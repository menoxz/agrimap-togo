"""
AgriMap Togo — Open Data Availability Audit
Zero-mock: real HTTP only. Saves all raw JSON to data/raw/.
"""

import json
import os
import sys
import time
import traceback
from pathlib import Path
import requests

RAW_DIR = Path(__file__).parent.parent / "data" / "raw"
RAW_DIR.mkdir(parents=True, exist_ok=True)

TIMEOUT = 120
RESULTS = []  # collect summary rows

def save(name: str, data) -> Path:
    p = RAW_DIR / name
    with open(p, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    return p

def section(title: str):
    print("\n" + "=" * 70)
    print(f"  {title}")
    print("=" * 70)

def record(source, url, status, count, sample, usable, path):
    RESULTS.append({
        "source": source,
        "url": url,
        "http_status": status,
        "count": count,
        "usable": usable,
        "raw_file": str(path) if path else "—"
    })
    print(f"  URL     : {url}")
    print(f"  Status  : {status}")
    print(f"  Count   : {count}")
    print(f"  Usable  : {usable}")
    if sample:
        print(f"  Sample  : {json.dumps(sample, ensure_ascii=False)[:500]}")
    if path:
        print(f"  Saved   : {path}")

# ──────────────────────────────────────────────────────────────────────────────
# TASK 1 — OVERPASS API (OSM)
# ──────────────────────────────────────────────────────────────────────────────

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

OSM_QUERIES = {
    "markets": {
        "query": """[out:json][timeout:60];
area["ISO3166-1"="TG"]->.togo;
(
  node["amenity"="marketplace"](area.togo);
  way["amenity"="marketplace"](area.togo);
  node["shop"="marketplace"](area.togo);
);
out body; >; out skel qt;""",
        "file": "osm_markets_raw.json",
    },
    "cooperatives": {
        "query": """[out:json][timeout:60];
area["ISO3166-1"="TG"]->.togo;
(
  node["amenity"="cooperative"](area.togo);
  node["operator:type"="cooperative"](area.togo);
  node["name"~"[Cc]oop[eé]rative|COOP",i](area.togo);
  way["amenity"="cooperative"](area.togo);
);
out body; >; out skel qt;""",
        "file": "osm_cooperatives_raw.json",
    },
    "farmland": {
        "query": """[out:json][timeout:90];
area["ISO3166-1"="TG"]->.togo;
(
  way["landuse"="farmland"](area.togo);
  way["landuse"="farm"](area.togo);
  node["landuse"="farmland"](area.togo);
);
out center; out count;""",
        "file": "osm_farmland_raw.json",
    },
    "agri_points": {
        "query": """[out:json][timeout:60];
area["ISO3166-1"="TG"]->.togo;
(
  node["shop"="agrarian"](area.togo);
  node["office"="agricultural"](area.togo);
  node["amenity"="agri_cooperative"](area.togo);
  node["landuse"="greenhouse_horticulture"](area.togo);
);
out body;""",
        "file": "osm_agri_points_raw.json",
    },
}

section("TASK 1 — OVERPASS API (OSM)")

for qname, qdef in OSM_QUERIES.items():
    print(f"\n>>> OSM Query: {qname}")
    try:
        t0 = time.time()
        r = requests.post(
            OVERPASS_URL,
            data={"data": qdef["query"]},
            timeout=TIMEOUT,
            headers={"User-Agent": "AgriMapTogo-Audit/1.0"}
        )
        elapsed = round(time.time() - t0, 2)
        print(f"    Response in {elapsed}s — HTTP {r.status_code}")

        if r.status_code == 200:
            data = r.json()
            elements = data.get("elements", [])
            # For count queries there might be a "count" element
            count_el = [e for e in elements if e.get("type") == "count"]
            real_els = [e for e in elements if e.get("type") != "count"]
            count = len(real_els)
            if count_el:
                # count element has tags like {"nodes":"42","ways":"7",...}
                tags = count_el[0].get("tags", {})
                total = int(tags.get("total", count))
                print(f"    OSM count element: {tags}")
                count = total

            path = save(qdef["file"], data)
            sample = real_els[:3] if real_els else count_el[:1]
            usable = f"YES — {count} features" if count > 0 else "EMPTY — 0 features"
            record(f"OSM/{qname}", OVERPASS_URL, r.status_code, count, sample, usable, path)
        else:
            record(f"OSM/{qname}", OVERPASS_URL, r.status_code, "N/A", None,
                   f"NO — HTTP {r.status_code}", None)
            print(f"    Body preview: {r.text[:300]}")
    except Exception as e:
        print(f"    ERROR: {e}")
        traceback.print_exc()
        record(f"OSM/{qname}", OVERPASS_URL, "ERROR", "N/A", None, f"NO — {e}", None)

# ──────────────────────────────────────────────────────────────────────────────
# TASK 2 — HDX (Humanitarian Data Exchange)
# ──────────────────────────────────────────────────────────────────────────────

section("TASK 2 — HDX Humanitarian Data Exchange")

HDX_SEARCHES = [
    ("togo+agriculture", 20, "hdx_togo_agriculture.json"),
    ("togo+market", 10, "hdx_togo_market.json"),
    ("togo+cooperative", 10, "hdx_togo_cooperative.json"),
]

for query, rows, fname in HDX_SEARCHES:
    url = f"https://data.humdata.org/api/3/action/package_search?q={query}&rows={rows}"
    print(f"\n>>> HDX: {query}")
    try:
        r = requests.get(url, timeout=TIMEOUT,
                         headers={"User-Agent": "AgriMapTogo-Audit/1.0"})
        print(f"    HTTP {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            results = data.get("result", {}).get("results", [])
            count = len(results)
            path = save(fname, data)
            # Print dataset listing
            for ds in results:
                title = ds.get("title", "?")
                org = ds.get("organization", {}).get("name", "?") if ds.get("organization") else "?"
                modified = ds.get("metadata_modified", "?")[:10]
                resources = ds.get("resources", [])
                fmt = ",".join(set(r2.get("format", "?") for r2 in resources)) if resources else "?"
                dl_urls = [r2.get("url", "") for r2 in resources if r2.get("url")]
                print(f"    • [{fmt}] {title} | org={org} | updated={modified}")
                for u in dl_urls[:2]:
                    print(f"      ↳ {u}")
            sample = results[:2] if results else []
            usable = f"YES — {count} datasets" if count > 0 else "EMPTY"
            record(f"HDX/{query}", url, r.status_code, count, sample, usable, path)
        else:
            record(f"HDX/{query}", url, r.status_code, "N/A", None,
                   f"NO — HTTP {r.status_code}", None)
    except Exception as e:
        print(f"    ERROR: {e}")
        record(f"HDX/{query}", url, "ERROR", "N/A", None, f"NO — {e}", None)

# ──────────────────────────────────────────────────────────────────────────────
# TASK 3 — WorldPop
# ──────────────────────────────────────────────────────────────────────────────

section("TASK 3 — WorldPop Rural Population Raster")

WORLDPOP_URLS = [
    ("https://hub.worldpop.org/rest/data/pop/cic2020_100m?iso3=TGO", "worldpop_cic2020.json"),
    ("https://hub.worldpop.org/rest/data/pop/wpgp?iso3=TGO", "worldpop_wpgp.json"),
]

for url, fname in WORLDPOP_URLS:
    print(f"\n>>> WorldPop: {url}")
    try:
        r = requests.get(url, timeout=TIMEOUT,
                         headers={"User-Agent": "AgriMapTogo-Audit/1.0"})
        print(f"    HTTP {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            # WorldPop response structure: {"data": [...]}
            items = data.get("data", data) if isinstance(data, dict) else data
            if isinstance(items, list):
                count = len(items)
            elif isinstance(items, dict):
                count = 1
            else:
                count = 0
            path = save(fname, data)
            sample = items[:3] if isinstance(items, list) else items
            # Show download URLs
            if isinstance(items, list):
                for item in items[:5]:
                    if isinstance(item, dict):
                        dl = item.get("files", item.get("url", item.get("download_url", "")))
                        yr = item.get("year", "?")
                        print(f"    • year={yr} | files={str(dl)[:120]}")
            usable = f"YES — {count} dataset(s)" if count > 0 else "EMPTY"
            record(f"WorldPop/{fname}", url, r.status_code, count, sample, usable, path)
        else:
            record(f"WorldPop/{fname}", url, r.status_code, "N/A", None,
                   f"NO — HTTP {r.status_code}", None)
            print(f"    Body: {r.text[:300]}")
    except Exception as e:
        print(f"    ERROR: {e}")
        record(f"WorldPop/{fname}", url, "ERROR", "N/A", None, f"NO — {e}", None)

# ──────────────────────────────────────────────────────────────────────────────
# TASK 4 — WorldCereal Cropland
# ──────────────────────────────────────────────────────────────────────────────

section("TASK 4 — ESA WorldCereal Cropland")

WORLDCEREAL_URLS = [
    ("https://ewoc-rdm-api.irri.org/search?model=WorldCerealMapProduct&geo=TGO", "worldcereal_irri.json"),
    ("https://zenodo.org/api/records?q=worldcereal+togo", "worldcereal_zenodo.json"),
]

for url, fname in WORLDCEREAL_URLS:
    print(f"\n>>> WorldCereal: {url}")
    try:
        r = requests.get(url, timeout=TIMEOUT,
                         headers={"User-Agent": "AgriMapTogo-Audit/1.0",
                                  "Accept": "application/json"})
        print(f"    HTTP {r.status_code}")
        if r.status_code == 200:
            try:
                data = r.json()
            except Exception:
                data = {"raw": r.text[:2000]}
            path = save(fname, data)
            # Handle both list and dict responses
            if isinstance(data, list):
                count = len(data)
                sample = data[:3]
            elif isinstance(data, dict):
                hits = data.get("hits", data.get("results", data.get("data", [])))
                if isinstance(hits, dict):
                    count_val = hits.get("total", hits.get("value", 0))
                    items = hits.get("hits", [])
                elif isinstance(hits, list):
                    items = hits
                    count_val = len(items)
                else:
                    items = []
                    count_val = 0
                count = count_val
                sample = items[:3] if items else [data]
            else:
                count = 0
                sample = []
            usable = f"YES — {count} record(s)" if (isinstance(count, int) and count > 0) else f"CHECK — count={count}"
            record(f"WorldCereal/{fname}", url, r.status_code, count, sample, usable, path)
            print(f"    Keys: {list(data.keys()) if isinstance(data, dict) else 'list'}")
        else:
            record(f"WorldCereal/{fname}", url, r.status_code, "N/A", None,
                   f"NO — HTTP {r.status_code}", None)
            print(f"    Body: {r.text[:300]}")
    except Exception as e:
        print(f"    ERROR: {e}")
        traceback.print_exc()
        record(f"WorldCereal/{fname}", url, "ERROR", "N/A", None, f"NO — {e}", None)

# ──────────────────────────────────────────────────────────────────────────────
# TASK 5 — FAOSTAT
# ──────────────────────────────────────────────────────────────────────────────

section("TASK 5 — FAOSTAT Agricultural Statistics")

FAOSTAT_URLS = [
    (
        "https://fenixservices.fao.org/faostat/api/v1/en/data/CAHD?area=213&element=5510&item=15&year=2020&show_codes=true&show_unit=true&show_flags=true",
        "faostat_cahd_togo.json",
        "Togo cropland 2020"
    ),
    (
        "https://fenixservices.fao.org/faostat/api/v1/en/areas",
        "faostat_areas.json",
        "FAOSTAT countries list"
    ),
    # Also try the broader query
    (
        "https://fenixservices.fao.org/faostat/api/v1/en/data/QCL?area=213&element=5510&item=27&year=2020,2021,2022&show_codes=true&show_unit=true",
        "faostat_qcl_togo.json",
        "Togo crop production QCL"
    ),
]

for url, fname, desc in FAOSTAT_URLS:
    print(f"\n>>> FAOSTAT: {desc}")
    try:
        r = requests.get(url, timeout=TIMEOUT,
                         headers={"User-Agent": "AgriMapTogo-Audit/1.0",
                                  "Accept": "application/json"})
        print(f"    HTTP {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            path = save(fname, data)
            items = data.get("data", data.get("Data", data.get("list", [])))
            if isinstance(items, list):
                count = len(items)
                sample = items[:3]
            else:
                count = 1
                sample = [items]
            print(f"    Count: {count}")
            if sample and count > 0:
                for s in sample[:3]:
                    print(f"    • {json.dumps(s, ensure_ascii=False)[:200]}")
            usable = f"YES — {count} record(s)" if count > 0 else "EMPTY"
            record(f"FAOSTAT/{desc}", url, r.status_code, count, sample, usable, path)
        else:
            record(f"FAOSTAT/{desc}", url, r.status_code, "N/A", None,
                   f"NO — HTTP {r.status_code}", None)
            print(f"    Body: {r.text[:300]}")
    except Exception as e:
        print(f"    ERROR: {e}")
        traceback.print_exc()
        record(f"FAOSTAT/{desc}", url, "ERROR", "N/A", None, f"NO — {e}", None)

# ──────────────────────────────────────────────────────────────────────────────
# TASK 6 — WFP VAM Food Markets
# ──────────────────────────────────────────────────────────────────────────────

section("TASK 6 — WFP VAM Food Markets")

WFP_URLS = [
    (
        "https://api.wfp.org/vam-data-bridges/2.0.0/Markets/GeoJSONList?CountryCode=TGO",
        "wfp_markets_api_tgo.json",
        "WFP VAM Markets API (may need key)"
    ),
    (
        "https://dataviz.vam.wfp.org/api/getmarkets?adm0Code=74",
        "wfp_markets_dataviz.json",
        "WFP DataViz markets adm0=74"
    ),
    # Also try the VAM API v1
    (
        "https://api.vam.wfp.org/marks/geojson?ac=TGO",
        "wfp_markets_vam_v1.json",
        "WFP VAM v1 geojson"
    ),
]

for url, fname, desc in WFP_URLS:
    print(f"\n>>> WFP: {desc}")
    try:
        r = requests.get(url, timeout=TIMEOUT,
                         headers={"User-Agent": "AgriMapTogo-Audit/1.0",
                                  "Accept": "application/json"})
        print(f"    HTTP {r.status_code}")
        if r.status_code == 200:
            try:
                data = r.json()
            except Exception:
                data = {"raw_text": r.text[:3000]}
            path = save(fname, data)
            # Handle GeoJSON or regular JSON
            if isinstance(data, dict):
                if data.get("type") == "FeatureCollection":
                    feats = data.get("features", [])
                    count = len(feats)
                    sample = feats[:3]
                else:
                    items = (data.get("items", data.get("markets", data.get("data", []))))
                    count = len(items) if isinstance(items, list) else 1
                    sample = items[:3] if isinstance(items, list) else [items]
            elif isinstance(data, list):
                count = len(data)
                sample = data[:3]
            else:
                count = 0
                sample = []
            print(f"    Count: {count}")
            usable = f"YES — {count} markets" if count > 0 else "CHECK — may need API key"
            record(f"WFP/{desc}", url, r.status_code, count, sample, usable, path)
        elif r.status_code == 401:
            record(f"WFP/{desc}", url, 401, "N/A", None,
                   "NO — 401 Unauthorized (API key required)", None)
            print(f"    → 401 Unauthorized — API key required")
            print(f"    Headers: {dict(r.headers)}")
        elif r.status_code == 403:
            record(f"WFP/{desc}", url, 403, "N/A", None,
                   "NO — 403 Forbidden (API key required)", None)
            print(f"    → 403 Forbidden")
        else:
            record(f"WFP/{desc}", url, r.status_code, "N/A", None,
                   f"NO — HTTP {r.status_code}", None)
            print(f"    Body: {r.text[:300]}")
    except Exception as e:
        print(f"    ERROR: {e}")
        record(f"WFP/{desc}", url, "ERROR", "N/A", None, f"NO — {e}", None)

# ──────────────────────────────────────────────────────────────────────────────
# FINAL SUMMARY REPORT
# ──────────────────────────────────────────────────────────────────────────────

section("SUMMARY REPORT — AgriMap Togo Open Data Audit")

# Save full summary
summary_path = save("audit_summary.json", RESULTS)
print(f"\nFull summary saved: {summary_path}")

print("\n{'SOURCE':<35} | {'STATUS':>6} | {'COUNT':>8} | {'USABLE'}")
print("-" * 80)
for r2 in RESULTS:
    src = r2["source"][:34]
    st  = str(r2["http_status"])[:6]
    cnt = str(r2["count"])[:8]
    use = r2["usable"][:40]
    print(f"{src:<35} | {st:>6} | {cnt:>8} | {use}")

print("\n")
viable   = [r2 for r2 in RESULTS if "YES" in str(r2["usable"])]
empty    = [r2 for r2 in RESULTS if "EMPTY" in str(r2["usable"])]
blocked  = [r2 for r2 in RESULTS if "NO" in str(r2["usable"]) or "ERROR" in str(r2["usable"])]

print(f"  🟢 Viable sources : {len(viable)}")
print(f"  🟡 Empty sources  : {len(empty)}")
print(f"  🔴 Blocked/Error  : {len(blocked)}")

if viable:
    print("\n  RECOMMENDED FOR ETL:")
    for r2 in viable:
        print(f"    ✅ {r2['source']:35} count={r2['count']:>8}  file={r2['raw_file']}")

print("\nAudit complete.")
