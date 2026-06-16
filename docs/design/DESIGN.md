# Design System — AgriMap Togo

> **Version** : 1.0 | **Statut** : Validé
> Basé sur `docs/vision/` (v1.1) et `docs/arch/stack.md`.
> Style de référence : **Mobile First** (sobriété, bas débit) + **Minimal Corporate** (crédibilité institutionnelle).
> Palette cartographique : **ColorBrewer 2.0** — palettes *colorblind safe* certifiées.

---

## Product brief

**AgriMap Togo** est un tableau de bord bilingue FR/EN qui cartographie les *zones blanches de services agricoles* du Togo — les territoires où l'agriculture produit mais reste éloignée des marchés, coopératives, ZAAP et pépinières. Trois audiences principales : (1) la planificatrice agricole publique (Awa) qui décide où implanter le prochain service, (2) le partenaire financier international (David) qui cible ses investissements, (3) le jury du Data Challenge qui évalue qualité des données, analyse et storytelling.

**Contraintes structurantes** : mobile-first (consultation fréquente sur téléphone en contexte togolais), bas débit (connexions intermittentes), WCAG 2.1 AA, zéro jargon, bilingue FR/EN, ton constructif (zones blanches = opportunités).

---

## Design tokens

### Palette — Couleurs

#### Brand & UI

| Token | Value | Usage | Rationale |
|-------|-------|-------|-----------|
| `--color-primary` | `#1B5E20` | Boutons principaux, liens, headers actifs | Vert agricole profond — évoque la production, la terre fertile. Passe WCAG AA sur fond clair (ratio 8.1:1). |
| `--color-primary-hover` | `#2E7D32` | Hover des éléments primaires | Variation plus claire pour feedback visuel. |
| `--color-primary-light` | `#E8F5E9` | Surfaces primaires légères, badges | Fond pour sections liées à la production/densité. |
| `--color-secondary` | `#1565C0` | Boutons secondaires, liens, marqueurs ZAAP | Bleu institutionnel complémentaire du vert — évoque la planification, l'État. Passe WCAG AA (ratio 7.5:1). |
| `--color-secondary-light` | `#E3F2FD` | Surfaces secondaires légères | Fond pour sections "couverture ZAAP". |
| `--color-accent` | `#E65100` | Mise en évidence zones blanches, alertes, indicateurs "manque" | Orange vif — attire l'attention sans anxiété (constructif). Passe WCAG AA (ratio 5.2:1 sur fond clair). |
| `--color-accent-light` | `#FFF3E0` | Fond des cartes zones blanches, badges "opportunité" | Version légère pour fonds. |
| `--color-bg` | `#FAFAF5` | Fond de page général | Blanc cassé chaud — réduit la fatigue visuelle sur mobile, évoque le papier naturel. |
| `--color-surface` | `#FFFFFF` | Cartes, modales, panneaux | Fond blanc pur pour lisibilité maximale du contenu. |
| `--color-surface-alt` | `#F5F5F0` | Fond alternatif des listes, sections alternées | Légère variation pour hiérarchie visuelle. |
| `--color-text` | `#1E293B` | Texte principal | Slate foncé — 97% de contraste sur blanc (bien supérieur au ratio 4.5:1 WCAG AA). |
| `--color-text-secondary` | `#475569` | Texte secondaire, sous-titres | Slate moyen — hiérarchie lisible, passe WCAG AA. |
| `--color-muted` | `#94A3B8` | Texte de placeholder, labels désactivés | Gris neutre — 3.5:1 minimum sur fond blanc (attention : ne pas utiliser pour infos critiques). |
| `--color-border` | `#E2E8F0` | Bordures, séparateurs | Gris très clair subtil. |
| `--color-success` | `#166534` | Indicateurs positifs (zone bien desservie) | Vert foncé accompagné d'icône ✓ (jamais couleur seule). |
| `--color-warning` | `#9A3412` | Indicateurs modérés (zone partiellement desservie) | Orange-brun foncé. |
| `--color-error` | `#991B1B` | Indicateurs critiques (zone blanche, manque avéré) | Rouge foncé accompagné d'icône ⚠. |
| `--color-info` | `#1E40AF` | Informations générales, légendes | Bleu foncé pour repères carto. |

