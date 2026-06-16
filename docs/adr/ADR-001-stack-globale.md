# ADR-001 : Architecture pattern & stack globale

**Status** : Accepted  
**Date** : 2026-06-16  
**Décisionnaire** : Architecte (porteur unique + IA)

---

## Contexte

AgriMap Togo doit être livré sous 6 jours par un porteur unique assisté par IA. Le projet doit :

- Intégrer 9 familles de données ouvertes → 4 analyses spatiales
- Offrir une carte interactive bilingue (FR/EN) avec filtres
- Fonctionner en bas débit et sur mobile
- Être hébergé sur un VPS existant (`*.favoured.cloud`)
- Coût quasi nul

Les données sont **statiques** (pas de mise à jour en temps réel). Toutes les analyses sont connues à l'avance (densité, couverture ZAAP, accessibilité, maillage coopératif).

## Contraintes immuables applicables

- [IMMUTABLE] Bilingue FR/EN — i18n intégrale
- [IMMUTABLE] VPS perso `*.favoured.cloud`
- [IMMUTABLE] Bas débit / mobile
- [IMMUTABLE] Données ouvertes uniquement
- [IMMUTABLE] Budget quasi nul
- [IMMUTABLE] Pas de donnée personnelle nominative
- [IMMUTABLE] Solo dev + IA — pas de coordination d'équipe
- [IMMUTABLE] Deadline 22/06/2026 — 6 jours

## Décision

**Architecture static-first avec ETL pré-computation.**

1. **Tout le calcul lourd** (nettoyage, agrégation, analyse spatiale) est exécuté **offline** dans un pipeline Python
2. Les résultats sont exportés en **GeoJSON statiques** + fichiers de métadonnées JSON
3. Le frontend est une **React SPA** (Vite + TypeScript) qui consomme ces fichiers statiques
4. **Aucun backend runtime** — Nginx sert directement les fichiers
5. Pas de base de données, pas d'API serveur, pas de SSR

Ce choix maximise la simplicité, la fiabilité, la vitesse de développement et la résilience en environnement contraint.

## Conséquences

**Positives :**
- Temps de développement réduit (un seul langage frontend, pipeline Python linéaire)
- Aucune dépendance runtime (pas de base de données, pas de serveur d'application)
- Performances excellentes en bas débit (fichiers statiques mis en cache par Nginx)
- Déploiement trivial (rsync d'un dossier)
- Sécurité maximale (pas d'attaque possible sur backend inexistant)
- Coût d'infrastructure nul (VPS déjà payé)

**Négatives :**
- Pas de mise à jour en temps réel des données (acceptable — données statiques du challenge)
- Pas de requêtes ad-hoc côté serveur (mais toutes les analyses sont pré-calculables)
- La taille des GeoJSON doit être maîtrisée (optimisation via simplification de géométries et TopoJSON)

## Alternatives considérées

| Alternative | Raison du rejet |
|------------|----------------|
| **Full-stack Python (FastAPI + PostgreSQL/PostGIS)** | Surcharge inutile : pas de données dynamiques, pas de besoin de requêtage ad-hoc. Temps de dév x2 |
| **Next.js SSR avec API routes** | SSR inutile pour un dashboard, overhead de build, déploiement plus complexe sur VPS |
| **Base de données temps réel (Supabase/Firebase)** | Violation budget quasi nul, dépassement des droits gratuits probable, inutile pour données statiques |
| **Python Flask + Jinja (server-side rendering)** | Plus long à développer, moins flexible pour l'interactivité cartographique, écosystème mapping moins riche |
| **Solution no-code (Power BI, Tableau Public)** | Pas de contrôle sur l'i18n, limitations de licence, pas de storytelling personnalisé, dépendance externe |

## Relations

- Cet ADR est le **parent** de ADR-002 à ADR-006
- Les choix concrets par couche sont détaillés dans `docs/arch/stack.md`
