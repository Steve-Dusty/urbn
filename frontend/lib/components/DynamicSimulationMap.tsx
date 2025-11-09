'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { Activity, Layers } from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = 'pk.eyJ1Ijoic3RldmVkdXN0eSIsImEiOiJjbWd4am05Z2IxZXhyMmtwdTg1cnU4cmYxIn0.zpfFRf-6xH6ivorwg_ZJ3w';

interface DynamicSimulationMapProps {
  city: string;
  simulationData: any;
  messages: any[];
  simulationId: string | null;
  onDemolitionComplete?: () => void;
  is3D?: boolean;
  onToggle3D?: () => void;
}

export function DynamicSimulationMap({ city, simulationData, messages, simulationId, is3D: externalIs3D, onToggle3D }: DynamicSimulationMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [constructionMarkers, setConstructionMarkers] = useState<mapboxgl.Marker[]>([]);
  const [publicSentiment, setPublicSentiment] = useState<any[]>([]);
  const [internalIs3D, setInternalIs3D] = useState(true);
  const is3D = externalIs3D !== undefined ? externalIs3D : internalIs3D;
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [heatmapStyle, setHeatmapStyle] = useState<'concentric' | 'radius'>('concentric');
  const [buildingOpacity, setBuildingOpacity] = useState(1);
  const demolitionIntervalRef = useRef<any>(null);

  // Initialize map
  useEffect(() => {
    if (typeof window === 'undefined') return; // Only run on client side
    if (!mapContainer.current || map.current) return;

    try {
      mapboxgl.accessToken = MAPBOX_TOKEN;

      // Set worker URL for Next.js
      (mapboxgl as any).workerClass = null;

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/dark-v11',  // DARK - Full control over buildings!
        center: [-122.4194, 37.7749],
        zoom: 15,
        pitch: 70,
        bearing: -17,
        antialias: true,
      });

      console.log('Mapbox map initialized:', map.current);
    } catch (error) {
      console.error('Failed to initialize Mapbox:', error);
      setMapLoaded(true); // Show error state instead of loading forever
      return;
    }

    map.current.on('error', (e: any) => {
      console.error('Mapbox error:', e);
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');

    map.current.on('load', () => {
      console.log('Mapbox map loaded successfully');
      setMapLoaded(true);

      if (!map.current) return;

      // Add custom 3D buildings layer that WE CAN CONTROL
      map.current.addLayer({
        'id': '3d-buildings',
        'source': 'composite',
        'source-layer': 'building',
        'filter': ['==', 'extrude', 'true'],
        'type': 'fill-extrusion',
        'minzoom': 14,
        'paint': {
          'fill-extrusion-color': '#aaa',
          'fill-extrusion-height': [
            'interpolate',
            ['linear'],
            ['zoom'],
            15, 0,
            15.05,
            ['get', 'height']
          ],
          'fill-extrusion-base': [
            'interpolate',
            ['linear'],
            ['zoom'],
            15, 0,
            15.05,
            ['get', 'min_height']
          ],
          'fill-extrusion-opacity': 0.8,
          'fill-extrusion-vertical-gradient': true
        }
      });
    });

    return () => {
      constructionMarkers.forEach(m => m.remove());
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Geocode and fly to city
  useEffect(() => {
    if (!map.current || !city || !mapLoaded) return;

    fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(city)}.json?access_token=${MAPBOX_TOKEN}&limit=1`
    )
      .then((res) => res.json())
      .then((data) => {
        if (data.features && data.features.length > 0) {
          const [lng, lat] = data.features[0].center;
          map.current?.flyTo({
            center: [lng, lat],
            zoom: 15,
            pitch: 70,
            bearing: -17.6,
            duration: 2000,
          });
        }
      })
      .catch(console.error);
  }, [city, mapLoaded]);

  // DYNAMIC SIMULATION EFFECTS
  useEffect(() => {
    if (!map.current || !mapLoaded || !simulationData?.metrics) return;

    const center = map.current.getCenter();

    // Remove old markers
    constructionMarkers.forEach(m => m.remove());
    setConstructionMarkers([]);

    // Parse policy actions from messages
    const policyActions = messages
      .filter(m => m.channel === `simulation:${simulationId}`)
      .filter(m => m.data.message?.includes('Action') || m.data.message?.includes('policy'))
      .map(m => m.data.message);

    // 1. ADD NEW BUILDING CONSTRUCTION SITES
    if (simulationData.metrics.changes?.housingAffordability?.percentage > 0) {
      const numNewBuildings = Math.floor(Math.abs(simulationData.metrics.changes.housingAffordability.percentage) / 2);
      const newMarkers: mapboxgl.Marker[] = [];

      for (let i = 0; i < Math.min(numNewBuildings, 10); i++) {
        // Random position near city center
        const offsetLng = (Math.random() - 0.5) * 0.02;
        const offsetLat = (Math.random() - 0.5) * 0.02;

        const el = document.createElement('div');
        el.innerHTML = `
          <div class="relative group cursor-pointer">
            <div class="absolute -inset-2 bg-green-500 rounded-full blur-xl opacity-60 animate-pulse"></div>
            <div class="relative w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center shadow-2xl text-2xl animate-bounce">
              🏗️
            </div>
          </div>
        `;

        const popup = new mapboxgl.Popup({ offset: 25, closeButton: false }).setHTML(`
          <div class="p-3 bg-black/90 rounded-lg border border-green-500/50">
            <h4 class="font-bold text-green-400 mb-1">New Housing Development</h4>
            <p class="text-white/80 text-sm">Affordable housing complex</p>
            <p class="text-green-300 text-xs mt-1">📊 +${Math.floor(Math.random() * 200 + 50)} units</p>
          </div>
        `);

        const marker = new mapboxgl.Marker(el)
          .setLngLat([center.lng + offsetLng, center.lat + offsetLat])
          .setPopup(popup)
          .addTo(map.current!);

        newMarkers.push(marker);

        // Show popup briefly then hide
        setTimeout(() => marker.togglePopup(), 500 + i * 200);
        setTimeout(() => marker.togglePopup(), 3000 + i * 200);
      }

      setConstructionMarkers(newMarkers);
    }

    // 2. SHOW DEMOLITION SITES (if housing decreased)
    if (simulationData.metrics.changes?.housingAffordability?.percentage < -5) {
      const numDemolitions = Math.floor(Math.abs(simulationData.metrics.changes.housingAffordability.percentage) / 5);
      const newMarkers: mapboxgl.Marker[] = [];

      for (let i = 0; i < Math.min(numDemolitions, 5); i++) {
        const offsetLng = (Math.random() - 0.5) * 0.02;
        const offsetLat = (Math.random() - 0.5) * 0.02;

        const el = document.createElement('div');
        el.innerHTML = `
          <div class="relative">
            <div class="absolute -inset-2 bg-red-500 rounded-full blur-xl opacity-60 animate-pulse"></div>
            <div class="relative w-12 h-12 bg-gradient-to-br from-red-400 to-orange-500 rounded-xl flex items-center justify-center shadow-2xl text-2xl">
              💥
            </div>
          </div>
        `;

        const popup = new mapboxgl.Popup({ offset: 25, closeButton: false }).setHTML(`
          <div class="p-3 bg-black/90 rounded-lg border border-red-500/50">
            <h4 class="font-bold text-red-400 mb-1">Demolition Zone</h4>
            <p class="text-white/80 text-sm">Old building removal</p>
          </div>
        `);

        const marker = new mapboxgl.Marker(el)
          .setLngLat([center.lng + offsetLng, center.lat + offsetLat])
          .setPopup(popup)
          .addTo(map.current!);

        newMarkers.push(marker);
      }

      setConstructionMarkers(prev => [...prev, ...newMarkers]);
    }

    // 3. ADD NEW ROAD CONSTRUCTION
    if (simulationData.metrics.changes?.trafficFlow?.percentage > 5) {
      // Add glowing new road overlay
      if (map.current.getSource('new-roads')) {
        map.current.removeLayer('new-roads-glow');
        map.current.removeLayer('new-roads');
        map.current.removeSource('new-roads');
      }

      map.current.addSource('new-roads', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: [
                  [center.lng - 0.01, center.lat - 0.01],
                  [center.lng + 0.01, center.lat + 0.01]
                ]
              },
              properties: { type: 'new' }
            }
          ]
        }
      });

      map.current.addLayer({
        id: 'new-roads-glow',
        type: 'line',
        source: 'new-roads',
        paint: {
          'line-width': 12,
          'line-color': '#3b82f6',
          'line-blur': 8,
          'line-opacity': 0.6
        }
      });

      map.current.addLayer({
        id: 'new-roads',
        type: 'line',
        source: 'new-roads',
        paint: {
          'line-width': 4,
          'line-color': '#60a5fa',
          'line-dasharray': [2, 2]
        }
      });
    }

    // 4. PUBLIC SENTIMENT MARKERS
    const sentiments = [
      { emoji: '😊', text: 'Love the new housing!', position: 'positive', color: 'green' },
      { emoji: '🤔', text: 'Traffic seems better', position: 'positive', color: 'blue' },
      { emoji: '👍', text: 'Air quality improved!', position: 'positive', color: 'green' },
      { emoji: '😐', text: 'Rent still high...', position: 'neutral', color: 'yellow' },
      { emoji: '🏡', text: 'Great for families!', position: 'positive', color: 'green' },
    ];

    if (simulationData.metrics.changes) {
      const markers: mapboxgl.Marker[] = [];

      sentiments.slice(0, 5).forEach((sentiment, i) => {
        const offsetLng = (Math.random() - 0.5) * 0.03;
        const offsetLat = (Math.random() - 0.5) * 0.03;

        const el = document.createElement('div');
        el.innerHTML = `
          <div class="relative group cursor-pointer">
            <div class="absolute -inset-1 bg-${sentiment.color}-500 rounded-full blur-lg opacity-40"></div>
            <div class="relative w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-xl text-xl border-2 border-${sentiment.color}-400 hover:scale-125 transition-transform">
              ${sentiment.emoji}
            </div>
          </div>
        `;

        const popup = new mapboxgl.Popup({ offset: 15, closeButton: false }).setHTML(`
          <div class="p-2 bg-black/95 rounded-lg border border-white/20">
            <p class="text-white text-sm">${sentiment.text}</p>
          </div>
        `);

        const marker = new mapboxgl.Marker(el)
          .setLngLat([center.lng + offsetLng, center.lat + offsetLat])
          .setPopup(popup)
          .addTo(map.current!);

        markers.push(marker);

        // Auto-show popup briefly
        setTimeout(() => marker.togglePopup(), 1000 + i * 500);
        setTimeout(() => marker.togglePopup(), 4000 + i * 500);
      });

      setConstructionMarkers(prev => [...prev, ...markers]);
    }

  }, [simulationData, mapLoaded, simulationId]);

  // Toggle 3D/2D view
  const toggle3D = () => {
    if (!map.current) return;
    
    if (onToggle3D) {
      onToggle3D();
    } else {
      if (is3D) {
        // Switch to 2D
        map.current.easeTo({
          pitch: 0,
          bearing: 0,
          duration: 1000
        });
      } else {
        // Switch to 3D
        map.current.easeTo({
          pitch: 70,
          bearing: -17,
          duration: 1000
        });
      }
      setInternalIs3D(!is3D);
    }
  };

  // Sync map view when is3D prop changes
  useEffect(() => {
    if (!map.current || !mapLoaded || externalIs3D === undefined) return;
    
    if (externalIs3D) {
      map.current.easeTo({
        pitch: 70,
        bearing: -17,
        duration: 1000
      });
    } else {
      map.current.easeTo({
        pitch: 0,
        bearing: 0,
        duration: 1000
      });
    }
  }, [externalIs3D, mapLoaded]);

  // STUNNING HEATMAP OVERLAYS - AI-DRIVEN IMPACT ZONES
  useEffect(() => {
    if (!map.current || !mapLoaded || !simulationData?.metrics || !showHeatmap) return;

    const center = map.current.getCenter();
    
    // Remove existing heatmap layers
    ['heatmap-outer', 'heatmap-middle', 'heatmap-inner', 'heatmap-core', 'policy-maker-zone'].forEach(id => {
      if (map.current?.getLayer(id)) {
        map.current?.removeLayer(id);
      }
    });

    if (map.current?.getSource('heatmap-source')) {
      map.current?.removeSource('heatmap-source');
    }

    // Create concentric heatmap zones based on policy impact
    const changes = simulationData.metrics.changes || {};
    const avgImpact = Object.values(changes).reduce((sum: number, c: any) => sum + Math.abs(c.percentage || 0), 0) / Object.keys(changes).length;

    // Determine colors based on overall impact
    const isPositive = Object.values(changes).filter((c: any) => (c.percentage || 0) > 0).length > Object.values(changes).length / 2;
    
    const colors = isPositive 
      ? ['#22c55e', '#84cc16', '#fbbf24', '#fb923c']  // Green to orange (positive)
      : ['#ef4444', '#f97316', '#fbbf24', '#84cc16']; // Red to yellow (negative)

    // Create multiple impact zones (like ripples)
    const zones = [
      { radius: 2000, opacity: 0.15, color: colors[0], label: 'Core Impact Zone' },
      { radius: 1500, opacity: 0.25, color: colors[1], label: 'Primary Zone' },
      { radius: 1000, opacity: 0.35, color: colors[2], label: 'Secondary Zone' },
      { radius: 500, opacity: 0.45, color: colors[3], label: 'Direct Impact' },
    ];

    map.current.addSource('heatmap-source', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: zones.map((zone, i) => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [center.lng, center.lat]
          },
          properties: {
            radius: zone.radius,
            color: zone.color,
            opacity: zone.opacity,
            label: zone.label
          }
        }))
      }
    });

    // Add heatmap layers based on style
    if (heatmapStyle === 'concentric') {
      // STYLE 1: Concentric circles (current)
      zones.reverse().forEach((zone, i) => {
        map.current!.addLayer({
          id: `heatmap-${i}`,
          type: 'circle',
          source: 'heatmap-source',
          filter: ['==', ['get', 'radius'], zone.radius],
          paint: {
            'circle-radius': [
              'interpolate',
              ['linear'],
              ['zoom'],
              10, zone.radius / 20,
              16, zone.radius / 3,
              20, zone.radius
            ],
            'circle-color': zone.color,
            'circle-opacity': zone.opacity,
            'circle-blur': 1
          }
        });
      });
    } else {
      // STYLE 2: Filled radius heatmap (smooth gradient)
      map.current!.addLayer({
        id: 'heatmap-filled',
        type: 'heatmap',
        source: 'heatmap-source',
        paint: {
          // Heatmap intensity based on zoom
          'heatmap-intensity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            10, 0.5,
            16, 1.5
          ],
          // Color ramp from blue to red
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0, 'rgba(0, 0, 255, 0)',
            0.2, colors[3],
            0.4, colors[2],
            0.6, colors[1],
            0.8, colors[0],
            1, colors[0]
          ],
          // Radius of each point
          'heatmap-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            10, 50,
            16, 200
          ],
          // Opacity
          'heatmap-opacity': 0.7
        }
      });
    }

    // Add POLICY MAKER ATTRIBUTION ZONE (who made this policy)
    if (simulationData.policyMaker || simulationData.source) {
      const policyMaker = simulationData.policyMaker || 'City Council';
      
      const makerEl = document.createElement('div');
      makerEl.innerHTML = `
        <div class="relative group">
          <div class="absolute -inset-2 bg-purple-500 rounded-2xl blur-xl opacity-60 animate-pulse"></div>
          <div class="relative bg-black/90 backdrop-blur-xl border-2 border-purple-400/50 rounded-2xl px-6 py-3 shadow-2xl">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-xl">
                🏛️
              </div>
              <div>
                <p class="text-purple-300 text-xs font-bold uppercase tracking-wide">Policy by</p>
                <p class="text-white font-bold">${policyMaker}</p>
              </div>
            </div>
          </div>
        </div>
      `;

      const makerMarker = new mapboxgl.Marker(makerEl)
        .setLngLat([center.lng, center.lat + 0.01])
        .addTo(map.current!);

      setConstructionMarkers(prev => [...prev, makerMarker]);
    }

  }, [simulationData, mapLoaded, showHeatmap, heatmapStyle]);

  // Trigger demolition when chat command received
  useEffect(() => {
    if (simulationData?.triggerDemolition) {
      demolishSalesforceTower();
    }
  }, [simulationData?.triggerDemolition]);

  // Zoom to specific location
  const zoomToLocation = (location: { lng: number; lat: number; zoom: number; label: string }) => {
    if (!map.current) return;
    
    map.current.flyTo({
      center: [location.lng, location.lat],
      zoom: location.zoom,
      pitch: 70,
      bearing: -17,
      duration: 2000,
      essential: true
    });

    // Add temporary marker at location
    const el = document.createElement('div');
    el.innerHTML = `
      <div class="relative animate-ping">
        <div class="w-16 h-16 bg-cyan-500 rounded-full opacity-75"></div>
      </div>
    `;

    const marker = new mapboxgl.Marker(el)
      .setLngLat([location.lng, location.lat])
      .addTo(map.current);

    // Remove after 3 seconds
    setTimeout(() => marker.remove(), 3000);
  };

  // DEMOLISH SALESFORCE TOWER - Slow disappear animation
  const demolishSalesforceTower = () => {
    if (!map.current) return;

    // Salesforce Tower coordinates
    const salesforceCoords: [number, number] = [-122.3970, 37.7897];

    // Fly to Salesforce Tower
    map.current.flyTo({
      center: salesforceCoords,
      zoom: 18,
      pitch: 70,
      bearing: 45,
      duration: 3000
    });

    // Add demolition marker
    const demolitionEl = document.createElement('div');
    demolitionEl.innerHTML = `
      <div class="relative">
        <div class="absolute -inset-4 bg-red-500 rounded-full blur-2xl opacity-60 animate-pulse"></div>
        <div class="relative w-20 h-20 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-2xl text-4xl animate-bounce">
          💥
        </div>
      </div>
    `;

    const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
      <div class="p-4 bg-black/95 rounded-xl border border-red-500/50">
        <h4 class="font-bold text-red-400 text-lg mb-2">🏢 Salesforce Tower</h4>
        <p class="text-white/90 text-sm mb-2">Demolition in progress...</p>
        <div class="h-2 bg-black/60 rounded-full overflow-hidden">
          <div id="demo-progress" class="h-full bg-gradient-to-r from-red-500 to-orange-500 transition-all duration-500" style="width: 0%"></div>
        </div>
        <p class="text-red-300 text-xs mt-2">Building opacity decreasing...</p>
      </div>
    `);

    const demolitionMarker = new mapboxgl.Marker(demolitionEl)
      .setLngLat(salesforceCoords)
      .setPopup(popup)
      .addTo(map.current!);

    demolitionMarker.togglePopup();

    // Slowly reduce building opacity (10 second animation)
    let opacity = 1;
    let progress = 0;
    
    if (demolitionIntervalRef.current) {
      clearInterval(demolitionIntervalRef.current);
    }

    demolitionIntervalRef.current = setInterval(() => {
      opacity -= 0.05; // Reduce by 5% every 500ms
      progress += 5;

      if (opacity <= 0) {
        opacity = 0;
        clearInterval(demolitionIntervalRef.current);
        
        // Make buildings completely transparent at the end
        if (map.current?.getLayer('3d-buildings')) {
          map.current.setPaintProperty('3d-buildings', 'fill-extrusion-opacity', 0);
        }
        
        // Final explosion effect
        const explosionEl = document.createElement('div');
        explosionEl.innerHTML = `
          <div class="w-40 h-40 bg-red-500 rounded-full opacity-75 animate-ping"></div>
        `;
        const explosionMarker = new mapboxgl.Marker(explosionEl)
          .setLngLat(salesforceCoords)
          .addTo(map.current!);
        
        setTimeout(() => {
          explosionMarker.remove();
          demolitionMarker.remove();
          
          // Reset building opacity after explosion
          if (map.current?.getLayer('3d-buildings')) {
            map.current.setPaintProperty('3d-buildings', 'fill-extrusion-opacity', 0.8);
          }
          
          alert('💥 Salesforce Tower demolished! Building removed from simulation.');
        }, 2000);
      }

      // ACTUALLY UPDATE BUILDING LAYER OPACITY IN REAL-TIME
      if (map.current?.getLayer('3d-buildings')) {
        // Reduce opacity of ALL buildings (makes Salesforce Tower disappear)
        map.current.setPaintProperty('3d-buildings', 'fill-extrusion-opacity', opacity * 0.8);
        
        // Also reduce height to make it "sink"
        const currentHeight = map.current.getPaintProperty('3d-buildings', 'fill-extrusion-height');
        if (currentHeight) {
          map.current.setPaintProperty('3d-buildings', 'fill-extrusion-height', [
            'interpolate',
            ['linear'],
            ['zoom'],
            15,
            0,
            15.05,
            ['*', ['get', 'height'], opacity] // Scale height by opacity
          ]);
        }
      }

      // Update progress bar
      const progressBar = document.getElementById('demo-progress');
      if (progressBar) {
        progressBar.style.width = `${progress}%`;
      }

    }, 500); // Update every 500ms for smooth animation
  };

  if (!MAPBOX_TOKEN) {
    return (
      <div className="flex items-center justify-center h-full bg-red-900">
        <div className="text-center p-8 bg-white rounded-2xl">
          <h3 className="text-xl font-bold mb-2">Mapbox Token Required</h3>
          <p className="text-gray-600">Set VITE_MAPBOX_TOKEN in frontend/.env</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="absolute inset-0" style={{ width: '100%', height: '100%' }} />
      
      {/* COMPACT CONTROLS - Top Right */}
      <div className="absolute top-6 right-6 z-20 flex gap-3">
        {/* 3D/2D Toggle - Compact */}
        <button
          onClick={toggle3D}
          className="group relative"
          title={is3D ? "Switch to 2D" : "Switch to 3D"}
        >
          <div className={`absolute -inset-0.5 bg-gradient-to-r ${is3D ? 'from-blue-600 to-cyan-600' : 'from-purple-600 to-pink-600'} rounded-xl blur-lg opacity-75 group-hover:opacity-100 transition`}></div>
          <div className="relative bg-black/90 backdrop-blur-2xl border border-white/30 rounded-xl px-4 py-3 hover:scale-105 transition-transform shadow-xl">
            <div className="text-2xl">{is3D ? '🏙️' : '🗺️'}</div>
          </div>
        </button>

        {/* Heatmap Toggle - Compact */}
        {simulationData && (
          <>
            <button
              onClick={() => setShowHeatmap(!showHeatmap)}
              className="group relative"
              title={showHeatmap ? "Hide Heatmap" : "Show Heatmap"}
            >
              <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-600 to-yellow-600 rounded-xl blur-lg opacity-75 group-hover:opacity-100 transition"></div>
              <div className="relative bg-black/90 backdrop-blur-2xl border border-white/30 rounded-xl px-4 py-3 hover:scale-105 transition-transform shadow-xl">
                <div className="text-2xl">{showHeatmap ? '🔥' : '❄️'}</div>
              </div>
            </button>

            {/* Style Toggle - Compact */}
            {showHeatmap && (
              <button
                onClick={() => setHeatmapStyle(heatmapStyle === 'concentric' ? 'radius' : 'concentric')}
                className="group relative"
                title={heatmapStyle === 'concentric' ? "Switch to Gradient" : "Switch to Circles"}
              >
                <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-600 to-purple-600 rounded-xl blur-lg opacity-75 group-hover:opacity-100 transition"></div>
                <div className="relative bg-black/90 backdrop-blur-2xl border border-white/30 rounded-xl px-4 py-3 hover:scale-105 transition-transform shadow-xl">
                  <div className="text-2xl">{heatmapStyle === 'concentric' ? '⭕' : '🌊'}</div>
                </div>
              </button>
            )}
          </>
        )}

        {/* DEMOLISH BUTTON */}
        <button
          onClick={demolishSalesforceTower}
          className="group relative"
          title="Demolish Salesforce Tower"
        >
          <div className="absolute -inset-0.5 bg-gradient-to-r from-red-600 to-orange-600 rounded-xl blur-lg opacity-75 group-hover:opacity-100 transition animate-pulse"></div>
          <div className="relative bg-black/90 backdrop-blur-2xl border border-white/30 rounded-xl px-4 py-3 hover:scale-105 transition-transform shadow-xl">
            <div className="text-2xl">💥</div>
          </div>
        </button>

        {/* TEST DEMO BUTTON */}
        <button
          onClick={() => {
            if (!map.current) return;
            
            alert('🎬 WATCH ALL BUILDINGS DISAPPEAR!\n\nOver the next 10 seconds:\n• Buildings will fade out\n• Buildings will shrink down\n• All 3D structures will vanish\n\nWatch the map closely!');
            
            let opacity = 1;
            const interval = setInterval(() => {
              opacity -= 0.1;
              
              if (opacity <= 0) {
                clearInterval(interval);
                
                // Explosion effect
                alert('💥 BOOM! All buildings gone!\n\nRefresh page to restore them.');
                
                if (map.current?.getLayer('3d-buildings')) {
                  map.current.setPaintProperty('3d-buildings', 'fill-extrusion-opacity', 0);
                  map.current.setPaintProperty('3d-buildings', 'fill-extrusion-height', 0);
                }
              } else {
                if (map.current?.getLayer('3d-buildings')) {
                  map.current.setPaintProperty('3d-buildings', 'fill-extrusion-opacity', opacity);
                  map.current.setPaintProperty('3d-buildings', 'fill-extrusion-height', [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    15, 0,
                    15.05,
                    ['*', ['get', 'height'], opacity]
                  ]);
                }
              }
            }, 1000);
          }}
          className="group relative"
          title="TEST: Make ALL buildings disappear"
        >
          <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-600 to-purple-600 rounded-xl blur-lg opacity-75 group-hover:opacity-100 transition animate-pulse"></div>
          <div className="relative bg-black/90 backdrop-blur-2xl border border-white/30 rounded-xl px-4 py-3 hover:scale-105 transition-transform shadow-xl">
            <div className="text-2xl">🎬</div>
          </div>
        </button>
      </div>
      
      {/* REMOVED LEGEND - DECLUTTERED UI */}

      {/* Loading */}
      {!mapLoaded && (
        <div className="absolute inset-0 bg-black flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white font-medium">Loading 3D map...</p>
          </div>
        </div>
      )}
    </div>
  );
}

