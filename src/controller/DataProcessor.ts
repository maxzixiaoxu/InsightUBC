import Decimal from "decimal.js";

import { InsightError, InsightResult } from "./IInsightFacade";
import { isSection, Section } from "./Section";
import { isRoom, Room } from "./Room";
import { ApplyRule } from "./Query";

export function compare(fieldValue: number, target: any, op: string): boolean {
	switch (op) {
		case "GT":
			return fieldValue > target;
		case "LT":
			return fieldValue < target;
		case "EQ":
			return fieldValue === target;
		default:
			throw new InsightError("Invalid comparator");
	}
}

export function matchString(value: string, pattern: any): boolean {
	if (!/^$|^\*?[^*]*\*?$/.test(pattern)) throw new InsightError("'*' cannot be in the middle");

	const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
	return regex.test(value);
}

export function projectColumns<T extends Section | Room | { [key: string]: string | number }>(
	data: T[],
	columns: string[]
): InsightResult[] {
	const result: InsightResult[] = [];

	for (const item of data) {
		const tempInsightResult: InsightResult = {};

		for (const col of columns) {
			if (col in item) {
				const value = item[col as keyof T];
				if (typeof value === "string" || typeof value === "number") {
					tempInsightResult[col] = value;
				} else {
					tempInsightResult[col] = "";
				}
			} else {
				const key = extractField(col);
				const value = item[key as keyof T];
				if (typeof value === "string" || typeof value === "number") {
					tempInsightResult[col] = value;
				} else {
					tempInsightResult[col] = "";
				}
			}
		}
		result.push(tempInsightResult);
	}

	return result;
}

export function checkSortKeyValidity(order: any, columns: any): void {
	let sortKeys: string[] = [];

	if (typeof order === "string") {
		sortKeys = [order];
	}

	if (typeof order === "object" && order.keys) {
		sortKeys = order.keys;
	}
	const subset = sortKeys;
	const superset = columns;
	if (!subset.every((item) => superset.includes(item))) {
	}
}

export function sortResult(results: any[], order: any): any[] {
	if (typeof order === "string") {
		const key = order;
		return results.sort((a, b) => {
			if (a[key] < b[key]) return -1;
			if (a[key] > b[key]) return 1;
			return 0;
		});
	}

	if (typeof order === "object" && order.dir && order.keys) {
		const keys = order.keys;
		const dir = order.dir === "DOWN" ? -1 : 1;
		return results.sort((a, b) => {
			for (const key of keys) {
				if (a[key] < b[key]) return -1 * dir;
				if (a[key] > b[key]) return 1 * dir;
			}
			return 0;
		});
	}

	return results;
}

export function extractId(key: string): string {
	return key.split("_")[0];
}

export function extractField(key: string): string {
	return key.split("_")[1];
}

export function checkKeyValidity(key: string, id: string): void {
	if (1 < key.split("_").length - 1) {
		throw new InsightError("More than 1 '_' in key");
	} else if (1 > key.split("_").length - 1) {
		throw new InsightError("No '_' in key");
	} else if (key[0] === "_" || key[key.length - 1] === "_") {
		throw new InsightError("Missing id or field");
	} else if (extractId(key) !== id) {
		throw new InsightError("More than one dataset referenced");
	}
}

export function checkKeyValidityCol(key: string, id: string, groups: string[], aks: string[]): void {
	if (!groups.includes(key) && !aks.includes(key)) {
		throw new InsightError("Column key does not correspond to group keys or apply keys");
	}
}

export function checkKeyFormat(key: string, filter: any, data: any): void {
	let strings: string[];
	let numbers: string[];
	if (isRoom(data[0])) {
		strings = ["fullname", "shortname", "number", "name", "address", "type", "furniture", "href"];
		numbers = ["lat", "lon", "seats"];
	} else if (isSection(data[0])) {
		strings = ["uuid", "id", "title", "instructor", "dept"];
		numbers = ["year", "avg", "pass", "fail", "audit"];
	} else {
		throw new InsightError("Invalid Data Type");
	}

	if (filter.IS) {
		if (!strings.includes(extractField(key))) {
			throw new InsightError("Invalid key format");
		}
	}

	if (filter.GT || filter.LT || filter.EQ) {
		if (!numbers.includes(extractField(key))) {
			throw new InsightError("Invalid key format");
		}
	}
}

