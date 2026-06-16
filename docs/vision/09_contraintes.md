# 09 — Contraintes

> Contraintes **non techniques** encadrant le projet. Les choix d'outils, de technologies et d'hébergement détaillés relèveront des phases ultérieures (Architecte / Développeur).

## Contraintes de plateforme et d'accès

- Le livrable est un **tableau de bord en ligne**, consultable via un **navigateur web**.
- Accès via un **nom de domaine dédié** (sous-domaine du domaine personnel `*.favoured.cloud`), hébergé sur le **serveur personnel (VPS)** du porteur de projet.
- Consultation attendue à la fois sur **ordinateur** et sur **mobile** (les audiences secondaires et tertiaires consultent souvent en mobilité).

## Contraintes utilisateurs

- **Bilinguisme obligatoire** : interface et contenus disponibles en **français et en anglais** (i18n), bascule de langue accessible partout.
- **Public mixte** : décideurs publics togolais (français), partenaires internationaux (anglais), grand public.
- **Niveau de littératie data variable** : l'interface doit être compréhensible **sans aucun jargon** ; tout indicateur doit s'expliquer de lui-même.
- **Accessibilité visuelle** : cartes et couleurs lisibles, y compris pour les personnes ayant des difficultés de perception des couleurs (éviter des codes couleur ambigus).

## Contraintes légales et de données

- Usage exclusif de **données ouvertes** issues de `geodata.gouv.tg` / `opendata.gouv.tg` : respecter et **citer les licences ouvertes** et l'**attribution des sources**.
- **Aucune donnée personnelle nominative** d'agriculteurs ne doit être exposée.
- **Transparence obligatoire** sur les limites des données (complétude, fraîcheur, précision de localisation) — exigence à la fois éthique et stratégique (crédibilité jury).
- Ton **factuel et constructif** sur les zones « mal dotées » : présenter des **opportunités d'investissement**, jamais un jugement sur un territoire.

## Contraintes de connectivité

- Le contexte togolais implique des **connexions parfois lentes ou intermittentes** : le tableau de bord doit rester **consultable et fluide en bas débit** (sobriété des contenus, pas de surcharge inutile).
- L'expérience ne doit pas dépendre d'un matériel haut de gamme.

## Contraintes de budget

- Projet réalisé dans le cadre d'un **challenge** (participation bénévole) : **coût quasi nul** attendu.
- Hébergement assuré par le **VPS personnel déjà disponible** : pas de dépense d'infrastructure supplémentaire.
- Privilégier des **ressources gratuites / ouvertes**.

## Contraintes de délai

- **Échéance ferme de soumission : 2026-06-22** (challenge de 7 jours).
- En cas de sélection (top 2), **présentation live** lors d'une session du Togo AI Lab → prévoir une version **présentable et narrée**.
- Le porteur travaille **assisté par l'intelligence artificielle** : la contrainte de temps est **fortement atténuée**, ce qui autorise un périmètre ambitieux — sans sacrifier la **discipline du fil rouge**.

## Contraintes organisationnelles

- **Porteur unique** (participant solo assisté par IA) : décisions rapides, pas de coordination d'équipe.
- **Règles du challenge à respecter** : livrer **un dashboard + un rapport** ; évaluation sur **qualité des données, analyse, storytelling**.
- Le dossier de Vision doit être **validé par le porteur** avant le passage à la phase technique (Architecte).

## Synthèse des contraintes structurantes

| Contrainte | Impact direct sur le projet |
|---|---|
| Bilingue FR/EN | i18n intégrale dès la conception |
| En ligne sur VPS perso `*.favoured.cloud` | Solution légère, autonome, peu coûteuse |
| Bas débit / mobile | Sobriété et fluidité prioritaires |
| Données ouvertes uniquement | Attribution + transparence des limites |
| Deadline 22/06/2026 | Prioriser le socle P1, narration prête pour le live |
