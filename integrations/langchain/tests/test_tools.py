"""Offline tests: no network, no calls to proofprice.com. Run: python -m unittest discover -s tests"""
import json
import unittest
from urllib.parse import urlparse, parse_qs

import langchain_proofprice.tools as t


class Fake:
    def __init__(self, status=200, body=None):
        self.status, self.body, self.urls = status, body if body is not None else {"status": "ok"}, []

    def __call__(self, url):
        self.urls.append(url)
        return self.status, self.body if isinstance(self.body, str) else json.dumps(self.body)


class ToolTests(unittest.TestCase):
    def setUp(self):
        self.orig = t._fetch

    def tearDown(self):
        t._fetch = self.orig

    def use(self, **kw):
        f = Fake(**kw)
        t._fetch = f
        return f

    def test_three_tools_with_names_and_docs(self):
        tools = t.get_proofprice_tools()
        self.assertEqual([x.name for x in tools], ["proofprice_coverage", "proofprice_lookup", "proofprice_check_price"])
        for x in tools:
            self.assertGreater(len(x.description), 60)

    def test_lookup_builds_free_rest_url(self):
        f = self.use()
        out = t.proofprice_lookup.invoke({"category": "fuel", "country": "IE", "extra": {"fuel": "diesel"}})
        u = urlparse(f.urls[0])
        self.assertEqual((u.scheme, u.netloc, u.path), ("https", "proofprice.com", "/api/v1/fuel"))
        self.assertEqual(parse_qs(u.query), {"fuel": ["diesel"], "country": ["IE"]})
        self.assertIn('"status": "ok"', out)

    def test_no_ppcheck_or_identifiers_sent(self):
        f = self.use()
        t.proofprice_lookup.invoke({"category": "rent", "country": "IE"})
        self.assertNotIn("ppcheck", f.urls[0])

    def test_check_price(self):
        f = self.use()
        t.proofprice_check_price.invoke({"category": "rent", "country": "IE", "price": 2400, "extra": {"currency": "EUR"}})
        u = urlparse(f.urls[0])
        self.assertEqual(u.path, "/api/v1/check")
        q = parse_qs(u.query)
        self.assertEqual((q["price"], q["category"], q["currency"]), (["2400"], ["rent"], ["EUR"]))

    def test_rejects_bad_input_without_calling(self):
        f = self.use()
        self.assertIn("above zero", t.proofprice_check_price.invoke({"category": "rent", "country": "IE", "price": 0}))
        self.assertIn("plain category", t.proofprice_lookup.invoke({"category": "../x", "country": "IE"}))
        self.assertEqual(f.urls, [])

    def test_402_is_reported_never_paid(self):
        self.use(status=402, body={"x402Version": 2})
        out = t.proofprice_check_price.invoke({"category": "rent", "country": "IE", "price": 1})
        self.assertIn("does not pay", out)

    def test_error_status_is_explained(self):
        self.use(status=400, body={"error": "country not covered"})
        self.assertIn("HTTP 400", t.proofprice_lookup.invoke({"category": "fuel", "country": "ZZ"}))

    def test_non_json_raises(self):
        self.use(body="<html>")
        with self.assertRaises(t.ProofPriceError):
            t.proofprice_coverage.invoke({})

    def test_long_answers_are_cut(self):
        self.use(body={"x": "a" * 30000})
        self.assertLess(len(t.proofprice_coverage.invoke({})), t.MAX_CHARS + 100)

    def test_no_secrets_in_source(self):
        src = open(t.__file__).read().lower()
        for w in ("api_key", "apikey", "secret", "bearer"):
            self.assertNotIn(w, src)


if __name__ == "__main__":
    unittest.main()
