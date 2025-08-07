import { expect } from "chai";
import request from "supertest";
import { StatusCodes } from "http-status-codes";
import { Log } from "@ubccpsc310/project-support";
import Server from "../../src/rest/Server";
import fs from "fs";

describe("Facade C3", function () {
	const SERVER_URL = "http://localhost:4321";
	let server: Server;

	before(async function () {
		const SNUM = 4321;
		server = new Server(SNUM);
		try {
			await server.start();
		} catch (err) {
			Log.error("Failed to start server: " + err);
		}
	});

	after(async function () {
		try {
			await server.stop();
		} catch (err) {
			Log.error("Failed to stop server: " + err);
		}
	});

	it("PUT test for rooms dataset", async function () {
		const ENDPOINT_URL = "/dataset/rooms/rooms";
		const ZIP_FILE_DATA = await fs.promises.readFile("test/resources/archives/campus.zip");

		try {
			const res = await request(SERVER_URL)
				.put(ENDPOINT_URL)
				.send(ZIP_FILE_DATA)
				.set("Content-Type", "application/x-zip-compressed");
			expect(res.status).to.be.equal(StatusCodes.OK);
			expect(res.body.result).to.be.an("array");
		} catch (err) {
			Log.error(err);
			expect.fail();
		}
	});

	it("GET /echo/:msg should echo message", async function () {
		const msg = "testmessage";
		const res = await request(SERVER_URL).get(`/echo/${msg}`);
		expect(res.status).to.equal(StatusCodes.OK);
		expect(res.body).to.deep.equal({ result: `${msg}...${msg}` });
	});

	it("GET /datasets should list datasets", async function () {
		const res = await request(SERVER_URL).get("/datasets");
		expect(res.status).to.equal(StatusCodes.OK);
		expect(res.body.result).to.be.an("array");
	});

	it("POST /query should reject invalid query", async function () {
		const badQuery = { WHERE: {}, OPTIONS: {} }; // incomplete query
		const res = await request(SERVER_URL).post("/query").send(badQuery);
		expect(res.status).to.equal(StatusCodes.BAD_REQUEST);
		expect(res.body.error).to.be.a("string");
	});

	it("DELETE /dataset/courses should remove dataset", async function () {
		const res = await request(SERVER_URL).delete("/dataset/courses");
		expect([StatusCodes.OK, StatusCodes.NOT_FOUND]).to.include(res.status);
	});

	it("DELETE /dataset/nonexistent should return 404", async function () {
		const res = await request(SERVER_URL).delete("/dataset/nonexistent");
		expect(res.status).to.equal(StatusCodes.NOT_FOUND);
		expect(res.body.error).to.be.a("string");
	});
});
