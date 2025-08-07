import JSZip from "jszip";
import { InsightError } from "./IInsightFacade";
import * as parse5 from "parse5";
import { Building } from "./Building";
import { GeoResponse } from "./Geo";

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

export async function processRoomDataset(zip: JSZip): Promise<Room[]> {
	const indexFile = zip.file("index.htm");
	if (!indexFile) throw new InsightError("Missing index.htm");

	const indexHtml = await indexFile.async("text");
	const indexDoc = parse5.parse(indexHtml);

	const buildings = await processBuildingInfo(indexDoc);

	const roomResults = await Promise.all(
		buildings.map(async (b) => {
			try {
				return await processRoomForBuilding(b, zip);
			} catch {
				return []; // skip problematic building
			}
		})
	);

	const allRooms = roomResults.flat();

	return allRooms;
}

export async function processRoomForBuilding(b: Building, zip: JSZip): Promise<Room[]> {
	const effectiveCellNumber = 4;

	const file = zip.file(b.href);
	if (!file) return [];

	const html = await file.async("text");
	const doc = parse5.parse(html);

	const tables = findNodesByTagName(doc, "table");
	if (tables.length === 0) return [];
	const roomTable = findValidRoomTable(tables);

	if (!roomTable) {
		return [];
	}

	const roomRows: any[] = ((): any[] => {
		const tbody = findNodesByTagName(roomTable, "tbody")[0];
		if (!tbody) return [];
		return findNodesByTagName(tbody, "tr");
	})();

	const rooms: Room[] = [];

	for (const room of roomRows) {
		const cells = findNodesByTagName(room, "td");
		if (cells.length < effectiveCellNumber) continue;

		pushRoom(cells, rooms, b);
	}

	return rooms;
}

export function pushRoom(cells: any, rooms: Room[], b: Building): void {
	const numberTD = findTdByClassKey(cells, "field-room-number");
	if (!numberTD) return;
	const href = numberTD ? (getAttr(findNodesByTagName(numberTD, "a")[0], "href") ?? "") : "";
	const roomNumber = getTextContent(numberTD).trim();

	const seatTD = findTdByClassKey(cells, "field-room-capacity");
	if (!seatTD) return;
	const seatStr = getTextContent(seatTD).trim();
	const seats = Number(seatStr);
	if (seatStr === "" || isNaN(seats)) return;

	const furnitureTD = findTdByClassKey(cells, "field-room-furniture");
	if (!furnitureTD) return;
	const furniture = getTextContent(furnitureTD).trim();

	const typeTD = findTdByClassKey(cells, "field-room-type");
	if (!typeTD) return;
	const type = getTextContent(typeTD).trim();

	if (b.geo.lat === undefined || b.geo.lon === undefined) return;

	const fields = {
		fullname: b.fullName,
		shortname: b.shortName,
		number: roomNumber,
		name: `${b.shortName}_${roomNumber}`,
		address: b.address,
		lat: b.geo.lat,
		lon: b.geo.lon,
		seats: seats,
		type: type,
		furniture: furniture,
		href: href,
	};
	if (!isValidRoom(fields)) return;
	rooms.push(fields);
}

export function isValidRoom(fields: any): boolean {
	return (
		fields &&
		typeof fields === "object" &&
		typeof fields.fullname === "string" &&
		typeof fields.shortname === "string" &&
		typeof fields.number === "string" &&
		typeof fields.name === "string" &&
		typeof fields.address === "string" &&
		typeof fields.lat === "number" &&
		typeof fields.lon === "number" &&
		typeof fields.seats === "number" &&
		typeof fields.type === "string" &&
		typeof fields.furniture === "string" &&
		typeof fields.href === "string"
	); // check if section must be string
}

export function isRoom(obj: any): obj is Room {
	return (
		typeof obj === "object" &&
		obj !== null &&
		"fullname" in obj &&
		"shortname" in obj &&
		"number" in obj &&
		"name" in obj &&
		"address" in obj &&
		"lat" in obj &&
		"lon" in obj &&
		"seats" in obj &&
		"type" in obj &&
		"furniture" in obj &&
		"href" in obj
	);
}

