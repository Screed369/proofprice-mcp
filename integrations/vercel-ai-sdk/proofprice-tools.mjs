/**
 * Three read-only Vercel AI SDK tools over the free ProofPrice REST API.
 *
 *  - proofpriceCoverage   what categories and countries exist (call first when unsure)
 *  - proofpriceLookup     what people actually paid for X in a place (one category per call)
 *  - proofpriceCheckPrice is this price high, fair or low for that place?
 *
 * Every answer carries price_type, sample size, period, source and attribution. Pass them on to the
 * user, and never call a posted, asking or averaged price a price paid. Nothing here pays or signs up
 * for anything: if the service ever asks for payment (HTTP 402) the tool says so in plain words.
 * Works with AI SDK 5 and later (tool({ inputSchema })).
 */
import { tool } from "ai";
import { z } from "zod";

export const BASE_URL = "https://proofprice.com";
const USER_AGENT = "proofprice-ai-sdk/0.1 (+https://github.com/Screed369/proofprice-mcp)";
const TIMEOUT_MS = 30_000;
const MAX_CHARS = 12_000;

export function buildUrl(baseUrl, path, params) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v !== undefined && v !== null && String(v) !== "") q.set(k, String(v));
  }
  const s = q.toString();
  return `${baseUrl.replace(/\/+$/, "")}${path}${s ? "?" + s : ""}`;
}

async function defaultFetch(url) {
  const res = await fetch(url, {
    headers: { "user-agent": USER_AGENT, accept: "application/json" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  return { status: res.status, body: await res.text() };
}

export async function call(path, params, { baseUrl = BASE_URL, fetcher = defaultFetch } = {}) {
  let r;
  try {
    r = await fetcher(buildUrl(baseUrl, path, params));
  } catch (e) {
    return `Could not reach ProofPrice: ${e instanceof Error ? e.message : String(e)}`;
  }
  if (r.status === 402) {
    return "ProofPrice asks for payment on this call (HTTP 402). This tool does not pay. " +
      "Tell the user, or use the free basic look-up (proofpriceLookup).";
  }
  let data;
  try {
    data = JSON.parse(r.body);
  } catch {
    return `ProofPrice answered HTTP ${r.status} with something that is not JSON.`;
  }
  let text = JSON.stringify(data, null, 1);
  if (r.status >= 400) return `ProofPrice could not answer (HTTP ${r.status}): ${text.slice(0, MAX_CHARS)}`;
  if (text.length > MAX_CHARS) text = text.slice(0, MAX_CHARS) + "\n... (cut; ask a narrower question)";
  return text;
}

const plainCategory = (c) => typeof c === "string" && c.trim() !== "" && !c.includes("/") && !c.includes("..");

/** options: { baseUrl?, fetcher?: (url) => Promise<{status:number, body:string}> } (fetcher is for tests). */
export function proofpriceTools(options = {}) {
  return {
    proofpriceCoverage: tool({
      description:
        "List every price category and country ProofPrice covers, with example calls. " +
        "Use this first when you are not sure a category or country is covered.",
      inputSchema: z.object({}),
      execute: async () => call("/api/v1/coverage", {}, options),
    }),
    proofpriceLookup: tool({
      description:
        "What did people actually pay (or what is the official price) for something in a place? " +
        "category: a ProofPrice category such as fuel, home-sales, rent, groceries, energy, medicines " +
        "(see proofpriceCoverage for the full list). country: ISO code such as IE, GB, FR, ES, US. " +
        'extra: that category\'s own parameters, for example {"fuel":"diesel"} for fuel. The answer states its ' +
        "price_type, sample size, period, source and licence: repeat those to the user and never call a " +
        "posted or asking price a price paid.",
      inputSchema: z.object({
        category: z.string().describe("ProofPrice category, e.g. fuel or home-sales"),
        country: z.string().describe("ISO country code, e.g. IE"),
        extra: z.record(z.string(), z.string()).optional().describe("the category's own parameters"),
      }),
      execute: async ({ category, country, extra }) => {
        if (!plainCategory(category)) return "category must be a plain category name such as fuel or home-sales.";
        return call(`/api/v1/${category.trim()}`, { ...(extra ?? {}), country }, options);
      },
    }),
    proofpriceCheckPrice: tool({
      description:
        "Is a price high, fair or low compared with what people actually paid? Gives a verdict, the evidence " +
        "range and the source. category and country as in proofpriceLookup; price is a number above zero. " +
        "extra may hold currency, unit, includes and the category's own parameters. If the currency or unit " +
        "differs from the evidence the answer says it cannot judge: it never converts.",
      inputSchema: z.object({
        category: z.string(),
        country: z.string(),
        price: z.number().describe("the price to judge, above zero"),
        extra: z.record(z.string(), z.string()).optional(),
      }),
      execute: async ({ category, country, price, extra }) => {
        if (!(price > 0)) return "price must be a number above zero.";
        if (!plainCategory(category)) return "category must be a plain category name such as rent or fuel.";
        return call("/api/v1/check", { ...(extra ?? {}), category, country, price }, options);
      },
    }),
  };
}
