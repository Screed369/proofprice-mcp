/**
 * n8n node: ask ProofPrice what people actually paid. Three read-only operations over the free
 * REST API (https://proofprice.com/api/v1): Coverage, Look Up, Check Price.
 * No credentials, no sign-in. It never pays: an HTTP 402 is returned as a plain note.
 * Plain JavaScript, no dependencies. Every answer keeps price_type, sample size, period, source and licence.
 */
"use strict";

const BASE_URL = "https://proofprice.com";
const USER_AGENT = "proofprice-n8n/0.1 (+https://github.com/Screed369/proofprice-mcp)";
const TIMEOUT_MS = 30000;

const plainCategory = (c) => typeof c === "string" && c.trim() !== "" && !c.includes("/") && !c.includes("..") && !c.includes("?");

function buildUrl(baseUrl, path, params) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params || {})) {
    if (v !== undefined && v !== null && String(v) !== "") q.set(k, String(v));
  }
  const s = q.toString();
  return `${String(baseUrl).replace(/\/+$/, "")}${path}${s ? "?" + s : ""}`;
}

/** extra: a JSON object (or JSON text) of the category's own parameters, e.g. {"fuel":"diesel"}. */
function parseExtra(extra) {
  if (extra === undefined || extra === null || extra === "") return {};
  let o = extra;
  if (typeof extra === "string") {
    try { o = JSON.parse(extra); } catch { throw new Error("Extra parameters must be valid JSON, e.g. {\"fuel\":\"diesel\"}."); }
  }
  if (!o || typeof o !== "object" || Array.isArray(o)) throw new Error("Extra parameters must be a JSON object.");
  const out = {};
  for (const [k, v] of Object.entries(o)) {
    if (typeof v === "object" && v !== null) throw new Error(`Extra parameter "${k}" must be a plain value.`);
    out[k] = v;
  }
  return out;
}

/** Plan the request for one item. Pure: no network. Returns { path, params } or throws a plain-English Error. */
function plan(operation, p) {
  if (operation === "coverage") return { path: "/api/v1/coverage", params: {} };
  const extra = parseExtra(p.extra);
  if (!plainCategory(p.category)) throw new Error("Category must be a plain category name such as fuel or home-sales.");
  if (typeof p.country !== "string" || p.country.trim() === "") throw new Error("Country is required (ISO code such as IE).");
  const category = p.category.trim();
  const country = p.country.trim();
  if (operation === "lookup") return { path: `/api/v1/${category}`, params: { ...extra, country } };
  if (operation === "checkPrice") {
    if (!(Number(p.price) > 0)) throw new Error("Price must be a number above zero.");
    return { path: "/api/v1/check", params: { ...extra, category, country, price: Number(p.price) } };
  }
  throw new Error(`Unknown operation "${operation}".`);
}

/** Turn an HTTP result into the item JSON. Never throws. */
function shape(status, body) {
  if (status === 402) {
    return { ok: false, http_status: 402, note: "ProofPrice asks for payment on this call (HTTP 402). This node does not pay. Use the free Look Up operation, or tell the user." };
  }
  let data = body;
  if (typeof body === "string") {
    try { data = JSON.parse(body); } catch { return { ok: false, http_status: status, note: "ProofPrice answered with something that is not JSON." }; }
  }
  if (status >= 400) return { ok: false, http_status: status, answer: data };
  return data;
}

async function run(operation, p, { baseUrl = BASE_URL, fetcher } = {}) {
  let req;
  try { req = plan(operation, p); } catch (e) { return { ok: false, note: e.message }; }
  try {
    const r = await fetcher(buildUrl(baseUrl, req.path, req.params));
    return shape(r.status, r.body);
  } catch (e) {
    return { ok: false, note: `Could not reach ProofPrice: ${e instanceof Error ? e.message : String(e)}` };
  }
}

class ProofPrice {
  constructor() {
    this.description = {
      displayName: "ProofPrice",
      name: "proofPrice",
      icon: "fa:tag",
      group: ["transform"],
      version: 1,
      subtitle: '={{$parameter["operation"]}}',
      description: "Ask what people actually paid for something, in a place, recently. Free, no key.",
      defaults: { name: "ProofPrice" },
      inputs: ["main"],
      outputs: ["main"],
      properties: [
        {
          displayName: "Operation", name: "operation", type: "options", noDataExpression: true, default: "lookup",
          options: [
            { name: "Coverage", value: "coverage", action: "List categories and countries", description: "Which categories and countries exist, with example calls" },
            { name: "Look Up", value: "lookup", action: "Look up what people paid", description: "What people actually paid (or the official price) in a place" },
            { name: "Check Price", value: "checkPrice", action: "Check if a price is high fair or low", description: "Is a price high, fair or low for that place? Never converts currency or unit" },
          ],
        },
        { displayName: "Category", name: "category", type: "string", default: "fuel", required: true, placeholder: "fuel, home-sales, rent", description: "A ProofPrice category (see the Coverage operation)", displayOptions: { show: { operation: ["lookup", "checkPrice"] } } },
        { displayName: "Country", name: "country", type: "string", default: "IE", required: true, placeholder: "IE", description: "ISO country code, e.g. IE, GB, FR, ES, US", displayOptions: { show: { operation: ["lookup", "checkPrice"] } } },
        { displayName: "Price", name: "price", type: "number", default: 0, description: "The price to judge, above zero", displayOptions: { show: { operation: ["checkPrice"] } } },
        { displayName: "Extra Parameters (JSON)", name: "extra", type: "json", default: "{}", description: 'The category\'s own parameters, e.g. {"fuel":"diesel"}. For Check Price: currency, unit, includes', displayOptions: { show: { operation: ["lookup", "checkPrice"] } } },
      ],
    };
  }

  async execute() {
    const items = this.getInputData();
    const out = [];
    const fetcher = async (url) => {
      const r = await this.helpers.httpRequest({
        method: "GET", url, json: false, returnFullResponse: true, ignoreHttpStatusErrors: true,
        headers: { "user-agent": USER_AGENT, accept: "application/json" }, timeout: TIMEOUT_MS,
      });
      return { status: r.statusCode, body: r.body };
    };
    for (let i = 0; i < items.length; i++) {
      const operation = this.getNodeParameter("operation", i);
      const p = { extra: this.getNodeParameter("extra", i, "{}") };
      if (operation !== "coverage") {
        p.category = this.getNodeParameter("category", i);
        p.country = this.getNodeParameter("country", i);
      }
      if (operation === "checkPrice") p.price = this.getNodeParameter("price", i);
      const json = await run(operation, p, { fetcher });
      out.push({ json: json && typeof json === "object" ? json : { result: json }, pairedItem: { item: i } });
    }
    return [out];
  }
}

module.exports = { ProofPrice, plan, shape, run, buildUrl, parseExtra, BASE_URL };
