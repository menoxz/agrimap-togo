# ADR-007 : Architecture préfecture-first — remaniement complet ETL + frontend

**Status** : Accepted  
**Date** : 2026-06-17  
**Décisionnaire** : CTO/Architecte  

---

## Contexte

L'application AgriMap Togo présentait une architecture interactive basée sur les régions (ADM1, 5 unités). L'utilisateur final a besoin d'une granularité préfecture (ADM2, 37 unités) pour :

1. Voir les disparités infra-régionales de couverture des services agricoles
2. Interagir directement avec sa préfecture d'intérêt
3. Obtenir des indicateurs spécifiques à la préfecture

Les analyses M2 (densité, ZAAP, accessibilité, coopératives) et la synthèse étaient calculées **exclusivement au niveau région**. Le GeoJSON préfecture (`prefecture_synthesis.geojson`) ne contenait que des comptages bruts sans les scores normalisés.

## Décision

### 1. Refactor ETL — paramètre `level`

Les 4 scripts d'analyse M2 + `synthesize.py` acceptent un paramètre `level: Literal["region", "prefecture"]` :

```
analyze_density(level)       → output density_{level}.geojson
analyze_zaap(level)          → output zaap_coverage_{level}.geojson
analyze_accessibility(level) → output accessibility_{level}.geojson
analyze_cooperatives(level)  → output cooperative_network_{level}.geojson
synthesize(level)            → output synthesis_{level}.geojson
```

Quand `level="prefecture"` :
- Charger les frontières ADM2 (`geoBoundaries-TGO-ADM2.geojson`) au lieu de ADM1
- Clé de jointure : `nom_prefecture` au lieu de `nom_region`
- Classification adaptée (quantile avec 37 items)
- Output suffixé `_prefecture`

### 2. Analyse préfecture enrichie

`analyze_prefectures.py` est enrichi pour consommer les 4 outputs préfecture et produire un `prefecture_synthesis.geojson` avec tous les champs de score M2.

### 3. Frontend — couches préfecture unifiées

Les 5 couches d'analyse (DensityLayer, ZAAPLayer, AccessibilityLayer, CoopLayer, SynthesisLayer) chargent désormais `prefecture_synthesis.geojson` et colorent les 37 préfectures. Le mécanisme de commutation par type d'analyse (`visible={activeLayer === '...'}`) reste inchangé.

### 4. Interaction préfecture-first

- Clic préfecture → `PrefectureDetailPanel` (déjà existant, enrichi des nouveaux scores)
- `ZoneDetailPanel` retiré de ExplorePage
- `RegionPopup` remplacé par `PrefecturePopup`
- Highlight préfecture sélectionnée maintenu (pane z=450)

## Conséquences

**Positives :**
- L'utilisateur final voit et interagit avec les 37 préfectures
- 0 régression région : `level="region"` continue de fonctionner pour les vues statiques (homepage)
- Un seul GeoJSON source pour toutes les couches préfecture → maintenance facilitée
- Les WorldPop par préfecture (données orphelines) sont enfin exploitées

**Négatives :**
- Les seuils de classification doivent être réévalués pour 37 items (vs 5)
- Les règles métier de `analyze_cooperatives` (>=5 coops = bon) ne s'appliquent plus à l'échelle préfecture

## Alternatives considérées

1. **Patch minimal** : modifier seulement le frontend pour colorer les préfectures avec les scores région existants → rejeté car les scores région ne reflètent pas les disparités infra-régionales
2. **4 nouveaux scripts M2 dédiés** : création de `analyze_density_prefecture.py` etc. → rejeté car duplication de code massive. Choix du paramètre `level` pour mutualisation.
3. **Une seule couche choroplèthe unifiée** au lieu de 5 → rejeté car chaque analyse a sa palette ColorBrewer, ses class breaks et ses popups spécifiques. 5 couches = meilleure séparation des responsabilités.

## Dépendances

- `config.py` : ajouter `PREFECTURES`, `PREFECTURE_AREA_KM2`, `ADM2_PATH`
- `data/raw/geoBoundaries-TGO-ADM2.geojson` : déjà présent
- `data/raw/worldpop_by_prefecture.json` : déjà présent
