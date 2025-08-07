import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
} from "../../src/controller/IInsightFacade";
import InsightFacade from "../../src/controller/InsightFacade";
import { clearDisk, getContentFromArchives, loadTestQuery } from "../TestUtil";

import { expect, use } from "chai";
import chaiAsPromised from "chai-as-promised";
import { getGeoLocation } from "../../src/controller/Room";

use(chaiAsPromised);

export interface ITestQuery {
	title?: string;
	input: unknown;
	errorExpected: boolean;
	expected: any;
}

describe("InsightFacade", function () {
	//let facade: IInsightFacade;

	//Declare datasets used in tests. You should add more datasets like this!
	//let sections: string;

	describe("AddDataset", function () {
		let facade: IInsightFacade;
		let sections: string;
		let section1: string;
		let section2: string;
		//let section3: string;
		//let section4: string;
		let section5: string;
		//let empty: string;
		let campus: string;
		let campus1: string;
		let campus2: string;
		let campus3: string;
		let campus4: string;

		before(async function () {
			// This block runs once and loads the datasets.
			//empty = await getContentFromArchives("empty.zip");
			sections = await getContentFromArchives("pair.zip");
			section1 = await getContentFromArchives("one_invalid_course.zip");
			section2 = await getContentFromArchives("one_broken_invalid_course.zip");
			//section3 = await getContentFromArchives("no_valid_section.zip");
			//section4 = await getContentFromArchives("one_valid_course.zip");
			section5 = await getContentFromArchives("not_in_result_key.zip");
			campus = await getContentFromArchives("campus.zip");
			campus1 = await getContentFromArchives("campus_miss_build_file_href.zip");
			campus2 = await getContentFromArchives("campus_miss_build_file.zip");
			campus3 = await getContentFromArchives("campus_with_4col_buildtable.zip");
			campus4 = await getContentFromArchives("campus_room_missing_col.zip");
		});

		beforeEach(async function () {
			// Just in case there is anything hanging around from a previous run of the test suite
			await clearDisk();
			facade = new InsightFacade();
		});

		// it("should reject with non-base64 string", async function () {
		// 	const ts = "ts";
		// 	try {
		// 		await facade.addDataset("test", ts, InsightDatasetKind.Sections);
		// 		expect.fail("Should have thrown!");
		// 	} catch (err) {
		// 		expect(err).to.be.an.instanceOf(InsightError);
		// 	}
		// });

		// it("should reject with no valid sections", async function () {
		// 	try {
		// 		await facade.addDataset("sec3", section3, InsightDatasetKind.Sections);
		// 		expect.fail("Should have thrown!");
		// 	} catch (err) {
		// 		expect(err).to.be.an.instanceOf(InsightError);
		// 	}
		// });

		// it("should reject with no valid sections", async function () {
		// 	try {
		// 		await facade.addDataset("sec3", section3, InsightDatasetKind.Sections);
		// 		expect.fail("Should have thrown!");
		// 	} catch (err) {
		// 		expect(err).to.be.an.instanceOf(InsightError);
		// 	}
		// });

		// it("should reject with empty zip", async function () {
		// 	try {
		// 		await facade.addDataset("empty", empty, InsightDatasetKind.Sections);
		// 		expect.fail("Should have thrown!");
		// 	} catch (err) {
		// 		expect(err).to.be.an.instanceOf(InsightError);
		// 	}
		// });

		it("should reject with invalid folder location", async function () {
			try {
				await facade.addDataset("sec1", section1, InsightDatasetKind.Sections);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.an.instanceOf(InsightError);
			}
		});

		it("should reject with invalid file", async function () {
			try {
				await facade.addDataset("sec2", section2, InsightDatasetKind.Sections);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.an.instanceOf(InsightError);
			}
		});

		it("should reject with valid section not in result key", async function () {
			try {
				await facade.addDataset("sec5", section5, InsightDatasetKind.Sections);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.an.instanceOf(InsightError);
			}
		});

		it("should reject with an empty dataset id", async function () {
			try {
				await facade.addDataset("", sections, InsightDatasetKind.Sections);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.an.instanceOf(InsightError);
			}
		});

		it("should reject with underscore invalid id", async function () {
			try {
				await facade.addDataset("u_bc", sections, InsightDatasetKind.Sections);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.an.instanceOf(InsightError);
			}
		});

		it("should reject with whitespace invalid id", async function () {
			try {
				await facade.addDataset("  ", sections, InsightDatasetKind.Sections);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.an.instanceOf(InsightError);
			}
		});

		it("should reject an already added dataset id", async function () {
			await facade.addDataset("ubc", sections, InsightDatasetKind.Sections);
			try {
				await facade.addDataset("ubc", sections, InsightDatasetKind.Sections);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.an.instanceOf(InsightError);
			}

			const listed = await facade.listDatasets();
			const list: InsightDataset[] = [{ id: "ubc", kind: InsightDatasetKind.Sections, numRows: 64612 }];
			expect(listed).to.deep.eq(list);
		});

		// it("should reject invalid kind arg", async function () {
		// 	try {
		// 		await facade.addDataset("ubc", sections, InsightDatasetKind.Rooms);
		// 		expect.fail("Should have thrown!");
		// 	} catch (err) {
		// 		expect(err).to.be.an.instanceOf(InsightError);
		// 	}
		// });

		// it("should successfully add with counter-intuitive file", async function () {
		// 	const result = await facade.addDataset("ci", section4, InsightDatasetKind.Sections);
		// 	expect(result).to.have.members(["ci"]);
		// });

		it("should successfully add a dataset with kind sections", async function () {
			const result = await facade.addDataset("ubc", sections, InsightDatasetKind.Sections);
			expect(result).to.have.members(["ubc"]);

			//const filePath = path.join(dataDir, "ubc.json");
			//const existsOnDisk = await fs.pathExists(filePath);
			//const existsInMemory = this.datasets.has("ubc");
			//console.log(existsOnDisk);
			//console.log(existsInMemory);
		});

		it("should successfully add a dataset with kind rooms", async function () {
			const result = await facade.addDataset("campus", campus, InsightDatasetKind.Rooms);
			expect(result).to.have.members(["campus"]);
		});

		it("should add a room dataset with missing building file href", async function () {
			const result = await facade.addDataset("campus1", campus1, InsightDatasetKind.Rooms);
			expect(result).to.have.members(["campus1"]);
		});

		it("should add a room dataset with missing building file", async function () {
			const result = await facade.addDataset("campus2", campus2, InsightDatasetKind.Rooms);
			expect(result).to.have.members(["campus2"]);
		});

		it("should add a room dataset whose room table has only 4 column in building file", async function () {
			const result = await facade.addDataset("campus3", campus3, InsightDatasetKind.Rooms);
			expect(result).to.have.members(["campus3"]);
		});

		it("should add a room dataset while skipping rooms that have missing columns", async function () {
			const result = await facade.addDataset("campus4", campus4, InsightDatasetKind.Rooms);
			expect(result).to.have.members(["campus4"]);
		});

		it("should reject invalid content input", async function () {
			// Valid content: base64 content of the dataset; Should be in the form of a serialized zip file.
			try {
				await facade.addDataset("insightUbc", "sections", InsightDatasetKind.Sections);
				expect.fail("Invalid content input: should have thrown an error.");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});

		it("should add dataset persistently into disk", async function () {
			await facade.addDataset("insightUbc", sections, InsightDatasetKind.Sections);

			const testInstance = new InsightFacade();
			const result = await testInstance.listDatasets();
			expect(result[0].id).to.equal("insightUbc");
		});
	});

	describe("RemoveDataSet", function () {
		let facade: IInsightFacade;
		//let sections: string;
		let section1: string;

		before(async function () {
			// This block runs once and loads the datasets.
			//sections = await getContentFromArchives("pair.zip");
			section1 = await getContentFromArchives("pair.zip");
			// section2 = await getContentFromArchives("two_courses.zip");
		});

		beforeEach(async function () {
			// Just in case there is anything hanging around from a previous run of the test suite
			await clearDisk();
			facade = new InsightFacade();
		});

		it("should not have dataset if removed", async function () {
			await facade.addDataset("sec1", section1, InsightDatasetKind.Sections);

			await facade.removeDataset("sec1");
			//expect(result).to.equal("sec1");
			const listed = await facade.listDatasets();
			const list: InsightDataset[] = [];
			expect(listed).to.deep.eq(list);
		});

		it("should reject remove with empty dataset id", async function () {
			await facade.addDataset("sec1", section1, InsightDatasetKind.Sections);
			try {
				await facade.removeDataset("");
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.an.instanceOf(InsightError);
			}
		});
		//
		// it("should reject remove with underscore invalid id", async function () {
		// 	await facade.addDataset("sec1", section1, InsightDatasetKind.Sections);
		// 	try {
		// 		await facade.removeDataset("u_bc");
		// 		expect.fail("Should have thrown!");
		// 	} catch (err) {
		// 		expect(err).to.be.an.instanceOf(InsightError);
		// 	}
		// });
		//
		// it("should reject remove with whitespace invalid id", async function () {
		// 	await facade.addDataset("sec1", section1, InsightDatasetKind.Sections);
		// 	try {
		// 		await facade.removeDataset("  ");
		// 		expect.fail("Should have thrown!");
		// 	} catch (err) {
		// 		expect(err).to.be.an.instanceOf(InsightError);
		// 	}
		// });
		//
		it("should reject when attempting to remove dataset that hasn't been added", async function () {
			try {
				await facade.removeDataset("ubc");
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.an.instanceOf(NotFoundError);
			}
		});
	});

	describe("ListDataSet", function () {
		let facade: IInsightFacade;
		let sections: string;
		let rooms: string;

		before(async function () {
			// This block runs once and loads the datasets.
			sections = await getContentFromArchives("pair.zip");
			rooms = await getContentFromArchives("campus.zip");
			// section1 = await getContentFromArchives("one_course.zip");
			// section2 = await getContentFromArchives("two_courses.zip");
		});

		beforeEach(async function () {
			// Just in case there is anything hanging around from a previous run of the test suite
			await clearDisk();
			facade = new InsightFacade();
		});

		it("should list datasets", async function () {
			await facade.addDataset("ubc", sections, InsightDatasetKind.Sections);

			//let result: InsightDataset[]; // dummy value before being reassigned
			const result = await facade.listDatasets();
			//console.log(result);
			const list: InsightDataset[] = [{ id: "ubc", kind: InsightDatasetKind.Sections, numRows: 64612 }];

			expect(result).to.deep.eq(list);
		});

		it("should list nothing if there are no datasets", async function () {
			//let result: InsightDataset[]; // dummy value before being reassigned
			const result = await facade.listDatasets();
			const list: InsightDataset[] = [];

			expect(result).to.deep.eq(list);
		});

		// When user creates a new instance of InsightFacade, they should be able to query the datasets existing on disk.
		// This test is reminded by GPT.
		it("should persist datasets existing on disk", async function () {
			await facade.addDataset("insightUbc", sections, InsightDatasetKind.Sections);
			// Create another Instance
			await facade.addDataset("rooms", rooms, InsightDatasetKind.Rooms);
			const testInstance = new InsightFacade();
			const datasets = await testInstance.listDatasets();
			expect(datasets).to.be.an("array").with.lengthOf(2);
			expect(datasets[0].id).to.equal("insightUbc");
		});

		it("should list room datasets", async function () {
			//let result: InsightDataset[]; // dummy value before being reassigned

			await facade.addDataset("rooms", rooms, InsightDatasetKind.Rooms);
			const result = await facade.listDatasets();
			//console.log(result);
			const list: InsightDataset[] = [{ id: "rooms", kind: InsightDatasetKind.Rooms, numRows: 364 }];

			expect(result).to.deep.eq(list);
		});

		it("should list both datasets", async function () {
			//let result: InsightDataset[]; // dummy value before being reassigned
			await facade.addDataset("ubc", sections, InsightDatasetKind.Sections);
			await facade.addDataset("rooms", rooms, InsightDatasetKind.Rooms);
			const result = await facade.listDatasets();
			//console.log(result);
			const list: InsightDataset[] = [
				{ id: "ubc", kind: InsightDatasetKind.Sections, numRows: 64612 },
				{ id: "rooms", kind: InsightDatasetKind.Rooms, numRows: 364 },
			];

			expect(result).to.deep.eq(list);
		});
	});

	describe("getGeoLocation", function () {
		it("should get geolocation for a known address", async function () {
			const geo = await getGeoLocation("2211 Wesbrook Mall");
			//console.log("Geolocation result:", geo);
			expect(geo.lat).to.be.a("number");
			expect(geo.lon).to.be.a("number");
		});

		it("should get an error when trying to getGeoLocation for a bad address", async function () {
			try {
				await getGeoLocation("0000 Doesnotexist Street");
				expect.fail("Should throw an error for bad address.");
			} catch (err) {
				expect(err).to.be.instanceof(InsightError);
			}
		});
	});

	// check if query is an object type
	describe("PerformQuery", function () {
		let facade: IInsightFacade;
		let sections: string;
		let rooms: string;
		//let section1: string;
		/**
		 * Loads the TestQuery specified in the test name and asserts the behaviour of performQuery.
		 *
		 * Note: the 'this' parameter is automatically set by Mocha and contains information about the test.
		 */
		async function checkQuery(this: Mocha.Context): Promise<void> {
			if (!this.test) {
				throw new Error(
					"Invalid call to checkQuery." +
						"Usage: 'checkQuery' must be passed as the second parameter of Mocha's it(..) function." +
						"Do not invoke the function directly."
				);
			}
			// Destructuring assignment to reduce property accesses
			const { input, expected, errorExpected } = await loadTestQuery(this.test.title);
			let result: InsightResult[] = []; // dummy value before being reassigned
			try {
				result = await facade.performQuery(input);
			} catch (err) {
				if (!errorExpected) {
					expect.fail(`performQuery threw unexpected error: ${err}`);
				}
				// replace this failing assertion with your assertions. You will need to reason about the code in this function
				// to determine what to put here :)
				if (err instanceof Error) {
					expect(err.constructor.name).to.eq(expected);
				} else {
					expect.fail("Thrown value was not an Error instance");
				}
				return;
			}
			if (errorExpected) {
				expect.fail(`performQuery resolved when it should have rejected with ${expected}`);
			}

			const sortedres = [...result].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
			const sortedexp = [...expected].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
			expect(sortedres).to.deep.eq(sortedexp);
			//expect(result).to.deep.eq(expected);
		}

		/**
		 * Loads the TestQuery specified in the test name and asserts the behaviour of performQuery.
		 *
		 * Note: the 'this' parameter is automatically set by Mocha and contains information about the test.
		 */
		async function checkQueryNO(this: Mocha.Context): Promise<void> {
			if (!this.test) {
				throw new Error(
					"Invalid call to checkQuery." +
						"Usage: 'checkQuery' must be passed as the second parameter of Mocha's it(..) function." +
						"Do not invoke the function directly."
				);
			}
			// Destructuring assignment to reduce property accesses
			const { input, expected, errorExpected } = await loadTestQuery(this.test.title);
			let result: InsightResult[] = []; // dummy value before being reassigned
			try {
				result = await facade.performQuery(input);
			} catch (err) {
				if (!errorExpected) {
					expect.fail(`performQuery threw unexpected error: ${err}`);
				}
				// replace this failing assertion with your assertions. You will need to reason about the code in this function
				// to determine what to put here :)
				if (err instanceof Error) {
					expect(err.constructor.name).to.eq(expected);
				} else {
					expect.fail("Thrown value was not an Error instance");
				}
				return;
			}
			if (errorExpected) {
				expect.fail(`performQuery resolved when it should have rejected with ${expected}`);
			}

			const sortedres = [...result].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
			const sortedexp = [...expected].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
			expect(sortedres).to.deep.eq(sortedexp);
		}

		before(async function () {
			await clearDisk();
			facade = new InsightFacade();

			sections = await getContentFromArchives("pair.zip");
			rooms = await getContentFromArchives("campus.zip");
			//section1 = await getContentFromArchives("one_course.zip");
			// Add the datasets to InsightFacade once.
			// Will *fail* if there is a problem reading ANY dataset.
			const loadDatasetPromises: Promise<string[]>[] = [
				facade.addDataset("sections", sections, InsightDatasetKind.Sections),
				facade.addDataset("rooms", rooms, InsightDatasetKind.Rooms),
			];

			try {
				await Promise.all(loadDatasetPromises);
			} catch (err) {
				throw new Error(`In PerformQuery Before hook, dataset(s) failed to be added. \n${err}`);
			}
		});

		after(async function () {
			await clearDisk();
		});

		it("should reject when query is not an object", async function () {
			try {
				await facade.performQuery(1);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.an.instanceOf(InsightError);
			}
		});

		// The year in which the section was run. Set to 1900 when Section = overall.
		//
		// Examples demonstrating how to test performQuery using the JSON Test Queries.
		// The relative path to the query file must be given in square brackets.
		it("[valid/simple.json] SELECT dept, avg WHERE avg > 97", checkQuery);
		it("[invalid/invalid.json] Query missing WHERE", checkQuery);
		it("[valid/complex.json] SELECT dept, id, avg, WHERE avg = 95 OR (dept = adhe AND avg > 90)", checkQuery);
		it("[invalid/tooLarge.json] Query result over 5000", checkQuery);
		it("[valid/queryResultEqual5000.json] Query result equal 5000", checkQuery);
		it("[valid/wildcardc1.json] wildcardc1", checkQuery);
		it("[valid/wildcardc2.json] wildcardc2", checkQuery);
		it("[valid/wildcardc3.json] wildcardc3", checkQuery);
		it("[valid/wildcardc4.json] wildcardc4", checkQuery);
		it("[invalid/invalidAsterisk.json] invalid asterisk", checkQuery);
		it("[invalid/referencesNone.json] References none", checkQuery);
		it("[invalid/referencesMoreThanOne.json] References more than one", checkQuery);
		it("[invalid/referencesMissing.json] References missing", checkQuery);
		it("[invalid/incorrectFormat.json] Incorrect Format", checkQuery);
		it("[invalid/invalidKeyFormat.json] Invalid key format", checkQuery);
		it("[invalid/invalidValueType.json] Invalid Value Type", checkQuery);
		it("[valid/notOperator.json] Not Operator", checkQuery);
		it("[valid/noWhere.json] No Where", checkQuery);
		it("[valid/andAndNested.json] And and nested", checkQuery);
		it("[valid/aNDORNested.json] And or nested", checkQuery);
		it("[valid/emptyInputstring.json] Empty inputstring", checkQuery);
		it("[valid/orOrNested.json] Or or nested", checkQuery);
		it("[invalid/noCols.json] No Cols", checkQuery);
		it("[invalid/noUnderscore.json] No underscore", checkQuery);
		//it("[invalid/orderKeyNotInCol.json] Order key not in col", checkQuery);
		it("[invalid/underscoreIdstring.json] Underscore idstring", checkQuery);
		it("[invalid/underscoreOnly.json] Underscore only", checkQuery);
		it("[invalid/asteriskInputstring.json] Asterisk inputstring", checkQuery);

		it("[valid/allCols.json] All Cols", checkQueryNO);
		it("[valid/noOrder.json] No Order", checkQueryNO);
		it("[valid/simpleRooms.json] Simple rooms", checkQueryNO);
		it("[valid/complexRooms.json] Complex rooms", checkQueryNO);
		it("[valid/simpleAggregation.json] Simple Aggregation", checkQueryNO);
		it("[valid/roomsQuery.json] Rooms Query", checkQuery);
		it("[valid/roomsQueryNoDirection.json] Rooms Query ND", checkQuery);
		it("[valid/findId.json] find Id", checkQuery);
	});
});
