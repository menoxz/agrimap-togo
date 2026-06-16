# AgriMap Togo — Stack Technique

> Décisions par couche avec justification et alternatives rejetées.
> Date : 2026-06-16 | Deadline : 2026-06-22

## Résumé (TL;DR)

**Static-first** : tout le calcul lourd est fait **offline** en Python (ETL), le frontend React sert des GeoJSON précalculés servis statiquement via Nginx. Aucune base de données, aucun backend au runtime. Maximum de simplicité, minimum de dépendances, déploiement trivial.

---

## Tableau des décisions

| Layer | Décision | Rationale | Alternatives rejetées |
|-------|----------|-----------|----------------------|
| **Langage ETL** | Python 3.11+ | Écosystème data (pandas, geopandas, shapely, rasterio) ; lisible, IDÉAL pour transformation GeoJSON | Node.js (écosystème GIS immature), R (courbe d'apprentissage, pas adapté au web) |
| **Data processing** | pandas + geopandas + shapely | Manipulation directe de GeoJSON, opérations spatiales (buffer, join, intersect), export natif | PostGIS (surcharge base de données, pas nécessaire pour 9 jeux statiques), QGIS headless (dépendance lourde) |
| **Spatial index** | Spatial index natif geopandas | Inclus dans geopandas, suffisant pour 9 jeux de données de taille modeste | Uber H3 (overkill pour ce volume), PostGIS spatial index |
| **Format de livraison** | GeoJSON + TopoJSON | Standard du web mapping, support natif Leaflet, facile à déboguer | Shapefile (obsolète pour le web), MBTiles (surcharge serveur), PMTiles (expérimental) |
| **Frontend framework** | Vite + React 18 + TypeScript | Écosystème mature, react-leaflet natif, i18n via react-i18next, Vite pour builds rapides (~3s) | Next.js (SSR inutile pour site statique, complexité ajoutée), Svelte (écosystème mapping moins riche), Vue 3 (bon mais react-i18next plus mature) |
| **Mapping library** | Leaflet 1.9 + react-leaflet 4 | Léger (~40 KB gzippé), excellent support mobile, pas de clé API requise, large choix de plugins | MapLibre GL (3D mais + lourd, nécessite serveur de tiles ou API key pour basemaps), OpenLayers (puissant mais courbe d'apprentissage raide) |
| **Basemap tiles** | OpenStreetMap (tile.openstreetmap.org) | Gratuit, pas de clé API, couverture Togo OK. Fallback prévu en cas de limite de débit | Mapbox (payant après quota gratuit), Stadia/Maptiler (clé API requise) |
| **i18n** | react-i18next | Standard React i18n, lazy loading des traductions, interpolation, pluralisation | react-intl (plus verbeux), react-polyglot (moins d'écosystème) |
| **State management** | React hooks + context | Pas de state management global nécessaire (pas de données mutables côté client) | Redux (overkill pour dashboard statique), Zustand (utile mais pas nécessaire ici) |
| **Styling** | Tailwind CSS 3 + PostCSS | Utility-first rapide, responsive natif, build minimal (purge CSS), accessible | Bootstrap (lourd, moins flexible), CSS Modules (plus lent à développer), Styled Components (JS runtime) |
| **Charts / Dataviz** | Chart.js 4 + react-chartjs-2 | Léger (~20 KB gzippé), charts bar/radar/pie pour indicateurs, animations fluides | D3.js (trop bas niveau, lent à développer), Recharts (plus lourd, dépendant de D3) |
| **Responsive / Mobile** | Tailwind breakpoints + touch events Leaflet | Mobile-first dans Tailwind, Leaflet gère nativement le touch, viewport meta | Framework mobile dédié (inutile pour un site web responsive) |
| **Accessibilité** | WCAG 2.1 AA + ColorBrewer palettes | ColorBrewer pour cartes (palettes adaptées daltoniens), contrastes WCAG, labels ARIA | Outil dédié (intégré dans la conception) |
| **Server HTTP** | Nginx (sur VPS existant) | Léger, haute perf pour fichiers statiques, SSL/TLS via Let's Encrypt, cache configurable | Apache (plus lourd, config plus verbeuse), Caddy (pas installé sur le VPS) |
| **HTTPS** | Let's Encrypt via Certbot | Gratuit, automatisé, large compatibilité | Auto-signed (non sécurisé), Cloudflare (nécessite modification DNS) |
| **Déploiement** | rsync + Makefile | Simple, reproductible, pas de dépendance CI/CD externe | Docker (surcharge pour site statique), GitHub Actions (nécessite accès SSH, possible mais plus complexe) |
| **Versionnement** | Git (GitHub) | Standard, gratuit, backup ; pas de CI/CD obligatoire | Pas de versionnement (risqué pour projet solo avec deadline) |
| **IDE / AI Assist** | VS Code + opencode | Déjà en place, fluide pour React/Python/TypeScript | Autres éditeurs (pas pertinents) |

---

## Architecture (diagramme conceptuel)

```
┌─────────────────────────────────────────────────────────────────────┐
│                          VPS (favoured.cloud)                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                        Nginx (port 443)                      │  │
│  │  ┌─────────────┐  ┌────────────────┐  ┌──────────────────┐  │  │
│  │  │ Static files │  │ /locales/*.json│  │ /data/*.geojson  │  │  │
│  │  │ (React SPA)  │  │ (i18n FR/EN)   │  │ (pre-computed)   │  │  │
│  │  └─────────────┘  └────────────────┘  └──────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                ▲
                                │ rsync / scp
                                │
┌─────────────────────────────────────────────────────────────────────┐
│                      Build Machine (dev)                            │
│  ┌──────────┐   ┌──────────────┐   ┌────────────────────────────┐  │
│  │ ETL      │──▶│ Analysis     │──▶│ Export (GeoJSON + locales)│  │
│  │ (Python) │   │ (geopandas)  │   │ + Build (Vite/React)      │  │
│  └──────────┘   └──────────────┘   └────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

## Empreinte estimée

| Ressource | Estimation | Notes |
|-----------|-----------|-------|
| Taille des données GeoJSON | ~5-15 MB | Après compression TopoJSON si nécessaire |
| Build frontend (gzippé) | ~150-250 KB | React + Leaflet + Tailwind (purge) |
| RAM VPS nécessaire | ~256-512 MB | Nginx + OS, site statique |
| CPU VPS | Négligeable | Aucun calcul runtime |
| Bande passante par visite | ~2-5 MB | Données GeoJSON chargées sélectivement |
