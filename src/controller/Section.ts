import JSZip from "jszip";
import { InsightError } from "./IInsightFacade";

export interface Section {
	uuid: string;
	id: string;
	title: string;
	instructor: string;
	dept: string;
	year: number;
	avg: number;
	pass: number;
	fail: number;
	audit: number;
}

export function parseSection(fields: any): Section {
	const ifOverall = 1900;

	return {
		uuid: String(fields.id),
		id: fields.Course,
		title: fields.Title,
		instructor: fields.Professor,
		dept: fields.Subject,
		year: fields.Section === "overall" ? ifOverall : Number(fields.Year),
		avg: fields.Avg,
		pass: fields.Pass,
		fail: fields.Fail,
		audit: fields.Audit,
	};
}

export function isValidSection(fields: any): boolean {
	return (
		fields &&
		typeof fields === "object" &&
		typeof fields.id === "number" &&
		typeof fields.Course === "string" &&
		typeof fields.Title === "string" &&
		typeof fields.Professor === "string" &&
		typeof fields.Subject === "string" &&
		typeof fields.Year === "string" &&
		typeof fields.Avg === "number" &&
		typeof fields.Pass === "number" &&
		typeof fields.Fail === "number" &&
		typeof fields.Audit === "number"
	);
}

export function isSection(obj: any): obj is Section {
	return (
		typeof obj === "object" &&
		obj !== null &&
		"uuid" in obj &&
		"id" in obj &&
		"title" in obj &&
		"instructor" in obj &&
		"dept" in obj &&
		"year" in obj &&
		"avg" in obj &&
		"pass" in obj &&
		"fail" in obj &&
		"audit" in obj
	);
}

export async function processSectionDataset(zip: JSZip): Promise<Section[]> {
	const courseSections: Section[] = [];

	const hasCoursesFolder = Object.keys(zip.files).some((key) => key.startsWith("courses/") && !key.endsWith("/"));

	if (!hasCoursesFolder) throw new InsightError("Missing 'courses' folder in zip");

	const folder = zip.folder("courses"); // took a year to figure out test zips are incorrect
	if (!folder) throw new Error("Missing 'courses' folder in zip"); // Actual check

	let files = Object.keys(folder.files);

	files = files.filter((item) => item !== "courses/");
	if (files.length === 0) throw new Error("No files found in 'courses' folder");

	const fileContents = await Promise.all(files.map(async (filename) => zip.file(filename)?.async("text")));

	for (const text of fileContents) {
		if (!text) {
			continue;
		}

		try {
			const data = JSON.parse(text);
			if (!Array.isArray(data.result)) continue;

			for (const fields of data.result) {
				if (isValidSection(fields)) {
					courseSections.push(parseSection(fields));
				}
			}
		} catch {}
	}

	return courseSections;
}
