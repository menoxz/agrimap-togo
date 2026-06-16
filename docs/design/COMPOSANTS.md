# Spécifications UI — AgriMap Togo

> Documentation des états et comportements pour chaque composant de l'interface.
> Référence DESIGN.md pour les tokens. Tous les composants sont en React + Tailwind CSS 3 avec Lucide React pour les icônes.

---

## Composants génériques (ui/)

### Button

```tsx
interface ButtonProps {
  variant: 'filled' | 'outline' | 'ghost';
  size: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'secondary' | 'accent';
  icon?: LucideIcon;   // Icône optionnelle à gauche
  iconRight?: LucideIcon; // Icône optionnelle à droite
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;  // true = w-full sur mobile
  children: React.ReactNode;
}
```

| Propriété | Valeurs | Détail |
|-----------|---------|--------|
| `size` | `sm` | h: 32px, padding: 8px 12px, text: 14px, icon: 16px |
| `size` | `md` | h: 44px (confort tactile mobile), padding: 12px 20px, text: 16px, icon: 20px |
| `size` | `lg` | h: 56px, padding: 16px 28px, text: 18px, icon: 24px |

#### États — Filled (primary)

```
Normal:   bg-primary (#1B5E20)  text-white  border-none
Hover:    bg-primary-hover (#2E7D32)  cursor-pointer
Active:   brightness(0.95)  scale(0.98)
Focus:    outline 2px solid #1565C0  outline-offset 2px
Disabled: bg-gray-300  text-gray-500  cursor-not-allowed  pointer-events-none
Loading:  icône <Loader2 className="animate-spin" /> + text
```

#### États — Outline

```
Normal:   bg-transparent  text-primary  border-2 border-primary
Hover:    bg-primary-light (#E8F5E9)
Active:   bg-primary/10  scale(0.98)
Focus:    outline 2px solid #1565C0  outline-offset 2px
Disabled: border-gray-300  text-gray-400  cursor-not-allowed
Loading:  même que filled (spinner)
```

#### États — Ghost

```
Normal:   bg-transparent  text-text
Hover:    bg-surface-alt (#F5F5F0)
Active:   bg-gray-200
Focus:    outline 2px solid #1565C0  outline-offset 2px
Disabled: text-muted (#94A3B8)  cursor-not-allowed
```

**Règle** : Un seul bouton `filled` par section/page. Les autres actions sont `outline` ou `ghost`.
**Mobile** : `fullWidth` automatique dans les sections étroites (< 300px de large disponible).

---

### Card

```tsx
interface CardProps {
  variant?: 'default' | 'accent' | 'synthesis';
  padding?: 'sm' | 'md' | 'lg';
  hoverable?: boolean;  // true = ombre au hover
  onClick?: () => void;
  children: React.ReactNode;
}
```

