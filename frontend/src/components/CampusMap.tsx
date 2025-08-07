import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { Room, Building } from '@/types/room';

interface CampusMapProps {
  rooms: Room[];
  selectedRooms: Room[];
  onRoomSelect: (room: Room) => void;
}

const CampusMap: React.FC<CampusMapProps> = ({ rooms, selectedRooms, onRoomSelect }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const markers = useRef<any[]>([]);
  const [showTokenInput, setShowTokenInput] = useState(false);
  
  const GOOGLE_MAPS_API_KEY = 'AIzaSyCuFOvdXHm84czeEF0NCAaIZKbGl749EiY';

  // Group rooms by building
  const buildings = React.useMemo(() => {
    const buildingMap = new Map<string, Building>();
    
    rooms.forEach(room => {
      if (!buildingMap.has(room.shortname)) {
        buildingMap.set(room.shortname, {
          shortname: room.shortname,
          fullname: room.fullname,
          address: room.address,
          lat: room.lat,
          lon: room.lon,
          rooms: []
        });
      }
      buildingMap.get(room.shortname)!.rooms.push(room);
    });
    
    return Array.from(buildingMap.values());
  }, [rooms]);

  const initializeMap = async (apiKey: string) => {
    if (!mapContainer.current || !apiKey) return;

    try {
      const loader = new Loader({
        apiKey: apiKey,
        version: 'weekly',
        libraries: ['places']
      });

      const { Map } = await loader.importLibrary('maps');
      const { AdvancedMarkerElement } = await loader.importLibrary('marker') as google.maps.MarkerLibrary;

      map.current = new Map(mapContainer.current, {
        center: { lat: 49.2606, lng: -123.2460 }, // UBC coordinates
        zoom: 15,
        mapId: 'DEMO_MAP_ID',
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      });

      addBuildingMarkers();
      setShowTokenInput(false);
    } catch (error) {
      console.error('Failed to initialize map:', error);
    }
  };

  const addBuildingMarkers = async () => {
    if (!map.current) return;

    // Clear existing markers
    markers.current.forEach(marker => marker.map = null);
    markers.current = [];

    const { AdvancedMarkerElement } = await google.maps.importLibrary('marker') as google.maps.MarkerLibrary;

    buildings.forEach(building => {
      // Create a custom marker element
      const markerElement = document.createElement('div');
      markerElement.className = 'building-marker';
      
      // Check if any rooms in this building are selected
      const hasSelectedRoom = building.rooms.some(room => 
        selectedRooms.some(selected => selected.name === room.name)
      );

      markerElement.style.cssText = `
        width: 30px;
        height: 30px;
        background: ${hasSelectedRoom ? 'hsl(var(--campus-green))' : 'hsl(var(--campus-blue))'};
        border: 3px solid white;
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        transition: all 0.2s ease;
        transform: ${hasSelectedRoom ? 'scale(1.2)' : 'scale(1)'};
      `;

      markerElement.addEventListener('mouseenter', () => {
        markerElement.style.transform = hasSelectedRoom ? 'scale(1.3)' : 'scale(1.1)';
      });

      markerElement.addEventListener('mouseleave', () => {
        markerElement.style.transform = hasSelectedRoom ? 'scale(1.2)' : 'scale(1)';
      });

      const marker = new AdvancedMarkerElement({
        map: map.current,
        position: { lat: building.lat, lng: building.lon },
        content: markerElement,
        title: building.fullname
      });

      // Create info window
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div class="p-3">
            <h3 class="font-semibold text-campus-navy">${building.fullname}</h3>
            <p class="text-sm text-muted-foreground">${building.address}</p>
            <p class="text-sm text-campus-blue mt-1">${building.rooms.length} rooms</p>
          </div>
        `
      });

      marker.addListener('click', () => {
        infoWindow.open(map.current, marker);
      });

      markers.current.push(marker);
    });
  };

  useEffect(() => {
    // Initialize map on component mount
    if (mapContainer.current && !map.current) {
      initializeMap(GOOGLE_MAPS_API_KEY);
    }
  }, []);

  useEffect(() => {
    // Re-add markers when selected rooms change
    if (map.current) {
      addBuildingMarkers();
    }
  }, [selectedRooms, buildings]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="absolute inset-0 rounded-lg overflow-hidden" />
      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-campus-blue rounded-full border-2 border-white"></div>
          <span className="text-sm font-medium">Buildings</span>
        </div>
        {selectedRooms.length > 0 && (
          <div className="flex items-center space-x-2 mt-2">
            <div className="w-4 h-4 bg-campus-green rounded-full border-2 border-white"></div>
            <span className="text-sm font-medium">Selected</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default CampusMap;