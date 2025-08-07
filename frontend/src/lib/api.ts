import { Room } from "@/types/room";

const BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:4321";

export class CampusAPI {
  static async getDatasets() {
    const response = await fetch(`${BASE_URL}/datasets`);
    if (!response.ok) {
      throw new Error("Failed to fetch datasets");
    }
    return response.json();
  }

  static async queryRooms(): Promise<Room[]> {
    const query = {
      WHERE: {},
      OPTIONS: {
        COLUMNS: [
          "rooms_fullname",
          "rooms_shortname", 
          "rooms_number",
          "rooms_name",
          "rooms_address",
          "rooms_lat",
          "rooms_lon",
          "rooms_seats",
          "rooms_type",
          "rooms_furniture",
          "rooms_href"
        ]
      }
    };

    const response = await fetch(`${BASE_URL}/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(query)
    });

    if (!response.ok) {
      throw new Error("Failed to query rooms");
    }

    const data = await response.json();
    
    // Transform the response to match our Room interface
    return data.result.map((room: any) => ({
      fullname: room.rooms_fullname,
      shortname: room.rooms_shortname,
      number: room.rooms_number,
      name: room.rooms_name,
      address: room.rooms_address,
      lat: room.rooms_lat,
      lon: room.rooms_lon,
      seats: room.rooms_seats,
      type: room.rooms_type,
      furniture: room.rooms_furniture,
      href: room.rooms_href
    }));
  }
}

// Calculate walking time between two points (rough estimate)
export function calculateWalkingTime(room1: Room, room2: Room): number {
  // Simple distance calculation using Haversine formula
  const R = 6371; // Earth's radius in kilometers
  const dLat = (room2.lat - room1.lat) * Math.PI / 180;
  const dLon = (room2.lon - room1.lon) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(room1.lat * Math.PI / 180) * Math.cos(room2.lat * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in kilometers
  
  // Convert to walking time (assuming 5 km/h walking speed)
  // Add extra time for same building (1 min) vs different buildings
  const isSameBuilding = room1.shortname === room2.shortname;
  const baseTime = isSameBuilding ? 1 : Math.max(2, distance * 12); // 12 min per km
  
  return Math.round(baseTime);
}