# TASK-M5 : Storytelling Layout — Navigation narrative

## Mission
Construire l'expérience de lecture guidée en 4 actes + synthèse. Implémenter le scroll narratif, la synchronisation carte-texte, les fiches de zones prioritaires, et le widget de partage. L'utilisateur doit pouvoir suivre l'histoire OU basculer en mode exploration libre.

## Input
- Contenu narratif depuis `docs/vision/05_analyse_solution.md`
- Composants carte de M4 (à intégrer dans chaque acte)
- Traductions FR/EN depuis M3

## Output
- Composants : ActContainer, StoryNavigator, SynthesisView, ZoneCard, ShareWidget
- Page : StoryPage (complète, avec les 4 actes + synthèse)
- Intégration : synchronisation scroll ↔ changement de couche carte

## Contraintes spécifiques
- [IMMUTABLE] Message fort < 30 secondes — l'accroche est visible immédiatement
- [IMMUTABLE] Bilingue — tout le contenu narratif en FR et EN
- Navigation possible : séquentielle (scroll) ET directe (menu)
- Chaque acte doit afficher la couche cartographique correspondante
- La synthèse doit produire des recommandations actionnables (≥ 3)
- Les fiches zones prioritaires doivent être imprimables (print CSS)

## Parcours narratif (contenu à implémenter)

1. **Accroche** — *« Produire ne suffit pas : il faut être relié. »* Carte d'entrée avec question
2. **Acte 1 — Où produit-on ?** → couche densité, message sur les bassins de production
3. **Acte 2 — Est-ce aménagé ?** → couche ZAAP + zones non couvertes, identification des manques
4. **Acte 3 — Est-ce accessible ?** → couche accessibilité, éloignement marchés/pépinières
5. **Acte 4 — Est-ce organisé ?** → couche coopératives, zones blanches d'organisation
6. **Synthèse — Où investir ?** → carte de priorisation + 3+ recommandations

## Définition of Done (vérifiable)
- [ ] Navigation fluide entre les 5 sections (4 actes + synthèse)
- [ ] Synchronisation scroll → changement de couche fonctionnelle
- [ ] Menu direct permet d'accéder à n'importe quel acte
- [ ] Au moins 3 recommandations géographiques précises dans la synthèse
- [ ] Widget partage fonctionnel (copie URL + message clé)
- [ ] Fiches zones prioritaires avec indicateurs et mini-carte
- [ ] Version imprimable des fiches (print stylesheet)
- [ ] Mode exploration libre accessible depuis le menu
- [ ] Tests Vitest passent
