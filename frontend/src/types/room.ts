export interface Room {
  fullname: string;
  shortname: string;
  number: string;
  name: string;
  address: string;
  lat: number;
  lon: number;
  seats: number;
  type: string;
  furniture: string;
  href: string;
}

export interface Building {
  shortname: string;
  fullname: string;
  address: string;
  lat: number;
  lon: number;
  rooms: Room[];
}