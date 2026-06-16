# ADR-006 : Module complémentaire — Testing & qualité

**Status** : Accepted  
**Date** : 2026-06-16  
**Décisionnaire** : Architecte

---

## Contexte

Le projet est livré sous 6 jours avec assistance IA. La qualité est un critère de notation du challenge (qualité des données, analyse). Il faut :

- S'assurer que le pipeline ETL ne produit pas d'erreurs silencieuses
- Vérifier que le frontend s'affiche correctement
- Garantir que les traductions sont complètes
- Documenter la couverture de test pour le jury
- Ne pas passer trop de temps sur les tests (pragmatisme)

## Décision

**Tests légers mais ciblés, avec vérification automatisée.**

### ETL (Python) — pytest

Tests sur les parties critiques du pipeline :

```python
# tests/test_clean.py
def test_all_regions_have_names():
    """Vérifie qu'aucune région n'a de nom manquant après nettoyage"""
    regions = pd.read_csv("data/processed/regions.csv")
    assert regions["name"].isna().sum() == 0

# tests/test_spatial.py
def test_zaap_coverage_valid_geometry():
    """Vérifie que les géométries ZAAP sont valides"""
    zaap = gpd.read_file("data/processed/zaap.geojson")
    assert zaap.geometry.is_valid.all()

# tests/test_export.py
def test_export_geojson_valid():
    """Vérifie que les GeoJSON exportés sont valides et légers"""
    path = "data/public/analysis/density.geojson"
    assert path.exists()
    size_kb = path.stat().st_size / 1024
    assert size_kb < 5000  # max 5 MB par fichier

# tests/test_quality_report.py
def test_missing_data_rate_documented():
    """Vérifie que le taux de données manquantes est documenté"""
    report = json.loads("data/public/metadata/quality.json")
    for dataset in report["datasets"]:
        assert "missing_rate" in dataset
        assert "completeness_note" in dataset
```

### Frontend — Vitest

Tests des composants et hooks :

```typescript
// src/__tests__/LanguageSwitcher.test.tsx
test('changes language on click', async () => {
  render(<LanguageSwitcher />)
  const btn = screen.getByRole('button', { name: /english/i })
  await userEvent.click(btn)
  expect(i18next.language).toBe('en')
})

// src/__tests__/MapLayer.test.tsx
test('renders layer when activated', () => {
  render(<MapLayer layerId="density" active={true} />)
  expect(screen.getByTestId('leaflet-layer')).toBeInTheDocument()
})
```

### Vérification des traductions (script custom)

```python
# scripts/check_i18n.py
"""Vérifie que tous les namespaces et clés sont identiques entre FR et EN"""
import json
from pathlib import Path

fr_dir = Path("frontend/public/locales/fr")
en_dir = Path("frontend/public/locales/en")

for fr_file in fr_dir.glob("*.json"):
    en_file = en_dir / fr_file.name
    fr_keys = set(json.loads(fr_file.read_text()).keys())
    en_keys = set(json.loads(en_file.read_text()).keys())
    missing_in_en = fr_keys - en_keys
    missing_in_fr = en_keys - fr_keys
    assert not missing_in_en, f"Missing EN keys in {fr_file.name}: {missing_in_en}"
    assert not missing_in_fr, f"Missing FR keys in {fr_file.name}: {missing_in_fr}"
print("✅ All translations are complete")
```

### CI optionnel

GitHub Actions basique (si le repo est poussé sur GitHub) :

```yaml
# .github/workflows/ci.yml
name: CI
on: [push]
jobs:
  etl-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.11' }
      - run: pip install -r requirements.txt
      - run: pytest data/tests/ -v

  frontend-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm test

  i18n-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
      - run: python scripts/check_i18n.py
```

**Pas de déploiement CI** — le déploiement reste manuel via `make deploy` pour garder le contrôle et la simplicité.

## Conséquences

**Positives :**
- Tests exécutables en local et en CI (qualité vérifiable pour le jury)
- Vérification automatique de la complétude des traductions
- Détection précoce des erreurs silencieuses dans le pipeline spatial
- Temps d'exécution total < 30 secondes (ne ralentit pas le développement)

**Négatives :**
- Couverture modeste (< 50% estimé) — c'est un choix délibéré (vise 100% des chemins critiques)
- Pas de tests d'intégration frontend (end-to-end) — acceptable pour le délai
- Les tests Python dépendent des données (mock partiel)

## Alternatives considérées

| Alternative | Raison du rejet |
|------------|----------------|
| **Pas de tests** | Risqué — les erreurs silencieuses dans les données GeoJSON sont difficiles à détecter visuellement |
| **Tests end-to-end (Playwright/Cypress)** | Trop coûteux en temps de setup et maintenance pour 6 jours de projet solo |
| **Couverture > 80%** | Objectif irréaliste pour le délai ; concentrer les tests sur les points critiques |
| **TDD strict** | Impossible en mode exploration/assisté IA ; les tests sont écrits après le code |

## Relations

- Parent : ADR-001
- Les tests ETL vérifient la sortie d'ADR-002
- Les tests frontend vérifient les composants d'ADR-003
- Le script i18n vérifie la complétude d'ADR-004
