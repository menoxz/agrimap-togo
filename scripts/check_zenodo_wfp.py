# -*- coding: utf-8 -*-
import sys, json, requests
sys.stdout.reconfigure(encoding='utf-8')
RAW = 'data/raw'
H = {'User-Agent': 'AgriMapTogo-Audit/1.0', 'Accept': 'application/json'}

# --- Inspect Zenodo results ---
print('=== Zenodo WorldCereal - inspect sample ===')
with open(f'{RAW}/worldcereal_zenodo.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

hits = data.get('hits', {})
total = hits.get('total', {}).get('value', 0)
records = hits.get('hits', [])
print(f'Total Zenodo hits for "worldcereal togo": {total}')
print(f'Records in this page: {len(records)}')

# Categorize: software releases vs actual data products
software = []
data_products = []
for rec in records:
    meta = rec.get('metadata', {})
    title = meta.get('title', '')
    res_type = meta.get('resource_type', {}).get('type', '')
    if 'software' in res_type.lower() or 'worldcereal-classification' in title.lower() or 'worldcereal-processing' in title.lower():
        software.append(title)
    else:
        data_products.append({'id': rec.get('id'), 'title': title, 'doi': meta.get('doi',''), 'type': res_type})

print(f'\nSoftware releases: {len(software)}')
print(f'Data products: {len(data_products)}')
for d in data_products[:10]:
    print(f'  * [{d["type"]}] {d["title"]} | doi={d["doi"]}')

# Try more specific query
print('\n=== Zenodo: worldcereal cropland togo specific ===')
r2 = requests.get('https://zenodo.org/api/records?q=worldcereal+togo+cropland&size=10', timeout=60, headers=H)
print(f'HTTP {r2.status_code}')
if r2.status_code == 200:
    d2 = r2.json()
    hits2 = d2.get('hits', {})
    total2 = hits2.get('total', {}).get('value', 0)
    recs2 = hits2.get('hits', [])
    print(f'Total: {total2}, Returned: {len(recs2)}')
    for rec in recs2[:5]:
        meta = rec.get('metadata', {})
        title = meta.get('title', '?')
        doi = meta.get('doi', '?')
        res_type = meta.get('resource_type', {}).get('type', '?')
        print(f'  * [{res_type}] {title} | doi={doi}')
        fs = rec.get('files', [])
        for ff in fs[:2]:
            lnk = ff.get('links', {}).get('self', '?')
            print(f'    -> {lnk}')

# Also search for WorldCereal season maps (the actual products)
print('\n=== Zenodo: worldcereal season map africa 2021 ===')
r3 = requests.get('https://zenodo.org/api/records?q=worldcereal+season+annual+africa&size=5', timeout=60, headers=H)
print(f'HTTP {r3.status_code}')
if r3.status_code == 200:
    d3 = r3.json()
    hits3 = d3.get('hits', {})
    total3 = hits3.get('total', {}).get('value', 0)
    recs3 = hits3.get('hits', [])
    print(f'Total: {total3}')
    for rec in recs3[:5]:
        meta = rec.get('metadata', {})
        title = meta.get('title', '?')
        doi = meta.get('doi', '?')
        print(f'  * {title} | doi={doi}')
