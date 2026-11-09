# proofprice-ai-sdk

Three [Vercel AI SDK](https://ai-sdk.dev) tools that let an agent ask [ProofPrice](https://proofprice.com) what people **actually paid** for something, in a place, recently. Free, no API key, no sign-in. Works with AI SDK 5 and later.

npm cannot install a sub-folder of a GitHub repo, so copy the two files (`proofprice-tools.mjs`, `proofprice-tools.d.ts`) into your project, or fetch them:

```bash
npx degit Screed369/proofprice-mcp/integrations/vercel-ai-sdk proofprice-ai-sdk
```

```ts
import { generateText, stepCountIs } from "ai";
import { proofpriceTools } from "./proofprice-ai-sdk/proofprice-tools.mjs";

const { text } = await generateText({
  model,                       // any AI SDK model
  tools: proofpriceTools(),    // proofpriceCoverage, proofpriceLookup, proofpriceCheckPrice
  stopWhen: stepCountIs(5),
  prompt: "What did people pay for diesel in Ireland recently?",
});
```

| Tool | Use it for |
| --- | --- |
| `proofpriceCoverage` | Which categories and countries exist, with example calls. |
| `proofpriceLookup` | `category` + `country` + that category's own parameters, e.g. `{ fuel: "diesel" }`. |
| `proofpriceCheckPrice` | Is a price high, fair or low for that place? Never converts currency or unit. |

Every answer states its `price_type`, sample size, period, source and licence. Tell the user which it is: a paid sale, a posted price or an official statistic. A posted or asking price is never a price paid.

These tools only call the public REST API (`https://proofprice.com/api/v1/...`). They never pay: if the service asks for payment (HTTP 402) the tool says so in words. Prefer MCP? Use `https://proofprice.com/api/mcp` with `createMCPClient` from `@ai-sdk/mcp`. Setup guides: https://proofprice.com/connect

## Test (offline, no network)

```bash
npm install && npm test
```
