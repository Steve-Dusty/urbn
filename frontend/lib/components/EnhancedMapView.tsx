import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { Activity } from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = 'pk.eyJ1Ijoic3RldmVkdXN0eSIsImEiOiJjbWd4am05Z2IxZXhyMmtwdTg1cnU4cmYxIn0.zpfFRf-6xH6ivorwg_ZJ3w';

interface EnhancedMapViewProps {
  city: string;
  layers: string[];
  simulationData?: any;
}

export function EnhancedMapView({ city, layers, simulationData }: EnhancedMapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/standard',  // STANDARD - BEST 3D BUILDINGS!
      center: [-122.4194, 37.7749], // SF default
      zoom: 16,  // Closer for better building detail
      pitch: 70,  // Steeper angle to see buildings better
      bearing: -17,
      antialias: true,
    });

    // STANDARD STYLE - PHOTOREALISTIC 3D BUILDINGS!

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');

    map.current.on('load', () => {
      setMapLoaded(true);
      
      if (!map.current) return;

      // Standard style has BUILT-IN photorealistic 3D buildings with textures!

      // Add VIBRANT traffic layer with glow
      if (layers.includes('traffic')) {
        map.current.addSource('traffic', {
          type: 'vector',
          url: 'mapbox://mapbox.mapbox-traffic-v1'
        });

        // Traffic with glow effect
        map.current.addLayer({
          'id': 'traffic-glow',
          'type': 'line',
          'source': 'traffic',
          'source-layer': 'traffic',
          'paint': {
            'line-width': 8,
            'line-blur': 4,
            'line-color': [
              'match',
              ['get', 'congestion'],
              'low', '#10b981',
              'moderate', '#fbbf24',
              'heavy', '#f97316',
              'severe', '#ef4444',
              '#6366f1'
            ],
            'line-opacity': 0.6
          }
        });

        map.current.addLayer({
          'id': 'traffic-layer',
          'type': 'line',
          'source': 'traffic',
          'source-layer': 'traffic',
          'paint': {
            'line-width': 4,
            'line-color': [
              'match',
              ['get', 'congestion'],
              'low', '#34d399',
              'moderate', '#fcd34d',
              'heavy', '#fb923c',
              'severe', '#f87171',
              '#818cf8'
            ]
          }
        });
      }

      // Standard style has built-in optimized labels!
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Geocode and fly to city when it changes
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
            zoom: 13,
            pitch: 60,
            bearing: -17.6,
            duration: 2000,
          });
        }
      })
      .catch(console.error);
  }, [city, mapLoaded]);

  // DYNAMICALLY UPDATE MAP BASED ON SIMULATION RESULTS
  useEffect(() => {
    if (!map.current || !mapLoaded || !simulationData) return;

    // Remove existing simulation layers
    ['housing-heatmap', 'traffic-impact', 'equity-zones', 'air-quality'].forEach(layerId => {
      if (map.current?.getLayer(layerId)) {
        map.current?.removeLayer(layerId);
      }
    });

    ['housing-source', 'impact-source'].forEach(sourceId => {
      if (map.current?.getSource(sourceId)) {
        map.current?.removeSource(sourceId);
      }
    });

    // ADD DYNAMIC HOUSING DENSITY OVERLAY
    if (simulationData.metrics?.changes?.housingAffordability) {
      const impact = simulationData.metrics.changes.housingAffordability.percentage;
      
      // Create a circle layer showing housing impact zones
      map.current.addSource('housing-source', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: map.current.getCenter().toArray()
              },
              properties: {
                impact: impact
              }
            }
          ]
        }
      });

      map.current.addLayer({
        id: 'housing-heatmap',
        type: 'circle',
        source: 'housing-source',
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            10, 100,
            16, 400
          ],
          'circle-color': impact > 0 ? '#10b981' : '#ef4444',
          'circle-opacity': 0.3,
          'circle-blur': 1
        }
      });
    }

    // ADD DYNAMIC TRAFFIC IMPACT OVERLAY
    if (simulationData.metrics?.changes?.trafficFlow) {
      const impact = simulationData.metrics.changes.trafficFlow.percentage;
      
      // Highlight roads with traffic changes
      map.current.addLayer({
        id: 'traffic-impact',
        type: 'line',
        source: 'composite',
        'source-layer': 'road',
        filter: ['==', ['get', 'class'], 'primary'],
        paint: {
          'line-width': 6,
          'line-color': impact > 0 ? '#34d399' : '#fbbf24',
          'line-opacity': 0.7,
          'line-blur': 2
        }
      });
    }

    // ADD AIR QUALITY ZONES
    if (simulationData.metrics?.changes?.airQuality) {
      const impact = simulationData.metrics.changes.airQuality.percentage;
      
      map.current.addSource('impact-source', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: map.current.getCenter().toArray()
              },
              properties: { impact }
            }
          ]
        }
      });

      map.current.addLayer({
        id: 'air-quality',
        type: 'circle',
        source: 'impact-source',
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            10, 150,
            16, 600
          ],
          'circle-color': impact > 0 ? '#22c55e' : '#f59e0b',
          'circle-opacity': 0.2,
          'circle-blur': 1.5
        }
      });
    }

  }, [simulationData, mapLoaded]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="flex items-center justify-center h-full bg-gradient-to-br from-red-50 to-orange-50">
        <div className="text-center p-8 bg-white rounded-2xl shadow-xl max-w-md">
          <div className="text-6xl mb-4">🗺️</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Mapbox Token Required</h3>
          <p className="text-gray-600 mb-4">
            To display beautiful 3D maps, please set your Mapbox token in <code className="bg-gray-100 px-2 py-1 rounded">frontend/.env</code>
          </p>
          <a
            href="https://account.mapbox.com/access-tokens/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Get Token →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="absolute inset-0" />
      
      {/* STUNNING Glass Legend with Colors */}
      <div className="absolute bottom-8 left-8 group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 rounded-3xl opacity-50 group-hover:opacity-75 blur-xl transition duration-500"></div>
        <div className="relative bg-black/40 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/20 p-6 max-w-xs">
          <h4 className="font-bold text-white mb-5 flex items-center gap-3 text-lg uppercase tracking-wide">
            <div className="w-4 h-4 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 rounded-full animate-pulse shadow-lg shadow-purple-500/50"></div>
            Map Layers
          </h4>
          <div className="space-y-4">
            {[
              { id: 'buildings', label: '3D Buildings', colors: ['#ffffff', '#e0e0e0'], emoji: '🏢', enabled: true },  // Always on in Standard
              { id: 'traffic', label: 'Live Traffic', colors: ['#10b981', '#ef4444'], emoji: '🚗', enabled: layers.includes('traffic') },
              { id: 'housing', label: 'Housing', colors: ['#3b82f6', '#06b6d4'], emoji: '🏠', enabled: layers.includes('housing') },
              { id: 'emissions', label: 'Air Quality', colors: ['#22c55e', '#84cc16'], emoji: '🌱', enabled: layers.includes('emissions') },
              { id: 'equity', label: 'Equity', colors: ['#8b5cf6', '#ec4899'], emoji: '⚖️', enabled: layers.includes('equity') },
            ].map((layer) => (
              <div
                key={layer.id}
                className={`flex items-center gap-3 p-3 rounded-xl backdrop-blur-sm border transition-all duration-300 ${
                  layer.enabled 
                    ? 'bg-white/10 border-white/30 scale-105' 
                    : 'bg-white/5 border-white/10 opacity-50'
                }`}
              >
                <div className="text-2xl">{layer.emoji}</div>
                <div className="flex-1">
                  <span className="text-sm text-white font-semibold block">{layer.label}</span>
                  {layer.enabled && (
                    <div className="h-1 mt-2 rounded-full overflow-hidden bg-black/30">
                      <div 
                        className="h-full rounded-full animate-pulse"
                        style={{
                          background: `linear-gradient(to right, ${layer.colors[0]}, ${layer.colors[1]})`,
                          width: '100%'
                        }}
                      ></div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* STUNNING Simulation Results with Glass Effect */}
      {simulationData && (
        <div className="absolute top-8 left-8 group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-green-600 via-emerald-600 to-cyan-600 rounded-3xl opacity-60 group-hover:opacity-100 blur-xl transition duration-500"></div>
          <div className="relative bg-black/40 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/20 p-6 max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/50">
                <Activity className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-bold text-white text-xl uppercase tracking-wide">Analysis Complete</h3>
            </div>
            <p className="text-white/90 text-base leading-relaxed">
              Simulation finished! View detailed impact metrics and AI insights in the right panel.
            </p>
          </div>
        </div>
      )}

      {/* Loading Indicator */}
      {!mapLoaded && (
        <div className="absolute inset-0 bg-slate-900 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white font-medium">Loading stunning 3D map...</p>
          </div>
        </div>
      )}
    </div>
  );
}

