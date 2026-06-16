# Catalogue des assets visuels — AgriMap Togo

> **Version** : 1.0 | **Statut** : Complément à DESIGN.md
> **Mission** : Intégrer l'identité visuelle du Togo dans le design system existant.
> **Principe** : Assets libres de droit, SVG préféré, Lucide React conservé, licences citées.

---

## A) Palette « Togo Heritage » 🇹🇬

Les 4 couleurs officielles du drapeau du Togo sont intégrées comme palette **complémentaire** au design system. Elles **coexistent** avec la palette ColorBrewer (réservée aux cartes) et la palette Brand & UI (existante).

### Couleurs du drapeau

| Token | Valeur | Usage | Justification |
|-------|--------|-------|--------------|
| `--togo-green` | `#006A4E` | Accents UI, badges "production", marqueurs zones agricoles, bordures "Togo Heritage" | Vert officiel du drapeau — évoque l'agriculture, la forêt, l'espoir. Plus foncé que `--color-primary` (#1B5E20), s'en distingue pour usage branding distinct. Passe WCAG AA sur fond clair (ratio 6.8:1). |
| `--togo-yellow` | `#FFD100` | Highlight, marqueurs "opportunité", badges signalétiques | Jaune officiel — soleil, savane, richesse agricole. Attention positive. Passe WCAG AA sur fond foncé (ratio 8.2:1). |
| `--togo-red` | `#D21034` | Zones critiques, alertes prioritaires, badges "investir ici", accent patriotique | Rouge officiel — sang des ancêtres, courage. Uniquement signaux forts. Passe WCAG AA sur fond clair (ratio 5.5:1). |
| `--togo-white` | `#FFFFFF` | Fond, contraste, équilibre sections Togo Heritage | Blanc officiel — pureté, paix. Identique à `--color-surface`, conservé comme token dédié. |

### Règle de coexistence des palettes

```
┌──────────────────────────────────────────────────────────────────┐
│ PALETTE BRAND & UI (existante)    Usage principal UI             │
│ ├── color-primary (#1B5E20)       Boutons, liens, headers       │
│ ├── color-secondary (#1565C0)     Éléments secondaires           │
│ └── color-accent (#E65100)        Zones blanches, alertes        │
│                                                                  │
│ PALETTE TOGO HERITAGE (nouvelle)  Branding national, émotion     │
│ ├── togo-green (#006A4E)          Badges "production togolaise"  │
│ ├── togo-yellow (#FFD100)         Highlight patriotique          │
│ ├── togo-red (#D21034)            Urgence, priorité nationale    │
│ └── togo-white (#FFFFFF)          Fond des sections brandées     │
│                                                                  │
│ PALETTE COLORBREWER (existante)   Cartes uniquement              │
│ ├── YlOrBr, Greens, BuPu, OrRd, RdYlGn                          │
│ └── Jamais utilisée en dehors des couches cartographiques        │
└──────────────────────────────────────────────────────────────────┘
```

**Règle d'usage :**
- **UI générale** (boutons, liens, navigation, cartes) → palette Brand & UI
- **Cartes** (couches, légendes, popups) → palette ColorBrewer
- **Branding national** (badges patriotiques, en-têtes "Fait au Togo", favicon, marqueurs d'opportunité) → Togo Heritage
- **Jamais** de couleur Togo Heritage sur les couches cartographiques (préserver ColorBrewer pour accessibilité colorblind)

### Palette étendue — versions light & dark

| Token | Light (fond) | Dark (accent foncé) | Usage |
|-------|-------------|---------------------|-------|
| `--togo-green-light` | `#E8F5E9` | `#004D3A` | Fonds verts légers / badges foncés, watermarks |
| `--togo-green-dark` | — | `#003D2E` | Texte sur fond clair Togo Heritage |
| `--togo-yellow-light` | `#FFF8E1` | `#C7A700` | Fonds jaunes légers / marqueurs foncés |
| `--togo-yellow-dark` | — | `#9A8200` | Texte sur fond clair |
| `--togo-red-light` | `#FFEBEE` | `#A00D29` | Fonds rouges légers / alertes foncées |
| `--togo-red-dark` | — | `#7A0A1F` | Texte sur fond clair |

### Association aux icônes Lucide

| Contexte Togo Heritage | Icône Lucide | Usage |
|------------------------|-------------|-------|
| Fierté nationale, drapeau | `<Flag />` | Badge drapeau, section "Made in Togo" |
| Opportunité d'investissement | `<Star />` | Marqueurs "opportunité" (jaune Togo) |
| Production agricole nationale | `<Sprout />` | Badge "production togolaise" (vert Togo) |
| Alerte prioritaire nationale | `<AlertTriangle />` | Badge "investir ici" (rouge Togo) |
| Unité, coopération nationale | `<HeartHandshake />` | Section "Pour le Togo" |

---

## B) Assets graphiques

### B1. Carte silhouette du Togo — SVG

| Propriété | Valeur |
|-----------|--------|
| **Format** | SVG pur (pas de PNG) |
| **Taille cible** | < 8 KB (idéal < 5 KB) |
| **Usage** | Logo, favicon, watermark de fond, OG image, section "Made in Togo" |
| **Variantes** | Silhouette simple (contour), Silhouette avec régions (6 régions) |
| **Source recommandée** | [Natural Earth Data](https://www.naturalearthdata.com/) — domaine public (licence CC0) |
| **Alternative** | [Wikimedia Commons — Carte du Togo](https://commons.wikimedia.org/wiki/Atlas_of_Togo) — licence libre |
| **Génération script** | Générer via script Python/Node : simplification du contour depuis un GeoJSON des limites administratives du Togo (source : geodata.gouv.tg ou OSM) |

**Description du rendu attendu :**
```
Silhouette du Togo stylisée, orientation nord-sud,
ligne de côte atlantique au sud (golfe de Guinée),
contour fluide mais simplifié (pas de micro-détails).
Remplissage : vert Togo (#006A4E) ou vide (pour watermark).
Bordure : blanc ou vert foncé selon fond.
```

**Fichiers à créer :**
- `public/assets/togo-silhouette.svg` — Silhouette pleine (remplie vert Togo)
- `public/assets/togo-outline.svg` — Silhouette contour uniquement (pour watermarks)
- `public/assets/togo-regions.svg` — Silhouette avec les 6 régions délimitées

### B2. Contour des 6 régions agricoles — SVG

| Propriété | Valeur |
|-----------|--------|
| **Format** | SVG simplifié |
| **Taille cible** | < 12 KB |
| **Usage** | Page d'accueil (carte muette interactive), fond de section, infographies |
| **Régions** | Savanes, Kara, Centrale, Plateaux, Maritime, Lacs |
| **Source** | À générer depuis le GeoJSON des régions (geodata.gouv.tg) via script de simplification |
| **Licence** | CC BY 4.0 (données gouvernementales togolaises) |

### B3. Icônes agricoles togolaises — extension Lucide

Lucide React reste la bibliothèque d'icônes. Compléter la table existante de DESIGN.md :

| Contexte agricole togolais | Icône Lucide | Usage |
|---------------------------|-------------|-------|
| Maïs (culture de base) | `<Corn />` ou `<Grains />` | Badge culture, filtre, indicateur production |
| Sorgho (culture de base) | `<Grains />` (même icône, label différent) | Badge culture |
| Igname (culture de base) | `<Sprout />` (avec label "Igname") | Badge culture |
| Tracteur + champ (ZAAP) | `<Tractor />` (déjà listé) | Acte 2, badge ZAAP |
| Filet de marchés (réseau commercial) | `<Store />` + `<Network />` | Acte 3, overlay marché |
| Main collaborative (coopérative) | `<Handshake />` | Acte 4, badge coopérative |
| Pépinière | `<TreePine />` | Filtre services, marqueur pépinière |
| Irrigation | `<Droplets />` | Indicateur complémentaire |
| Transport / route | `<Truck />` | Indicateur d'accessibilité |
| Ferme / exploitation | `<Farm />` ou `<Home />` | Marqueur exploitation individuelle |
| Données / statistiques | `<BarChart3 />` | Section rapport, indicateurs |

**Note** : Certaines icônes Lucide peuvent ne pas exister. Alternatives : Maïs/Sorgho → `<Wheat />` ou `<Sprout />` avec label. Vérifier la [doc Lucide](https://lucide.dev/icons/).

### B4. Photos de paysage agricole togolais

| Propriété | Valeur |
|-----------|--------|
| **Format** | JPEG optimisé, < 200 KB par image |
| **Usage** | Page d'accueil, rapport, arrière-plan hero |
| **Source recommandée** | [Unsplash](https://unsplash.com) — licence gratuite |
| **Alternative** | [Pexels](https://www.pexels.com) — licence gratuite. [Wikimedia Commons](https://commons.wikimedia.org) — licences CC. |
| **Contingence** | Si aucune photo libre du Togo trouvée, utiliser illustrations SVG stylisées. |

**Descriptions :**

| # | Description | Usage prioritaire |
|---|-------------|-------------------|
| 1 | Champ de maïs/sorgho sous le soleil, savane | Fond section "Pourquoi" (HomePage) |
| 2 | Marché de plein air togolais, étals colorés | Fond section "Accessibilité" (Acte 3) |
| 3 | Agriculteur/agricultrice souriant dans un champ | Hero, carte "Impact" |
| 4 | Vue aérienne parcelles agricoles, motifs géométriques | Fond section "Densité" (Acte 1) |
| 5 | Plantation d'arbres (café, cacao, palmiers) | Fond section "Coopératives" (Acte 4) |

---

## C) Favicon & Meta tags

### C1. Favicon

| Propriété | Valeur |
|-----------|--------|
| **Format** | SVG (préféré) + PNG fallback (32×32, 16×16) |
| **Poids max** | < 2 KB (SVG) |
| **Description** | Silhouette du Togo en vert `#006A4E` avec un épi/feuille agricole stylisé au centre (blanc). Fond transparent. |
| **Variantes** | `favicon.svg`, `favicon-32x32.png`, `favicon-16x16.png`, `apple-touch-icon.png` (180×180) |
| **Génération** | SVG manuel ou [real favicon generator](https://realfavicongenerator.net/) |

### C2. OG Image (Open Graph)

| Propriété | Valeur |
|-----------|--------|
| **Dimensions** | 1200 × 630 px (ratio 1.91:1) |
| **Format** | PNG ou JPEG, < 200 KB |
| **Titre** | "AgriMap Togo" |
| **Message** | "Produire ne suffit pas : il faut être relié." |
| **Fond** | Vert Togo (`#006A4E`) |
| **Éléments** | Silhouette Togo blanche + icône Sprout + texte |
| **Police** | Inter |

**Maquette du rendu :**
```
┌────────────────────────────────────────────────────────────┐
│                                                            │
│           ┌──────────────────────┐                         │
│           │  Silhouette Togo     │                         │
│           │  (blanc, semi-       │                         │
│           │   transparente)      │                         │
│           └──────────────────────┘                         │
│                         🌱                                  │
│                    AgriMap Togo                             │
│                                                            │
│   Produire ne suffit pas : il faut être relié.             │
│                                                            │
│   ──── Data Challenge Agriculture · Togo AI Lab 2026 ────  │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**Tags HTML :**
```html
<meta property="og:title" content="AgriMap Togo — Zones blanches de services agricoles" />
<meta property="og:description" content="Produire ne suffit pas : il faut être relié. La carte qui révèle les zones blanches de services agricoles du Togo." />
<meta property="og:image" content="https://agrimap.favoured.cloud/assets/og-image.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:type" content="website" />
<meta name="twitter:card" content="summary_large_image" />
```

### C3. Favicon HTML tags

```html
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
```

---

## D) Règles d'usage des assets Togo Heritage

### Quand utiliser le vert Togo vs le vert ColorBrewer ?

| Contexte | Palette à utiliser | Pourquoi |
|----------|-------------------|----------|
| Bouton "Produire au Togo" | Togo Heritage (`--togo-green`) | Branding national |
| Carte de densité | ColorBrewer YlOrBr | Accessibilité colorblind |
| Badge "Zone prioritaire" | Togo Heritage (`--togo-red`) | Urgence patriotique |
| Légende de carte | ColorBrewer (selon couche) | Précision sémantique |
| Header du site | Brand & UI + accent Togo Heritage | Cohérence + fierté |
| Favicon | Togo Heritage (`--togo-green` + blanc) | Identité immédiate |
| Watermark de fond | Togo Heritage (`--togo-green-light`) | Fond discret brandé |
| Marqueur de marché | Icône Lucide (pas Togo Heritage) | La carte reste ColorBrewer |
| Section "Made in Togo" | Togo Heritage (toute palette) | Célébration, émotion |

### Hiérarchie des assets

```
Priorité haute (MVP)
├── favicon.svg + favicon.png          → Identité onglet navigateur
├── OG image (1200×630px)              → Partage réseaux sociaux
├── togo-silhouette.svg                → Logo, watermark, favicon
├── togo-outline.svg                   → Watermark léger

Priorité moyenne (V1.1)
├── togo-regions.svg                   → Carte muette page d'accueil
├── Photos libres de droit (3-5 max)   → Fond de sections
├── Icônes Lucide supplémentaires      → Mapping agricole

Priorité basse (V2)
├── Animations SVG (silhouette pulsante)
├── Variantes favicon (dark mode)
├── Stickers/badges "Made in Togo"
```

### Positionnement "Made in Togo"

**Emplacements dans l'interface :**
1. **Footer** — ligne "Made in Togo — Données togolaises, pour le Togo"
2. **Page accueil** — section "Pourquoi" : carte "Impact" mentionne origine togolaise
3. **Page rapport** — en-tête : "Rapport méthodologique — AgriMap Togo"
4. **Favicon** — Silhouette Togo + épi = identité immédiate

---

## E) Licences

| Asset | Source | Licence | Attribution req. |
|-------|--------|---------|-----------------|
| Silhouette Togo (SVG) | Natural Earth Data | CC0 (domaine public) | Non |
| Contours régions (SVG) | geodata.gouv.tg | CC BY 4.0 | Oui — "Source : geodata.gouv.tg" |
| Icônes Lucide | Lucide React | ISC License | Oui — crédits |
| Photos (Unsplash) | Unsplash | Unsplash License | Non (apprécié) |
| Photos (Pexels) | Pexels | Pexels License | Non |
| Polices (Inter, JetBrains Mono) | Google Fonts | SIL OFL 1.1 | Oui — crédits |
| Favicon / OG image | Création originale | CC BY 4.0 | — |

---

## F) Checklist de production

- [ ] Générer `togo-silhouette.svg` (contour Togo simplifié)
- [ ] Générer `togo-outline.svg` (contour uniquement, watermark)
- [ ] Générer `togo-regions.svg` (6 régions)
- [ ] Créer `favicon.svg` (silhouette + épi)
- [ ] Exporter `favicon-32x32.png`, `favicon-16x16.png`, `apple-touch-icon.png`
- [ ] Créer OG image 1200×630px
- [ ] Rechercher 3-5 photos libres de droit (Unsplash/Pexels)
- [ ] Ajouter meta tags OG et favicon dans index.html
- [ ] Ajouter "Made in Togo" dans le footer
- [ ] Vérifier performance (SVG < 10 KB, images < 200 KB)
- [ ] Ajouter crédits/licences dans le footer
