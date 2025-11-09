import { useEffect, useRef, useState } from 'react';
import Map, { Source, Layer, NavigationControl } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = 'pk.eyJ1Ijoic3RldmVkdXN0eSIsImEiOiJjbWd4am05Z2IxZXhyMmtwdTg1cnU4cmYxIn0.zpfFRf-6xH6ivorwg_ZJ3w';

interface MapViewProps {
  city: string;
  layers: string[];
  simulationData?: any;
}

export function MapView({ city, layers, simulationData }: MapViewProps) {
  const [viewport, setViewport] = useState({
    longitude: -122.4194,
    latitude: 37.7749,
    zoom: 12,
  });

  useEffect(() => {
    // Geocode city when it changes
    if (city) {
      geocodeCity(city);
    }
  }, [city]);

  const geocodeCity = async (cityName: string) => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(cityName)}.json?access_token=${MAPBOX_TOKEN}&limit=1`
      );
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        setViewport((prev) => ({
          ...prev,
          longitude: lng,
          latitude: lat,
        }));
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    }
  };

  if (!MAPBOX_TOKEN) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100">
        <div className="text-center">
          <p className="text-gray-600 mb-2">Mapbox token not configured</p>
          <p className="text-sm text-gray-500">
            Set VITE_MAPBOX_TOKEN in your .env file
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <Map
        {...viewport}
        onMove={(evt) => setViewport(evt.viewState)}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        style={{ width: '100%', height: '100%' }}
        pitch={60}
        bearing={-17.6}
        terrain={{ source: 'mapbox-dem', exaggeration: 1.5 }}
      >
        <NavigationControl position="top-right" />

        {/* Traffic Layer */}
        {layers.includes('traffic') && (
          <Source
            id="traffic"
            type="vector"
            url="mapbox://mapbox.mapbox-traffic-v1"
          >
            <Layer
              id="traffic-layer"
              type="line"
              source-layer="traffic"
              paint={{
                'line-width': 3,
                'line-color': [
                  'match',
                  ['get', 'congestion'],
                  'low',
                  '#00ff00',
                  'moderate',
                  '#ffff00',
                  'heavy',
                  '#ff9900',
                  'severe',
                  '#ff0000',
                  '#888888',
                ],
              }}
            />
          </Source>
        )}

        {/* 3D Buildings Layer - Enhanced like NYC example */}
        {layers.includes('buildings') && (
          <Layer
            id="3d-buildings"
            type="fill-extrusion"
            source="composite"
            source-layer="building"
            filter={['==', 'extrude', 'true']}
            minzoom={14}
            paint={{
              'fill-extrusion-color': [
                'interpolate',
                ['linear'],
                ['get', 'height'],
                0, '#2a2a2a',
                50, '#3a3a3a',
                100, '#4a4a4a',
                200, '#5a5a5a'
              ],
              'fill-extrusion-height': [
                'interpolate',
                ['linear'],
                ['zoom'],
                15,
                0,
                15.05,
                ['get', 'height'],
              ],
              'fill-extrusion-base': [
                'interpolate',
                ['linear'],
                ['zoom'],
                15,
                0,
                15.05,
                ['get', 'min_height'],
              ],
              'fill-extrusion-opacity': 0.8,
            }}
          />
        )}

        {/* Simulation overlay */}
        {simulationData && (
          <div className="absolute top-4 left-4 bg-white p-4 rounded-lg shadow-lg max-w-md">
            <h3 className="font-semibold text-sm mb-2">Simulation Results</h3>
            <p className="text-xs text-gray-600">
              Results will be overlaid on the map as heatmaps and markers
            </p>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-white p-3 rounded-lg shadow">
          <h4 className="font-medium text-xs mb-2">Active Layers</h4>
          <div className="space-y-1">
            {layers.map((layer) => (
              <div key={layer} className="flex items-center gap-2 text-xs">
                <div
                  className={`w-3 h-3 rounded ${
                    layer === 'traffic'
                      ? 'bg-green-500'
                      : layer === 'buildings'
                      ? 'bg-gray-500'
                      : layer === 'housing'
                      ? 'bg-blue-500'
                      : layer === 'emissions'
                      ? 'bg-yellow-500'
                      : 'bg-purple-500'
                  }`}
                />
                <span className="capitalize">{layer}</span>
              </div>
            ))}
          </div>
        </div>
      </Map>
    </div>
  );
}