#### Cartographie — ColorBrewer (colorblind safe)

Toutes les palettes cartographiques ci-dessous sont certifiées **colorblind safe** par ColorBrewer 2.0.

| Token | Palette | Classes | Usage | Rationale |
|-------|---------|---------|-------|-----------|
| `--cb-density` | **YlOrBr** (5 classes) | Très faible → Très élevé | Carte densité des exploitations (Acte 1) | Séquentielle lumineuse : variation claire du jaune au brun. Lisible en niveaux de gris. Colorblind safe ✓ |
| `--cb-zaap` | **Greens** (4 classes) | Hors ZAAP → Couvert ZAAP | Carte couverture ZAAP (Acte 2) | Vert évoque l'aménagement ; l'absence (jaune clair) ressort immédiatement. Colorblind safe ✓ |
| `--cb-access` | **BuPu** (5 classes) | Très accessible → Très isolé | Carte accessibilité marchés/pépinières (Acte 3) | Bleu→Violet : gradation naturelle de "proche" (bleu) à "loin" (violet foncé). Colorblind safe ✓ |
| `--cb-coop` | **OrRd** (4 classes) | Dense → Aucune coopérative | Carte réseau coopératif (Acte 4) | Orange→Rouge : l'intensité signale l'urgence d'organisation. Colorblind safe ✓ |
| `--cb-synthesis` | **RdYlGn** (5 classes) | Prioritaire → Bien desservi | Carte synthèse / priorisation | Divergente : rouge (investir vite) → jaune (surveiller) → vert (bien couvert). Point médian neutre. Colorblind safe ✓ |

### Typographie

Police principale : **Inter** (Google Fonts).
Raison : caractères très lisibles sur écran mobile, bon support des accents français, hinting parfait à toutes les tailles. Alternative système `system-ui, -apple-system, sans-serif` en fallback pour le bas débit (pas de chargement de font si réseau lent).

Police data : **JetBrains Mono** (optionnel, pour tableaux de chiffres uniquement). Fallback : `monospace`.

| Token | Size | Weight | Line H. | Usage | Rationale |
|-------|------|--------|---------|-------|-----------|
| `--text-caption` | 12px / 0.75rem | 400 | 1.4 | Légendes carto, labels, crédits sources | Miniature mais lisible sur mobile (≥12px minimum WCAG) |
| `--text-body-sm` | 14px / 0.875rem | 400 | 1.5 | Texte secondaire, métadonnées | Confortable pour lecture mobile continue |
| `--text-body` | 16px / 1rem | 400 | 1.6 | Texte courant, paragraphes, descriptions | Baseline du système — 16px optimal pour mobile |
| `--text-body-lg` | 18px / 1.125rem | 400 | 1.6 | Texte d'introduction, extraits | 18px = seuil WCAG "large text" (3:1 suffit) |
| `--text-label` | 14px / 0.875rem | 600 | 1.3 | Labels de boutons, badges, onglets | Semi-bold pour distinction sans taille excessive |
| `--text-h4` | 18px / 1.125rem | 600 | 1.3 | Titres de section, sous-titres de carte | Hiérarchie 4e niveau |
| `--text-h3` | 20px / 1.25rem | 600 | 1.3 | Titres de cartes, noms d'actes | 3e niveau — visible sans dominer |
| `--text-h2` | 24px / 1.5rem | 700 | 1.2 | Titres de page, titres d'acte | 2e niveau — taille généreuse sur mobile |
| `--text-h1` | 32px / 2rem | 700 | 1.1 | Titre héro, message fort, titre de page desktop | Très grand — usage parcimonieux |
| `--text-hero` | 40px / 2.5rem | 800 | 1.1 | Message d'accroche "Produire ne suffit pas" | Poids maximal pour impact émotionnel immédiat |

### Breakpoints

| Token | Value | Usage |
|-------|-------|-------|
| `--bp-mobile` | < 640px | Téléphone portrait (conception **mobile-first**) |
| `--bp-tablet` | 640px – 1024px | Tablette / téléphone paysage |
| `--bp-desktop` | > 1024px | Écran large |

Design mobile-first : toutes les règles partent du mobile, les `@media (min-width: ...)` enrichissent pour tablette/desktop.

### Espacements

Base : échelle de 4px. Mobile spacieux, desktop condensé.

