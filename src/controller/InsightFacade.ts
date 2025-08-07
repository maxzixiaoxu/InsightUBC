import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
	ResultTooLargeError,
} from "./IInsightFacade";
import JSZip from "jszip";
import * as fs from "fs-extra";
import { promises as fsp } from "fs";
import * as path from "path";
import { Section, processSectionDataset, isSection } from "./Section";
import { Room, processRoomDataset, isRoom } from "./Room";
import {
	projectColumns,
	sortResult,
	checkKeyValidity,
	checkKeyValidityCol,
	filterData,
	transform,
	extractApplyKeys,
	checkSortKeyValidity,
	extractId,
	checkApplyFields,
} from "./DataProcessor";
import { Query, validateQueryStructure } from "./Query";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */

export default class InsightFacade implements IInsightFacade {
	private dataDir = "./data";
	private datasets: Map<string, Section[] | Room[]>;

	constructor() {
		this.datasets = new Map();
	}

	private async directoryExists(dir: string): Promise<boolean> {
		const exists = await fs.pathExists(dir);
		return exists;
	}

	private checkIdAndKindValidity(id: string, kind: InsightDatasetKind): void {
		if (this.has_(id)) {
			throw new InsightError("Invalid Dataset Id: Has _");
		} else if (this.onlyWhiteSpace(id)) {
			throw new InsightError("Invalid Dataset Id: Only whitespace");
		} else if (this.idAlreadyExists(id)) {
			throw new InsightError("Same id already added");
		} else if (kind !== InsightDatasetKind.Sections && kind !== InsightDatasetKind.Rooms) {
			throw new InsightError("Unsupported dataset kind.");
		}
	}

	private async checkIfInDisk(id: string): Promise<void> {
		if (await this.directoryExists(this.dataDir)) {
			const files = await this.listFilesRecursive(this.dataDir);
			for (const file of files) {
				if (file.split(".")[0] === id) {
					throw new InsightError("Same id already added");
				}
			}
		}
	}

	private has_(id: string): boolean {
		return id.includes("_");
	}

	private onlyWhiteSpace(id: string): boolean {
		return id.trim() === "";
	}

	private idAlreadyExists(id: string): boolean {
		return Array.from(this.datasets.keys()).includes(id);
	}

	private isBase64Zip(base64Str: string): boolean {
		try {
			if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64Str)) return false;

			const binary = atob(base64Str);
			const bytes = new Uint8Array(binary.length);
			for (let i = 0; i < binary.length; i++) {
				bytes[i] = binary.charCodeAt(i);
			}

