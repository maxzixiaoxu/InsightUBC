import { InsightError } from "./IInsightFacade";

export interface Query {
	WHERE: any;
	OPTIONS: any;
	TRANSFORMATIONS?: any;
}

export type ApplyRule = {
	[applyKey: string]: {
		[applyToken: string]: string;
	};
};

export function validateQueryStructure(query: any): void {
	if (typeof query !== "object" || query === null) {
		throw new InsightError("Query must be an object");
	}
	if (!query.WHERE || !query.OPTIONS) {
		throw new InsightError("Query must include WHERE and OPTIONS");
	}
	if (query.OPTIONS.ORDER && !query.OPTIONS.COLUMNS) {
		throw new InsightError("Query must include Columns");
	}
	if (query.TRANSFORMATIONS) {
		if (!query.TRANSFORMATIONS.GROUP || !query.TRANSFORMATIONS.APPLY) {
			throw new InsightError("TRANSFORMATIONS must include GROUP and APPLY");
		}
	}
}
