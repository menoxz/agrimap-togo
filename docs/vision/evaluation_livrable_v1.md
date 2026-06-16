# Évaluation du livrable — AgriMap Togo (v1)

> **Évaluateur** : Product Manager (regard métier · UX · storytelling · design)
> **Date** : 2026-06-16
> **Version inspectée** : dashboard local `http://localhost:5173` (Explorer · Lire · Rapport · Accueil)
> **Échéance challenge** : 2026-06-22 — Data Challenge Agriculture, Togo AI Lab (Défi 1)
> **Statut** : Évaluation v1 — GO conditionnel (corrections priorisées listées)

---

## 1. Note globale

| Dimension | Note | Commentaire express |
|---|---|---|
| **Conformité à la Vision** | 18 / 20 | Message fort, récit 4 actes, carte « où investir », rapport jury : tout est là |
| **Fonctionnel / UX** | 16,5 / 20 | Solide, quelques manques d'action décisionnelle |
| **Design (beauté)** | 15 / 20 | Propre, cohérent, crédible — mais sage |
| **Immersion** | 13 / 20 | Le scrollytelling immerge ; l'accueil reste un dashboard classique |
| **Note PM globale** | **16,5 / 20** | Très bon livrable, présentable. 3 corrections pour viser le Top 1 |

**Verdict : GO pour soumission après corrections.** Le produit respecte la vision avec fidélité et tient la promesse jury (qualité données · analyse · storytelling).

---

## 2. Conformité à la Vision (point par point)

