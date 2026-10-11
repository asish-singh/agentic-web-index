"""Agent discovery census for the Index panel.

Probes every panel site for the well known discovery documents that let an
AI agent find a site's agent endpoints without guessing, and records the raw
outcome for each. The AI Catalog at /.well-known/ai-catalog.json is the
entry point adopted by MCP Server Cards (SEP-2127). The other paths are
earlier or parallel conventions, probed so the comparison is fair.

Usage: python3 -I data/catalog-census.py data/panel.txt > data/catalog-census-YYYY-MM-DD.csv
"""

import csv
import json
import re
import sys
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor

UA = "Mozilla/5.0 (compatible; agent-readiness-auditor/0.5; +https://github.com/asish-singh/agent-readiness-auditor)"
PATHS = {
    "ai_catalog": "/.well-known/ai-catalog.json",
    "mcp_legacy": "/.well-known/mcp.json",
    "a2a_agent_card": "/.well-known/agent-card.json",
}
MCP_CARD = "application/mcp-server-card+json"
A2A_CARD = "application/a2a-agent-card+json"


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json, */*"})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status, r.headers.get("Content-Type", ""), r.read(200000).decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, e.headers.get("Content-Type", "") if e.headers else "", ""
    except Exception as e:  # network error, TLS, timeout
        return None, "", type(e).__name__


def json_object(body):
    try:
        doc = json.loads(body)
    except ValueError:
        return None
    return doc if isinstance(doc, dict) else None


def catalog_verdict(doc):
    """Returns (valid, mcp_entries, a2a_entries) under the AI Catalog spec's required rules."""
    ok = isinstance(doc.get("specVersion"), str) and re.fullmatch(r"\d+\.\d+", doc["specVersion"]) is not None
    entries = doc.get("entries")
    if not isinstance(entries, list):
        return False, 0, 0
    mcp = a2a = 0
    for e in entries:
        if not isinstance(e, dict) or not e.get("identifier") or not e.get("type"):
            ok = False
            continue
        if ("url" in e) == ("data" in e):
            ok = False
        mcp += e["type"] == MCP_CARD
        a2a += e["type"] == A2A_CARD
    return ok, mcp, a2a


def probe(site):
    origin = site if site.startswith("http") else "https://" + site
    origin = origin.rstrip("/")
    row = {"site": site}
    home, _, _ = fetch(origin)
    row["home_status"] = home
    for key, path in PATHS.items():
        status, ctype, body = fetch(origin + path)
        doc = json_object(body) if status == 200 else None
        row[key + "_status"] = status
        row[key + "_json"] = doc is not None
        if key == "ai_catalog":
            row["ai_catalog_content_type"] = ctype.split(";")[0].strip()
            valid, mcp, a2a = catalog_verdict(doc) if doc else (False, 0, 0)
            row.update(ai_catalog_valid=valid, ai_catalog_mcp_cards=mcp, ai_catalog_a2a_cards=a2a)
    return row


def main():
    sites = [l.strip() for l in open(sys.argv[1]) if l.strip() and not l.startswith("#")]
    with ThreadPoolExecutor(max_workers=12) as pool:
        rows = list(pool.map(probe, sites))
    writer = csv.DictWriter(sys.stdout, fieldnames=list(rows[0].keys()))
    writer.writeheader()
    writer.writerows(rows)


if __name__ == "__main__":
    main()
