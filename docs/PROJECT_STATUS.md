# Project Status — AgriMap Togo

> Date : 2026-06-16 | Deadline : 2026-06-22
> Tous les modules sont **terminés et vérifiés**. Reste : déploiement manuel sur le VPS.

## État des phases

| Phase | Statut | Documents |
|-------|--------|-----------|
| **PM Vision** | ✅ Terminé | `docs/vision/` — 10 fichiers validés |
| **Design** | ✅ Terminé | `docs/design/` — DESIGN.md, 4 mockups, charte Togo Heritage |
| **Architecture** | ✅ Terminé | `docs/adr/` (6 ADRs) + `docs/arch/` (stack, modules, structure, 6 TASKs) |
| **Build — Tous modules** | ✅ Terminé | Voir tableau modules |
| **QA** | ✅ Passé | 208 pytest + 27 Vitest + i18n check |
| **Déploiement** | 🔜 Prêt | Config Nginx, Makefile, setup.sh, CI — prêt pour `make deploy` manuel |

## Modules

| Module | Status | Tests | Dépendances | Notes |
|--------|--------|-------|-------------|-------|
| M1 — ETL Pipeline | ✅ **Terminé** | 125/125 pytest | Python, geopandas, pandas | 9 GeoJSON nettoyés dans `data/processed/` |
| M2 — Analysis Engine | ✅ **Terminé** | 83/83 pytest | geopandas, shapely | 5 GeoJSON d'analyse + métadonnées, ColorBrewer |
| M3 — Frontend Core | ✅ **Terminé** | 5/5 Vitest | React, TypeScript, Vite | SPA 4 pages, i18n FR/EN, ~103 KB gzippé |
| M4 — Map & Viz | ✅ **Terminé** | 11/11 Vitest | Leaflet, react-leaflet | 5 couches + filtres + légende dynamique |
| M5 — Storytelling | ✅ **Terminé** | 11/11 Vitest | Intersection Observer | 4 actes + synthèse + 3 recommandations |
| M6 — Deployment | ✅ **Terminé** | CI + scripts | Nginx, rsync, certbot | Makefile, nginx.conf, setup.sh, check_i18n.py |

**Tests totaux : 208 pytest + 27 Vitest = 235 tests — tout vert**
**Bundle total : ~122 KB gzippé** (target < 300 KB)

## Décisions clés (ADR)

| ADR | Décision | Statut |
|-----|----------|--------|
| ADR-001 | Architecture static-first (ETL pré-computation + fichiers statiques) | ✅ Accepted |
| ADR-002 | Pipeline Python + geopandas pour données spatiales | ✅ Accepted |
| ADR-003 | Vite + React 18 + TypeScript + Leaflet + Tailwind | ✅ Accepted |
| ADR-004 | react-i18next avec lazy loading JSON (FR/EN) | ✅ Accepted |
| ADR-005 | Nginx + Let's Encrypt + rsync sur VPS favoured.cloud | ✅ Accepted |
| ADR-006 | Tests ciblés (pytest + Vitest + check i18n) | ✅ Accepted |

## Contraintes immuables — Vérification finale

- [x] Bilingue FR/EN — 5 fichiers × 2 langues, check_i18n.py ✅
- [x] VPS favoured.cloud — Makefile + nginx.conf + setup.sh prêts
- [x] Bas débit / mobile — Bundle ~122 KB gzip, Leaflet mobile-ready, Nginx gzip + cache
- [x] Données ouvertes uniquement — Pas d'API, tout statique
- [x] Budget quasi nul — Stack 100% open source, Let's Encrypt gratuit
- [x] Pas de données nominatives — Données mock agrégées
- [x] Accessibilité WCAG — Palettes ColorBrewer (colorblind-safe) + contrastes WCAG
- [x] Ton constructif — Zones blanches = opportunités d'investissement
- [x] Palette Togo Heritage — Design system avec couleurs nationales (vert #006A4E, jaune #FFD100, rouge #D21034)
- [x] Deadline 22/06 — Tous les modules terminés le 16/06 (6 jours d'avance)

## Structure des fichiers clés

```
C:.
├── Makefile                          # build, deploy, rollback
├── docs/
│   ├── adr/                          # 6 ADRs
│   ├── arch/                         # stack, modules, 6 TASK templates
│   ├── design/                       # DESIGN.md, ASSETS.md, mockups
│   └── PROJECT_STATUS.md             # ce fichier
├── etl/
│   ├── run_all.py                    # Pipeline complet
│   ├── analyze_density.py            # M2
│   ├── analyze_zaap.py               # M2
│   ├── analyze_accessibility.py      # M2
│   ├── analyze_cooperatives.py       # M2
│   └── synthesize.py                 # M2
├── data/
│   ├── processed/                    # 10 GeoJSON nettoyés (M1)
│   └── public/
│       ├── analysis/                 # 5 GeoJSON d'analyse + métadonnées (M2)
│       ├── metadata/quality.json     # Rapport qualité (M1)
│       └── boundaries/              # Limites administratives
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/                  # Button, Card, Badge, Select, Skeleton, Layout
│   │   │   ├── map/                 # TogoMap, 5 layers, FilterPanel, MapLegend, etc.
│   │   │   └── story/              # StoryHero, ActContainer, StoryNavigator, SynthesisView, etc.
│   │   ├── pages/                   # HomePage, ExplorePage, StoryPage, ReportPage
│   │   ├── hooks/                   # useDataLoader, useMapFilters
│   │   └── i18n/                   # Configuration react-i18next
│   └── public/
│       ├── locales/{fr,en}/         # common, map, story, acts, report
│       └── data/                    # Mock GeoJSON pour le dev
├── deploy/
│   ├── nginx.conf                   # Nginx production config
│   ├── setup.sh                     # Server setup script
│   └── check-deploy.sh             # Post-deploy verification
├── scripts/
│   └── check_i18n.py               # i18n verification
└── .github/workflows/
    └── ci.yml                       # GitHub Actions
```

## Bloqueurs

- **Aucun bloqueur** — Attente déploiement manuel sur VPS

## Prochaines étapes — Pour aller en production

```bash
# 1. Sur le VPS (une fois)
bash deploy/setup.sh

# 2. En local
make build && make deploy

# 3. Vérifier
bash deploy/check-deploy.sh
```
