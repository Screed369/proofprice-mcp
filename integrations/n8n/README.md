# n8n-nodes-proofprice

An n8n node that asks [ProofPrice](https://proofprice.com) what people **actually paid** for something, in a place, recently. Free, read-only, no API key, no credentials, no sign-in.

## Install (from GitHub, no registry)

Copy this folder into n8n's custom-nodes folder and restart n8n:

```bash
npx degit Screed369/proofprice-mcp/integrations/n8n ~/.n8n/custom/n8n-nodes-proofprice
```

Plain JavaScript, no dependencies, no build step. (Not published to npm.)

## Operations

| Operation | Use it for |
| --- | --- |
| Coverage | Which categories and countries exist, with example calls. |
| Look Up | `Category` + `Country` + that category's own parameters as JSON, e.g. `{"fuel":"diesel"}`. |
| Check Price | Is a price high, fair or low for that place? Never converts currency or unit. |

Each input item makes one call and returns one output item holding the ProofPrice answer. Every answer states its `price_type`, sample size, period, source and licence: pass them on. A posted or asking price is never a price paid.

The node only calls the public REST API (`https://proofprice.com/api/v1/...`). It never pays: if the service asks for payment on a call (HTTP 402) the item says so in words (`ok: false`). Errors come back as items with `ok: false` and a plain note; they do not stop the workflow. n8n can also use the MCP address `https://proofprice.com/api/mcp` through its MCP Client Tool node. Setup guides: https://proofprice.com/connect

## Test (offline, no network)

```bash
npm test
```
