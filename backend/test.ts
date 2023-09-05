import { performance } from "perf_hooks";
import supertest from "supertest";
import { buildApp } from "./app";

const app = supertest(buildApp());

async function basicLatencyTest() {
    await app.post("/reset").expect(204);
    const start = performance.now();
    await app.post("/charge").expect(200);
    await app.post("/charge").expect(200);
    await app.post("/charge").expect(200);
    await app.post("/charge").expect(200);
    await app.post("/charge").expect(200);
    console.log(`Latency: ${performance.now() - start} ms`);
}

async function consistencyTest() {
    await app.post("/reset").expect(204); // reset user balance to 100
    let remainingBalance = 100;

    let request_promises = [];
    for(let i = 0; i < 10; i++) {
        request_promises.push(app.post("/charge"));
    }
    const results = await Promise.all(request_promises);
    for(let result of results) {
        console.log(result.body);
        remainingBalance -= result.body.charges;
    }

    // all the charges made should be consistent with the remaining balance
    await app.post("/charge").expect(200).then(res => {
        console.log(res.body);
        remainingBalance -= res.body.charges;
        if(remainingBalance !== res.body.remainingBalance) {
            throw new Error("Inconsistent balance.");
        }
    });
}

async function runTests() {
    await basicLatencyTest();
    await consistencyTest();
}

runTests().catch(console.error);
