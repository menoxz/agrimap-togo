# Wireframes — AgriMap Togo

> **4 pages** clés, décrites en layout desktop + adaptation mobile.
> Cotes en pixels (px) pour desktop (≥1024px) ; mobile (<640px) utilise une grille fluide.
> Tous les composants font référence aux tokens de DESIGN.md.

---

## Sommaire des pages

1. [Page 1 — Accueil (HomePage)](#page-1--accueil-homepage)
2. [Page 2 — Lecture guidée (StoryPage)](#page-2--lecture-guidée-storypage)
3. [Page 3 — Exploration libre (ExplorePage)](#page-3--exploration-libre-explorepage)
4. [Page 4 — Rapport (ReportPage)](#page-4--rapport-reportpage)

---

## Page 1 — Accueil (HomePage)

**Objectif** : Captiver le visiteur en ≤ 3 secondes, faire comprendre le message, offrir 3 entrées (lecture guidée, exploration, rapport).

### Desktop (≥1024px)

```
┌──────────────────────────────────────────────────────────────────┐
│ NavBar                                                            │
│ ┌──────┐  ┌──────────┐ ┌──────┐ ┌──────┐ ┌──────┐  ┌─────────┐ │
│ │ LOGO │  │ Explorer │ │ Lire │ │Rappor│ │ FREN │  │ GitHub  │ │
│ └──────┘  └──────────┘ └──────┘ └──────┘ └──────┘  └─────────┘ │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ╔══════════════════════════════════════════════════════════╗    │
│   ║  (Zone Hero — 100vh)                                    ║    │
│   ║                                                         ║    │
│   ║         ┌─────────────────┐                             ║    │
│   ║         │   Sprout icon   │  ← Lucide Sprout            ║    │
│   ║         └─────────────────┘                             ║    │
│   ║                                                         ║    │
│   ║   ◄ PRODUIRE NE SUFFIT PAS :                           ║    │
│   ║   IL FAUT ÊTRE RELIÉ ►                                 ║    │
│   ║                                                         ║    │
│   ║   Sous-titre : "La carte qui relie la production        ║    │
│   ║   agricole togolaise à ses services."                   ║    │
│   ║                                                         ║    │
│   ║   ┌──────────────────────┐  ┌──────────────────┐       ║    │
│   ║   │ Explorer les zones   │  │ Suivre l'histoire │       ║    │
│   ║   │ blanches             │  │ (4 actes)         │       ║    │
│   ║   └──────────────────────┘  └──────────────────┘       ║    │
│   ║                                                         ║    │
│   ║        + Lire le rapport                                 ║    │
│   ║                                                         ║    │
│   ╚══════════════════════════════════════════════════════════╝    │
│                                                                  │
│   ┌──────────┐  ┌─────────────┐  ┌────────────┐                 │
│   │   4       │  │   6          │  │   22        │                 │
│   │ Analyses  │  │ Régions     │  │ Zones       │                 │
│   │ clés      │  │ agricoles   │  │ prioritaires│                 │
│   └──────────┘  └─────────────┘  └────────────┘                 │
│                                                                  │
│   ─── Pourquoi ce tableau de bord ? ───                         │
│   (3 colonnes : problème, solution, impact)                     │
│                                                                  │
│   ─── Footer ───                                                │
│   Logo | Data Challenge Togo AI Lab 2026 | Sources :             │
│   geodata.gouv.tg, opendata.gouv.tg | Licences ouvertes         │
└──────────────────────────────────────────────────────────────────┘
```

#### Détails layout

| Zone | Position | Dimensions | Contenu |
|------|----------|------------|---------|
| **NavBar** | Top, fixed | h: 64px | Logo (gauche) + 3 nav links + LanguageSwitcher + GitHub icon (droite) |
| **Hero** | Sous navbar, 100vh | Centré verticalement, padding latéral 48px | Icône Sprout (64×64), H1 "Produire ne suffit pas…", sous-titre, 2 CTA boutons + lien texte |
| **Statistiques** | Après hero | 3 colonnes égales, gap 32px | Chiffres clés (nombre analyses, régions, zones) avec labels |
| **Section pourquoi** | Après stats | 3 colonnes (problème/solution/impact) | Texte court + icône |
| **Footer** | Bottom | h: ~120px | Logo, crédits, sources, licences |

### Mobile (<640px)

```
┌────────────────────┐
│ NavBar compacte    │
│ LOGO  ☰            │
├────────────────────┤
│                    │
│   ┌──┐             │
│   │🌱│             │
│   └──┘             │
│                    │
│ PRODUIRE NE       │
│ SUFFIT PAS :      │
│ IL FAUT ÊTRE      │
│ RELIÉ             │
│                    │
│ Sous-titre        │
│ (2 lignes)        │
│                    │
│ ┌────────────────┐│
│ │ Explorer       ││
│ ├────────────────┤│
│ │ Suivre l'hist. ││
│ └────────────────┘│
│                    │
│   Lire le rapport │
│                    │
│ ┌─────┐┌─────┐   │
│ │4 ana││6 rég│   │
│ └─────┘└─────┘   │
│ ┌─────┐          │
│ │22 zo│          │
│ └─────┘          │
│                    │
│ Problème → Sol...  │
│ (stack vertical)  │
│                    │
│ Footer compact    │
└────────────────────┘
```

#### Changements mobile

- **NavBar** : Menu burger ☰ à droite. LanguageSwitcher réduit à "FR/EN" inline.
- **Hero** : Padding latéral réduit à 16px. CTA boutons en stack vertical (pleine largeur).
- **Statistiques** : 3 en ligne sur 640px, 2+1 sur <480px.
- **Section pourquoi** : Passe en colonne unique.
- **CTA secondaire** : Lien texte "Lire le rapport" sous les boutons.

### Zones cliquables

| Élément | Action |
|---------|--------|
| "Explorer les zones blanches" (bouton) | → `/explore` (ExplorePage) |
| "Suivre l'histoire" (bouton) | → `/story` (StoryPage) |
| "Lire le rapport" (lien) | → `/report` (ReportPage) |
| Logo | → `/` (HomePage) — reload |
| Nav "Explorer" | → `/explore` |
| Nav "Lire" | → `/story` |
| Nav "Rapport" | → `/report` |
| LanguageSwitcher | Bascule FR↔EN, persiste en localStorage |
| Chiffres stats | Scroll vers la section correspondante (acte) |

---

## Page 2 — Lecture guidée (StoryPage)

**Objectif** : Guider le visiteur à travers les 4 actes narratifs avec synchronisation carte + texte.

### Desktop (≥1024px)

```
┌──────────────────────────────────────────────────────────────────┐
│ NavBar (fixed, transparente → opaque au scroll)                │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────────────────────────────────┐ ┌────────────────┐   │
│   │  COLONNE TEXTE (gauche, 40%)        │ │ COLONNE CARTE  │   │
│   │                                      │ │ (droite, 60%)  │   │
│   │  ┌─ StoryNavigator ──────────────┐   │ │                │   │
│   │  │ ● Acte 1    ○ Acte 2    ○ ... │   │ │   Carte       │   │
│   │  │ ─────────────────────────     │   │ │   Leaflet     │   │
│   │  └────────────────────────────────┘   │ │   avec la     │   │
│   │                                       │ │   couche      │   │
│   │  ┌─ ActContainer ─────────────────┐   │ │   active      │   │
│   │  │  [Icône] Acte 1 :              │   │ │              │   │
│   │  │  Où produit-on ?               │   │ │              │   │
│   │  │                                │   │ │              │   │
│   │  │  Texte narratif (2-3 phrases)  │   │ │              │   │
│   │  │                                │   │ │              │   │
│   │  │  ┌──── Clé ────────┐          │   │ │              │   │
│   │  │  │ Indicateur 1   │ │          │   │ │              │   │
│   │  │  │ Indicateur 2   │ │          │   │ │              │   │
│   │  │  └────────────────┘          │   │ │              │   │
│   │  │                                │   │ │              │   │
│   │  │  "Et donc..." (callout)       │   │ │              │   │
│   │  └────────────────────────────────┘   │ │              │   │
│   │                                       │ │              │   │
│   │  [← Acte précédent]  [Acte suivant →] │ │              │   │
│   └──────────────────────────────────────┘ └────────────────┘   │
│                                                                  │
│   ═══════ Section Synthèse (après Acte 4) ═══════               │
│                                                                  │
│   ┌──────────────┐  ┌──────────────────────┐                    │
│   │ Carte syn-   │  │ Recommandations       │                    │
│   │ thèse avec   │  │ 1. Région X → ZAAP   │                    │
│   │ priorisation │  │ 2. Région Y → Marché  │                    │
│   │ (RdYlGn)     │  │ 3. Région Z → Coop    │                    │
│   └──────────────┘  └──────────────────────┘                    │
│                                                                  │
│   ┌──────────────────────────────────────────────────┐          │
│   │ ZoneCard × 3 (fiches zones prioritaires)         │          │
│   │ ┌──────────┐ ┌──────────┐ ┌──────────┐          │          │
│   │ │Zone 1    │ │Zone 2    │ │Zone 3    │          │          │
│   │ │Indicateur│ │Indicateur│ │Indicateur│          │          │
│   │ └──────────┘ └──────────┘ └──────────┘          │          │
│   └──────────────────────────────────────────────────┘          │
│                                                                  │
│   ┌──────────────────────────────┐                              │
│   │ [ShareWidget] Partager       │                              │
│   └──────────────────────────────┘                              │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

#### Détails layout

| Zone | Position | Détails |
|------|----------|---------|
| **StoryNavigator** | Top de la colonne texte, sticky au scroll | 4 points avec libellés (Acte 1, 2, 3, 4) + Synthèse. Le point actif est rempli (●), les autres sont vides (○). |
| **ActContainer** | Scrollable, occupe la hauteur restante | Titre avec icône Lucide, texte narratif (2-3 phrases max), 2-3 indicateurs clés en mini-cartes, callout "Et donc…" (construction : révèle l'implication décisionnelle) |
| **Colonne carte** | Fixe (sticky top), 60% largeur | La carte Leaflet se met à jour automatiquement quand l'acte change. Animations de transition de couche. |
| **Synthèse** | Pleine largeur après les 4 actes | Carte prioritaire (RdYlGn) + 3 recommandations actionnables + ZoneCards |
| **ZoneCard** | 3 colonnes, gap 16px | Mini-carte statique (fond de carte sans interaction), nom zone, 3 indicateurs clés, badge de priorité |
| **ShareWidget** | Centré en bas | Bouton partager + message clé pré-rempli |

### Mobile (<640px)

```
┌──────────────────────┐
│ NavBar (mini)        │
├──────────────────────┤
│                      │
│ ○ Acte 1 ○ Acte 2  │  ← StoryNavigator horizontal
│ ● Acte 3             │    (scrollable horizontal)
│                      │
│ ┌── Carte ──────────┐│
│ │   (50vh, sticky)  ││
│ │                   ││
│ └───────────────────┘│
│                      │
│ ┌── Acte 3 ─────────┐│
│ │ [Icône] Titre     ││
│ │ Texte narratif    ││
│ │                   ││
│ │ ┌─ Indicateur ──┐ ││
│ │ │ Valeur + label│ ││
│ │ └───────────────┘ ││
│ │                   ││
│ │ 💡 Et donc...    ││
│ └───────────────────┘│
│                      │
│ [← Préc]  [Suiv →]  │
│                      │
│ ═════ Synthèse ═════│
│ ┌──────────────────┐│
│ │ Carte synthèse   ││
│ │ (pleine largeur) ││
│ └──────────────────┘│
│ Recommandations...  │
│ ┌ ZoneCard 1 ─────┐│
│ └─────────────────┘│
│ ┌ ZoneCard 2 ─────┐│
│ └─────────────────┘│
│ ┌ ZoneCard 3 ─────┐│
│ └─────────────────┘│
│                      │
│ [ShareWidget]        │
└──────────────────────┘
```

#### Changements mobile

- **StoryNavigator** : Horizontal scrollable en haut (mini barre de progression).
- **Carte** : 50vh sticky en haut (passe sous la navbar au scroll).
- **Texte** : Sous la carte, en colonne unique.
- **Indicateurs** : En stack vertical (pas de grille).
- **ZoneCards** : En stack vertical (pleine largeur).
- **Boutons navigation** : Pleine largeur, en bas de chaque acte.

### Zones cliquables

| Élément | Action |
|---------|--------|
| StoryNavigator points | Scroll vers l'acte correspondant |
| "Acte précédent / suivant" | Transition animée vers acte suivant/précédent |
| Carte Leaflet | Interaction zoom/pan normale |
| Callout "Et donc…" | Stay — information contextuelle |
| ZoneCard | → Scroll vers la section détail ou popup modale |
| ShareWidget | Partager le message clé (URL + texte pré-rempli) |

---

## Page 3 — Exploration libre (ExplorePage)

**Objectif** : Permettre à l'utilisateur d'explorer les données avec des filtres, sans guide narratif.

### Desktop (≥1024px)

```
┌──────────────────────────────────────────────────────────────────┐
│ NavBar                                                            │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─ FilterPanel (250px, collapsible) ─┐  ┌─ Carte (flex 1) ──┐ │
│  │                                    │  │                    │ │
│  │  🌍 Région                         │  │   Carte Leaflet    │ │
│  │  ┌──────────────────────────┐      │  │   pleine hauteur   │ │
│  │  │ Toutes les régions      ▼│      │  │                    │ │
│  │  └──────────────────────────┘      │  │   Couche sélection-│ │
│  │                                    │  │   née affichée     │ │
│  │  🗺 Type d'analyse                 │  │                    │ │
│  │  ○ Densité exploitations           │  │   "Région des      │ │
│  │  ● Couverture ZAAP                │  │   Savanes :        │ │
│  │  ○ Accessibilité marchés          │  │   4.2 exploitations │ │
│  │  ○ Réseau coopératif              │  │   / km²"            │ │
│  │  ○ Synthèse priorisation          │  │                    │ │
│  │                                    │  │   [RegionPopup]    │ │
│  │  🏷 Services (checkbox si accès)   │  │                    │ │
│  │  ☑ Marchés  ☑ Pépinières          │  │                    │ │
│  │  ☐ Coopératives                   │  │                    │ │
│  │                                    │  │                    │ │
│  │  🅿 Présence ZAAP                  │  │                    │ │
│  │  ○ Toutes  ● Avec ZAAP  ○ Sans   │  │                    │ │
│  │                                    │  │                    │ │
│  │  ┌──────────────────────────┐      │  │                    │ │
│  │  │ Réinitialiser filtres   │      │  │                    │ │
│  │  └──────────────────────────┘      │  │                    │ │
│  │                                    │  │                    │ │
│  │  ──── Légende (MapLegend) ────     │  │                    │ │
│  │  [palette YlOrBr]                 │  │                    │ │
│  │  ■ Très élevé                     │  │                    │ │
│  │  ■ Élevé                          │  │                    │ │
│  │  ■ Moyen                          │  │                    │ │
│  │  ■ Faible                         │  │                    │ │
│  │  ■ Très faible                    │  │                    │ │
│  │                                    │  │                    │ │
│  └────────────────────────────────────┘  └────────────────────┘ │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

#### Détails layout

| Zone | Détails |
|------|---------|
| **FilterPanel** | Panneau latéral gauche, 250px. Collapsible via bouton "☰ Filtres". Contient : Select région, Radio type analyse, Checkbox services, Radio ZAAP, Reset bouton, MapLegend en bas |
| **MapLegend** | Intégrée dans le panneau de filtres. Palette dynamique selon la couche active. |
| **Carte** | Occupe tout l'espace restant. **RegionPopup** au clic sur une région : infobulle avec indicateurs clés. |
| **RegionPopup** | Apparaît au clic sur une région : nom région, valeur indicateur, taux de couverture, distance moyenne. 2 boutons : "Voir la fiche" (→ synthèse) et "Fermer". |

### Mobile (<640px)

```
┌──────────────────────┐
│ NavBar mini          │
├──────────────────────┤
│                      │
│ [☰ Filtres]    [🧹] │ ← Bouton filtres + reset
│                      │
│ ┌──────────────────┐│
│ │   Carte Leaflet  ││
│ │   (55vh)         ││
│ │                  ││
│ └──────────────────┘│
│                      │
│ ┌─ FilterPanel ─────┐│
│ │ (si déplié)       ││
│ │ Région ▼          ││
│ │ ○ ○ ● ○ ○ Analyse││
│ │ ☑ ☐ Services     ││
│ │ ○ ● ○ ZAAP       ││
│ │ Légende...        ││
│ └───────────────────┘│
│                      │
│ [RegionPopup]        │
│ (overlay si clic)    │
│                      │
└──────────────────────┘
```

#### Changements mobile

- **Carte** : 55vh en haut. FilterPanel en dessous (sorte de bottom sheet).
- **FilterPanel** : Masqué par défaut, se déplie via bouton "☰ Filtres".
- **RegionPopup** : S'ouvre en modal pleine largeur (overlay) au clic sur une région.
- **Reset** : Bouton 🧹 séparé en haut à droite.

### Zones cliquables

| Élément | Action |
|---------|--------|
| Select "Région" | Filtre la carte + met à jour la légende |
| Radio "Type d'analyse" | Change la couche affichée + la légende |
| Checkbox "Services" | Affiche/masque les points services sur la carte |
| Radio "ZAAP" | Filtre les zones avec/sans ZAAP |
| Clic région sur carte | RegionPopup avec indicateurs |
| "Voir la fiche" (RegionPopup) | → `/story#zone-{id}` (ancre vers la zone dans la synthèse) |
| "Réinitialiser filtres" | Reset tous les filtres aux valeurs par défaut |

---

## Page 4 — Rapport (ReportPage)

**Objectif** : Présenter la démarche, les sources, la qualité des données et les limites de manière lisible et téléchargeable.

### Desktop (≥1024px)

```
┌──────────────────────────────────────────────────────────────────┐
│ NavBar                                                            │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─── Table des matières (250px, sticky) ─┐  ┌─ Contenu ─────┐ │
│  │                                        │  │               │ │
│  │ ● 1. Démarche                         │  │   # 1. Démarche  │
│  │ ● 2. Sources de données               │  │   Texte...     │ │
│  │ ● 3. Qualité des données              │  │               │ │
│  │   3.1 Complétude                      │  │   ┌──────────┐ │ │
│  │   3.2 Précision                       │  │   │Tableau   │ │ │
│  │ ● 4. Analyses                         │  │   │complétude│ │ │
│  │   4.1 Densité exploitations           │  │   └──────────┘ │ │
│  │   4.2 Couverture ZAAP                 │  │               │ │
│  │   4.3 Accessibilité                   │  │               │ │
│  │   4.4 Réseau coopératif              │  │               │ │
│  │ ● 5. Limites                         │  │               │ │
│  │ ● 6. Conclusion                      │  │               │ │
│  │                                        │  │               │ │
│  │  ┌────────────────────────┐          │  │               │ │
│  │  │ 📥 Télécharger PDF     │          │  │               │ │
│  │  └────────────────────────┘          │  │               │ │
│  │  ┌────────────────────────┐          │  │               │ │
│  │  │ 🔗 Copier lien         │          │  │               │ │
│  │  └────────────────────────┘          │  │               │ │
│  │                                        │  │               │ │
│  └────────────────────────────────────────┘  └───────────────┘ │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

#### Détails layout

| Zone | Détails |
|------|---------|
| **Table des matières** | Colonne gauche, 250px, sticky (top: 80px). Souligne la section active au scroll. |
| **Contenu** | Colonne droite. Sections avec heading 2, sous-sections heading 3. Tableaux stylisés (qualité données). Mini-cartes statiques. |
| **Boutons action** | En bas de la TdM : "Télécharger PDF" (généré côté client) et "Copier lien". |

### Mobile (<640px)

```
┌──────────────────────┐
│ NavBar mini          │
├──────────────────────┤
│                      │
│ [☰ Sommaire]         │ ← Modal overlay de la TdM
│                      │
│ 📥 Télécharger PDF   │ ← Bouton flottant en haut
│                      │
│ ── Rapport ──────────│
│                      │
│ # 1. Démarche        │
│ Texte...             │
│                      │
│ # 2. Sources         │
│ ...                  │
│                      │
│ # 3. Qualité         │
│ ┌ Tableau ─────────┐│
│ │ complétude       ││
│ └──────────────────┘│
│                      │
│ ...                  │
│                      │
│ Footer               │
└──────────────────────┘
```

#### Changements mobile

- **Table des matières** : Modal overlay déclenché par bouton "☰ Sommaire" en haut.
- **Téléchargement** : Bouton flottant en haut (FAB subtil).
- **Contenu** : Colonne unique, pleine largeur.
- **Tableaux** : Deviennent des listes ou scroll horizontal si nécessaire.

### Zones cliquables

| Élément | Action |
|---------|--------|
| Table des matières (items) | Scroll vers la section correspondante |
| "Télécharger PDF" | Génère et télécharge le rapport en PDF (html2pdf ou équivalent) |
| "Copier lien" | Copie l'URL de la page dans le presse-papier |
| Liens sources | Ouvre les portails data dans un nouvel onglet |

---

## Notes techniques transverses

| Aspect | Règle |
|--------|-------|
| **Sticky éléments** | NavBar toujours fixed (h: 64px desktop, 56px mobile). Les éléments sticky (TdM, carte) ont un offset-top de 80px desktop / 64px mobile. |
| **Transitions** | Changement d'acte : transition 300ms ease. Popup : fade 200ms + scale. Filtres : mise à jour 150ms debounced. |
| **Empty states** | Carte sans filtre = vue du Togo entier. Aucun résultat = message "Aucune zone ne correspond aux filtres sélectionnés" avec illustration. |
| **Loading** | GeoJSON chargé via `<Skeleton>` pour la carte et les indicateurs. Skeleton = placeholder gris animé (pulse). |
| **Error** | Erreur de chargement = message "Impossible de charger les données" + bouton Réessayer. Icône AlertTriangle. |
| **Data freshness** | Badge en haut de chaque page : "Données : juin 2026" + lien vers le rapport de qualité. |
