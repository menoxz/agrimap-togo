# ADR-003 : Frontend framework & mapping library

**Status** : Accepted  
**Date** : 2026-06-16  
**Décisionnaire** : Architecte

---

## Contexte

Le frontend doit offrir :
- Une **carte interactive du Togo** avec zoom par région/préfecture
- Des **filtres** multiples (type d'exploitation, type de service, région, présence ZAAP)
- Des **indicateurs visuels** (couleurs, opacité, icônes)
- Une **lecture guidée** en 4 actes + synthèse
- La **bascule FR/EN** sur toute l'interface
- Une expérience **mobile et bas débit** fluide
- Une **accessibilité visuelle** WCAG 2.1 AA

Contraintes techniques :
- Pas de clé API payante
- Fichiers statiques uniquement (pas de backend)
- Build time React (Vite) rapide

## Décision

**Vite + React 18 + TypeScript + Leaflet + Tailwind CSS**

### Justification détaillée

| Composant | Choix | Pourquoi |
|-----------|-------|----------|
| **Build tool** | Vite 5 | Build < 3s, HMR instantané, config minimale |
| **Framework** | React 18 | Écosystème mature, react-leaflet, react-i18next, large communauté |
| **Typage** | TypeScript 5 | Documentation intégrée, prévention d'erreurs, Auto-complétion IA |
| **Mapping** | Leaflet 1.9 + react-leaflet 4 | Léger (~40 KB gzip), pas de clé API, excellent tactile, plugins riches |
| **State** | React Context + custom hooks | Pas de besoin de store global (données statiques, pas de mutations) |
| **CSS** | Tailwind CSS 3 | Utility-first, responsive natif, purge CSS pour build minimal (~15 KB) |
| **Dataviz** | Chart.js 4 + react-chartjs-2 | Léger, charts interactifs pour indicateurs complémentaires |
| **Icônes** | Lucide React | 1000+ icônes légères, tree-shakable, pas de dépendance font |

### Stratégie de données

Les GeoJSON sont chargés **lazily** via `fetch` au moment où l'utilisateur arrive sur un acte (ou activé par un filtre). Pas de chargement tout-en-un.

```
Page d'accueil        → données de l'accroche (légères)
Acte 1 (Densité)      → GeoJSON densité (régions + exploitations)
Acte 2 (ZAAP)         → GeoJSON ZAAP + bassins non couverts
Acte 3 (Accessibilité)→ GeoJSON marchés + pépinières + buffers
Acte 4 (Coopératives) → GeoJSON coopératives + zones blanches
Synthèse              → GeoJSON priorisation (superposition pondérée)
```

### Palette cartographique

Utilisation de ColorBrewer 2.0 pour l'accessibilité daltoniens :
- Séquentielle : YlOrBr, Blues
- Divergente : RdYlBu
- Qualitative : Set3, Dark2

### Responsive design

- Menu de navigation en burger sur mobile
- Légende repliable
- Carte redimensionnée automatiquement (100% remaining height)
- Filtres en accordéon mobile

## Conséquences

**Positives :**
- Application très légère (build gzippé < 250 KB)
- Fonctionne même en 3G dégradé
- Chargement progressif : l'utilisateur ne télécharge que ce qu'il voit
- Aucune dépendance externe payante
- Mobile-first d'emblée

**Négatives :**
- Leaflet n'a pas de rendu 3D (pas nécessaire ici)
- Limitations Leaflet pour les très grands jeux de points (> 10k) — solution : clustering via `leaflet.markercluster`
- Pas de tiles vectoriels (uniquement raster OSM) — acceptable pour le cas d'usage

## Alternatives considérées

| Alternative | Raison du rejet |
|------------|----------------|
| **MapLibre GL JS** | Plus lourd (~150 KB gzip), nécessite un serveur de tiles ou des frais API pour les basemaps vectoriels. Fonctionnalités 3D non nécessaires |
| **OpenLayers** | Courbe d'apprentissage raide, communauté plus petite, documentation moins accessible |
| **Next.js** | SSR inutile pour site statique, build plus long (minutes vs secondes), complexité déploiement |
| **Svelte + SvelteKit** | Bon mais écosystème mapping moins riche, moins de libs i18n matures |
| **Vanilla JS (no framework)** | Plus rapide encore, mais perte de productivité pour les composants réactifs, i18n, filtres |

## Relations

- Parent : ADR-001 (architecture static-first)
- Consomme les données d'ADR-002
- Utilise react-i18next défini dans ADR-004
