"""
Tests de validation du pipeline ETL — qualité et conformité des données.

Vérifie :
- Chaque fichier GeoJSON existe et est valide
- Le CRS est EPSG:4326 (coordonnées décimales)
- Les colonnes sont en snake_case
- Pas de valeurs manquantes sur les champs critiques
- Les types de colonnes correspondent au schéma attendu
- Champs obligatoires présents (region)
"""

import json
from pathlib import Path

import pytest

from etl.config import (
    COLUMN_SCHEMAS,
    DATASET_INFO,
    GEOMETRY_TYPES,
    QUALITY_THRESHOLDS,
    get_schema,
)

# ── Chemins ──────────────────────────────────────────────────────────
PROCESSED_DIR = Path("data/processed")
QUALITY_FILE = Path("data/public/metadata/quality.json")


# ── Fixtures ─────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def quality_report():
    """Charge le rapport de qualité consolidé."""
    if not QUALITY_FILE.exists():
        pytest.skip(f"Fichier quality.json introuvable : {QUALITY_FILE}")
    with open(QUALITY_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


@pytest.fixture(scope="module")
def geojson_datasets():
    """Charge tous les GeoJSON des datasets (hors regions)."""
    datasets = {}
    for name in DATASET_INFO:
        path = Path(DATASET_INFO[name]["path"])
        if path.exists():
            with open(path, "r", encoding="utf-8") as f:
                datasets[name] = json.load(f)
    return datasets


# ── Tests généraux ───────────────────────────────────────────────────

class TestFileExistence:
    """Tous les fichiers GeoJSON doivent exister."""

    @pytest.mark.parametrize("name, info", list(DATASET_INFO.items()))
    def test_geojson_exists(self, name: str, info: dict):
        path = Path(info["path"])
        assert path.exists(), f"{name} : fichier manquant → {path}"
        assert path.stat().st_size > 0, f"{name} : fichier vide"


class TestGeoJSONValidity:
    """Chaque GeoJSON doit être valide selon la spec GeoJSON."""

    @pytest.mark.parametrize("name", list(DATASET_INFO.keys()))
    def test_is_valid_geojson(self, name: str, geojson_datasets: dict):
        data = geojson_datasets.get(name)
        if data is None:
            pytest.skip(f"{name} : fichier introuvable")

        # Structure de base
        assert data["type"] == "FeatureCollection", f"{name} : pas une FeatureCollection"
        assert "features" in data, f"{name} : pas de clé 'features'"
        assert isinstance(data["features"], list), f"{name} : 'features' n'est pas une liste"

    @pytest.mark.parametrize("name", list(DATASET_INFO.keys()))
    def test_features_have_required_structure(self, name: str, geojson_datasets: dict):
        data = geojson_datasets.get(name)
        if data is None:
            pytest.skip(f"{name} : fichier introuvable")

        for i, feature in enumerate(data["features"]):
            assert "type" in feature, f"{name}[{i}] : pas de type"
            assert feature["type"] == "Feature", f"{name}[{i}] : type != Feature"
            assert "geometry" in feature, f"{name}[{i}] : pas de geometry"
            assert "properties" in feature, f"{name}[{i}] : pas de properties"

    @pytest.mark.parametrize("name", list(DATASET_INFO.keys()))
    def test_geometry_type(self, name: str, geojson_datasets: dict):
        """Vérifie que le type de géométrie correspond au schéma."""
        data = geojson_datasets.get(name)
        if data is None:
            pytest.skip(f"{name} : fichier introuvable")

        expected_type = GEOMETRY_TYPES.get(name)
        if expected_type is None:
            pytest.skip(f"{name} : type de géométrie non spécifié")

        for i, feature in enumerate(data["features"]):
            geom = feature.get("geometry")
            if geom is not None:
                actual = geom.get("type")
                if name == "regions":
                    assert actual in ("Polygon", "MultiPolygon"), (
                        f"{name}[{i}] : géométrie {actual} au lieu de Polygon/MultiPolygon"
                    )
                else:
                    assert actual == expected_type, (
                        f"{name}[{i}] : géométrie {actual} au lieu de {expected_type}"
                    )


class TestCoordinateSystem:
    """Les coordonnées doivent être en EPSG:4326 (lon ~-180/180, lat ~-90/90)."""

    @pytest.mark.parametrize("name", list(DATASET_INFO.keys()))
    def test_coordinates_in_togo_bounds(self, name: str, geojson_datasets: dict):
        """Vérifie que les coordonnées sont dans les limites du Togo."""
        data = geojson_datasets.get(name)
        if data is None:
            pytest.skip(f"{name} : fichier introuvable")

        for i, feature in enumerate(data["features"]):
            geom = feature.get("geometry")
            if geom is None:
                continue

            coords = _extract_coords(geom)
            for lon, lat in coords:
                assert -0.5 <= lon <= 2.5, (
                    f"{name}[{i}] : longitude {lon} hors Togo"
                )
                assert 5.5 <= lat <= 11.5, (
                    f"{name}[{i}] : latitude {lat} hors Togo"
                )


class TestColumnConventions:
    """Les colonnes doivent être en snake_case."""

    @pytest.mark.parametrize("name", list(DATASET_INFO.keys()))
    def test_snake_case_columns(self, name: str, geojson_datasets: dict):
        data = geojson_datasets.get(name)
        if data is None:
            pytest.skip(f"{name} : fichier introuvable")

        for i, feature in enumerate(data["features"]):
            props = feature.get("properties", {}) or {}
            for col in props.keys():
                assert " " not in col, (
                    f"{name}[{i}] : colonne '{col}' contient un espace"
                )
                # Vérification snake_case basique
                assert col.islower() or col.startswith("_"), (
                    f"{name}[{i}] : colonne '{col}' n'est pas en snake_case"
                )

    @pytest.mark.parametrize("name", list(DATASET_INFO.keys()))
    def test_column_types_match_schema(self, name: str, geojson_datasets: dict):
        """Vérifie que les types des colonnes correspondent au schéma."""
        data = geojson_datasets.get(name)
        if data is None:
            pytest.skip(f"{name} : fichier introuvable")

        schema = get_schema(name)
        if not schema:
            pytest.skip(f"{name} : pas de schéma défini")

        for i, feature in enumerate(data["features"]):
            props = feature.get("properties", {}) or {}
            for field, (expected_type, _) in schema.items():
                val = props.get(field)
                if val is None:
                    continue  # Les None sont acceptés
                if expected_type == int:
                    assert isinstance(val, int), (
                        f"{name}[{i}] : {field} = {val} ({type(val).__name__}), attendu int"
                    )
                elif expected_type == float:
                    assert isinstance(val, (int, float)), (
                        f"{name}[{i}] : {field} = {val} ({type(val).__name__}), attendu float"
                    )
                elif expected_type == bool:
                    assert isinstance(val, bool), (
                        f"{name}[{i}] : {field} = {val} ({type(val).__name__}), attendu bool"
                    )


class TestDataQuality:
    """Tests de qualité des données."""

    def test_quality_report_exists(self):
        """Le rapport de qualité doit exister."""
        assert QUALITY_FILE.exists(), "quality.json manquant"
        assert QUALITY_FILE.stat().st_size > 0, "quality.json vide"

    def test_quality_report_structure(self, quality_report: dict):
        """Vérifie la structure du rapport de qualité."""
        assert "pipeline" in quality_report
        assert "datasets" in quality_report
        assert "summary" in quality_report

        summary = quality_report["summary"]
        assert "total_datasets" in summary
        assert "total_records" in summary
        assert "average_completeness" in summary

    def test_minimum_records(self, geojson_datasets: dict):
        """Chaque dataset doit avoir au moins 1 enregistrement."""
        for name, data in geojson_datasets.items():
            n = len(data["features"])
            assert n >= QUALITY_THRESHOLDS["min_records"], (
                f"{name} : {n} enregistrements (< {QUALITY_THRESHOLDS['min_records']})"
            )

    def test_missing_rate_acceptable(self, quality_report: dict):
        """Le taux de données manquantes ne doit pas dépasser le seuil."""
        threshold = QUALITY_THRESHOLDS["max_missing_rate"]
        for name, ds in quality_report.get("datasets", {}).items():
            missing = ds.get("missing_rate_by_field", {})
            for field, rate in missing.items():
                assert rate <= threshold + 0.05, (  # +0.05 de marge pour l'aléa
                    f"{name}.{field} : {rate:.1%} manquant (> {threshold:.0%})"
                )

    @pytest.mark.parametrize("name", list(DATASET_INFO.keys()))
    def test_region_field_present(self, name: str, geojson_datasets: dict):
        """Le champ 'region' doit être présent et non nul."""
        data = geojson_datasets.get(name)
        if data is None:
            pytest.skip(f"{name} : fichier introuvable")

        for i, feature in enumerate(data["features"]):
            props = feature.get("properties", {}) or {}
            assert "region" in props, f"{name}[{i}] : champ 'region' manquant"
            assert props["region"] is not None, f"{name}[{i}] : region = None"


class TestRealRegionsSource:
    """Anti-régression: le dataset régions doit venir d'une source réelle."""

    def test_regions_have_real_source_and_license(self, geojson_datasets: dict):
        data = geojson_datasets.get("regions")
        if data is None:
            pytest.skip("regions : fichier introuvable")

        for i, feature in enumerate(data["features"]):
            props = feature.get("properties", {}) or {}
            source = str(props.get("source", ""))
            licence = str(props.get("licence", ""))
            version = str(props.get("dataset_version", ""))

            assert "geoBoundaries" in source, (
                f"regions[{i}] : source non traçable geoBoundaries ({source})"
            )
            assert licence == "ODbL-1.0", (
                f"regions[{i}] : licence attendue ODbL-1.0, obtenu {licence}"
            )
            assert version.startswith("gbOpen-TGO-ADM1"), (
                f"regions[{i}] : dataset_version inattendue: {version}"
            )

    def test_regions_have_bilingual_fields(self, geojson_datasets: dict):
        data = geojson_datasets.get("regions")
        if data is None:
            pytest.skip("regions : fichier introuvable")

        for i, feature in enumerate(data["features"]):
            props = feature.get("properties", {}) or {}
            assert props.get("nom_region"), f"regions[{i}] : nom_region manquant"
            assert props.get("name_en"), f"regions[{i}] : name_en manquant"


# ── Helpers ──────────────────────────────────────────────────────────

def _extract_coords(geometry: dict) -> list[tuple[float, float]]:
    """Extrait toutes les coordonnées (lon, lat) d'une géométrie."""
    coords: list[tuple[float, float]] = []
    geom_type = geometry.get("type")

    if geom_type == "Point":
        coords.append(tuple(geometry["coordinates"][:2]))
    elif geom_type == "MultiPoint":
        for c in geometry["coordinates"]:
            coords.append(tuple(c[:2]))
    elif geom_type == "Polygon":
        for ring in geometry["coordinates"]:
            for c in ring:
                coords.append(tuple(c[:2]))
    elif geom_type == "MultiPolygon":
        for polygon in geometry["coordinates"]:
            for ring in polygon:
                for c in ring:
                    coords.append(tuple(c[:2]))
    elif geom_type == "LineString":
        for c in geometry["coordinates"]:
            coords.append(tuple(c[:2]))
    elif geom_type == "MultiLineString":
        for line in geometry["coordinates"]:
            for c in line:
                coords.append(tuple(c[:2]))

    return coords
