# -*- coding: utf-8 -*-
import sys, json, requests
sys.stdout.reconfigure(encoding='utf-8')
RAW = 'data/raw'
H = {'User-Agent': 'AgriMapTogo-Audit/1.0', 'Accept': 'application/json'}

# --- FAOSTAT alternatives ---
print('=== FAOSTAT alternatives ===')
fao_urls = [
    ('https://www.fao.org/faostat/api/v1/en/data/CAHD?area=213&element=5510&item=15&year=2020&show_codes=true&show_unit=true', 'faostat_www_cahd.json', 'FAO www CAHD'),
    ('https://fenixservices.fao.org/faostat/api/v1/en/data/QCL?area=213&element=5510&item=27&year=2020&show_codes=true', 'faostat_fenix_qcl.json', 'FAOSTAT fenix QCL'),
    # Try the actual FAOSTAT bulk API
    ('https://www.fao.org/faostat/en/api/areas', 'faostat_areas2.json', 'FAO areas list'),
]
for url, fname, desc in fao_urls:
    print(f'  Testing: {desc}')
    try:
        r = requests.get(url, timeout=30, headers=H, allow_redirects=True)
        ct = r.headers.get('content-type', '?')[:60]
        print(f'  HTTP {r.status_code} | content-type={ct} | size={len(r.content)}b')
        if r.status_code == 200:
            try:
                data = r.json()
                with open(f'{RAW}/{fname}', 'w', encoding='utf-8') as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
                items = data.get('data', data.get('Data', []))
                cnt = len(items) if isinstance(items, list) else 1
                print(f'  Count: {cnt}')
                if isinstance(items, list) and items:
                    print(f'  Sample: {json.dumps(items[:2], ensure_ascii=False)[:300]}')
                print(f'  Saved: {RAW}/{fname}')
            except Exception as e:
                print(f'  Not JSON ({e}): {r.text[:200]}')
        else:
            print(f'  Body: {r.text[:200]}')
    except Exception as e:
        print(f'  Error: {e}')

# --- WFP via HDX direct CSV download ---
print()
print('=== WFP Togo Food Prices via HDX ===')
wfp_hdx_url = 'https://data.humdata.org/dataset/f6b47ff7-48aa-4e13-b2e7-e5e487d43c19/resource/13b52287-f019-49a3-aa56-1480f2aab026/download/wfp_food_prices_tgo.csv'
try:
    r = requests.get(wfp_hdx_url, timeout=60, headers=H, allow_redirects=True)
    print(f'  HTTP {r.status_code} | size={len(r.content)}b')
    if r.status_code == 200:
        lines = r.text.replace('\r\n','\n').split('\n')
        print(f'  CSV rows: {len(lines)}')
        print(f'  Header: {lines[0][:200]}')
        for line in lines[1:4]:
            print(f'  Row: {line[:200]}')
        with open(f'{RAW}/wfp_food_prices_tgo.csv', 'w', encoding='utf-8') as f:
            f.write(r.text)
        print(f'  Saved: {RAW}/wfp_food_prices_tgo.csv')
    else:
        print(f'  Body: {r.text[:200]}')
except Exception as e:
    print(f'  Error: {e}')

# --- WFP HungerMap ---
print()
print('=== WFP HungerMap Togo ===')
try:
    r2 = requests.get('https://api.hungermapdata.org/v2/info/country/TGO', timeout=30, headers=H)
    print(f'  HTTP {r2.status_code}')
    if r2.status_code == 200:
        data2 = r2.json()
        with open(f'{RAW}/wfp_hungermap_tgo.json', 'w', encoding='utf-8') as f:
            json.dump(data2, f, ensure_ascii=False, indent=2)
        print(f'  Keys: {list(data2.keys()) if isinstance(data2, dict) else "list"}')
        print(f'  Saved: {RAW}/wfp_hungermap_tgo.json')
    else:
        print(f'  Body: {r2.text[:200]}')
except Exception as e:
    print(f'  Error: {e}')

# --- WorldCereal stac endpoint ---
print()
print('=== WorldCereal STAC catalog ===')
stac_urls = [
    'https://stac.ewoc-project.eu/worldcereal/v2',
    'https://ewoc-project.eu/api/v1/maps?country=TGO',
]
for url in stac_urls:
    try:
        r3 = requests.get(url, timeout=20, headers=H)
        print(f'  {url} => HTTP {r3.status_code}')
        if r3.status_code == 200:
            try:
                d3 = r3.json()
                print(f'  Keys: {list(d3.keys()) if isinstance(d3,dict) else "list"}')
                with open(f'{RAW}/worldcereal_stac.json', 'w', encoding='utf-8') as f:
                    json.dump(d3, f, ensure_ascii=False, indent=2)
            except Exception:
                print(f'  Body: {r3.text[:200]}')
    except Exception as e:
        print(f'  Error: {e}')
