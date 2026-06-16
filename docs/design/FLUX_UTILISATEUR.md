# Flux Utilisateur — AgriMap Togo

> 3 parcours utilisateur complets, couvrant les cas d'usage P1 (obligatoires).
> Chaque flux décrit : déclencheur → étapes → succès → points d'attention.

---

## Parcours A — Lecture guidée (Jury)

**Utilisateur** : Sarah (membre du jury Togo AI Lab)
**Objectif** : Évaluer le storytelling, la qualité des données et la force du message en ≤ 5 minutes.
**Cas d'usage** : UC-12, UC-13, UC-05, UC-17

### Déclencheur

Sarah reçoit le lien `agrimap.favoured.cloud`. Elle l'ouvre sur son ordinateur lors de la session d'évaluation.

### Flux

```
 1. PAGE D'ACCUEIL (HomePage)
    ┌─ Sarah voit le message "Produire ne suffit pas : il faut être relié."
    │  + icône Sprout + sous-titre explicatif
    │  → Comprend le thème en < 10 secondes (UC-12 ✓)
    │
    ├─ Option A : Clique "Suivre l'histoire (4 actes)" → FLUX A (recommandé)
    │
    └─ Option B : Clique "Explorer les zones blanches" → Parcours B


 2. PAGE LECTURE GUIDÉE (StoryPage) — Acte 1 : Densité
    ┌─ La carte affiche la couche YlOrBr (densité exploitations)
    │  Texte : "Où produit-on au Togo ?"
    │  Indicateurs : exploitations/km² par région
    │  Callout : "Les régions des Savanes et Centrale concentrent
    │   la plus forte densité"
    │
    ├─ Navigation : clic sur → "Acte suivant"
    │  (ou scroll, ou clic StoryNavigator)
    │
    └─ Temps estimé : ~30-45 secondes de lecture


 3. ACTE 2 : Couverture ZAAP
    ┌─ La carte bascule sur Greens (couverture ZAAP)
    │  Texte : "Ces zones de production sont-elles aménagées ?"
    │  Les zones hors ZAAP ressortent en clair
    │  Callout : "X% des bassins de production sont hors ZAAP"
    │
    ├─ Navigation → Acte suivant
    └─ Temps : ~30-45 secondes


 4. ACTE 3 : Accessibilité
    ┌─ La carte bascule sur BuPu (accessibilité marchés/pépinières)
    │  Texte : "Les producteurs peuvent-ils vendre leurs récoltes ?"
    │  Points marchés + buffers d'accessibilité
    │  Callout : "La région X est à 45 min en moyenne du marché"
    │
    ├─ Navigation → Acte suivant
    └─ Temps : ~30-45 secondes


 5. ACTE 4 : Réseau coopératif
    ┌─ La carte bascule sur OrRd (maillage coopératif)
    │  Texte : "L'organisation collective est-elle présente ?"
    │  Points coopératives + zones blanches
    │  Callout : "Y coopératives pour 100 km² en moyenne"
    │
    ├─ Navigation → Synthèse
    └─ Temps : ~30-45 secondes


 6. SYNTHÈSE — Carte de priorisation
    ┌─ La carte bascule sur RdYlGn (synthèse)
    │  3 recommandations affichées :
    │   1. Région des Savanes → prioriser ZAAP
    │   2. Région Centrale → développer marchés
    │   3. Région des Plateaux → créer coopératives
    │
    ├─ ZoneCards (3 colonnes) : fiches détaillées
    │  Sarah clique sur "Région des Savanes" pour voir les
    │  indicateurs détaillés → Scroll vers la ZoneCard
    │
    └─ Temps : ~1 minute


 7. PARTAGE (optionnel)
    ┌─ Sarah veut garder une trace
    │  ShareWidget : "Copier le lien" → 📋
    │  Ou Tweet pour diffusion
    │
    └─ Succès du parcours A ✓
```

### Succès

- Sarah comprend le message en ≤ 10 secondes (UC-12).
- Elle a vu les 4 analyses + synthèse en ≤ 5 minutes (UC-13).
- Elle peut citer 3 recommandations géographiques concrètes.
- Elle peut accéder au rapport pour les détails (UC-14).

### Points d'attention