| Variant | Styles |
|---------|--------|
| `default` | bg-surface (#FFFFFF), border 1px solid border (#E2E8F0), radius-md (8px), shadow-sm |
| `accent` | bg-accent-light (#FFF3E0), border 1px solid #E6510033, radius-md |
| `synthesis` | bg-white, border-left 4px solid accent (#E65100), radius-md |

#### États

```
Normal:   shadow-sm, border
Hover:    (si hoverable) shadow-md, border-primary/20, cursor-pointer
Active:   scale(0.99) (si onClick)
Focus:    outline 2px solid primary, outline-offset 2px (si tabIndex)
```

**Règles** :
- Pas d'ombre sur les cartes en mobile (économie de rendu).
- Card `synthesis` utilisée uniquement dans SynthesisView (carte prioritaire).
- Card `accent` utilisée pour les zones blanches (mise en évidence).

---

### Badge

```tsx
interface BadgeProps {
  variant: 'default' | 'success' | 'warning' | 'error' | 'info' | 'primary';
  size?: 'sm' | 'md';
  icon?: LucideIcon;
  children: React.ReactNode;
}
```

| Variant | Styles |
|---------|--------|
| `default` | bg-gray-100, text-text-secondary, radius-full |
| `success` | bg-green-100 (#DCFCE7), text-success (#166534) |
| `warning` | bg-orange-100 (#FFEDD5), text-warning (#9A3412) |
| `error` | bg-red-100 (#FEE2E2), text-error (#991B1B) |
| `info` | bg-blue-100 (#DBEAFE), text-info (#1E40AF) |
| `primary` | bg-primary-light (#E8F5E9), text-primary (#1B5E20) |

**Règles** :
- Ne jamais utiliser la couleur seule : chaque badge a un texte explicite (ex. "Prioritaire" + icône ⚠️).
- `size sm` : h: 20px, text 12px, padding 2px 8px.
- `size md` : h: 24px, text 14px, padding 4px 12px.
- Icône optionnelle à gauche (ex. `CheckCircle` pour success).

---

### Select

```tsx
interface SelectProps {
  options: { value: string; label: string; }[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  icon?: LucideIcon;    // Icône à gauche
  disabled?: boolean;
  error?: string;       // Message d'erreur
}
```

#### États

```
Normal:   bg-white  border-1 solid border (#E2E8F0)  radius-md (8px)
          h: 44px  padding: 8px 12px  cursor-pointer
Hover:    border-primary/40
Focus:    outline 2px solid primary  outline-offset 2px
          (override du outline natif du select)
Active:   border-primary
Disabled: bg-gray-100  text-muted  cursor-not-allowed
Error:    border-error  + message error text-sm en dessous
Open:     dropdown shadow-md  max-h: 240px  overflow-y auto
```

**Mobile** : Utiliser le `<select>` natif du navigateur (UX plus familière sur téléphone). Sur desktop, utiliser un custom dropdown avec `ChevronDown`.

---

### Skeleton

```tsx
interface SkeletonProps {
  variant: 'text' | 'card' | 'circle' | 'map';
  width?: string;
  height?: string;
  lines?: number;   // Pour variant text, nombre de lignes
}
```

| Variant | Styles |
|---------|--------|
| `text` | h: 16px, bg-gray-200, radius-sm, animate-pulse |
| `card` | h: 120px, bg-gray-100, radius-md, animate-pulse |
| `circle` | w: 44px, h: 44px, bg-gray-200, radius-full, animate-pulse |
| `map` | h: 400px, bg-gray-100, radius-md, animate-pulse |

**Règles** :
- Toujours utiliser Skeleton pour les données chargées (GeoJSON, images).
- Ne jamais utiliser de spinner quand on peut montrer un Skeleton (meilleure perception de performance).
- Skeleton map = placeholder de la carte avec les contours du Togo en gris clair (bonus UX).

---

## Composants spécifiques

### LanguageSwitcher

```tsx
interface LanguageSwitcherProps {
  currentLang: 'fr' | 'en';
  onSwitch: (lang: 'fr' | 'en') => void;
  variant?: 'navbar' | 'footer';
}
```

#### Layout

```
Desktop (navbar):
┌──────────────┐
│ FR  │  EN    │   ← Deux pills côte à côte
│ ●   │  ○     │   ● = actif (bg-primary, text-white)
└──────────────┘   ○ = inactif (bg-transparent, border)

Mobile (navbar):
┌────────┐
│  FR/EN │   ← Un seul bouton compact, affiche la langue active
└────────┘   Au clic, bascule immédiatement
```

#### États

```
Actif:    bg-primary  text-white  font-semibold
Inactif:  bg-transparent  text-text-secondary  border-1 border-border
Hover inactif:  bg-primary-light (#E8F5E9)
Focus:    outline 2px solid secondary  outline-offset 2px
```

**Comportement** :
- Au clic, bascule immédiatement (pas de confirmation).
- Changement de langue = mise à jour du state react-i18next + persist dans `localStorage`.
- La page courante reste sur la même route (ne pas naviguer).
- `aria-label` : "Switch language to English" / "Basculer en français".

---

### FilterPanel

```tsx
interface FilterPanelProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  onReset: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface FilterState {
  region: string;            // "" = toutes
  analysisType: 'density' | 'zaap' | 'access' | 'coop' | 'synthesis';
  services: string[];        // ['marches', 'pepinieres', 'cooperatives']
  hasZAAP: 'all' | 'with' | 'without';
}
```

#### Layout (desktop)

```
┌─────────────────────────────┐
│ 🌍 Région                   │  ← icône + label
│ ┌───────────────────────┐   │
│ │ Toutes les régions   ▼│   │  ← Select
│ └───────────────────────┘   │
│                             │
│ 🗺 Type d'analyse           │  ← Radio group
│ ○ Densité exploitations     │
│ ● Couverture ZAAP          │
│ ○ Accessibilité marchés    │
│ ○ Réseau coopératif        │
│ ○ Synthèse priorisation    │
│                             │
│ 🏷 Services                 │  ← Checkbox group
│ ☑ Marchés                   │
│ ☑ Pépinières               │
│ ☐ Coopératives              │
│                             │
│ 🅿 Présence ZAAP            │  ← Radio group
│ ○ Toutes                    │
│ ● Avec ZAAP                 │
│ ○ Sans ZAAP                 │
│                             │
│ ┌─────────────────────────┐ │
│ │ 🧹 Réinitialiser        │ │  ← Bouton outline
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

#### États

| Élément | États |
|---------|-------|
| **Select** | Normal, focus, disabled (aucun ici) |
| **Radio** | Normal (○ border), checked (● filled primary), hover (bg-primary-light) |
| **Checkbox** | Unchecked (□ border), checked (☑ bg-primary + check icon), hover (bg-primary-light) |
| **Reset button** | Outline variant, désactivé si tous les filtres sont par défaut |

**Comportement** :
- Tout changement de filtre met à jour la carte avec un debounce de 150ms.
- Sur desktop, le FilterPanel est toujours visible (collapsible optionnel).
- Sur mobile, le FilterPanel est masqué par défaut, s'ouvre en overlay/bottom sheet.

---

### MapLegend

```tsx
interface MapLegendProps {
  analysisType: 'density' | 'zaap' | 'access' | 'coop' | 'synthesis';
  colorScheme: string[];  // Palette ColorBrewer (5 couleurs)
  labels: string[];       // Labels FR
  labelsEn?: string[];    // Labels EN
}
```

#### Layout

```
┌─────────────────────┐
│ Légende — Densité   │  ← titre selon couche active
│                     │
│ ■ Très élevé        │  ← Carré 12×12px avec couleur + label
│ ■ Élevé             │
│ ■ Moyen             │
│ ■ Faible            │
│ ■ Très faible       │
│                     │
│ 🛈 Les couleurs suivent│
│ la palette YlOrBr   │
│ colorblind safe     │
└─────────────────────┘
```

**Règles** :
- La légende change dynamiquement selon `analysisType`.
- Toujours inclure les palettes colorblind safe dans les labels.
- Si la couche a des points (marchés, coopératives), ajouter une section légende des points.
- Sur mobile : intégrée dans le FilterPanel. Sur desktop : panneau séparé en bas des filtres.

---

### RegionPopup

```tsx
interface RegionPopupProps {
  regionName: string;
  regionNameEn: string;
  indicators: {
    label: string;
    value: string | number;
    trend?: 'up' | 'down' | 'stable';
    type?: 'density' | 'zaap' | 'access' | 'coop';
  }[];
  onClose: () => void;
  onViewDetails?: () => void;
}
```

#### Layout

```
┌─────────────────────────────────────┐
│   × Fermer                          │  ← Bouton fermer (ghost)
│                                     │
│   🌍 Région des Savanes             │  ← Nom région
│                                     │
│   ┌─── Indicateurs ──────────────┐  │
│   │                              │  │
│   │ 🗺 4.2 exploitations / km²  │  │  ← Icône + valeur + label
│   │ 📐 Couverture ZAAP : 34%    │  │
│   │ 🚗 Marché le + proche : 45' │  │
│   │ 👥 Coop pour 100 km² : 0.8  │  │
│   │                              │  │
│   └──────────────────────────────┘  │
│                                     │
│   ┌─────────────────────────────┐   │
│   │ Voir la fiche détaillée →  │   │  ← Bouton filled
│   └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

#### États

```
Apparition:  fade + scale (200ms ease-out)
Disparition: fade (150ms)
Fermeture:   bouton ×, ou clic en dehors, ou Escape
Focus trap:  oui (accessibilité clavier)
```

**Comportement** :
- Apparaît au clic sur une région de la carte (mode exploration).
- Contient les 4 indicateurs clés de la région.
- "Voir la fiche" redirige vers `/story#zone-{region}`.
- Leaflet Popup standard mais stylisé selon le design system.

---

### StoryNavigator

```tsx
interface StoryNavigatorProps {
  acts: { id: string; label: string; labelEn: string; icon: LucideIcon }[];
  currentAct: number;
  onActChange: (index: number) => void;
}
```

#### Layout (desktop)

```
● Acte 1    ○ Acte 2    ○ Acte 3    ○ Acte 4    ○ Synthèse
Où produit-on ?  Est-ce aménagé ?  Est-ce accessible ?  ...
────────────────────────────────────────────────────────────
```

#### Layout (mobile)

```
← ○ ● ○ ○ Synthèse →   ← scroll horizontal
   Acte 2
```

#### États

```
Actif:      ● filled (bg-primary) + label bold + text-primary
Inactif:    ○ outlined (border-primary/40) + text-muted
Passé:      ● check (bg-primary + CheckCircle icon)
Hover:      bg-primary-light (uniquement sur les inactifs)
Focus:      outline 2px solid secondary
```

**Comportement** :
- Desktop : barre horizontale fixe en haut de la colonne texte.
- Mobile : scroll horizontal avec les 5 items.
- Au clic sur un acte : transition animée vers l'acte correspondant.
- Les actes passés affichent une icône ✓ (CheckCircle) pour montrer la progression.
- Utiliser `IntersectionObserver` pour mettre à jour `currentAct` au scroll.

---

### ZoneCard

```tsx
interface ZoneCardProps {
  zone: {
    id: string;
    name: string;
    priority: 1 | 2 | 3;
    indicators: { label: string; value: string; icon: LucideIcon }[];
    thumbnail?: string;  // URL miniature carte
  };
  onSelect: (zoneId: string) => void;
}
```

#### Layout

```
┌──────────────────────────────────┐
│  ┌────────────────────┐          │
│  │  Miniature carte   │          │  ← 120×80px, fond de carte
│  │  (zone surlignée)  │  Priorité│  ← Badge
│  └────────────────────┘  1       │
│                                  │
│  Région des Savanes              │  ← Name
│  Zone prioritaire                │
│                                  │
│  🗺 4.2 / km²   📐 34% couv.    │  ← Indicateurs 2x2 grid
│  🚗 45' marché  👥 0.8 coop.    │
│                                  │
└──────────────────────────────────┘
```

#### États

```
Normal:   Card variant default (white)
Hover:    shadow-md, border-primary/20, cursor-pointer
Focus:    outline 2px solid primary
Selected: (dans la synthèse) border-accent + bg-accent-light
```

**Règles** :
- Priorité 1 = cadre accent (border-left accent).
- Priorité 2 = cadre primary.
- Priorité 3 = cadre default.
- Sur mobile : pleine largeur, empilées verticalement.
- Sur desktop : 3 colonnes (ou 2 selon espace).

---

### ShareWidget

```tsx
interface ShareWidgetProps {
  message: string;     // Message clé à partager
  url?: string;        // URL de la page (par défaut window.location.href)
}
```

#### Layout

```
┌──────────────────────────────────┐
│                                   │
│ 📢 Vous voulez partager ?        │
│                                   │
│ ┌──────────────────────────────┐ │
│ │ "Les zones blanches de       │ │
│ │ services agricoles au Togo   │ │
│ │ — où investir en priorité ?" │ │  ← Message pré-rempli
│ └──────────────────────────────┘ │
│                                   │
│ [📋 Copier] [🐦 Twitter] [📧 Email]│  ← Boutons partage
│                                   │
└──────────────────────────────────┘
```

#### États

```
Copier:   clique → "Copié !" (CheckCircle) pendant 2s → retour normal
Twitter:  ouvre twitter.com/intent/tweet avec message + URL
Email:    ouvre mailto avec sujet + corps
```

---

### SynthesisView

```tsx
interface SynthesisViewProps {
  topZones: ZoneCardProps['zone'][];
  recommendation: { region: string; action: string; icon: LucideIcon }[];
}
```

#### Layout

```
┌──────────────────────────────────────────────────┐
│ Carte synthèse RdYlGn (carte Leaflet)            │
│ avec les 3 zones prioritaires surlignées         │
└──────────────────────────────────────────────────┘

┌─ Recommandations ──────────────────────────────┐
│                                                 │
│ 1. 🌾 Région des Savanes                        │
│    → Prioriser l'implantation d'une ZAAP        │
│                                                 │
│ 2. 🏪 Région Centrale                           │
│    → Développer l'accès aux marchés             │
│                                                 │
│ 3. 👥 Région des Plateaux                       │
│    → Créer un réseau coopératif                 │
│                                                 │
└─────────────────────────────────────────────────┘

┌─ ZoneCard 1 ─┐ ┌─ ZoneCard 2 ─┐ ┌─ ZoneCard 3 ─┐
└──────────────┘ └──────────────┘ └──────────────┘
```

**Comportement** :
- La carte synthèse est une Leaflet avec la couche SynthesisLayer (RdYlGn).
- Les 3 zones prioritaires sont marquées d'un marqueur spécial.
- Le scroll vers les ZoneCards se fait automatiquement après la synthèse.
- `ShareWidget` en bas de la vue.

---

## Composants génériques additionnels (bonus)

### Tooltip

```tsx
interface TooltipProps {
  content: string;     // Texte du tooltip
  position?: 'top' | 'bottom' | 'left' | 'right';
  children: React.ReactNode;
}
```

**États** : hidden (default) → visible au hover/focus. Transition 150ms.

### Toast / Notification

```tsx
interface ToastProps {
  variant: 'success' | 'error' | 'info';
  message: string;
  duration?: number;   // ms, 0 = persistant
  onClose?: () => void;
}
```

**États** : slide-in top-right (desktop) / bottom (mobile). Auto-dismiss après duration.

---

## Tableau récapitulatif des états

| Composant | Normal | Hover | Focus | Active | Disabled | Loading | Error |
|-----------|--------|-------|-------|--------|----------|---------|-------|
| Button | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| Card | ✅ | ✅* | ✅* | ✅* | — | — | — |
| Badge | ✅ | — | — | — | — | — | — |
| Select | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ |
| Skeleton | ✅ | — | — | — | — | — | — |
| LanguageSwitcher | ✅ | ✅ | ✅ | ✅ | — | — | — |
| FilterPanel | ✅ | ✅ | ✅ | ✅ | — | — | — |
| MapLegend | ✅ | — | — | — | — | — | — |
| RegionPopup | ✅ | — | — | — | — | — | — |
| StoryNavigator | ✅ | ✅ | ✅ | ✅ | — | — | — |
| ZoneCard | ✅ | ✅ | ✅ | — | — | — | — |
| ShareWidget | ✅ | ✅ | ✅ | ✅ | — | — | — |
| SynthesisView | ✅ | ✅ | ✅ | — | — | — | — |

✅* = si hoverable ou onClick défini

---

## Notes d'implémentation

| Note | Détail |
|------|--------|
| **Focus visible** | Toujours utiliser `focus-visible:` plutôt que `focus:` pour ne pas montrer le focus au clic souris |
| **Reduced motion** | `@media (prefers-reduced-motion)` : désactiver les animations, transitions en instant |
| **Touch targets** | Tous les éléments cliquables ≥ 44×44px (WCAG 2.5.5) |
| **Dark mode** | Non demandé (timebox). Préparer via CSS custom properties si itération future |
| **Print styles** | La page Rapport utilise `@media print` pour masquer navbar, boutons, et optimiser l'impression |
