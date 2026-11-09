// Offline tests: no network, no calls to proofprice.com. Run: npm test
import test from "node:test";
import assert from "node:assert/strict";
import { proofpriceTools } from "../proofprice-tools.mjs";

function fake(status = 200, body = { status: "ok" }) {
  const urls = [];
  const fetcher = async (url) => { urls.push(url); return { status, body: typeof body === "string" ? body : JSON.stringify(body) }; };
  return { urls, tools: proofpriceTools({ fetcher }) };
}
const run = (t, input) => t.execute(input, { toolCallId: "t", messages: [] });

test("three tools with descriptions", () => {
  const { tools } = fake();
  assert.deepEqual(Object.keys(tools), ["proofpriceCoverage", "proofpriceLookup", "proofpriceCheckPrice"]);
  for (const t of Object.values(tools)) assert.ok(t.description.length > 60);
});

test("lookup builds the free REST url", async () => {
  const { tools, urls } = fake();
  const out = await run(tools.proofpriceLookup, { category: "fuel", country: "IE", extra: { fuel: "diesel" } });
  const u = new URL(urls[0]);
  assert.equal(u.origin + u.pathname, "https://proofprice.com/api/v1/fuel");
  assert.equal(u.searchParams.get("fuel"), "diesel");
  assert.equal(u.searchParams.get("country"), "IE");
  assert.match(out, /"status": "ok"/);
});

test("no ppcheck or identifiers sent", async () => {
  const { tools, urls } = fake();
  await run(tools.proofpriceLookup, { category: "rent", country: "IE" });
  assert.ok(!urls[0].includes("ppcheck"));
});

test("check price", async () => {
  const { tools, urls } = fake();
  await run(tools.proofpriceCheckPrice, { category: "rent", country: "IE", price: 2400, extra: { currency: "EUR" } });
  const u = new URL(urls[0]);
  assert.equal(u.pathname, "/api/v1/check");
  assert.equal(u.searchParams.get("price"), "2400");
  assert.equal(u.searchParams.get("currency"), "EUR");
});

test("bad input never calls the network", async () => {
  const { tools, urls } = fake();
  assert.match(await run(tools.proofpriceCheckPrice, { category: "rent", country: "IE", price: 0 }), /above zero/);
  assert.match(await run(tools.proofpriceLookup, { category: "../x", country: "IE" }), /plain category/);
  assert.equal(urls.length, 0);
});

test("402 is reported in words, never paid", async () => {
  const { tools } = fake(402, { error: "payment required" });
  assert.match(await run(tools.proofpriceCheckPrice, { category: "rent", country: "IE", price: 1 }), /does not pay/);
});

test("errors and non-JSON are reported, long answers cut", async () => {
  assert.match(await run(fake(500, { e: 1 }).tools.proofpriceCoverage, {}), /could not answer \(HTTP 500\)/);
  assert.match(await run(fake(200, "<html>").tools.proofpriceCoverage, {}), /not JSON/);
  assert.match(await run(fake(200, { x: "a".repeat(20000) }).tools.proofpriceCoverage, {}), /cut/);
  const down = proofpriceTools({ fetcher: async () => { throw new Error("offline"); } });
  assert.match(await run(down.proofpriceCoverage, {}), /Could not reach ProofPrice: offline/);
});
