# AgriMap Togo — Structure du projet

```
agrimap-togo/
│
├── README.md                           # Présentation du projet (bilingue)
├── Makefile                            # Commandes build/deploy/test
├── requirements.txt                    # Dépendances Python ETL
├── .gitignore
├── .github/
│   └── workflows/
│       └── ci.yml                      # CI GitHub Actions (tests + i18n)
│
├── docs/
│   ├── README.md                       # Documentation index
│   ├── vision/                         # Vision produit (PM) — INCHANGÉ
│   │   ├── 01_description_projet.md
│   │   ├── 02_problematique.md
│   │   ├── 03_objectifs.md
│   │   ├── 04_solutions_existantes.md
│   │   ├── 05_analyse_solution.md
│   │   ├── 06_utilisateurs_profils.md
│   │   ├── 07_cas_utilisation.md
│   │   ├── 08_glossaire.md
│   │   ├── 09_contraintes.md
│   │   └── README.md
│   ├── adr/                            # Architecture Decision Records
│   │   ├── ADR-001-stack-globale.md
│   │   ├── ADR-002-data-pipeline.md
│   │   ├── ADR-003-frontend-mapping.md
│   │   ├── ADR-004-internationalisation.md
│   │   ├── ADR-005-hosting-deploiement.md
│   │   └── ADR-006-module-complementaire.md
│   └── arch/                           # Architecture technique détaillée
│       ├── stack.md                    # Décisions stack (tableau)
│       ├── modules.md                  # Découpage modulaire
│       ├── project-structure.md        # Ce fichier
│       ├── TASK-M1-ETL.md              # Template tâche M1
│       ├── TASK-M2-Analysis.md         # Template tâche M2
│       ├── TASK-M3-Frontend-Core.md    # Template tâche M3
│       ├── TASK-M4-Map-Viz.md          # Template tâche M4
│       ├── TASK-M5-Storytelling.md     # Template tâche M5
│       └── TASK-M6-Deployment.md       # Template tâche M6
│
├── data/
│   ├── raw/                            # Données téléchargées (versionnées)
│   │   ├── exploitations/
│   │   ├── zaap/
│   │   ├── cooperatives/
│   │   ├── marches/
│   │   ├── pepinieres/
│   │   └── cadrage/
│   ├── processed/                      # Données nettoyées et normalisées
│   │   ├── exploitations_clean.geojson
│   │   ├── zaap_clean.geojson
│   │   ├── cooperatives_clean.geojson
│   │   ├── marches_clean.geojson
│   │   ├── pepinieres_clean.geojson
│   │   └── regions.geojson
│   ├── public/                         # Données prêtes pour le frontend
│   │   ├── analysis/
│   │   │   ├── density.geojson
│   │   │   ├── zaap_coverage.geojson
│   │   │   ├── accessibility.geojson
│   │   │   ├── cooperative_network.geojson
│   │   │   └── synthesis.geojson
│   │   ├── boundaries/
│   │   │   ├── regions.geojson
│   │   │   └── prefectures.geojson
│   │   ├── reference/                  # Données statiques de référence
│   │   │   └── communes.geojson
│   │   └── metadata/
│   │       ├── quality.json            # Rapport de qualité des données
│   │       ├── sources.json            # Attribution des sources
│   │       └── changelog.json          # Historique des versions
│   └── tests/                          # Tests du pipeline de données
│       ├── test_clean.py
│       ├── test_spatial.py
│       └── test_export.py
│
├── etl/                                # Pipeline ETL Python
│   ├── run_all.py                      # Ordonnancement du pipeline complet
│   ├── config.py                       # Configuration (URLs, CRS, paramètres)
│   ├── download.py                     # Téléchargement des données
│   ├── inspect.py                      # Exploration et documentation des colonnes
│   ├── clean.py                        # Nettoyage et normalisation
│   ├── analyze_density.py              # Analyse 1 : densité exploitations
│   ├── analyze_zaap.py                 # Analyse 2 : couverture ZAAP
│   ├── analyze_accessibility.py         # Analyse 3 : accessibilité services
│   ├── analyze_cooperatives.py         # Analyse 4 : réseau coopératif
│   ├── synthesize.py                   # Synthèse : carte de priorisation
│   ├── export.py                       # Export optimisé GeoJSON + métadonnées
│   ├── quality_report.py               # Génération rapport de qualité
│   └── utils/
│       ├── geo.py                      # Utilitaires géospatiaux
│       ├── io.py                       # Lecture/écriture fichiers
│       └── stats.py                    # Statistiques descriptives
│
├── frontend/                           # Application React
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── public/
│   │   ├── favicon.svg
│   │   ├── og-image.png                # Image pour partage réseaux
│   │   ├── locales/                    # Fichiers de traduction
│   │   │   ├── fr/
│   │   │   │   ├── common.json
│   │   │   │   ├── acts.json
│   │   │   │   ├── map.json
│   │   │   │   └── report.json
│   │   │   └── en/
│   │   │       ├── common.json
│   │   │       ├── acts.json
│   │   │       ├── map.json
│   │   │       └── report.json
│   │   └── data/                       # Symlink vers ../../data/public/
│   ├── src/
│   │   ├── main.tsx                    # Point d'entrée React
│   │   ├── App.tsx                     # Root : providers, router
│   │   ├── vite-env.d.ts
│   │   ├── i18n/
│   │   │   ├── config.ts               # Configuration i18next
│   │   │   └── index.ts                # Export
│   │   ├── types/
│   │   │   ├── index.d.ts              # Types globaux
│   │   │   ├── geojson.d.ts            # Types GeoJSON
│   │   │   └── i18n.d.ts               # Types i18n
│   │   ├── hooks/
│   │   │   ├── useDataLoader.ts        # Hook chargement GeoJSON
│   │   │   ├── useMapFilters.ts        # Hook filtres carte
│   │   │   ├── useScrollSpy.ts         # Hook scroll detection
│   │   │   └── useTranslation.ts        # Re-export i18n
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Layout.tsx
│   │   │   │   ├── Navbar.tsx
│   │   │   │   ├── Footer.tsx
│   │   │   │   └── LanguageSwitcher.tsx
│   │   │   ├── map/
│   │   │   │   ├── TogoMap.tsx
│   │   │   │   ├── DataLayer.tsx
│   │   │   │   ├── DensityLayer.tsx
│   │   │   │   ├── ZAAPLayer.tsx
│   │   │   │   ├── AccessibilityLayer.tsx
│   │   │   │   ├── CoopLayer.tsx
│   │   │   │   ├── SynthesisLayer.tsx
│   │   │   │   ├── FilterPanel.tsx
│   │   │   │   ├── MapLegend.tsx
│   │   │   │   ├── RegionPopup.tsx
│   │   │   │   └── MapController.tsx    # Contrôles programmatiques
│   │   │   ├── story/
│   │   │   │   ├── ActContainer.tsx
│   │   │   │   ├── StoryNavigator.tsx
│   │   │   │   ├── SynthesisView.tsx
│   │   │   │   ├── ZoneCard.tsx
│   │   │   │   └── ShareWidget.tsx
│   │   │   ├── report/
│   │   │   │   └── ReportContent.tsx
│   │   │   └── ui/
│   │   │       ├── Button.tsx
│   │   │       ├── Card.tsx
│   │   │       ├── Badge.tsx
│   │   │       ├── Select.tsx
│   │   │       └── Skeleton.tsx
│   │   ├── pages/
│   │   │   ├── HomePage.tsx            # Accroche + carte d'entrée
│   │   │   ├── StoryPage.tsx           # Lecture guidée (4 actes + synthèse)
│   │   │   ├── ExplorePage.tsx         # Exploration libre
│   │   │   └── ReportPage.tsx          # Rapport complet
│   │   ├── utils/
│   │   │   ├── mapConfig.ts            # Configuration carte (centre, zoom, bounds)
│   │   │   ├── colors.ts              # Palettes ColorBrewer
│   │   │   └── formatters.ts          # Formateurs (nombres, pourcentages)
│   │   └── styles/
│   │       └── globals.css             # Styles Tailwind + custom
│   └── tests/                          # Tests frontend
│       ├── setup.ts
│       ├── LanguageSwitcher.test.tsx
│       ├── MapLayer.test.tsx
│       ├── FilterPanel.test.tsx
│       └── StoryNavigator.test.tsx
│
├── scripts/                            # Scripts utilitaires
│   ├── check_i18n.py                   # Vérification complétude traductions
│   └── check_geojson.py               # Validation des GeoJSON produits
│
├── deploy/                             # Configuration déploiement
│   ├── nginx.conf                      # Configuration Nginx
│   ├── setup.sh                        # Script init serveur
│   └── .env.example                    # Variables d'environnement (si besoin)
│
└── tasks/                              # Points d'entrée Orchestrator
    ├── TASK-M1-ETL.md
    ├── TASK-M2-Analysis.md
    ├── TASK-M3-Frontend-Core.md
    ├── TASK-M4-Map-Viz.md
    ├── TASK-M5-Storytelling.md
    └── TASK-M6-Deployment.md
```