| Élément du cahier Vision | Constat à l'écran | Statut |
|---|---|---|
| Message fort « Produire ne suffit pas : il faut être relié » | Affiché mot pour mot dans le hero (FR) et « Producing is not enough: you need to be connected » (EN) | ✅ Parfait |
| Récit en 4 actes (densité → ZAAP → accessibilité → coopératif → synthèse) | Page **Lire** = scrollytelling, carte synchronisée au texte, encadré « À retenir » chiffré, question-passerelle entre actes (« Acte 1/4 ») | ✅ Excellent |
| Carte de synthèse « où investir » | Vue **Synthèse priorisation** : dégradé rouge (priorité max) → vert (bien desservi), légende dynamique | ✅ Livre la promesse |
| Audience n°1 : planificateur public | Servie par la priorisation, mais manque le détail au clic / classement actionnable (voir §4) | ⚠️ À renforcer |
| Bilingue FR / EN (i18n) | Nav, hero, sections, rapport traduits ; **tableau qualité données reste en FR en mode EN** | ⚠️ Incomplet |
| Dashboard en ligne | OK (local pour l'instant), à déployer sur `*.favoured.cloud` | ✅ / à déployer |
| Rapport (PDF data-storytelling) | Page **Rapport** structurée + bouton **Télécharger PDF** + Copier le lien | ✅ Conforme |
| 3 axes jury (qualité · analyse · storytelling) | Rapport : Démarche · Sources · **Qualité (complétude/précision chiffrées + tableau)** · Analyses · **Limites** · Conclusion | ✅ Couvre tout |
| Ancrage local | « Made in Togo — Données togolaises, pour le Togo », sources `geodata/opendata.gouv.tg` citées | ✅ |
| Accessibilité | Palette colorblind safe, lien « Aller au contenu », recentrage carte, bouton zoom | ✅ Soigné |

---

## 3. Points forts (à conserver absolument)

1. **Fil rouge tenu de bout en bout** — le message « être relié » irrigue le hero, le récit et la conclusion du rapport.
2. **Scrollytelling carte+texte** — pattern data-storytelling de niveau pro, c'est le vrai différenciateur jury.
3. **Honnêteté méthodologique** — section *Limites* explicite + « outil d'aide à la décision, pas une vérité absolue ». Crédibilité maximale devant un jury data science.
4. **Reframing positif** — « zones blanches = opportunités d'investissement » plutôt que « manques ». Posture constructive, alignée commanditaire.
5. **Chiffres d'accroche** — KPIs accueil (4 analyses · 5 régions · 22 zones prioritaires) : lecture instantanée de la valeur.
6. **Cohérence de marque** — logo pousse/sprout, palette verte agricole, ton homogène sur toutes les pages.

---

## 4. Corrections priorisées avant le 22/06

### P1 — Bloquant pour la note storytelling/jury
1. **Compléter le bilinguisme du tableau Qualité des données.** En mode EN, les entêtes (*Dimension / Complétude / Précision*) et libellés de lignes (*Densité exploitations, Couverture ZAAP, Accessibilité*) restent en français. Défaut le plus visible pour un jury incluant des bailleurs anglophones (FSRP/Banque Mondiale).

2. **Rendre la priorisation actionnable pour le planificateur public.** Ajouter, au clic sur une zone prioritaire, un volet de détail avec les chiffres-clés (densité, distance au marché, nb de coopératives) ET/OU une **liste classée « Top zones où investir »**. C'est ce qui transforme la belle carte en outil de décision — cœur de la mission de l'audience n°1.

### P2 — À vérifier / fiabiliser
3. **Valider le filtre région** (Maritime→Savanes) : confirmer qu'il filtre/zoome réellement la carte. Critique pour la démo live.
4. **Fluidité en bas débit** : la page Lire met un instant à révéler le contenu (chargement carte). Public cible souvent en connexion mobile lente — tester et alléger si besoin.

### P3 — Confort / finition
5. Centrer la mini-carte d'aperçu de l'accueil sur le Togo (les pays voisins prennent trop de place).

---

## 5. Évaluation DESIGN pure (beauté & immersion)

### 5.1 Ce qui est beau
- **Sobriété élégante** : whitespace généreux, fond crème/ivoire chaud (évoque la terre, l'agricole), zéro surcharge → impression de sérieux et de calme.
- **Palette maîtrisée** : verts cohérents (croissance, agriculture) + accents ambre sur l'encadré « problème ». Lisible, crédible, institutionnel sans être froid.
- **Hiérarchie typographique nette** : titre display fort, sous-titres clairs, corps lisible.
- **Système de cartes homogène** (KPIs, « Why this dashboard ») : rythme visuel régulier.
- **Note design : 15/20** — c'est propre, professionnel, « presentable to a ministry ».

### 5.2 Ce qui manque à l'immersion
- **Hero trop statique** : le tiers supérieur est une bande vert pâle quasi vide, sans visuel ni mouvement. Pour un livrable « immersif » on attend un hero plus cinématique — une carte du Togo en fond, une donnée animée, ou une photo agricole traitée.
- **Aucune image / illustration / texture** : tout est vectoriel minimaliste. Beau mais « template SaaS » plutôt qu'« expérience émotionnelle ancrée au Togo ».
- **Peu de profondeur / motion** : pas d'animation d'entrée, d'ombres subtiles ou de transitions perceptibles hors scrollytelling. L'immersion repose presque uniquement sur la page Lire.
- **Contraste faible** sur certains sous-titres (vert clair sur crème) : à la limite de la lisibilité + risque accessibilité.
- **Cartes « Why » monotones** : seule la première est colorée ; les 3 gagneraient une couleur/illustration distincte pour raconter problème→solution→impact visuellement.
- **Note immersion : 13/20** — la page Lire immerge réellement (8/10), mais l'accueil et l'ensemble restent un « beau dashboard » (5/10).

### 5.3 Pistes design pour passer de « beau » à « mémorable » (si temps disponible)
1. **Hero vivant** : carte du Togo en fond avec zones blanches qui s'illuminent au chargement, ou compteur animé sur les 22 zones prioritaires.
2. **Une signature visuelle locale** : motif/texture inspiré des tissus ou de la terre togolaise, en touches discrètes.
3. **Micro-animations** : apparition au scroll des KPIs, hover sur les cartes, transition douce entre actes.
4. **Différencier les 3 cartes « Why »** par couleur (rouge problème → vert solution → bleu impact) pour un mini-récit visuel.
5. **Renforcer le contraste** des textes secondaires (accessibilité AA).

---

## 6. Conclusion PM

Les développeurs ont **respecté la vision avec une grande fidélité** : le message, le récit en 4 actes, la carte de priorisation et le rapport orienté jury sont tous présents et de bonne facture. Le livrable est **présentable en l'état** et tient la promesse des 3 axes d'évaluation.

Pour viser le **Top 1**, deux leviers :
- **Métier** : compléter le bilinguisme du tableau + rendre la priorisation cliquable/classée (action décideur).
- **Design** : injecter de l'immersion dans le hero et un peu de motion pour passer de « beau dashboard » à « expérience mémorable ».

> Le fond est gagnant. Il reste à polir la forme et l'actionnabilité pour faire la différence devant le jury.
