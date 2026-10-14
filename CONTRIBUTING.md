# Contributing

ProofPrice returns what people actually paid, from official open data. The hosted service is run by Simon Creedon. This repository holds only the integration files (configuration, plugin manifests, documentation), so most useful contributions are requests and corrections rather than code.

## Ask for a country or a category

Email **hello@proofprice.com**, or open an issue in this repository (use the "Request a country or category" template). Tell us:

1. **What price** you need (for example "home sales in Portugal", "electricity per kWh in Germany", "used cars in the Netherlands").
2. **Where** (country, and region if it matters).
3. **The official source**, if you know one: a government or regulator page that publishes the records, ideally with the licence.
4. **What question** your agent or app is trying to answer. A real example prompt helps most.

We only use data we are allowed to use: official open data, licensed or partner data, and verified receipts. We do not scrape sites in breach of their terms, and we never present an asking price as a price paid. Anything about people's homes or purchases is returned as an aggregate, and we do not publish a figure built from fewer than 5 records.

We reply to every request, but we cannot promise a date. A source with a clear open licence and a bulk file or API is usually quick to add.

## Report a wrong number or a broken answer

Open an issue, or email **hello@proofprice.com**, with:

- the tool name and the exact request (the REST URL or the tool arguments),
- what you got back and what you expected,
- the `source.id` and `as_of` fields from the answer.

## Fix the integration files

Pull requests are welcome for the files in this repository: wrong or outdated setup snippets, broken links, typos, manifest fixes. Keep changes small and say which client or directory the change is for. By contributing you agree your change is released under the MIT licence in `LICENSE`.

Please do not include API keys, tokens or personal data in an issue or pull request. ProofPrice has none to share, and none are needed.

## Security

Email **hello@proofprice.com** with "security" in the subject. Please do not open a public issue for a vulnerability.
