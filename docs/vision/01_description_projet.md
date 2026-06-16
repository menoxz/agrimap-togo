# 01 — Description du projet

## Nom du projet

**AgriMap Togo**
Slogan : *« La carte qui relie la production agricole togolaise à ses services. »* *(EN : « The map that connects farming to its services. »)*

## Contexte

Le Togo conduit une **réforme agricole majeure** structurée autour des **Zones d'Aménagement Agricole Planifiées (ZAAP)** : environ **231 ZAAP** existent aujourd'hui, avec un objectif national de **400**, réparties dans les **6 régions agricoles** du pays. Cette réforme vise la sécurité alimentaire, la mécanisation et l'emploi des jeunes, dans le cadre de programmes nationaux et internationaux (FSRP, partenariats techniques et financiers).

En parallèle, le **Togo AI Lab** (initiative du Ministère de l'Économie Numérique avec le centre de recherche CEGA / UC Berkeley) promeut l'usage de la **science des données au service de la décision publique**, notamment dans l'agriculture.

Dans ce cadre, le Togo AI Lab lance un **Data Challenge Agriculture (Défi 1)** : concevoir un tableau de bord interactif pour **mieux comprendre la géographie du tissu agricole togolais** à partir des données ouvertes de `geodata.gouv.tg` et `opendata.gouv.tg`. Le présent projet, **AgriMap Togo**, est notre réponse à ce défi, avec l'ambition affichée de viser la **première place**.

Le déclencheur est donc double : (1) une **réforme territoriale agricole** qui appelle des outils de pilotage géographique, et (2) un **concours** qui valorise la qualité des données, la finesse de l'analyse et la force du récit.

## Périmètre

### Dans le périmètre

- **Un tableau de bord interactif en ligne**, bilingue français / anglais, organisé autour d'une **carte du Togo** et de filtres.
- L'intégration et la valorisation des **9 familles de données ouvertes** du défi :
  1. Grandes exploitations (établissements)
  2. Petites exploitations agricoles
  3. Plantations agricoles (établissements)
  4. ZAAP — formes (périmètres)
  5. ZAAP et ZAPB — champs individuels
  6. Coopératives agricoles
  7. Marchés
  8. Pépinières agricoles
  9. Agriculture & développement rural (données de cadrage)
- **Quatre familles d'analyses** demandées par le défi : densité des exploitations, couverture des ZAAP, accessibilité aux services, réseau coopératif.
- **Un fil rouge narratif unique** : les *zones blanches de services agricoles* (« produire vs être relié »).
- **Un rapport** d'accompagnement expliquant la démarche, les analyses et les conclusions.

### Hors périmètre

- Toute **collecte de données de terrain nouvelle** (le projet exploite uniquement les données ouvertes fournies).
- Toute **donnée personnelle nominative** d'agriculteurs ou d'exploitants.
- La **prédiction / modélisation prospective** complexe (ex. simulation de rendements) — sauf indicateur descriptif simple ; ce n'est pas le cœur du message.
- Les **décisions techniques** (outil de cartographie, mode d'hébergement, technologies) : elles relèvent des phases ultérieures (Architecte, Développeur).
- Le **suivi en temps réel** (le tableau de bord reflète l'état des données ouvertes au moment du challenge).

## Parties prenantes

| Partie prenante | Rôle | Attentes |
|---|---|---|
| Porteur du projet (participant) | Concepteur / décideur, assisté par IA | Un livrable de niveau « top 1 » : rigueur, clarté, impact |
| Togo AI Lab | Organisateur & jury | Qualité des données, analyse pertinente, storytelling fort |
| Planificateur agricole public (audience cible n°1) | Bénéficiaire des analyses | Voir où sont les manques pour cibler les prochains aménagements |
| Partenaires financiers / bailleurs | Audience secondaire | Identifier les zones d'investissement prioritaires |
| Animateurs de réseaux coopératifs | Audience secondaire | Comprendre le maillage et les zones blanches d'organisation |
| Producteurs de données ouvertes (`geodata.gouv.tg`, `opendata.gouv.tg`) | Fournisseurs de données | Attribution correcte et usage conforme aux licences ouvertes |
