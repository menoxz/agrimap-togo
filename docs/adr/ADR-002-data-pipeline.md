# ADR-002 : Data processing pipeline (ETL, format, storage)

**Status** : Accepted  
**Date** : 2026-06-16  
**Décisionnaire** : Architecte

---

## Contexte

Le pipeline ETL doit :

1. **Télécharger** les 9 familles de données depuis `geodata.gouv.tg` et `opendata.gouv.tg`
2. **Nettoyer** et **normaliser** (format, CRS unifié, colonnes, types)
3. **Analyser** selon 4 axes : densité, couverture ZAAP, accessibilité, réseau coopératif
4. **Exporter** au format adapté au frontend (GeoJSON, TopoJSON, JSON)

Les données sont de nature spatiale (points, lignes, polygones) et tabulaire.

Contraintes :
- Budget quasi nul → Python open source uniquement
- Pas de DB → fichiers plats
- Reproductible → scripts automatisés, pas de clics manuels
- Traçabilité → chaque étape documente son taux de données manquantes

## Décision

**Pipeline Python modulaire avec geopandas comme coeur spatial.**

```
data/raw/       ← Téléchargement (requests)
data/processed/ ← Nettoyage (pandas + geopandas)
data/public/    ← Export final (geopandas → GeoJSON + métadonnées JSON)
```

**Stack :**
- **Python 3.11+** — langage
- **requests** — téléchargement HTTP
- **pandas** — nettoyage tabulaire
- **geopandas** — opérations spatiales (lecture Shapefile, reprojection, jointure spatiale, buffer, intersection)
- **shapely** — opérations géométriques fines
- **contextily** — tiles de fond pour vérification visuelle
- **json / geojson** — export structuré

**Flux :**

1. `download.py` → récupère tous les fichiers depuis les APIs/portails open data
2. `inspect.py` → explore la structure, documente les colonnes et les trous
3. `clean.py` → standardise (CRS → EPSG:4326, noms de colonnes en snake_case, types)
4. `analyze_density.py` → exploitations par région/préfecture, heatmap
5. `analyze_zaap.py` → buffer ZAAP, intersection avec bassins de production
6. `analyze_accessibility.py` → distance aux marchés/pépinières (buffer + nearest neighbor)
7. `analyze_cooperatives.py` → maillage, densité coopérative, zones blanches
8. `export.py` → GeoJSON simplifié + TopoJSON + métadonnées

## Conséquences

**Positives :**
- Pipeline entièrement reproductible (`python run_all.py`)
- Chaque étape est testable unitairement
- Les métriques de qualité (taux de données manquantes, complétude) sont documentées pour chaque jeu
- Export optimisé pour le frontend (géométries simplifiées, attributs réduits au nécessaire)

**Négatives :**
- Taille des GeoJSON à surveiller (solution : simplification via `simplify()` de shapely + export TopoJSON pour les polygones complexes)
- Pas de visualisation interactive pendant le développement ETL (solution : Jupyter notebooks optionnels pour exploration)
- Les sources open data peuvent changer de format (solution : versionnage des fichiers raw téléchargés)

## Alternatives considérées

| Alternative | Raison du rejet |
|------------|----------------|
| **PostGIS + SQL** | Surcharge base de données pour 9 jeux statiques de taille modeste. Time to first result plus long |
| **QGIS Processing** | Dépendance GUI, difficile à automatiser en script, moins reproductible |
| **Node.js + Turf.js** | Géospatial en JS, mais l'écosystème data (pandas) est bien plus mature en Python pour le nettoyage tabulaire |
| **Manual data prep (Excel/QGIS)** | Non reproductible, source d'erreurs, impossible à documenter proprement pour le jury |

## Relations

- Parent : ADR-001 (architecture static-first)
- Les formats d'export sont consommés par le frontend (ADR-003)
