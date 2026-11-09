"""Three read-only LangChain tools over the free ProofPrice REST API.

* proofprice_coverage    - what categories and countries exist (call first when unsure).
* proofprice_lookup      - what people actually paid for X in a place (one category per call).
* proofprice_check_price - is this price high, fair or low for that place?

Every answer carries price_type, sample size, period, source and attribution. Pass them on to the
user, and never call a posted, asking or averaged price a price paid. Nothing here pays or signs
up for anything: if the service ever asks for payment (HTTP 402) the tool says so in plain words.
"""
from __future__ import annotations

import json
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Callable, Dict, List, Optional

from langchain_core.tools import tool

BASE_URL = "https://proofprice.com"
USER_AGENT = "langchain-proofprice/0.1 (+https://github.com/Screed369/proofprice-mcp)"
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
                "Tell the user, or use the free basic look-up (proofprice_lookup).")
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


def _extra(extra: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    return dict(extra or {})


@tool
def proofprice_coverage() -> str:
    """List every price category and country ProofPrice covers, with example calls.
    Use this first when you are not sure a category or country is covered."""
    return _call("/api/v1/coverage", {})


@tool
def proofprice_lookup(category: str, country: str, extra: Optional[Dict[str, str]] = None) -> str:
    """What did people actually pay (or what is the official price) for something in a place?
    category: a ProofPrice category such as fuel, home-sales, rent, groceries, energy, medicines
    (see proofprice_coverage for the full list). country: ISO code such as IE, GB, FR, ES, US.
    extra: that category's own parameters, for example {"fuel": "diesel", "postcode": "D02"} for fuel.
    The answer states its price_type, sample size, period, source and licence: repeat those to the
    user and never call a posted or asking price a price paid."""
    if not category or "/" in category or ".." in category:
        return "category must be a plain category name such as fuel or home-sales."
    params = _extra(extra)
    params["country"] = country
    return _call(f"/api/v1/{category.strip()}", params)


@tool
def proofprice_check_price(category: str, country: str, price: float,
                           extra: Optional[Dict[str, str]] = None) -> str:
    """Is a price high, fair or low compared with what people actually paid? Gives a verdict, the
    evidence range and the source. category and country as in proofprice_lookup; price is a number
    above zero. extra may hold currency, unit, includes and the category's own parameters. If the
    currency or unit differs from the evidence the answer says it cannot judge: it never converts."""
    if price is None or price <= 0:
        return "price must be a number above zero."
    params = _extra(extra)
    params.update({"category": category, "country": country, "price": f"{price:g}"})
    return _call("/api/v1/check", params)


def get_proofprice_tools() -> List[Any]:
    """The three tools, ready to hand to an agent: create_agent(model, get_proofprice_tools())."""
    return [proofprice_coverage, proofprice_lookup, proofprice_check_price]
