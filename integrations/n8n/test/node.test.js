// Offline tests: no network, no calls to proofprice.com. Run: npm test
const test = require("node:test");
const assert = require("node:assert/strict");
const { ProofPrice, plan, shape, run, parseExtra } = require("../nodes/ProofPrice/ProofPrice.node.js");

function fake(status = 200, body = { status: "ok" }) {
  const urls = [];
  const fetcher = async (url) => { urls.push(url); return { status, body: typeof body === "string" ? body : JSON.stringify(body) }; };
  return { urls, fetcher };
}

test("node description: three operations, no credentials", () => {
  const d = new ProofPrice().description;
  assert.equal(d.name, "proofPrice");
  assert.equal(d.credentials, undefined);
  const op = d.properties.find((p) => p.name === "operation");
  assert.deepEqual(op.options.map((o) => o.value), ["coverage", "lookup", "checkPrice"]);
});

test("lookup builds the free REST url", async () => {
  const { urls, fetcher } = fake();
  const out = await run("lookup", { category: "fuel", country: "IE", extra: '{"fuel":"diesel"}' }, { fetcher });
  const u = new URL(urls[0]);
  assert.equal(u.origin + u.pathname, "https://proofprice.com/api/v1/fuel");
  assert.equal(u.searchParams.get("fuel"), "diesel");
  assert.equal(u.searchParams.get("country"), "IE");
  assert.equal(out.status, "ok");
});

test("coverage and check price", async () => {
  const a = fake();
  await run("coverage", {}, { fetcher: a.fetcher });
  assert.equal(new URL(a.urls[0]).pathname, "/api/v1/coverage");
  const b = fake();
  await run("checkPrice", { category: "rent", country: "IE", price: 2400, extra: { currency: "EUR" } }, { fetcher: b.fetcher });
  const u = new URL(b.urls[0]);
  assert.equal(u.pathname, "/api/v1/check");
  assert.equal(u.searchParams.get("price"), "2400");
  assert.equal(u.searchParams.get("category"), "rent");
  assert.equal(u.searchParams.get("currency"), "EUR");
});

test("no ppcheck or identifiers sent", async () => {
  const { urls, fetcher } = fake();
  await run("lookup", { category: "rent", country: "IE" }, { fetcher });
  assert.ok(!urls[0].includes("ppcheck"));
});

test("bad input never calls the network", async () => {
  const { urls, fetcher } = fake();
  assert.match((await run("checkPrice", { category: "rent", country: "IE", price: 0 }, { fetcher })).note, /above zero/);
  assert.match((await run("lookup", { category: "../x", country: "IE" }, { fetcher })).note, /plain category/);
  assert.match((await run("lookup", { category: "fuel", country: "" }, { fetcher })).note, /Country is required/);
  assert.match((await run("lookup", { category: "fuel", country: "IE", extra: "{oops" }, { fetcher })).note, /valid JSON/);
  assert.match((await run("lookup", { category: "fuel", country: "IE", extra: { a: { b: 1 } } }, { fetcher })).note, /plain value/);
  assert.equal(urls.length, 0);
});

test("402 is reported in words, never paid", async () => {
  const { fetcher } = fake(402, { error: "payment required" });
  const out = await run("checkPrice", { category: "rent", country: "IE", price: 1 }, { fetcher });
  assert.equal(out.ok, false);
  assert.match(out.note, /does not pay/);
});

test("errors, non-JSON and network failure are reported", async () => {
  assert.equal((await run("coverage", {}, { fetcher: fake(500, { e: 1 }).fetcher })).http_status, 500);
  assert.match((await run("coverage", {}, { fetcher: fake(200, "<html>").fetcher })).note, /not JSON/);
  const down = await run("coverage", {}, { fetcher: async () => { throw new Error("offline"); } });
  assert.match(down.note, /Could not reach ProofPrice: offline/);
});

test("execute() wires n8n helpers and returns one item per input", async () => {
  const calls = [];
  const params = { operation: "lookup", category: "fuel", country: "IE", extra: '{"fuel":"diesel"}' };
  const ctx = {
    getInputData: () => [{ json: {} }, { json: {} }],
    getNodeParameter: (n, _i, dflt) => (n in params ? params[n] : dflt),
    helpers: { httpRequest: async (o) => { calls.push(o); return { statusCode: 200, body: '{"status":"ok","price_type":"posted"}' }; } },
  };
  const [out] = await new ProofPrice().execute.call(ctx);
  assert.equal(out.length, 2);
  assert.equal(out[1].json.price_type, "posted");
  assert.equal(out[1].pairedItem.item, 1);
  assert.equal(calls[0].method, "GET");
  assert.equal(calls[0].ignoreHttpStatusErrors, true);
  assert.ok(!JSON.stringify(calls[0]).includes("ppcheck"));
  assert.ok(!("auth" in calls[0]) && !("authentication" in calls[0]));
});

test("helpers", () => {
  assert.deepEqual(parseExtra(""), {});
  assert.throws(() => parseExtra("[1]"), /JSON object/);
  assert.deepEqual(plan("coverage", {}), { path: "/api/v1/coverage", params: {} });
  assert.equal(shape(200, { a: 1 }).a, 1);
});
