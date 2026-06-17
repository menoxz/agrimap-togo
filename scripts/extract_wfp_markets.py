# -*- coding: utf-8 -*-
import sys, csv, json
sys.stdout.reconfigure(encoding='utf-8')
RAW = 'data/raw'

print('=== WFP Food Prices Togo - market extraction ===')
markets = {}
row_count = 0
with open(f'{RAW}/wfp_food_prices_tgo.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        row_count += 1
        mk = row.get('market', '')
        if mk and mk not in markets:
            markets[mk] = {
                'market': mk,
                'market_id': row.get('market_id', ''),
                'admin1': row.get('admin1', ''),
                'admin2': row.get('admin2', ''),
                'latitude': row.get('latitude', ''),
                'longitude': row.get('longitude', ''),
            }

print(f'Total price rows: {row_count}')
print(f'Unique markets: {len(markets)}')
for mk, info in sorted(markets.items()):
    a1 = info['admin1']
    a2 = info['admin2']
    lat = info['latitude']
    lon = info['longitude']
    print(f'  {mk} | {a1}/{a2} | lat={lat} lon={lon}')

# Build GeoJSON
features = []
for info in markets.values():
    try:
        lat = float(info['latitude'])
        lon = float(info['longitude'])
        features.append({
            'type': 'Feature',
            'geometry': {'type': 'Point', 'coordinates': [lon, lat]},
            'properties': {k: v for k, v in info.items()}
        })
    except (ValueError, TypeError):
        pass

geojson = {'type': 'FeatureCollection', 'features': features}
outpath = f'{RAW}/wfp_markets_tgo.geojson'
with open(outpath, 'w', encoding='utf-8') as f:
    json.dump(geojson, f, ensure_ascii=False, indent=2)
print(f'\nGeoJSON: {outpath} ({len(features)} features)')
