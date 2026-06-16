# ADR-004 : Internationalisation (i18n)

**Status** : Accepted  
**Date** : 2026-06-16  
**Décisionnaire** : Architecte

---

## Contexte

Le tableau de bord doit être intégralement disponible en **français** et en **anglais** (bascule accessible depuis n'importe quelle page/vue). C'est une contrainte immuable — le projet est consulté par :

- Des décideurs publics togolais (FR)
- Des partenaires financiers internationaux (EN)
- Un jury bilingue
- Le grand public (les deux langues)

Contraintes :
- Les textes statiques (UI, labels, descriptions des actes) et les textes dynamiques (noms de régions, indicateurs) doivent être traduits
- La bascule de langue doit être instantanée (pas de rechargement complet de la page)
- Les traductions doivent être maintenables (un seul fichier par langue)
- Pas de dépendance payante

## Décision

**react-i18next** avec lazy loading de fichiers JSON.

### Architecture i18n

```
frontend/public/locales/
├── fr/
│   ├── common.json       # UI générique (menu, boutons, filtres)
│   ├── acts.json          # Textes des 4 actes + accroche + synthèse
│   ├── map.json           # Légendes, infobulles, catégories
│   └── report.json        # Contenu du rapport
└── en/
    ├── common.json
    ├── acts.json
    ├── map.json
    └── report.json
```

### Mécanisme

```typescript
// Configuration i18n
i18next
  .use(HttpApi)           // Chargement depuis /locales/{{lng}}/{{ns}}.json
  .use(LanguageDetector)  // Auto-détection navigateur
  .init({
    fallbackLng: 'fr',
    supportedLngs: ['fr', 'en'],
    ns: ['common', 'acts', 'map'],
    defaultNS: 'common',
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage']
    }
  })
```

### Dans React

```tsx
// Hook standard
const { t } = useTranslation('map');
t('legend.density_high');  // "Forte densité" / "High density"

// Changement de langue (instantané, pas de reload)
const { i18n } = useTranslation();
i18n.changeLanguage('en');
```

### URLs (optionnel mais recommandé)

```
/          → page d'accueil (langue détectée ou dernière choisie)
/?lng=en   → force anglais
/?lng=fr   → force français
```

### Gestion des données localisées

Certaines données (noms de régions, descriptions) sont en français dans les sources officielles. Elles sont accompagnées d'un champ `name_en` dans le GeoJSON quand disponible, ou d'une table de correspondance dans les traductions.

```json
// locales/fr/map.json
{
  "regions": {
    "maritime": "Région Maritime",
    "plateaux": "Région des Plateaux",
    "centrale": "Région Centrale",
    "kara": "Région de la Kara",
    "savanes": "Région des Savanes",
    "lome": "District Autonome du Grand Lomé"
  }
}
```

## Conséquences

**Positives :**
- Bascule instantanée (pas de reload page)
- Traductions externalisées (modifiables sans rebuild frontend ? Non, mais sans toucher au code React)
- Détection automatique de la langue du navigateur
- Chargement lazy (seulement les namespaces utilisés)
- Écosystème mature, bien documenté, compatible TypeScript

**Négatives :**
- Les textes dans les données GeoJSON doivent être dupliqués (fr + en) ou gérés par traduction
- Taille des fichiers de traduction (restera < 50 KB par langue)
- react-i18next ajoute ~10 KB au bundle

## Alternatives considérées

| Alternative | Raison du rejet |
|------------|----------------|
| **react-intl (FormatJS)** | Plus verbeux (messages IDs vs nested JSON), moins flexible pour les textes longs des actes narratifs |
| **react-polyglot** | Écosystème plus petit, moins de plugins (lang detector, http loader) |
| **Multiples builds (fr/en séparés)** | Duplication du code, pas de bascule à chaud, maintenance lourde |
| **Traduction via CMS headless** | Overkill pour 2 langues et ~50 pages de texte, dépendance externe |

## Relations

- Parent : ADR-001 (static-first)
- Utilisé par tous les composants React (ADR-003)
- Les GeoJSON peuvent contenir des champs bilingues (préparés par ADR-002)
