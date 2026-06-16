# 05 — Analyse de la solution

## La solution en bref

**AgriMap Togo** est un **tableau de bord interactif bilingue** (français / anglais) bâti autour d'une **carte du Togo**. Il rassemble les données agricoles ouvertes et les fait dialoguer pour révéler les **zones blanches de services agricoles**. À côté du dashboard, un **rapport** raconte la démarche et délivre des recommandations géographiques.

Le visiteur arrive sur un **message fort**, puis descend une **histoire en 4 temps** (densité → couverture ZAAP → accessibilité → réseau coopératif), pour aboutir à une **carte de synthèse** : *« voici où placer le prochain investissement. »*

## Le parcours narratif (storytelling)

1. **Accroche** — *« Produire ne suffit pas : il faut être relié. »* Une carte d'entrée qui pose la question.
2. **Acte 1 — Où produit-on ?** Densité des exploitations (grandes, petites, plantations) par région/préfecture.
3. **Acte 2 — Est-ce aménagé ?** Couverture des ZAAP/ZAPB sur les bassins de production → les bassins **non couverts** ressortent.
4. **Acte 3 — Est-ce accessible ?** Éloignement aux **marchés** et **pépinières** → les zones **mal desservies** ressortent.
5. **Acte 4 — Est-ce organisé ?** Maillage des **coopératives** → les **zones blanches d'organisation** ressortent.
6. **Synthèse — Où investir ?** Une carte qui superpose les manques et hiérarchise les **priorités géographiques**.

## Fonctionnalités clés (vue métier, non technique)

- **Carte interactive** du Togo avec zoom par région / préfecture.
- **Filtres** : type d'exploitation, type de service, région, présence/absence de ZAAP.
- **Indicateurs visuels** : densité, taux de couverture, niveau d'accessibilité, densité coopérative.
- **Mise en évidence des zones blanches** (le cœur différenciant).
- **Bascule de langue FR / EN** (i18n) sur toute l'interface.
- **Lecture guidée** (histoire défilante) + **mode exploration libre**.
- **Fiches de synthèse** par zone prioritaire identifiée.
- **Indication des limites de données** (transparence).

## Avantages

| Avantage | Bénéfice |
|---|---|
| Vue unifiée de 9 jeux de données | Fini la dispersion : tout au même endroit |
| Croisement production ↔ services | Révèle l'information vraiment décisionnelle |
| Angle « zones blanches » | Différenciation forte = note storytelling élevée |
| Bilingue & en ligne | Touche public togolais **et** partenaires internationaux |
| Transparence sur les données | Crédibilité auprès du jury |

## Valeur créée, par audience

- **Planificateur agricole public** : un outil pour **cibler** les prochains aménagements là où ils manquent vraiment.
- **Partenaires financiers** : une **grille de priorisation** des investissements.
- **Animateurs coopératifs** : une **carte des zones** à organiser en priorité.
- **Jury / grand public** : une démonstration claire de la **valeur de la donnée ouverte** pour la décision publique.

## Risques et parades (non techniques)

| Risque | Probabilité | Parade |
|---|---|---|
| Données incomplètes ou imprécises | Élevée | Documenter les limites ; raisonner en **tendances** plutôt qu'en valeurs absolues ; signaler visuellement l'incertitude |
| Message dilué par trop de couches | Moyenne | Discipline du **fil rouge unique** ; hiérarchiser, ne pas tout montrer |
| Dashboard « joli mais creux » | Moyenne | Toujours relier chaque vue à une **décision** (« et donc ? ») |
| Sur-ambition vs temps | Faible (travail assisté IA) | Prioriser O1–O3 + O6–O7 ; O4–O5 en enrichissement |
| Sensibilité interprétative (zones « mal dotées ») | Moyenne | Ton **factuel et constructif** : opportunités d'investissement, pas jugement |

## Pourquoi cette solution gagne

Elle est la seule à transformer des données brutes en **carte de décision narrative**, avec un **message mémorable** et une **utilité publique immédiate** — exactement les trois axes notés par le jury : **qualité des données, analyse, storytelling**.
