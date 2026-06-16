# TASK-M3 : Frontend Core — Application React SPA

## Mission
Créer l'application React monopage (SPA) avec Vite + TypeScript + Tailwind CSS. Mettre en place le routage, l'internationalisation (react-i18next), le layout responsive, la page d'accueil avec accroche, et le squelette de navigation entre les actes du storytelling.

## Input
- `docs/arch/ADR-003-frontend-mapping.md` — décisions frontend
- `docs/arch/ADR-004-internationalisation.md` — décisions i18n
- Maquettes et textes depuis `docs/vision/` (contenu narratif)

## Output
- Application React buildée : `frontend/dist/`
- Fichiers de traduction : `frontend/public/locales/{fr,en}/*.json`
- Composants : Layout, Navbar, LanguageSwitcher, Footer, Accroche
- Pages : HomePage, (squelette) StoryPage, ExplorePage, ReportPage
- Tests Vitest des composants critiques

## Contraintes spécifiques
- [IMMUTABLE] Bilingue FR/EN — la bascule doit être disponible sur toutes les pages
- [IMMUTABLE] Bas débit / mobile — layout 100% responsive, chargement lazy
- [IMMUTABLE] Accessibilité visuelle — contrastes WCAG 2.1 AA, labels ARIA
- Le build doit être < 300 KB gzippé (target)
- Pas de données chargées au lancement (uniquement le framework)

## Définition of Done (vérifiable)
- [ ] `npm run build` produit un bundle sans erreur
- [ ] La page d'accueil affiche l'accroche « Produire ne suffit pas : il faut être relié »
- [ ] La bascule FR/EN fonctionne et change toute l'interface instantanément
- [ ] Le layout est responsive (testé sur 320px, 768px, 1280px)
- [ ] Toutes les pages sont accessibles via le routeur
- [ ] Les 4 actes du storytelling ont un squelette de page
- [ ] Tests Vitest passent : `npm test`
- [ ] Lighthouse audit > 80 sur tous les axes (desktop)
