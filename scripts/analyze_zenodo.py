# -*- coding: utf-8 -*-
import sys, json, requests
sys.stdout.reconfigure(encoding='utf-8')
RAW = 'data/raw'
H = {'User-Agent': 'AgriMapTogo-Audit/1.0', 'Accept': 'application/json'}

print('=== Zenodo WorldCereal - categorize sample ===')
with open(f'{RAW}/worldcereal_zenodo.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

hits = data.get('hits', {})
total = hits.get('total', 0)
recs = hits.get('hits', [])
print(f'Total records: {total}, Sample: {len(recs)}')

software_count = 0
data_products = []
for rec in recs:
    meta = rec.get('metadata', {})
    title = meta.get('title', '')
    res_type = meta.get('resource_type', {}).get('type', '')
    if res_type == 'software':
        software_count += 1
    else:
        fls = rec.get('files', [])
        data_products.append({
            'title': title,
            'type': res_type,
            'doi': meta.get('doi', ''),
            'file_count': len(fls)
        })

print(f'Software releases: {software_count}')
print(f'Data products in sample: {len(data_products)}')
for d in data_products[:8]:
    t = d['type']
    ti = d['title']
    doi = d['doi']
    fc = d['file_count']
    print(f'  [{t}] {ti} ({fc} files) | {doi}')

# More specific search
print()
print('=== Zenodo: worldcereal v200 cropland ===')
r2 = requests.get(
    'https://zenodo.org/api/records?q=worldcereal+v200+cropland&size=10&sort=bestmatch',
    timeout=60, headers=H
)
print(f'HTTP {r2.status_code}')
if r2.status_code == 200:
    d2 = r2.json()
    h2 = d2.get('hits', {})
    recs2 = h2.get('hits', [])
    total2 = h2.get('total', 0)
    print(f'Total: {total2}, Returned: {len(recs2)}')
    for rec in recs2[:6]:
        meta = rec.get('metadata', {})
        title = meta.get('title', '?')
        res_type = meta.get('resource_type', {}).get('type', '?')
        doi = meta.get('doi', '?')
        fls = rec.get('files', [])
        print(f'  [{res_type}] {title} | {doi} | {len(fls)} files')
        for ff in fls[:2]:
            key = ff.get('key', '?')
            lnk = ff.get('links', {}).get('self', '?')
            print(f'    -> {key}: {lnk}')
