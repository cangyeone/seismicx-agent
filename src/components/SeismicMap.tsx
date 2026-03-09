import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { SeismicEvent } from '../services/aiService';

interface MapProps {
  events: SeismicEvent[];
  center?: [number, number];
}

const SeismicMap: React.FC<MapProps> = ({ events, center = [35, 105] }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markersLayer = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    if (!mapInstance.current) {
      mapInstance.current = L.map(mapRef.current).setView(center, 4);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
      }).addTo(mapInstance.current);
      markersLayer.current = L.layerGroup().addTo(mapInstance.current);
    }

    if (markersLayer.current) {
      markersLayer.current.clearLayers();
      events.forEach(event => {
        const radius = Math.pow(2, event.magnitude) * 2;
        L.circleMarker([event.latitude, event.longitude], {
          radius: radius,
          fillColor: event.magnitude > 5 ? '#ef4444' : '#f59e0b',
          color: '#000',
          weight: 1,
          opacity: 1,
          fillOpacity: 0.6
        })
        .bindPopup(`
          <div class="text-black font-sans">
            <div class="font-bold">M${event.magnitude}</div>
            <div class="text-xs">${event.place}</div>
            <div class="text-xs text-gray-500">${new Date(event.time).toLocaleString()}</div>
          </div>
        `)
        .addTo(markersLayer.current!);
      });
    }
  }, [events, center]);

  return (
    <div ref={mapRef} className="w-full h-full rounded-xl border border-white/10 overflow-hidden shadow-2xl" />
  );
};

export default SeismicMap;