			const sig1 = 0x50;
			const sig2 = 0x4b;
			return bytes[0] === sig1 && bytes[1] === sig2;
		} catch {
			return false;
		}
	}

	private async listFilesRecursive(dirPath: string): Promise<string[]> {
		const list = await fsp.readdir(dirPath);
		const tasks = list.map(async (file) => {
			const filePath = path.join(dirPath, file);
			const stat = await fsp.stat(filePath);

			if (stat.isDirectory()) {
				return this.listFilesRecursive(filePath);
			} else {
				return [file];
			}
		});

		const results = await Promise.all(tasks);
		return results.flat();
	}

	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		this.checkIdAndKindValidity(id, kind);
		await this.checkIfInDisk(id);

		if (!this.isBase64Zip(content)) throw new InsightError("Not base64 zip");

		const zip = new JSZip();
		let courseKind: Section[] | Room[] = [];
		await zip.loadAsync(content, { base64: true });
		if (kind === InsightDatasetKind.Sections) {
			courseKind = await processSectionDataset(zip);
		} else if (kind === InsightDatasetKind.Rooms) {
			courseKind = await processRoomDataset(zip);
		}

		await fs.ensureDir(this.dataDir);
		await fs.writeJSON(path.join(this.dataDir, `${id}.json`), courseKind);
		//console.log(courseKind);
		this.datasets.set(id, courseKind);

		return Array.from(this.datasets.keys());
	}

	public async removeDataset(id: string): Promise<string> {
		if (this.has_(id)) throw new InsightError("Invalid Dataset Id: Has _");
		else if (this.onlyWhiteSpace(id)) throw new InsightError("Invalid Dataset Id: Only whitespace");

		const filePath = path.join(this.dataDir, `${id}.json`);
		const existsOnDisk = await fs.pathExists(filePath);
		const existsInMemory = this.datasets.has(id);

		if (!existsOnDisk && !existsInMemory) throw new NotFoundError("Dataset not found");

		if (existsInMemory) this.datasets.delete(id);

		if (existsOnDisk) await fs.remove(filePath);

		return id;
	}

	private extractDatasetId(query: any): string {
		const columns = query.OPTIONS?.COLUMNS;
		if (!Array.isArray(columns) || columns.length === 0) throw new InsightError("COLUMNS must be a non-empty array");

		let hasId = false;
		for (let i = 0; i < columns.length; i++) {
			if (columns[i].includes("_")) {
				hasId = true;
				const tempID = columns[i];
				columns[i] = columns[0];
				columns[0] = tempID;
				break;
			}
		}
		if (hasId) {
			let ids = columns.map((col: string) => (col.includes("_") ? col.split("_")[0] : ""));

			const uniqueIds = new Set(ids);
			uniqueIds.add("");
			ids = ids.filter((item) => item !== "");
			if (uniqueIds.size !== 2) throw new InsightError("All keys must use the same dataset id");
			return ids[0];
		} else {
			if (!query.TRANSFORMATIONS) {
				throw new InsightError("Dataset ID cannot be found");
			} else if (!query.TRANSFORMATIONS.APPLY) {
				throw new InsightError("Dataset ID cannot be found");
			} else {
				const obj = query.TRANSFORMATIONS.APPLY[0];
				const outer = Object.keys(obj)[0];
				const innerObj = obj[outer];
				const innerKey = Object.keys(innerObj)[0];
				const id = innerObj[innerKey].split("_")[0];

				return id;
			}
		}
	}

	public async performQuery(query: unknown): Promise<InsightResult[]> {
		validateQueryStructure(query);

		const datasetId = this.extractDatasetId(query);

		if (await this.directoryExists(this.dataDir)) {
			const files = await this.listFilesRecursive(this.dataDir);
			const match = files.find((file) => file.split(".")[0] === datasetId);
			if (match) this.datasets.set(datasetId, await this.lazyLoad(match));
		}

		const dataset = this.datasets.get(datasetId);
		if (!dataset) throw new InsightError("Dataset not found");

		const validQuery = query as Query;

		const columns = validQuery.OPTIONS?.COLUMNS;
		if (!validQuery.TRANSFORMATIONS) {
			columns.map((col: string) => checkKeyValidity(col, datasetId));
		} else {
			const group = validQuery.TRANSFORMATIONS.GROUP;
			if (!group.every((key: string) => extractId(key) === datasetId))
				throw new InsightError("More than one dataset referenced");

			const aks = extractApplyKeys(validQuery.TRANSFORMATIONS.APPLY);
			checkApplyFields(validQuery.TRANSFORMATIONS.APPLY, datasetId);
			columns.map((col: string) => checkKeyValidityCol(col, datasetId, group, aks));
		}

		let filtered = filterData(validQuery.WHERE, dataset, datasetId);

		if (validQuery.TRANSFORMATIONS) {
			filtered = transform(filtered, validQuery.TRANSFORMATIONS, datasetId);
		}
		const maxResults = 5000;

		if (filtered.length > maxResults) throw new ResultTooLargeError("Result too large");

		const result = projectColumns(filtered, validQuery.OPTIONS.COLUMNS);

		if (validQuery.OPTIONS.ORDER) {
			checkSortKeyValidity(validQuery.OPTIONS.ORDER, validQuery.OPTIONS.COLUMNS);
			sortResult(result, validQuery.OPTIONS.ORDER);
		}

		return result;
	}

	private async lazyLoad(id: string): Promise<Section[] | Room[]> {
		let data;
		try {
			data = await fs.readJson(path.join(this.dataDir, `${id}`));
		} catch {
			throw new InsightError("Failed load");
		}

		if (!Array.isArray(data)) throw new InsightError("Invalid data format: expected an array of sections");

		if (isRoom(data[0])) {
			return data as Room[];
		} else if (isSection(data[0])) {
			return data as Section[];
		} else {
			throw new InsightError("Data is neither Section[] nor Room[]");
		}
	}

	public async listDatasets(): Promise<InsightDataset[]> {
		const datasetList: InsightDataset[] = [];

		const idArray = Array.from(this.datasets.keys());
		if (await this.directoryExists(this.dataDir)) {
			const files = await this.listFilesRecursive(this.dataDir);
			const loadFiles = files.filter((file) => !idArray.includes(file.split(".")[0]));
			const lazyLoadPromises = loadFiles.map(async (file) => this.lazyLoad(file));
			const loadedDatasets = await Promise.all(lazyLoadPromises);
			for (let i = 0; i < loadFiles.length; i++) {
				const id = loadFiles[i].split(".")[0];
				this.datasets.set(id, loadedDatasets[i]);
			}
		}

		for (const [key, value] of this.datasets.entries()) {
			let insightDataset;
			if (isRoom(value[0])) {
				insightDataset = { id: key, kind: InsightDatasetKind.Rooms, numRows: value.length };
			} else if (isSection(value[0])) {
				insightDataset = { id: key, kind: InsightDatasetKind.Sections, numRows: value.length };
			} else {
				throw new InsightError("Data is neither Section[] nor Room[]");
			}
			datasetList.push(insightDataset);
		}

		return datasetList;
	}
}
