# -*- coding: utf-8 -*-
import sys, json, time, requests
sys.stdout.reconfigure(encoding='utf-8')
RAW = 'data/raw'
OVERPASS = 'https://overpass-api.de/api/interpreter'
HEADERS = {'User-Agent': 'AgriMapTogo-Audit/1.0'}

# Wait for rate limit
print('Waiting 45s for Overpass rate limit...')
time.sleep(45)

queries = {
    'farmland': {
        'query': '[out:json][timeout:90];\narea["ISO3166-1"="TG"]->.togo;\n(\n  way["landuse"="farmland"](area.togo);\n  way["landuse"="farm"](area.togo);\n  node["landuse"="farmland"](area.togo);\n);\nout center; out count;',
        'file': 'osm_farmland_raw.json'
    },
    'agri_points': {
        'query': '[out:json][timeout:60];\narea["ISO3166-1"="TG"]->.togo;\n(\n  node["shop"="agrarian"](area.togo);\n  node["office"="agricultural"](area.togo);\n  node["amenity"="agri_cooperative"](area.togo);\n  node["landuse"="greenhouse_horticulture"](area.togo);\n);\nout body;',
        'file': 'osm_agri_points_raw.json'
    }
}

for qname, qdef in queries.items():
    print(f'\n>>> Retrying {qname}...')
    t0 = time.time()
    try:
        r = requests.post(OVERPASS, data={'data': qdef['query']}, timeout=120, headers=HEADERS)
        elapsed = round(time.time()-t0, 1)
        print(f'  HTTP {r.status_code} in {elapsed}s')
        if r.status_code == 200:
            data = r.json()
            els = data.get('elements', [])
            count_el = [e for e in els if e.get('type') == 'count']
            real_els = [e for e in els if e.get('type') != 'count']
            if count_el:
                tags = count_el[0].get('tags', {})
                total = int(tags.get('total', len(real_els)))
                print(f'  OSM count tags: {tags} => total={total}')
            else:
                total = len(real_els)
                print(f'  Direct count: {total} elements')
            with open(f'{RAW}/{qdef["file"]}', 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            print(f'  Sample: {json.dumps(real_els[:2], ensure_ascii=False)[:400]}')
            print(f'  Saved: {RAW}/{qdef["file"]}')
        elif r.status_code == 429:
            print(f'  Still rate limited (429). Waiting more...')
            time.sleep(60)
        else:
            print(f'  Failed: {r.text[:200]}')
    except Exception as e:
        print(f'  Error: {e}')
    if qname == 'farmland':
        print('  Waiting 30s before next query...')
        time.sleep(30)
