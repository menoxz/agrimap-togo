# Source des frontières régionales (Togo ADM1)

Ce dossier contient le jeu de données **réel** utilisé par AgriMap pour les régions du Togo.

## Fichier

- `geoBoundaries-TGO-ADM1.geojson`

## Provenance

- Fournisseur: **geoBoundaries (gbOpen)**
- Endpoint source: `https://www.geoboundaries.org/api/current/gbOpen/TGO/ADM1/`
- Téléchargement (snapshot versionné):
  `https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/9469f09/releaseData/gbOpen/TGO/ADM1/geoBoundaries-TGO-ADM1.geojson`
- Identifiant dataset: `TGO-ADM1-44829518`
- Année représentée: `2017`
- Unités ADM1 attendues: `5`

## Licence

- Licence: **Open Data Commons Open Database License (ODbL) v1.0**
- Source licence: `https://www.openstreetmap.org/copyright`

## Notes d’intégration AgriMap

- Mapping de noms appliqué: `shapeName -> nom_region`
  - Maritime Region -> Maritime
  - Plateaux Region -> Plateaux
  - Centrale Region -> Centrale
  - Kara Region -> Kara
  - Savanes Region -> Savanes
- Champs propagés dans `data/processed/regions.geojson`:
  - `id_region`, `nom_region`, `region`, `name_en`, `capitale`,
    `population`, `superficie_km2`, `source`, `licence`, `dataset_version`
