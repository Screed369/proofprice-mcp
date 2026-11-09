"""Three read-only CrewAI tools over the free ProofPrice REST API.

* ProofPriceCoverage   - what categories and countries exist (call first when unsure).
* ProofPriceLookup     - what people actually paid for X in a place (one category per call).
* ProofPriceCheckPrice - is this price high, fair or low for that place?

Every answer carries price_type, sample size, period, source and attribution. Pass them on to the
user, and never call a posted, asking or averaged price a price paid. Nothing here pays or signs
up for anything: if the service ever asks for payment (HTTP 402) the tool says so in plain words.
"""
from __future__ import annotations

import json
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Callable, Dict, List, Optional, Type

from crewai.tools import BaseTool
from pydantic import BaseModel, Field

BASE_URL = "https://proofprice.com"
USER_AGENT = "crewai-proofprice/0.1 (+https://github.com/Screed369/proofprice-mcp)"
TIMEOUT_SECONDS = 30
MAX_CHARS = 12000

# Replaceable for tests: (url) -> (status, body_text).
Fetcher = Callable[[str], "tuple[int, str]"]


class ProofPriceError(RuntimeError):
    """The service could not give an answer (network failure or non-JSON reply)."""


def _default_fetch(url: str) -> "tuple[int, str]":
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT_SECONDS) as r:  # noqa: S310 - fixed https host
            return r.status, r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")
    except (urllib.error.URLError, TimeoutError, OSError) as e:
        raise ProofPriceError(f"Could not reach ProofPrice: {e}") from e


_fetch: Fetcher = _default_fetch


def _build_url(base_url: str, path: str, params: Dict[str, Any]) -> str:
    clean = {k: str(v) for k, v in params.items() if v is not None and str(v) != ""}
    return f"{base_url.rstrip('/')}{path}" + ("?" + urllib.parse.urlencode(clean) if clean else "")


def _call(path: str, params: Dict[str, Any], base_url: str = BASE_URL) -> str:
    status, body = _fetch(_build_url(base_url, path, params))
    if status == 402:
        return ("ProofPrice asks for payment on this call (HTTP 402). This tool does not pay. "
                "Tell the user, or use the free basic look-up (ProofPriceLookup).")
    try:
        data = json.loads(body)
    except ValueError:
        raise ProofPriceError(f"ProofPrice answered HTTP {status} with something that is not JSON.")
    text = json.dumps(data, ensure_ascii=False, indent=1)
    if status >= 400:
        return f"ProofPrice could not answer (HTTP {status}): {text[:MAX_CHARS]}"
    if len(text) > MAX_CHARS:
        text = text[:MAX_CHARS] + "\n... (cut; ask a narrower question)"
    return text


class _NoArgs(BaseModel):
    pass


class _LookupArgs(BaseModel):
    category: str = Field(..., description="A ProofPrice category such as fuel, home-sales, rent, groceries, energy, medicines.")
    country: str = Field(..., description="ISO country code such as IE, GB, FR, ES, US.")
    extra: Optional[Dict[str, str]] = Field(
        default=None,
        description='That category\'s own parameters, for example {"fuel": "diesel", "postcode": "D02"} for fuel.')


class _CheckArgs(BaseModel):
    category: str = Field(..., description="A ProofPrice category, as in the lookup tool.")
    country: str = Field(..., description="ISO country code such as IE, GB, FR, ES, US.")
    price: float = Field(..., description="The price to judge, a number above zero.")
    extra: Optional[Dict[str, str]] = Field(
        default=None, description="Optional: currency, unit, includes and the category's own parameters.")


class ProofPriceCoverage(BaseTool):
    name: str = "proofprice_coverage"
    description: str = (
        "List every price category and country ProofPrice covers, with example calls. "
        "Use this first when you are not sure a category or country is covered.")
    args_schema: Type[BaseModel] = _NoArgs

    def _run(self, **_: Any) -> str:
        return _call("/api/v1/coverage", {})


class ProofPriceLookup(BaseTool):
    name: str = "proofprice_lookup"
    description: str = (
        "What did people actually pay (or what is the official price) for something in a place? "
        "Give a category (see proofprice_coverage), a country code, and that category's own parameters in extra. "
        "The answer states its price_type, sample size, period, source and licence: repeat those to the "
        "user and never call a posted or asking price a price paid.")
    args_schema: Type[BaseModel] = _LookupArgs

    def _run(self, category: str, country: str, extra: Optional[Dict[str, str]] = None, **_: Any) -> str:
        if not category or "/" in category or ".." in category:
            return "category must be a plain category name such as fuel or home-sales."
        params = dict(extra or {})
        params["country"] = country
        return _call(f"/api/v1/{category.strip()}", params)


class ProofPriceCheckPrice(BaseTool):
    name: str = "proofprice_check_price"
    description: str = (
        "Is a price high, fair or low compared with what people actually paid? Gives a verdict, the "
        "evidence range and the source. If the currency or unit differs from the evidence the answer "
        "says it cannot judge: it never converts. Price must be above zero.")
    args_schema: Type[BaseModel] = _CheckArgs

    def _run(self, category: str, country: str, price: float,
             extra: Optional[Dict[str, str]] = None, **_: Any) -> str:
        if price is None or price <= 0:
            return "price must be a number above zero."
        params = dict(extra or {})
        params.update({"category": category, "country": country, "price": f"{price:g}"})
        return _call("/api/v1/check", params)


def get_proofprice_tools() -> List[BaseTool]:
    """The three tools, ready for an agent: Agent(role=..., tools=get_proofprice_tools())."""
    return [ProofPriceCoverage(), ProofPriceLookup(), ProofPriceCheckPrice()]