| Token | Value | Usage | Rationale |
|-------|-------|-------|-----------|
| `--space-1` | 4px | Icônes, badges, espacements internes serrés | Élémentaire |
| `--space-2` | 8px | Gaps entre éléments rapprochés, padding inputs | Confort tactile min 44px sur boutons |
| `--space-3` | 12px | Padding boutons moyens, gap cartes serré | Transition 8→16 |
| `--space-4` | 16px | Padding cartes, padding boutons, marges latérales mobile | **Référence mobile** — marge standard |
| `--space-5` | 24px | Gaps entre sections, marge entre cartes | Respiration visuelle |
| `--space-6` | 32px | Padding sections, marges entre blocs majeurs | Espacement généreux |
| `--space-7` | 48px | Séparation de pages, espace avant footer | Transition majeure |
| `--space-8` | 64px | Marges desktop, séparation héro/contenu | Maximum |

### Bordures & Ombres

| Token | Value | Usage | Rationale |
|-------|-------|-------|-----------|
| `--radius-sm` | 4px | Inputs, badges, petits contrôles | Léger arrondi, propre |
| `--radius-md` | 8px | Cartes, panneaux, boutons | Standard |
| `--radius-lg` | 12px | Modales, fiches zones prioritaires | Accentue la notion de "carte" |
| `--radius-full` | 9999px | Avatars, LanguageSwitcher pills | Rond complet |
| `--border-width` | 1px | Bordures standard | Minimal |
| `--border-width-focus` | 2px | Focus visible (accessibilité clavier) | Visible sans être épais |
| `--shadow-sm` | `0 1px 2px rgba(30,41,59,0.08)` | Cartes subtiles, élévation légère | Ombre très douce — pas d'ombre sur surface-level |
| `--shadow-md` | `0 4px 6px rgba(30,41,59,0.07)` | Modales, dropdowns | |
| `--shadow-lg` | `0 10px 15px rgba(30,41,59,0.1)` | Popups carto, overlay | |

### Icônes

Bibliothèque : **Lucide React** (compatible Tailwind, arborescence légère, tree-shakable).

| Contexte | Icône | Usage |
|----------|-------|-------|
| Agriculture générale | `<Sprout />` | Logo, page d'accueil, marque |
| Densité exploitations | `<Layers />` ou `<Grid3x3 />` | Acte 1, carte densité |
| ZAAP / aménagement | `<Tractor />` | Acte 2, couverture ZAAP |
| Marché / accessibilité | `<Store />` ou `<MapPin />` | Acte 3, accessibilité services |
| Coopérative | `<Users />` | Acte 4, réseau coopératif |
| Synthèse / priorisation | `<Target />` | Synthèse, carte prioritaire |
| Filtre | `<SlidersHorizontal />` | FilterPanel |
| Langue | `<Languages />` | LanguageSwitcher |
| Partager | `<Share2 />` | ShareWidget |
| Télécharger | `<Download />` | Rapport / export |
| Info | `<Info />` | Légendes, popups |
| Navigation | `<ChevronLeft />`, `<ChevronRight />`, `<ChevronDown />` | StoryNavigator, accordéons |
| États | `<AlertTriangle />` (warning), `<CheckCircle />` (success), `<XCircle />` (error) | Badges statuts |

---

## 🇹🇬 Togo Heritage — Branding national

> Palette complémentaire dédiée à l'identité visuelle du Togo. Ces couleurs **coexistent** avec la palette Brand & UI (usage général) et ColorBrewer (cartographie). Voir `ASSETS.md` pour le catalogue complet.

### Couleurs du drapeau

