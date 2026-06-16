# AgriMap Togo — Découpage modulaire

> 6 modules couvrant l'intégralité des cas d'usage P1.
> Complexité : **S** (petite, < 100 lignes), **M** (moyenne, 100-500 lignes), **L** (grande, > 500 lignes).

---

## Carte des modules

```
ETL Pipeline ──▶ Analysis Engine ──▶ Frontend Core ──▶ Map & Viz ──▶ Storytelling
      │                │                  │                 │              │
      └────────────────┴──────────────────┴─────────────────┴──────────────┘
                                            │
                                     Deployment & DevOps
```

---

## M1 — ETL Pipeline

| Champ | Valeur |
|-------|--------|
| **Responsabilité** | Téléchargement, nettoyage, normalisation et validation des 9 familles de données ouvertes |
| **Interface** | `data/raw/` (entrée) → scripts Python → `data/processed/` (sortie) |
| **Périmètre** | 9 familles de données depuis `geodata.gouv.tg` et `opendata.gouv.tg` |
| **Dépendances** | Python 3.11+, pandas, geopandas, requests, shapely |
| **Complexité** | M (~400 lignes sur 3-4 scripts) |
| **Cas d'usage couverts** | UC-01, UC-02, UC-07, UC-09, UC-10, UC-11 (tous nécessitent des données propres) |

### Scripts

| Script | Responsabilité |
|--------|---------------|
| `download.py` | Récupère tous les fichiers depuis les portails open data |
| `inspect.py` | Analyse la structure, documente les colonnes et les taux de données manquantes |
| `clean.py` | Standardisation (CRS → EPSG:4326, noms snake_case, types unifiés) |

### DoD vérifiable

- [ ] Tous les 9 jeux de données sont téléchargés et nettoyés
- [ ] CRS unifié en EPSG:4326 pour toutes les données spatiales
- [ ] Rapport de qualité produit (taux de données manquantes par jeu)
- [ ] Tests pytest passent sur les données nettoyées
- [ ] Un schéma de validation existe pour chaque jeu

---

## M2 — Analysis Engine

| Champ | Valeur |
|-------|--------|
| **Responsabilité** | Calcul des 4 analyses spatiales et production des GeoJSON prêts pour le frontend |
| **Interface** | `data/processed/` (entrée) → scripts → `data/public/` (sortie GeoJSON + JSON métadonnées) |
| **Périmètre** | Densité exploitations, couverture ZAAP, accessibilité, maillage coopératif + synthèse priorisation |
| **Dépendances** | geopandas, shapely, contextily, scipy (pour les calculs de distance), json, math |
| **Complexité** | L (~800 lignes sur 5 scripts) |
| **Cas d'usage couverts** | UC-01, UC-02, UC-03, UC-04, UC-07, UC-09, UC-10 |

### Scripts

| Script | Responsabilité |
|--------|---------------|
| `analyze_density.py` | Calcul densité exploitations par région/préfecture → heatmap GeoJSON + stats |
| `analyze_zaap.py` | Buffer ZAAP, intersection avec bassins, identification des zones non couvertes |
| `analyze_accessibility.py` | Distance marchés/pépinières → buffer isochrones, zones mal desservies |
| `analyze_cooperatives.py` | Maillage coopératif, densité, zones blanches d'organisation |
| `synthesize.py` | Superposition pondérée des 4 analyses → carte de priorisation « Où investir » |
| `export.py` | Optimisation GeoJSON (simplification géométries, réduction attributs, TopoJSON) + métadonnées |

### DoD vérifiable

- [ ] 4 fichiers GeoJSON d'analyse produits + 1 fichier de synthèse
- [ ] Chaque fichier GeoJSON < 5 MB (après simplification si nécessaire)
- [ ] Métadonnées JSON produites (méthode, date, licence, limites)
- [ ] Les zones blanches sont identifiables dans chaque analyse
- [ ] Tests pytest passent (validité géométrie, cohérence spatiale)

---

## M3 — Frontend Core

| Champ | Valeur |
|-------|--------|
| **Responsabilité** | Application React SPA : routage, i18n, layout, composants communs |
| **Interface** | Navigateur → composants React ; API : chargement GeoJSON fetch, context React |
| **Périmètre** | Routing SPA, bascule de langue, layout responsive, page d'accueil, barre de navigation, pied de page |
| **Dépendances** | Vite, React 18, TypeScript, Tailwind CSS, react-i18next, react-router-dom |
| **Complexité** | M (~500 lignes sur 10+ composants) |
| **Cas d'usage couverts** | UC-06, UC-12, UC-13, UC-15, UC-16 |

### Composants clés

| Composant | Responsabilité |
|-----------|---------------|
| `App.tsx` | Root : router, layout provider |
| `Layout.tsx` | Header (logo, langue, navigation), footer, contenu |
| `LanguageSwitcher.tsx` | Bascule FR/EN |
| `NavBar.tsx` | Menu responsive (burger sur mobile) |
| `Accroche.tsx` | Page d'accueil : message fort + carte d'entrée |
| `StoryContainer.tsx` | Conteneur de lecture guidée pour les 4 actes |
| `ReportPage.tsx` | Page du rapport complet |

### DoD vérifiable

- [ ] Application build sans erreur TypeScript
- [ ] Bascule de langue fonctionnelle et instantanée
- [ ] Layout responsive (mobile + desktop)
- [ ] Page d'accueil avec accroche visible en < 3s chargement
- [ ] Tests Vitest des composants critiques passent

---

## M4 — Map & Visualization

