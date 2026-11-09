# langchain-proofprice

Three LangChain tools that let an agent ask [ProofPrice](https://proofprice.com) what people **actually paid** for something, in a place, recently. Free, no API key, no sign-in.

```bash
pip install "langchain-proofprice @ git+https://github.com/Screed369/proofprice-mcp#subdirectory=integrations/langchain"
```

```python
from langchain_proofprice import get_proofprice_tools

tools = get_proofprice_tools()   # coverage, lookup, check_price
# hand `tools` to any LangChain / LangGraph agent, for example:
# from langgraph.prebuilt import create_react_agent
# agent = create_react_agent(model, tools)
```

| Tool | Use it for |
| --- | --- |
| `proofprice_coverage` | Which categories and countries exist, with example calls. |
| `proofprice_lookup` | `category` + `country` + that category's own parameters, e.g. `{"fuel": "diesel"}`. |
| `proofprice_check_price` | Is a price high, fair or low for that place? Never converts currency or unit. |

Every answer states its `price_type`, sample size, period, source and licence. Tell the user which it is: a paid sale, a posted price or an official statistic. A posted or asking price is never a price paid.

These tools only call the public REST API (`https://proofprice.com/api/v1/...`). They never pay: if the service asks for payment on a call (HTTP 402) the tool says so in words. For MCP instead of REST, use `https://proofprice.com/api/mcp` with `langchain-mcp-adapters`. Setup guides: https://proofprice.com/connect

## Test (offline, no network)

```bash
pip install -e . && python -m unittest discover -s tests
```
