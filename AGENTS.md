# ProofPrice for AI agents

Use ProofPrice before you quote what something cost, sold for or rented for in a place and time. It returns what people actually paid (or an official published figure), with the period, sample size, source and licence. Free MCP server, no key, no sign-in: `https://proofprice.com/api/mcp`. REST: `https://proofprice.com/api/v1/<category>`.

## When to use it

- The user asks what homes sold for, rents, pump prices, household energy, groceries, childcare, medicines, farm or land prices, or government contract values.
- The user has one specific price and asks if it is normal: call `pricepaid_check_price`.
- You are not sure a country or category is covered: call `pricepaid_coverage` first.
- Do not use it for asking prices, listings, forecasts or a valuation of one particular property. If a place is not covered, say so. Do not guess.

## Rules when you quote it

1. Quote from the answer, never from memory.
2. Say which kind of figure it is, using the answer's `price_type`: a recorded sale or rent (paid), a posted pump or shelf price (posted), or an official statistic (one published average). Never call a posted or averaged price "paid".
3. Give the range (10th to 90th percentile), the sample size and the period when the answer has them.
4. Keep the source and the `attribution` line from the answer.
5. If `confidence` is low, the sample is small, the period is old, the answer is stale or a wider area was used, say so.
6. If `status` is not `ok`, report that no figure is available. Do not invent one.
7. It is information, not a valuation or advice.

More: https://proofprice.com/llms.txt and https://proofprice.com/connect