| Champ | Valeur |
|-------|--------|
| **Responsabilité** | Intégration Leaflet, couches cartographiques, filtres, légendes, clustering |
| **Interface** | Props React → Leaflet layers ; chargement GeoJSON depuis `/data/` |
| **Périmètre** | Toutes les couches de données, filtres, indicateurs visuels, popups, légende |
| **Dépendances** | leaflet, react-leaflet, leaflet.markercluster, leaflet-defaulticon-compatibility |
| **Complexité** | L (~700 lignes sur 8+ composants) |
| **Cas d'usage couverts** | UC-01, UC-02, UC-03, UC-04, UC-07, UC-09, UC-10, UC-11 |

### Composants clés

| Composant | Responsabilité |
|-----------|---------------|
| `TogoMap.tsx` | Carte Leaflet centrée sur Togo, basemap OSM |
| `DataLayer.tsx` | Couche générique : charge un GeoJSON, le rend sur la carte |
| `DensityLayer.tsx` | Carte de densité (choroplèthe par région/préfecture) |
| `ZAAPLayer.tsx` | Périmètres ZAAP + zones non couvertes |
| `AccessibilityLayer.tsx` | Marchés, pépinières, buffers d'accessibilité |
| `CoopLayer.tsx` | Coopératives, maillage, zones blanches |
| `SynthesisLayer.tsx` | Carte de priorisation « Où investir » |
| `FilterPanel.tsx` | Filtres : région, type, services, ZAAP |
| `MapLegend.tsx` | Légende dynamique selon la couche active |
| `RegionPopup.tsx` | Infobulle avec indicateurs clés par région |

### DoD vérifiable

- [ ] Carte Leaflet centrée sur Togo, zoom par région possible
- [ ] 4 couches d'analyse + 1 couche de synthèse rendues correctement
- [ ] Filtres fonctionnels (région, type d'exploitation, présence ZAAP)
- [ ] Légende dynamique s'adapte à la couche active
- [ ] Popups affichent les indicateurs avec traductions FR/EN
- [ ] Performance acceptable (< 2s rendu initial)

---

## M5 — Storytelling Layout

| Champ | Valeur |
|-------|--------|
| **Responsabilité** | Mise en page de la lecture guidée : navigation entre actes, animations, transition de cartes |
| **Interface** | Composants React + CSS Tailwind ; transition de scènes + synchronisation carte |
| **Périmètre** | Scroller narrative, 4 actes, synthèse, fiches zones prioritaires |
| **Dépendances** | React, Tailwind CSS, Intersection Observer API (scroll detection) |
| **Complexité** | M (~400 lignes sur 5 composants) |
| **Cas d'usage couverts** | UC-03, UC-05, UC-12, UC-13, UC-17 |

### Composants clés

| Composant | Responsabilité |
|-----------|---------------|
| `ActContainer.tsx` | Conteneur d'un acte : titre, texte, visualisation |
| `StoryNavigator.tsx` | Barre de progression / navigation entre les actes |
| `SynthesisView.tsx` | Vue synthèse : carte prioritaire + recommandations |
| `ZoneCard.tsx` | Fiche d'une zone prioritaire (indicateurs, carte miniature) |
| `ShareWidget.tsx` | Widget partage (visuel + message clé) |

### DoD vérifiable

- [ ] Navigation séquentielle entre les 4 actes + synthèse
- [ ] Scroll fluide avec synchronisation carte
- [ ] Accès direct à chaque acte depuis le menu
- [ ] Fiches zones prioritaires affichées avec indicateurs
- [ ] Widget partage fonctionnel
- [ ] Mode exploration libre accessible depuis le menu

---

## M6 — Deployment & DevOps

| Champ | Valeur |
|-------|--------|
| **Responsabilité** | Configuration Nginx, automatisation du build/deploy, CI, monitoring |
| **Interface** | Makefile, scripts shell, nginx.conf |
| **Périmètre** | Build ETL + frontend, déploiement VPS, SSL, tests CI |
| **Dépendances** | Nginx, rsync, certbot, GitHub Actions (optionnel) |
| **Complexité** | S (~200 lignes total sur config + scripts) |
| **Cas d'usage couverts** | Tous (infrastructure) |

### Fichiers

| Fichier | Responsabilité |
|---------|---------------|
| `Makefile` | Commandes `make build`, `make deploy`, `make test` |
| `deploy/nginx.conf` | Configuration Nginx |
| `deploy/setup.sh` | Script d'initialisation du serveur (création dossier, permissions) |
| `.github/workflows/ci.yml` | CI GitHub Actions (tests + i18n check) |

### DoD vérifiable

- [ ] `make deploy` fonctionne et met à jour le site
- [ ] HTTPS opérationnel (Let's Encrypt)
- [ ] Cache Nginx configuré (assets: 1 an, data: 1h, locales: pas de cache)
- [ ] Gzip activé
- [ ] Le site est accessible publiquement sur `agrimap.favoured.cloud`
- [ ] Les tests passent en CI (si GitHub Actions configuré)

---

## Couverture des cas d'usage P1

| ID | Cas d'usage | Module P1 | Priorité |
|----|-------------|-----------|----------|
| UC-01 | Carte densité exploitations | M2, M4 | P1 |
| UC-02 | Bassins non couverts ZAAP | M2, M4 | P1 |
| UC-03 | Carte synthèse « où investir » | M2, M4, M5 | P1 |
| UC-06 | Dashboard en anglais | M3, (ADR-004) | P1 |
| UC-07 | Zones à potentiel sous-équipées | M2, M4, M5 | P1 |
| UC-09 | Maillage coopératif | M2, M4 | P1 |
| UC-12 | Message fort < 30s | M3, M5 | P1 |
| UC-13 | Lecture guidée 4 actes | M3, M5 | P1 |
| UC-14 | Rapport accessible | M3 | P1 |

**Tous les 9 cas d'usage P1 sont couverts par au moins 2 modules** (redondance = robustesse).
