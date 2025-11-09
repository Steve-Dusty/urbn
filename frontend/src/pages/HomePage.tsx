import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Zap, Play } from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = 'pk.eyJ1Ijoic3RldmVkdXN0eSIsImEiOiJjbWd4am05Z2IxZXhyMmtwdTg1cnU4cmYxIn0.zpfFRf-6xH6ivorwg_ZJ3w';

export function HomePage() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const rotationRef = useRef(0);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    // Initialize map with standard style (brighter)
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/standard', // Brighter style
      center: [-122.4194, 37.7749], // San Francisco
      zoom: 13,
      pitch: 60,
      bearing: -17,
      antialias: true,
      interactive: false, // Disable interaction for background
      attributionControl: false, // Hide attribution
    });

    // Add 3D buildings layer
    map.current.on('load', () => {
      if (!map.current) return;

      map.current.addLayer({
        'id': '3d-buildings',
        'source': 'composite',
        'source-layer': 'building',
        'filter': ['==', 'extrude', 'true'],
        'type': 'fill-extrusion',
        'minzoom': 12,
        'paint': {
          'fill-extrusion-color': '#718096', // Brighter gray
          'fill-extrusion-height': [
            'interpolate',
            ['linear'],
            ['zoom'],
            12, 0,
            12.05,
            ['get', 'height']
          ],
          'fill-extrusion-base': [
            'interpolate',
            ['linear'],
            ['zoom'],
            12, 0,
            12.05,
            ['get', 'min_height']
          ],
          'fill-extrusion-opacity': 0.8, // More visible
          'fill-extrusion-vertical-gradient': true
        }
      });

      // Start smooth rotation animation
      const animate = () => {
        if (!map.current) return;
        
        rotationRef.current += 0.1; // Slow rotation speed
        
        // Smoothly rotate the map
        map.current.easeTo({
          bearing: -17 + Math.sin(rotationRef.current * 0.01) * 10, // Gentle sway
          duration: 0, // Instant for smooth animation
        });

        // Also slowly pan the map
        const center = map.current.getCenter();
        const newLng = center.lng + Math.sin(rotationRef.current * 0.005) * 0.001;
        const newLat = center.lat + Math.cos(rotationRef.current * 0.005) * 0.001;
        
        map.current.easeTo({
          center: [newLng, newLat],
          duration: 0,
        });

        animationFrameRef.current = requestAnimationFrame(animate);
      };

      animate();
    });

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      {/* Animated Map Background */}
      <div ref={mapContainer} className="absolute inset-0 opacity-70" />
      
      {/* Lighter overlay for better text readability */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/50 via-black/40 to-black/50"></div>
      
      {/* Subtle animated particles */}
      <div className="absolute inset-0">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/20 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 3}s`
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-8">
        <div className="text-center max-w-6xl">
          <div className="mb-8 inline-block">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-blue-600 rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-purple-500/50 animate-pulse">
              <MapPin className="w-10 h-10 text-white" />
            </div>
          </div>
          
          <h1 className="text-8xl font-black text-white mb-6 tracking-tight">
            URBAN
          </h1>
          
          <p className="text-3xl text-white/70 mb-4 font-light tracking-wide">
            AI-Powered Policy Simulation
          </p>
          
          <div className="relative inline-block mb-12">
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 rounded-2xl blur-xl opacity-75 animate-pulse"></div>
            <div className="relative bg-black/80 backdrop-blur-xl border border-white/20 rounded-2xl px-12 py-6">
              <p className="text-white/90 text-xl font-light leading-relaxed max-w-3xl">
                Simulate government policies with AI agents. <br/>
                Real data. Real impact. Real-time analysis.
              </p>
            </div>
          </div>

          <div className="flex gap-6 justify-center">
            <Link
              to="/simulations"
              className="group relative"
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl blur-lg opacity-75 group-hover:opacity-100 transition"></div>
              <div className="relative bg-gradient-to-r from-purple-600 to-blue-600 px-12 py-5 rounded-2xl font-bold text-xl text-white flex items-center gap-3">
                <Play className="w-6 h-6" />
                Simulations
              </div>
            </Link>

            <Link
              to="/agents"
              className="group relative"
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-600 to-green-600 rounded-2xl blur-lg opacity-75 group-hover:opacity-100 transition"></div>
              <div className="relative bg-black border-2 border-white/30 px-12 py-5 rounded-2xl font-bold text-xl text-white flex items-center gap-3 hover:border-white/60 transition">
                <Zap className="w-6 h-6" />
                Create Agents
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

