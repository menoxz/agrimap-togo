# TASK-M2 : Analysis Engine — 4 analyses spatiales + synthèse

## Mission
À partir des données nettoyées de M1, produire les 4 analyses spatiales demandées par le Data Challenge : (1) densité des exploitations par région/préfecture, (2) couverture ZAAP et bassins non couverts, (3) accessibilité aux marchés et pépinières, (4) maillage coopératif et zones blanches. Produire également une synthèse « Où investir » par superposition pondérée.

## Input
- `data/processed/` — 9 jeux de données nettoyés (GeoJSON)
- Découpages administratifs (régions, préfectures)

## Output
- `data/public/analysis/density.geojson` — carte de densité (choroplèthe)
- `data/public/analysis/zaap_coverage.geojson` — couverture ZAAP + zones non couvertes
- `data/public/analysis/accessibility.geojson` — buffers d'accessibilité marchés/pépinières
- `data/public/analysis/cooperative_network.geojson` — maillage coopératif + zones blanches
- `data/public/analysis/synthesis.geojson` — synthèse priorisation
- `data/public/metadata/` — métadonnées de chaque analyse

## Contraintes spécifiques
- [IMMUTABLE] Accessibilité visuelle → utiliser les palettes ColorBrewer (adaptées daltoniens)
- [IMMUTABLE] Ton constructif → les zones « mal desservies » sont des « opportunités d'investissement »
- Chaque GeoJSON doit être < 5 MB (taille max pour chargement bas débit)
- Simplifier les géométries avec `shapely.simplify()` si nécessaire (tolérance conservant la forme des régions)
- Documenter la méthode de chaque analyse dans les métadonnées (pour le jury)

## Méthodes attendues

### Densité (analyze_density.py)
- Compter les exploitations par région/préfecture
- Normaliser par surface (exploitations/km²)
- Produire un choroplèthe par région + un point heatmap optionnel

### Couverture ZAAP (analyze_zaap.py)
- Buffer de 5 km autour des ZAAP (rayon de couverture raisonnable)
- Intersection avec les bassins de production (zones de forte densité)
- Marquer les bassins hors buffer comme « non couverts »

### Accessibilité (analyze_accessibility.py)
- Buffer isochrone approximatif : 10 km autour marchés, 15 km autour pépinières
- Zones de production hors buffer = « mal desservies »
- Calculer un indicateur composite par région

### Coopératives (analyze_cooperatives.py)
- Densité de coopératives par région
- Zones de production sans coopérative dans un rayon de 10 km = « zone blanche organisation »

### Synthèse (synthesize.py)
- Superposition pondérée des 4 analyses (poids : densité 0.25, ZAAP 0.30, accessibilité 0.25, coopératives 0.20)
- Score composite par zone → classement des priorités d'investissement

## Définition of Done (vérifiable)
- [ ] 5 fichiers GeoJSON d'analyse produits (4 analyses + 1 synthèse)
- [ ] Chaque fichier < 5 MB (vérifié par test)
- [ ] Les géométries sont valides (vérifié par `geopandas.is_valid`)
- [ ] Métadonnées JSON produites pour chaque analyse (méthode, date, limites)
- [ ] Palettes ColorBrewer utilisées et documentées
- [ ] Tests pytest passent : `pytest data/tests/`
