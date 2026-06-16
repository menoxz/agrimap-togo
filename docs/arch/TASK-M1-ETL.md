# TASK-M1 : Pipeline ETL — Téléchargement & nettoyage

## Mission
Construire le pipeline de téléchargement et nettoyage des 9 familles de données ouvertes depuis `geodata.gouv.tg` et `opendata.gouv.tg`. Chaque jeu de données doit être normalisé (CRS EPSG:4326, colonnes snake_case, types unifiés) et un rapport de qualité produit (taux de données manquantes, complétude).

## Input
- URLs des sources : configurées dans `etl/config.py`
- Répertoire cible : `data/raw/` → `data/processed/`

## Output
- `data/processed/` — 9 jeux nettoyés en GeoJSON + 1 fichier régions
- `data/public/metadata/quality.json` — rapport de qualité par jeu
- `data/tests/` — tests pytest validant la propreté des données

## Contraintes spécifiques
- [IMMUTABLE] Données ouvertes uniquement — citer et respecter les licences
- [IMMUTABLE] Aucune donnée nominative — ne jamais exposer d'identifiants personnels
- Reproductible : `python etl/run_all.py` doit tout générer
- Tous les fichiers vers `data/processed/` en GeoJSON, CRS EPSG:4326
- Documenter toute donnée manquante ou imprécise (transparence pour le jury)

## Définition of Done (vérifiable)
- [ ] `etl/run_all.py` s'exécute sans erreur
- [ ] 9 jeux de données nettoyés dans `data/processed/`
- [ ] Chaque jeu a un GeoJSON valide (vérifié par `ogr2ogr` ou validation Python)
- [ ] `data/public/metadata/quality.json` produit avec taux de complétude par jeu
- [ ] Tests pytest passent : `pytest data/tests/`
- [ ] Le rapport de qualité documente : source, date de téléchargement, nb d'enregistrements, taux de données manquantes par champ critique, note sur la précision géographique