- La synthèse doit être visible AVANT le scroll final (pas besoin de tout descendre).
- Chaque acte doit se lire indépendamment (Sarah peut arriver par n'importe quel acte).
- Les transitions de carte ne doivent pas être trop lentes (max 300ms).
- Le callout "Et donc…" est la phrase la plus importante de chaque acte — la formuler comme une implication décisionnelle.

---

## Parcours B — Exploration libre (Planificateur)

**Utilisateur** : Awa (planificatrice agricole publique)
**Objectif** : Explorer les données par région, filtrer par critères, identifier les zones blanches.
**Cas d'usage** : UC-01, UC-02, UC-03, UC-04, UC-07

### Déclencheur

Awa reçoit un lien de son supérieur. Elle doit préparer un argumentaire pour la prochaine ZAAP. Elle ouvre le dashboard sur son téléphone (connexion 3G).

### Flux

```
 1. PAGE D'ACCUEIL (HomePage) — 3G, chargement 5s
    ┌─ La page se charge avec Skeleton (carte placeholder)
    │  Puis le contenu apparaît
    │
    ├─ Awa clique "Explorer les zones blanches" →
    │
    └─ Navigation vers /explore


 2. PAGE EXPLORATION (ExplorePage) — Vue initiale
    ┌─ Carte du Togo avec la couche Densité (par défaut)
    │  FilterPanel replié sur mobile
    │
    ├─ Awa clique [☰ Filtres] → FilterPanel s'ouvre
    │
    └─ Elle change le type d'analyse :


 3. FILTRAGE — Couverture ZAAP
    ┌─ Elle sélectionne "Couverture ZAAP" (radio)
    │  La carte bascule sur Greens (150ms)
    │  La légende se met à jour automatiquement
    │
    ├─ Elle sélectionne "Sans ZAAP" (radio ZAAP)
    │  La carte filtre : seules les zones sans ZAAP visibles
    │
    └─ Elle clique sur la Région des Savanes →


 4. POPUP RÉGION (RegionPopup)
    ┌─ Popup Leaflet stylisé :
    │  Région des Savanes
    │  🗺 4.2 exploitations / km²
    │  📐 Couverture ZAAP : 12%  ← alarmant
    │  🚗 Marché le + proche : 45'
    │  👥 Coop pour 100 km² : 0.8
    │
    ├─ Awa clique "Voir la fiche détaillée" →
    │  Navigation vers /story#zone-savanes
    │
    └─ (Ou elle peut fermer et continuer l'exploration)


 5. FICHE ZONE (ancre dans StoryPage)
    ┌─ Scroll automatique vers la ZoneCard "Savanes"
    │  Indicateurs détaillés, mini-carte
    │  Priorité 1 — badge "Prioritaire"
    │
    ├─ Awa peut ajuster les filtres depuis l'URL
    │  (deep linking : /explore?region=savanes&type=zaap)
    │
    └─ Succès du parcours B ✓
```

### Succès

- Awa a trouvé une zone blanche concrète en < 2 minutes (UC-04).
- Elle a visualisé la couverture ZAAP (UC-02) et la densité (UC-01).
- Elle peut exporter/partager la vue (URL avec paramètres de filtre).
- Elle a les indicateurs pour justifier une décision (UC-07).

### Points d'attention

- **Bas débit** : Les GeoJSON doivent être chargés progressivement (priorité : couche principale d'abord, détails après). Skeleton visible pendant le chargement.
- **Mobile** : FilterPanel en bottom sheet, carte en 55vh.
- **Deep linking** : Tous les filtres doivent être représentés dans l'URL pour permettre le partage d'une vue filtrée.
- **Performance** : Le changement de filtre doit être instantané (< 200ms) — les données GeoJSON sont déjà chargées en mémoire.

---

## Parcours C — Rapport (Chercheur)

**Utilisateur** : David (chargé d'investissement, partenaire financier)
**Objectif** : Comprendre la méthode, vérifier les sources, télécharger le rapport.
**Cas d'usage** : UC-06, UC-08, UC-14

### Déclencheur

David, basé à Washington, travaille en anglais. Il a entendu parler du Data Challenge et veut évaluer si les données peuvent éclairer un investissement FSRP. Il ouvre le dashboard sur son ordinateur.

### Flux

```
 1. PAGE D'ACCUEIL (HomePage)
    ┌─ David voit le message en anglais (par défaut si navigateur en EN)
    │  "Producing is not enough: you need to be connected."
    │
    ├─ Il bascule en anglais si besoin (LanguageSwitcher)
    │  → L'ensemble de l'interface passe en anglais
    │
    └─ Il clique "Read the report" → /report


 2. PAGE RAPPORT (ReportPage) — Vue initiale
    ┌─ Table des matières (gauche) + contenu (droite)
    │
    ├─ David scanne la TdM :
    │  1. Methodology
    │  2. Data Sources
    │  3. Data Quality
    │  4. Analyses
    │  5. Limitations
    │  6. Conclusion
    │
    └─ Il clique "Data Sources" → scroll


 3. SECTION SOURCES
    ┌─ Tableau des 9 familles de données :
    │  │ Dataset │ Source │ Records │ Last update │
    │  │─────────────────────────────────────────│
    │  │ Farms   │ geodata.gouv.tg │ 1,234  │ 2025-12 │
    │  │ ZAAP    │ geodata.gouv.tg │ 231    │ 2025-12 │
    │  │ ...     │                │        │         │
    │
    └─ David vérifie les sources → OK, portails officiels


 4. SECTION DATA QUALITY
    ┌─ Tableau de qualité :
    │  │ Dataset │ Completeness │ Precision │ Issues │
    │  │────────────────────────────────────────────│
    │  │ Farms   │ 92%          │ High      │ 12 dup │
    │  │ ZAAP    │ 98%          │ Medium    │ 2 gaps │
    │
    ├─ David apprécie la transparence (UC-08)
    │
    └─ Il lit les limitations → note les incertitudes


 5. TÉLÉCHARGEMENT
    ┌─ David clique "📥 Download PDF" (TdM)
    │  → Le PDF se génère et se télécharge (html2pdf)
    │  → Il peut aussi copier le lien permanent
    │
    └─ Succès du parcours C ✓
```

### Succès

- David a trouvé toutes les informations en anglais (UC-06 ✓).
- Il a vérifié les sources et la qualité des données (UC-08 ✓).
- Il a téléchargé le rapport pour son dossier (UC-14 ✓).
- Temps estimé : 3-5 minutes.

### Points d'attention

- **Bilinguisme** : Le rapport doit exister en FR et EN intégralement. La bascule en page d'accueil persiste sur tout le site.
- **Transparence** : La section "Limitations" doit être visible et honnête — c'est un signal de crédibilité pour le jury et les partenaires.
- **Export PDF** : Doit préserver la mise en page, inclure les tableaux et mini-cartes. Utiliser une lib légère (html2pdf.js ou équivalent).
- **Print styles** : `@media print` doit masquer navbar, TdM, boutons. Le contenu doit s'imprimer proprement sur A4.

---

## Tableau de couverture

| Parcours | UC couverts | Persona | Pages visitées | Temps estimé |
|----------|-------------|---------|----------------|--------------|
| A — Lecture guidée | UC-12, UC-13, UC-05, UC-17 | Sarah (jury) | Home → Story → (Synthèse) | 3-5 min |
| B — Exploration libre | UC-01, UC-02, UC-03, UC-04, UC-07 | Awa (planificatrice) | Home → Explore → (Story#zone) | 2-5 min |
| C — Rapport | UC-06, UC-08, UC-14 | David (investisseur) | Home → Report → (Download) | 3-5 min |

---

## Chemins alternatifs et erreurs

| Situation | Parcours | Comportement attendu |
|-----------|----------|----------------------|
| Arrivée directe sur `/story` | A | La StoryPage se charge avec le premier acte. Le StoryNavigator indique l'acte 1. |
| Arrivée directe sur `/explore?region=centrale` | B | La carte se charge avec la région filtrée + popup info "Région Centrale sélectionnée" |
| Arrivée directe sur `/report#limitations` | C | Scroll direct vers la section Limitations. |
| Lien de partage de zone | B | `/story#zone-savanes` → StoryPage avec la synthèse visible et la ZoneCard Savanes mise en évidence. |
| Erreur de chargement GeoJSON | A/B | La carte affiche un message d'erreur avec bouton "Réessayer". Les indicateurs textuels restent visibles si déjà chargés. |
| Changement de langue en cours | A/B/C | La page reste sur la même route. Les textes se mettent à jour instantanément (react-i18next). Les données GeoJSON (neutres) ne se rechargent pas. |