export async function processBuildingInfo(indexDoc: any): Promise<Building[]> {
	const buildings: Building[] = [];
	const effectiveCellNumber = 3;

	const tables = findNodesByTagName(indexDoc, "table");
	const buildingTable = findValidBuildingTable(tables);

	const buildingRows = findNodesByTagName(buildingTable, "tr");
	for (const building of buildingRows) {
		const cells = findNodesByTagName(building, "td");
		if (cells.length < effectiveCellNumber) continue;

		const nameTD = findTdByClassKey(cells, "title");
		if (!nameTD) continue;
		const nameNode = findNodesByTagName(nameTD, "a")[0];
		const fullName = getTextContent(nameNode).trim();

		const codeNode = findTdByClassKey(cells, "field-building-code");
		if (!codeNode) continue;
		const shortName = getTextContent(codeNode).trim();
		let href = nameNode ? (getAttr(nameNode, "href") ?? "") : "";
		if (!href.includes(`${shortName}.htm`)) continue;
		href = href.replace(/^\.\//, "");

		const addrNode = findTdByClassKey(cells, "field-building-address");
		if (!addrNode) continue;
		const address = getTextContent(addrNode).trim();

		buildings.push({ fullName, shortName, address, href, geo: { lat: 0, lon: 0 }, rooms: [] });
	}

	const geoResponses = await Promise.all(buildings.map(async (b) => getGeoLocation(b.address)));
	buildings.forEach((b, i) => (b.geo = geoResponses[i]));

	return buildings;
}

export function findValidBuildingTable(tables: any[]): any {
	for (const table of tables) {
		const tds = findNodesByTagName(table, "td");
		for (const td of tds) {
			const classAttr = getAttr(td, "class");
			if (
				classAttr?.includes("views-field-title") ||
				classAttr?.includes("views-field-field-building-code") ||
				classAttr?.includes("views-field-field-building-address")
			) {
				return table;
			}
		}
	}
	throw new InsightError("No valid building table found in index.htm");
}

export function findValidRoomTable(tables: any[]): any | undefined {
	for (const table of tables) {
		const tds = findNodesByTagName(table, "td");
		for (const td of tds) {
			const classAttr = getAttr(td, "class");
			if (
				classAttr?.includes("views-field-field-room-number") ||
				classAttr?.includes("views-field-field-room-capacity") ||
				classAttr?.includes("views-field-field-room-furniture") ||
				classAttr?.includes("views-field-field-room-type")
			) {
				return table;
			}
		}
	}
	return undefined;
}

export function findNodesByTagName(node: any, tagName: string): any[] {
	const result = [];

	if (node.nodeName === tagName) {
		result.push(node);
	}

	if (node.childNodes && Array.isArray(node.childNodes)) {
		for (const child of node.childNodes) {
			result.push(...findNodesByTagName(child, tagName));
		}
	}

	return result;
}

export function findTdByClassKey(cells: any[], keyword: string): any | undefined {
	return cells.find((cell) => cell.attrs?.some((attr: any) => attr.name === "class" && attr.value.includes(keyword)));
}

export function getAttr(node: any, name: string): string | undefined {
	return node.attrs?.find((attr: any) => attr.name === name)?.value;
}

export function getTextContent(node: any): string {
	if (!node.childNodes) return "";
	return node.childNodes
		.map((child: any) => (child.nodeName === "#text" ? child.value : getTextContent(child)))
		.join("");
}

export async function getGeoLocation(address: string): Promise<GeoResponse> {
	const encoded = encodeURIComponent(address);
	const url = `http://cs310.students.cs.ubc.ca:11316/api/v1/project_team031/${encoded}`;
	const response = await fetch(url);
	if (!response.ok) throw new InsightError("Failed to get geolocation");
	const json = await response.json();
	return { lat: json.lat, lon: json.lon };
}
