import { Room } from "./Room";
import { GeoResponse } from "./Geo";

export interface Building {
	fullName: string;
	shortName: string;
	address: string;
	href: string;
	geo: GeoResponse;
	rooms: Room[];
}