| Token | Valeur | Usage | Justification |
|-------|--------|-------|--------------|
| `--togo-green` | `#006A4E` | Accents UI, badges "production togolaise", marqueurs zones agricoles, bordures "Togo Heritage" | Vert officiel du drapeau — agriculture, forêt, espoir. Plus foncé que `--color-primary` (#1B5E20) pour distinction nette entre UI générale et branding national. |
| `--togo-yellow` | `#FFD100` | Highlight patriotique, marqueurs "opportunité", badges signalétiques | Soleil, savane, richesse agricole. Utilisé avec modération (couleur d'accent, pas de fond). |
| `--togo-red` | `#D21034` | Zones critiques, badges "investir ici", alertes prioritaires nationales | Sang des ancêtres, courage. Réservé aux signaux forts. Associé à une icône ⚠ ou ★. |
| `--togo-white` | `#FFFFFF` | Fond des sections brandées, contraste, équilibre | Paix, pureté. Identique à `--color-surface`, token dédié pour expliciter le rôle dans la palette nationale. |

### Palette étendue

| Token | Valeur | Usage |
|-------|--------|-------|
| `--togo-green-light` | `#E8F5E9` | Fonds verts légers, watermarks, badges non prioritaires |
| `--togo-green-dark` | `#004D3A` | Texte sur fond clair Togo Heritage, bordures accentuées |
| `--togo-yellow-light` | `#FFF8E1` | Fonds jaunes légers, marqueurs discrets |
| `--togo-yellow-dark` | `#C7A700` | Texte sur fond clair, accents secondaires |
| `--togo-red-light` | `#FFEBEE` | Fonds rouges légers, alertes soft |
| `--togo-red-dark` | `#A00D29` | Texte sur fond clair, accents forts |

### Règle de coexistence des 3 palettes

```
UI générale (boutons, liens, navigation)    → Brand & UI
Couches cartographiques (légendes, popups)  → ColorBrewer uniquement
Branding national (badges, favicon, footer) → Togo Heritage
```

1. **ColorBrewer reste souverain sur les cartes** — ne jamais utiliser les couleurs du drapeau pour les couches de données. L'accessibilité colorblind prime.
2. **Togo Heritage = émotion, fierté, identité** — utilisé pour le branding, jamais pour des données quantitatives.
3. **Brand & UI = le quotidien** — les boutons, headers, navigation restent dans `--color-primary`, `--color-secondary`, `--color-accent`.
4. **Signal faible** : le vert Togo peut remplacer le vert primaire dans les badges "production" si l'intention est patriotique.

### Icônes associées

| Contexte Togo Heritage | Icône Lucide |
|------------------------|-------------|
| Fierté nationale | `<Flag />` |
| Opportunité | `<Star />` |
| Production nationale | `<Sprout />` |
| Alerte prioritaire | `<AlertTriangle />` |
| Unité, coopération | `<HeartHandshake />` |

### Hiérarchie des assets visuels

Voir `ASSETS.md` section D pour la hiérarchie complète. Points clés :
- **MVP** : favicon SVG (silhouette Togo + épi), OG image, togo-silhouette.svg
- **V1.1** : togo-regions.svg, photos libres de droit, complétion icônes Lucide
- **V2** : animations SVG, dark mode favicon, badges "Made in Togo"

### Positionnement "Made in Togo"

```
🇹🇬 Made in Togo
AgriMap Togo est construit avec des données ouvertes togolaises
(geodata.gouv.tg, opendata.gouv.tg), pour les acteurs agricoles du Togo.
"Produire ne suffit pas : il faut être relié." — Message 100% togolais.
```

**Emplacements dans l'interface :**
- Footer : "Made in Togo — Données togolaises, pour le Togo"
- Page accueil : section "Pourquoi" → carte Impact mentionne l'origine togolaise
- Page rapport : en-tête avec drapeau
- Favicon : identité immédiate

---

## Component logic

| Component | Use when | Don't use when |
|-----------|----------|----------------|
| **Button (filled)** | Action primaire (1 par page/section) | Plusieurs actions primaires en concurrence |
| **Button (outline)** | Action secondaire, sur fond coloré | Actions principales — manque de contraste |
| **Button (ghost)** | Actions tertiaires, barre d'outils | Moins de 3 options (préférer des vrais boutons) |
| **Card vs List** | 1-3 items riches (image, métadonnées) | Plus de 5 items → liste avec scroll |
| **Badge vs Tag** | Statut court (FR/EN, niveau) | Texte long (> 15 caractères) |
| **Select vs Radio** | > 5 options, espace limité | 2-4 options fixes que l'utilisateur doit voir |
| **Modal vs Page** | Info popup région, confirmation | Contenu complexe (préférer une page) |
| **FilterPanel** | Mode exploration libre (page Explore) | Mode lecture guidée (StoryPage) |
| **MapLegend** | Toujours avec une couche active | Quand la carte est vide (cacher la légende) |
| **StoryNavigator** | Navigation linéaire 4 actes | Navigation libre (page Explore) |
| **Skeleton vs Spinner** | Chargement initial de composant | Action après clic (préférer spinner dans le bouton) |

---

## DON'Ts — Règles strictes

1. **Ne jamais utiliser la couleur seule pour transmettre une information** — toujours associer un texte, une icône ou un motif. Exemple : un indicateur "zone rouge" doit avoir l'icône ⚠️ + texte explicatif.

2. **Ne jamais centrer le texte du corps** (paragraphes, descriptions). Les titres peuvent être centrés si intentionnel (ex. message d'accroche).

3. **Ne jamais souligner sauf pour les liens hypertextes** — pas de soulignement décoratif.

4. **Ne jamais utiliser le noir pur (#000) pour le texte** — utiliser `--color-text` (#1E293B). Le noir pur crée une fatigue visuelle, surtout sur mobile en extérieur.

5. **Ne jamais mettre de texte en majuscules pour le corps** — les labels et badges peuvent l'être si spécifié (ex. "FR / EN").

6. **Ne jamais utiliser plus de 2 font families** — Inter pour tout, JetBrains Mono pour les données uniquement.

7. **Pas de dégradés** sauf dans les indicateurs cartographiques ColorBrewer (qui sont des palettes de couleurs, pas des dégradés UI).

8. **Pas d'ombre sur les éléments de surface** (cartes, modales) — utiliser `--shadow-sm` uniquement pour l'élévation nécessaire.

9. **Pas d'animation gratuite** — toute transition doit servir la compréhension (ex. transition d'acte dans StoryPage) ou le feedback utilisateur (hover, focus). Pas de chargement lottie/confettis.

10. **Pas d'icône sans label textuel proche** — sauf si l'icône est universellement reconnue (ex. ❌ fermer). Toujours préférer `<Languages />` avec le texte "FR / EN" en dessous ou à côté.

11. **Pas de valeur affichée sans unité ou contexte** — jamais "0.45" mais "0.45 exploitations/km²" avec un label clair. Tout indicateur doit s'expliquer seul (zéro jargon).

12. **Pas de scroll horizontal** — le contenu doit s'adapter à la largeur de l'écran. Les tableaux en mobile passent en cartes.

---

## Accessibilité — Règles WCAG 2.1 AA

| Règle | Application |
|-------|-------------|
| Contraste texte normal ≥ 4.5:1 | Tous les textes < 18px (ou < 14px bold) |
| Contraste grand texte ≥ 3:1 | Textes ≥ 18px ou ≥ 14px bold |
| Contraste composants UI ≥ 3:1 | Boutons, inputs, bordures d'icônes |
| Taille cible tactile ≥ 44×44px | Boutons, filtres, LanguageSwitcher, navigation |
| Focus visible au clavier | `outline: 2px solid var(--color-primary)` avec offset 2px |
| Labels ARIA sur tous les contrôles | `aria-label` sur icônes seules, `aria-current` sur page active |
| Langue déclarée | `<html lang="fr">` ou `<html lang="en">` selon bascule |
| Images décoratives `alt=""` | Toute image non informative a `alt=""` (lecteur écran les ignore) |
| Palettes colorblind safe | Toutes les palettes ColorBrewer vérifiées (YlOrBr, Greens, BuPu, OrRd, RdYlGn) |
| Pas d'information par couleur seule | Accompagner d'icône + texte |

---

## Ton & Voice

| Principe | Exemple FR | Exemple EN |
|----------|------------|------------|
| Constructif — "zone blanche" = opportunité | "Ces zones concentrent un fort potentiel de production sans accès aux marchés" | "These areas have high production potential but no market access" |
| Zéro jargon — tout indicateur s'explique | "0.8 coopératives pour 100 km²" (pas "densité coopérative normalisée") | "0.8 cooperatives per 100 km²" |
| Souci du terrain — concret, pas abstrait | "Les exploitations de la région des Savanes sont à 45 min en moyenne du marché le plus proche" | "Farms in the Savanes region are on average 45 min from the nearest market" |
| Bilingue — pas de traduction mot à mot | Adapter les formulations à la langue cible | Keep natural phrasing per language |