export function filterData(filter: any, data: any[], id: string): any[] {
	if (Object.keys(filter).length === 0) return data; // empty WHERE = all entries

	if (filter.AND) {
		return filter.AND.reduce(
			(acc: any[], f: any) => acc.filter((item: any) => filterData(f, [item], id).length > 0),
			data
		);
	}
	if (filter.OR) {
		const sets = filter.OR.map((f: any) => new Set(filterData(f, data, id)));
		return [...new Set(sets.flatMap((s: any) => [...s]))]; // union of results
	}
	if (filter.NOT) {
		const negated = filterData(filter.NOT, data, id);
		return data.filter((item) => !negated.includes(item));
	}
	if (filter.GT || filter.LT || filter.EQ) {
		const comparator = Object.keys(filter)[0];
		const [key, value] = Object.entries(filter[comparator])[0];
		checkKeyValidity(key, id);
		checkKeyFormat(key, filter, data);
		if (typeof value !== "number") throw new InsightError("Invalid value type");

		return data.filter((item) => compare(item[extractField(key)], value, comparator));
	}
	if (filter.IS) {
		const [key, val] = Object.entries(filter.IS)[0];
		checkKeyValidity(key, id);
		checkKeyFormat(key, filter, data);
		if (typeof val !== "string") throw new InsightError("Invalid value type");

		return data.filter((item) => matchString(item[extractField(key)], val));
	}
	throw new InsightError("Invalid filter");
}

export function groupBy(data: any[], keys: string[]): Map<string, any[]> {
	const map = new Map<string, any[]>();
	for (const row of data) {
		const groupKey = keys.map((k) => row[extractField(k)]).join("|");
		if (!map.has(groupKey)) {
			map.set(groupKey, []);
		}
		map.get(groupKey)!.push(row);
	}
	return map;
}

export function checkValidCalc(applyToken: string, key: string): void {
	const numericKeys = ["lat", "lon", "seats", "year", "avg", "pass", "fail", "audit"];
	if (applyToken === "MAX" || applyToken === "MIN" || applyToken === "AVG" || applyToken === "SUM") {
		if (!numericKeys.includes(extractField(key))) {
			throw new InsightError("Type of calc only valid for numeric keys");
		}
	}
}

function applyTokenOperation(token: string, values: any[]): number {
	switch (token) {
		case "MAX":
			return Math.max(...values);
		case "MIN":
			return Math.min(...values);
		case "AVG":
			return computeAvg(values);
		case "SUM":
			return computeSum(values);
		case "COUNT":
			return new Set(values).size;
		default:
			throw new InsightError(`Unknown apply token: ${token}`);
	}
}

export function applyAggregations(grouped: Map<string, any[]>, applyRules: ApplyRule[], groupKeys: string[]): any[] {
	const results: any[] = [];
	for (const groupRows of grouped.values()) {
		const resultRow: any = {};

		const sample = groupRows[0];
		for (const key of groupKeys) {
			resultRow[key] = sample[extractField(key)];
		}

		for (const rule of applyRules) {
			const applyKey = Object.keys(rule)[0];
			const applyObj = rule[applyKey];

			const applyToken = Object.keys(applyObj)[0];
			const key = applyObj[applyToken];

			const values = groupRows.map((r) => r[extractField(key)]);
			checkValidCalc(applyToken, key);
			resultRow[applyKey] = applyTokenOperation(applyToken, values);
		}
		results.push(resultRow);
	}

	return results;
}

export function computeAvg(values: number[]): number {
	if (values.length === 0) return 0;

	let total = new Decimal(0);

	for (const value of values) {
		total = total.add(new Decimal(value));
	}

	const avg = total.toNumber() / values.length;
	const res = Number(avg.toFixed(2));

	return res;
}

export function computeSum(values: number[]): number {
	if (!values.length) return 0;

	const sum = values.reduce((acc, val) => acc + val, 0);

	const roundedSum = parseFloat(sum.toFixed(2));

	return roundedSum;
}

export function transform(data: any[], transformations: any, id: string): any[] {
	const { GROUP, APPLY } = transformations;

	GROUP.forEach((key: string) => checkKeyValidity(key, id));

	const grouped = groupBy(data, GROUP);

	return applyAggregations(grouped, APPLY, GROUP);
}

function has_(id: string): boolean {
	return id.includes("_");
}

function onlyWhiteSpace(id: string): boolean {
	return id.trim() === "";
}

export function checkApplyFields(data: any, id: string): void {
	const af: string[] = [];

	for (const applyRule of data) {
		const applyKey = Object.keys(applyRule)[0];
		const applyTokenObj = applyRule[applyKey];
		const token = Object.keys(applyTokenObj)[0];
		const field = applyTokenObj[token];
		af.push(field);
	}
	af.map((key: string) => {
		if (extractId(key) !== id) {
			throw new InsightError("More than one dataset referenced");
		}
		return extractId(key);
	});
}

export function extractApplyKeys(data: any): string[] {
	const ak: string[] = [];

	for (const applyRule of data) {
		const applyKey = Object.keys(applyRule)[0];

		if (has_(applyKey)) {
			throw new InsightError("Invalid ApplyKey: Has _");
		} else if (onlyWhiteSpace(applyKey)) {
			throw new InsightError("Invalid ApplyKey: Only whitespace");
		}
		if (ak.includes(applyKey)) {
			throw new InsightError("applykey in APPLYRULE should be unique.");
		}
		ak.push(applyKey);
	}

	return ak;
}
