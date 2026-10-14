# ProofPrice

<img src="assets/logo.svg" alt="ProofPrice" width="256" height="64">

**What did people actually pay for X, here, recently?**

ProofPrice is a free remote [MCP](https://modelcontextprotocol.io) server and REST API that answers that question for AI agents. Every answer is a **range or an official figure, never a bare number**: the median, the typical range (10th to 90th percentile), the sample size, the period covered, a confidence label, and the official source with its licence. The numbers come from official open data. Asking prices are never presented as prices paid.

- **MCP server (Streamable HTTP, no key, no sign-in):** `https://proofprice.com/api/mcp`
- **Website:** https://proofprice.com
- **Setup guides:** https://proofprice.com/connect
- **REST API (OpenAPI 3.1):** https://proofprice.com/openapi.json
- **For LLMs:** https://proofprice.com/llms.txt
- **Sources and licences:** https://proofprice.com/sources
- **Method:** https://proofprice.com/method
- **Trust and status:** https://proofprice.com/trust
- **Registry name:** `com.proofprice/pricepaid` in the [official MCP Registry](https://registry.modelcontextprotocol.io)

This repository holds the integration files only (configs, plugin manifests, docs). The hosted service code is not published here.

## Add it to your AI app

The server is read-only and needs no API key or sign-in. Add the address below and you are done.

```
https://proofprice.com/api/mcp
```

### Claude (claude.ai and Claude Desktop)

Open **Customize > Connectors**, add a custom connector, paste the address, and choose no sign-in. Switch it on for a chat from the **+** menu. On Team and Enterprise plans an Owner adds it under Organization settings first.

If your Claude Desktop only reads a config file, this fallback uses the `mcp-remote` bridge:

```json
{
  "mcpServers": {
    "proofprice": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://proofprice.com/api/mcp"]
    }
  }
}
```

### Claude Code

One command:

```bash
claude mcp add --transport http proofprice https://proofprice.com/api/mcp
```

Or install this repository as a plugin (it is also a one-plugin marketplace):

```bash
claude plugin marketplace add Screed369/proofprice-mcp
claude plugin install proofprice@proofprice
```

### Cursor

[![Add to Cursor](https://cursor.com/deeplink/mcp-install-dark.png)](https://cursor.com/en/install-mcp?name=proofprice&config=eyJ1cmwiOiJodHRwczovL3Byb29mcHJpY2UuY29tL2FwaS9tY3AifQ%3D%3D)

Or paste this deeplink into a browser or terminal: `cursor://anysphere.cursor-deeplink/mcp/install?name=proofprice&config=eyJ1cmwiOiJodHRwczovL3Byb29mcHJpY2UuY29tL2FwaS9tY3AifQ==`

Or add to `.cursor/mcp.json` (one project) or `~/.cursor/mcp.json` (all projects):

```json
{
  "mcpServers": {
    "proofprice": { "url": "https://proofprice.com/api/mcp" }
  }
}
```

### VS Code and GitHub Copilot

[Install in VS Code](https://vscode.dev/redirect/mcp/install?name=proofprice&config=%7B%22type%22%3A%22http%22%2C%22url%22%3A%22https%3A%2F%2Fproofprice.com%2Fapi%2Fmcp%22%7D)

Or run **MCP: Add Server** from the Command Palette, choose HTTP, and paste the address. Or add to `.vscode/mcp.json` in a workspace:

```json
{
  "servers": {
    "proofprice": { "type": "http", "url": "https://proofprice.com/api/mcp" }
  }
}
```

The VS Code URL handler also accepts `vscode:mcp/install?` followed by the URL-encoded JSON `{"name":"proofprice","type":"http","url":"https://proofprice.com/api/mcp"}`.

### ChatGPT (developer mode)

Developer mode is available on Pro, Plus, Business, Enterprise and Education accounts on the web.

1. Go to **Settings > Apps > Advanced settings** and turn on **Developer mode**.
2. Choose **Create app**, enter `https://proofprice.com/api/mcp`, and select **No Authentication**.
3. Start a chat, choose Developer mode from the **+** menu, and select the app. If ChatGPT does not call a tool, name it in your prompt, for example "use pricepaid_home_sales".

### Windsurf

Open the MCP config file from Cascade (`~/.codeium/windsurf/mcp_config.json` in most installs) and add:

```json
{
  "mcpServers": {
    "proofprice": { "serverUrl": "https://proofprice.com/api/mcp" }
  }
}
```

### Any other MCP client, or plain REST

Use the address above with the Streamable HTTP transport. Without an MCP client, call the REST API directly. No key is needed and CORS is open:

```bash
curl "https://proofprice.com/api/v1/fuel?country=ES&area=42&fuel=diesel"
```

## Tools

| Tool | What it answers |
| --- | --- |
| `pricepaid_home_sales` | What homes actually sold for in a town, district or postcode: median, typical range, number of sales (or the official average where a statistics office publishes one). |
| `pricepaid_rent_prices` | Rents actually agreed or paid (registered tenancies, rental bonds, official rent surveys), never asking rents. |
| `pricepaid_fuel_prices_now` | Pump prices for petrol, diesel and other fuels near a place, or the official national average. |
| `pricepaid_energy_prices` | Household electricity and gas prices per kWh, official published averages. |
| `pricepaid_grocery_prices` | Official average shop prices of everyday items (milk, bread, eggs, coffee...). |
| `pricepaid_medicine_prices` | Regulated or reimbursement prices of medicines, and what pharmacies paid to buy them. |
| `pricepaid_medical_prices` | What Medicare paid for doctor visits, tests and hospital stays (US). |
| `pricepaid_airfare_prices` | Average airfares actually paid between two airports (US). |
| `pricepaid_contract_prices` | What public buyers paid in awarded government contracts. |
| `pricepaid_farm_prices` | Official farm-gate and wholesale prices of cereals, meat, milk, dairy, eggs, olive oil, fruit and vegetables. |
| `pricepaid_land_prices` | Average price or yearly rent per hectare of farmland. |
| `pricepaid_car_prices` | Singapore Certificate of Entitlement (COE) premiums. |
| `pricepaid_coverage` | Which countries, categories, sources, licences and update frequencies are covered right now. |

More tools and countries are added often. `pricepaid_coverage` and https://proofprice.com/sources always show the current list, with every source's publisher, licence and limits. All tools are read-only; parameters are described in each tool's schema and in the [OpenAPI file](https://proofprice.com/openapi.json).

## Example answer

Illustrative figures, not real data. The shape is what the server returns.

Prompt: *"What did terraced houses in Bristol actually sell for recently?"* (tool: `pricepaid_home_sales`, arguments `country=GB`, `town=Bristol`, `property_type=terraced`)

```json
{
  "query": { "country": "GB", "town": "Bristol", "postcode_district": null, "property_type": "terraced", "months": 12 },
  "status": "ok",
  "price": {
    "currency": "GBP",
    "unit": "per home",
    "value": 395000,
    "measure": "median",
    "median": 395000,
    "typical_low": 265000,
    "typical_high": 575000,
    "min": 150000,
    "max": 1250000
  },
  "sample_size": 1240,
  "period": { "from": "2025-09-01", "to": "2026-08-29" },
  "confidence": "high",
  "price_type": "transaction",
  "as_of": "2026-10-14T09:00:00.000Z",
  "source": {
    "id": "gb-hmlr-ppd",
    "name": "Price Paid Data",
    "publisher": "HM Land Registry",
    "licence": "Open Government Licence v3.0",
    "licence_url": "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/",
    "attribution": "Contains HM Land Registry data © Crown copyright and database right. This data is licensed under the Open Government Licence v3.0.",
    "url": "https://www.gov.uk/government/statistical-data-sets/price-paid-data-downloads"
  },
  "method": "Median and 10th–90th percentile of standard-price residential sales (category A) recorded by HM Land Registry in the selected area and period. Repossessions, buy-to-let and transfers to companies (category B) are excluded.",
  "method_url": "https://proofprice.com/method",
  "summary": "Terraced homes in Bristol sold for a median of £395,000; typical range £265,000–£575,000. Based on 1240 records from HM Land Registry (2025-09-01 to 2026-08-29). Confidence: high.",
  "notice": "Information, not a valuation or offer. Ranges describe past recorded prices."
}
```

Confidence is **low** for 5 to 14 records, **medium** for 15 to 49 and **high** for 50 or more. With fewer than 5 records the server returns `status: "insufficient_data"` and no figure.

Some sources publish one official figure instead of a list of records, for example household energy prices from Eurostat. Those answers have `price_type: "official_statistic"`, a `statistic.reference_period` (such as a half-year), and empty range fields and sample size, because the publisher gives one average and ProofPrice does not invent a range.

## Data sources and licences

Every answer comes from an official publisher (land registries, statistics offices, regulators, ministries, the European Commission and Eurostat) under an open licence, and carries its attribution line. Please keep that line when you show a figure. The live list of sources, with each licence, update frequency and known limits, is at https://proofprice.com/sources and https://proofprice.com/api/v1/coverage.

## How to use the numbers honestly

- Cite the source and attribution line returned with each answer.
- Every answer says what kind of figure it is (`price_type`): **recorded sale prices**, **official published averages**, **posted shelf or pump prices**, **contract award values** or **regulated reimbursement prices**. Never present one kind as another.
- A range is not an asking price, a valuation, an offer or advice.
- Home-sale answers are aggregates only. No individual address is ever returned.
- No figure is returned from fewer than 5 records.

## Privacy, terms and contact

- Privacy notice: https://proofprice.com/privacy (no accounts, no cookies, no sale of data, no profiles or ads; the service keeps nothing about your questions itself, apart from the standard hosting logs that its host Vercel keeps)
- Terms of use: https://proofprice.com/terms
- Contact: hello@proofprice.com
- Run by Simon Creedon, under Irish law.

## Contributing

Want a country or category added? See [CONTRIBUTING.md](CONTRIBUTING.md) or email hello@proofprice.com.

## Licence

The integration files in this repository are released under the [MIT licence](LICENSE), copyright 2026 Simon Creedon. The licence covers only these files. It does not cover the hosted service's source code or the third-party data, which stays under its publishers' licences.
