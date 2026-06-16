"""
Tests de validation des analyses spatiales M2 — AgriMap Togo.

Vérifie :
- 5 fichiers GeoJSON d'analyse existent dans data/public/analysis/
- 5 fichiers de métadonnées dans data/public/analysis/metadata/
- Chaque GeoJSON est valide (FeatureCollection)
- Chaque GeoJSON < 5 MB
- Géométries valides (geopandas.is_valid)
- Palettes ColorBrewer documentées dans les métadonnées
- Champs bilingues (fr + name_en) présents
- Scores de synthèse interprétables (0-100)
"""

import json
from pathlib import Path

import geopandas as gpd
import pytest

from etl.config import REGIONS

# ── Chemins ──────────────────────────────────────────────────────────
ANALYSIS_DIR = Path("data/public/analysis")
METADATA_DIR = ANALYSIS_DIR / "metadata"

ANALYSIS_FILES = [
    "density.geojson",
    "zaap_coverage.geojson",
    "accessibility.geojson",
    "cooperative_network.geojson",
    "synthesis.geojson",
]

METADATA_FILES = [
    "density.json",
    "zaap_coverage.json",
    "accessibility.json",
    "cooperative_network.json",
    "synthesis.json",
]

COLORBREWER_PALETTES = {
    "density": "YlOrBr",
    "zaap_coverage": "Greens",
    "accessibility": "BuPu",
    "cooperative_network": "OrRd",
    "synthesis": "RdYlGn",
}

REGION_NAMES_FR = [r["name"] for r in REGIONS]
REGION_NAMES_EN = ["Maritime", "Plateaux", "Centrale", "Kara", "Savanes"]


# ── Fixtures ─────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def geojson_data():
    """Charge tous les GeoJSON d'analyse."""
    datasets = {}
    for fname in ANALYSIS_FILES:
        path = ANALYSIS_DIR / fname
        if path.exists():
            datasets[fname] = gpd.read_file(path)
    return datasets


@pytest.fixture(scope="module")
def metadata_data():
    """Charge tous les fichiers de métadonnées."""
    metadata = {}
    for fname in METADATA_FILES:
        path = METADATA_DIR / fname
        if path.exists():
            with open(path, "r", encoding="utf-8") as f:
                metadata[fname] = json.load(f)
    return metadata


# ── Tests d'existence ────────────────────────────────────────────────

class TestFileExistence:
    """Tous les fichiers d'analyse doivent exister."""

    @pytest.mark.parametrize("fname", ANALYSIS_FILES)
    def test_geojson_exists(self, fname: str):
        path = ANALYSIS_DIR / fname
        assert path.exists(), f"Fichier manquant : {path}"
        assert path.stat().st_size > 0, f"Fichier vide : {path}"

    @pytest.mark.parametrize("fname", METADATA_FILES)
    def test_metadata_exists(self, fname: str):
        path = METADATA_DIR / fname
        assert path.exists(), f"Fichier manquant : {path}"
        assert path.stat().st_size > 0, f"Fichier vide : {path}"


# ── Tests de taille ──────────────────────────────────────────────────

class TestFileSize:
    """Chaque GeoJSON doit être < 5 MB."""

    MAX_SIZE_MB = 5

    @pytest.mark.parametrize("fname", ANALYSIS_FILES)
    def test_geojson_under_5mb(self, fname: str):
        path = ANALYSIS_DIR / fname
        size_mb = path.stat().st_size / (1024 * 1024)
        assert size_mb < self.MAX_SIZE_MB, (
            f"{fname} : {size_mb:.2f} Mo ≥ {self.MAX_SIZE_MB} Mo"
        )


# ── Tests de validité GeoJSON ───────────────────────────────────────

class TestGeoJSONValidity:
    """Les GeoJSON doivent être valides."""

    @pytest.mark.parametrize("fname", ANALYSIS_FILES)
    def test_is_geodataframe(self, fname: str, geojson_data: dict):
        gdf = geojson_data.get(fname)
        if gdf is None:
            pytest.skip(f"{fname} : fichier introuvable")
        assert isinstance(gdf, gpd.GeoDataFrame), f"{fname} : pas un GeoDataFrame"
        assert len(gdf) > 0, f"{fname} : GeoDataFrame vide"

    @pytest.mark.parametrize("fname", ANALYSIS_FILES)
    def test_has_nom_region_field(self, fname: str, geojson_data: dict):
        gdf = geojson_data.get(fname)
        if gdf is None:
            pytest.skip(f"{fname} : fichier introuvable")
        assert "nom_region" in gdf.columns, (
            f"{fname} : champ 'nom_region' manquant"
        )

    @pytest.mark.parametrize("fname", ANALYSIS_FILES)
    def test_has_name_en_field(self, fname: str, geojson_data: dict):
        """Tous les GeoJSON doivent avoir le champ bilingue name_en."""
        gdf = geojson_data.get(fname)
        if gdf is None:
            pytest.skip(f"{fname} : fichier introuvable")
        assert "name_en" in gdf.columns, (
            f"{fname} : champ 'name_en' manquant"
        )
        # Vérifier que les valeurs sont valides
        for val in gdf["name_en"].unique():
            assert val in REGION_NAMES_EN or val is None, (
                f"{fname} : nom anglais invalide : {val}"
            )

    @pytest.mark.parametrize("fname", ANALYSIS_FILES)
    def test_has_color_field(self, fname: str, geojson_data: dict):
        """Chaque feature doit avoir une couleur."""
        gdf = geojson_data.get(fname)
        if gdf is None:
            pytest.skip(f"{fname} : fichier introuvable")
        assert "color" in gdf.columns, (
            f"{fname} : champ 'color' manquant"
        )
        # Vérifier le format hexadécimal
        for c in gdf["color"].unique():
            if c and c != "#CCCCCC":
                assert c.startswith("#") and len(c) == 7, (
                    f"{fname} : couleur invalide : {c}"
                )

    @pytest.mark.parametrize("fname", ANALYSIS_FILES)
    def test_all_regions_present(self, fname: str, geojson_data: dict):
        """Les 5 régions doivent être présentes."""
        gdf = geojson_data.get(fname)
        if gdf is None:
            pytest.skip(f"{fname} : fichier introuvable")
        regions_found = set(gdf["nom_region"].unique())
        missing = set(REGION_NAMES_FR) - regions_found
        assert not missing, (
            f"{fname} : régions manquantes : {missing}"
        )


# ── Tests de validité géométrique ───────────────────────────────────

class TestGeometryValidity:
    """Les géométries doivent être valides."""

    @pytest.mark.parametrize("fname", ANALYSIS_FILES)
    def test_geometries_are_valid(self, fname: str, geojson_data: dict):
        gdf = geojson_data.get(fname)
        if gdf is None:
            pytest.skip(f"{fname} : fichier introuvable")
        invalid = gdf[~gdf.is_valid]
        assert len(invalid) == 0, (
            f"{fname} : {len(invalid)} géométries invalides"
        )

    @pytest.mark.parametrize("fname", ANALYSIS_FILES)
    def test_no_null_geometries(self, fname: str, geojson_data: dict):
        gdf = geojson_data.get(fname)
        if gdf is None:
            pytest.skip(f"{fname} : fichier introuvable")
        null_count = gdf.geometry.isna().sum()
        assert null_count == 0, (
            f"{fname} : {null_count} géométries nulles"
        )


# ── Tests des métadonnées ───────────────────────────────────────────

class TestMetadata:
    """Les métadonnées doivent documenter la méthode et la palette."""

    @pytest.mark.parametrize("fname", METADATA_FILES)
    def test_metadata_has_analysis_field(self, fname: str, metadata_data: dict):
        md = metadata_data.get(fname)
        if md is None:
            pytest.skip(f"{fname} : fichier introuvable")
        assert "analysis" in md, f"{fname} : champ 'analysis' manquant"
        assert "method" in md, f"{fname} : champ 'method' manquant"

    @pytest.mark.parametrize("fname", METADATA_FILES)
    def test_metadata_has_palette(self, fname: str, metadata_data: dict):
        md = metadata_data.get(fname)
        if md is None:
            pytest.skip(f"{fname} : fichier introuvable")
        assert "palette" in md, f"{fname} : champ 'palette' manquant"
        palette = md["palette"]
        assert "name" in palette, f"{fname} : palette sans nom"
        assert "colorblind_safe" in palette, (
            f"{fname} : palette sans info colorblind_safe"
        )
        assert "classes" in palette, f"{fname} : palette sans classes"
        assert len(palette["classes"]) > 0, f"{fname} : palette vide"

    def test_colorbrewer_palettes_match(self, metadata_data: dict):
        """Vérifie que les palettes ColorBrewer sont correctement nommées."""
        for fname, expected_palette in COLORBREWER_PALETTES.items():
            md_fname = f"{fname}.json"
            md = metadata_data.get(md_fname)
            if md is None:
                pytest.skip(f"{md_fname} : fichier introuvable")
            actual = md.get("palette", {}).get("name", "")
            assert actual == expected_palette, (
                f"{md_fname} : palette '{actual}' au lieu de '{expected_palette}'"
            )

    @pytest.mark.parametrize("fname", METADATA_FILES)
    def test_metadata_has_inputs(self, fname: str, metadata_data: dict):
        md = metadata_data.get(fname)
        if md is None:
            pytest.skip(f"{fname} : fichier introuvable")
        assert "inputs" in md, f"{fname} : champ 'inputs' manquant"
        assert isinstance(md["inputs"], list), f"{fname} : inputs n'est pas une liste"
        assert len(md["inputs"]) > 0, f"{fname} : liste inputs vide"

    @pytest.mark.parametrize("fname", METADATA_FILES)
    def test_metadata_has_interpretation_note(self, fname: str, metadata_data: dict):
        md = metadata_data.get(fname)
        if md is None:
            pytest.skip(f"{fname} : fichier introuvable")
        assert "interpretation_note" in md, (
            f"{fname} : champ 'interpretation_note' manquant"
        )
        # Ton constructif : ne doit pas contenir de termes négatifs alarmistes
        note = md["interpretation_note"]
        assert "opportunité" in note.lower() or "opportunity" in note.lower(), (
            f"{fname} : ton constructif manquant dans l'interprétation"
        )


# ── Tests spécifiques à chaque analyse ──────────────────────────────

class TestDensityAnalysis:
    """Tests spécifiques à l'analyse de densité."""

    def test_density_has_required_fields(self, geojson_data: dict):
        gdf = geojson_data.get("density.geojson")
        if gdf is None:
            pytest.skip("density.geojson introuvable")
        for field in ["nb_exploitations", "area_km2", "density", "density_class"]:
            assert field in gdf.columns, f"Champ '{field}' manquant dans density"

    def test_density_class_in_range(self, geojson_data: dict):
        gdf = geojson_data.get("density.geojson")
        if gdf is None:
            pytest.skip("density.geojson introuvable")
        for cls_val in gdf["density_class"].unique():
            assert 1 <= cls_val <= 5, f"Classe de densité invalide : {cls_val}"


class TestZAAPCoverageAnalysis:
    """Tests spécifiques à l'analyse ZAAP."""

    def test_zaap_has_required_fields(self, geojson_data: dict):
        gdf = geojson_data.get("zaap_coverage.geojson")
        if gdf is None:
            pytest.skip("zaap_coverage.geojson introuvable")
        for field in ["coverage_pct", "coverage_class", "total_zones",
                       "covered_zones", "uncovered_zones"]:
            assert field in gdf.columns, f"Champ '{field}' manquant dans zaap_coverage"

    def test_zaap_class_in_range(self, geojson_data: dict):
        gdf = geojson_data.get("zaap_coverage.geojson")
        if gdf is None:
            pytest.skip("zaap_coverage.geojson introuvable")
        for cls_val in gdf["coverage_class"].unique():
            assert 1 <= cls_val <= 4, f"Classe ZAAP invalide : {cls_val}"


class TestAccessibilityAnalysis:
    """Tests spécifiques à l'analyse d'accessibilité."""

    def test_accessibility_has_required_fields(self, geojson_data: dict):
        gdf = geojson_data.get("accessibility.geojson")
        if gdf is None:
            pytest.skip("accessibility.geojson introuvable")
        for field in ["accessibility_score", "accessibility_class",
                       "unserved_pct", "total_exploitations"]:
            assert field in gdf.columns, f"Champ '{field}' manquant dans accessibility"

    def test_accessibility_score_range(self, geojson_data: dict):
        gdf = geojson_data.get("accessibility.geojson")
        if gdf is None:
            pytest.skip("accessibility.geojson introuvable")
        for score in gdf["accessibility_score"]:
            assert 0 <= score <= 100, (
                f"Score d'accessibilité hors limites : {score}"
            )


class TestCooperativeAnalysis:
    """Tests spécifiques à l'analyse coopérative."""

    def test_coop_has_required_fields(self, geojson_data: dict):
        gdf = geojson_data.get("cooperative_network.geojson")
        if gdf is None:
            pytest.skip("cooperative_network.geojson introuvable")
        for field in ["n_cooperatives", "white_zone_pct", "coop_class"]:
            assert field in gdf.columns, f"Champ '{field}' manquant dans cooperative_network"


class TestSynthesisAnalysis:
    """Tests spécifiques à la synthèse."""

    def test_synthesis_has_required_fields(self, geojson_data: dict):
        gdf = geojson_data.get("synthesis.geojson")
        if gdf is None:
            pytest.skip("synthesis.geojson introuvable")
        for field in ["synthesis_score", "synthesis_class",
                       "priority_label", "investment_priority_score"]:
            assert field in gdf.columns, f"Champ '{field}' manquant dans synthesis"

    def test_synthesis_score_range(self, geojson_data: dict):
        gdf = geojson_data.get("synthesis.geojson")
        if gdf is None:
            pytest.skip("synthesis.geojson introuvable")
        for score in gdf["synthesis_score"]:
            assert 0 <= score <= 100, (
                f"Score de synthèse hors limites : {score}"
            )

    def test_synthesis_class_in_range(self, geojson_data: dict):
        gdf = geojson_data.get("synthesis.geojson")
        if gdf is None:
            pytest.skip("synthesis.geojson introuvable")
        for cls_val in gdf["synthesis_class"].unique():
            assert 1 <= cls_val <= 5, f"Classe de synthèse invalide : {cls_val}"

    def test_investment_priority_score_inverse(self, geojson_data: dict):
        """Le score de priorité d'investissement doit être l'inverse du score composite."""
        gdf = geojson_data.get("synthesis.geojson")
        if gdf is None:
            pytest.skip("synthesis.geojson introuvable")
        for _, row in gdf.iterrows():
            composite = row["synthesis_score"]
            priority = row["investment_priority_score"]
            # Les deux scores devraient être complémentaires (~100)
            assert abs(composite + priority - 100) < 5 or abs(priority - (100 - composite)) < 5, (
                f"Relation inverse non respectée : synthèse={composite}, priorité={priority}"
            )

    def test_top3_in_metadata(self, metadata_data: dict):
        """Les métadonnées de synthèse doivent contenir le top 3 des priorités."""
        md = metadata_data.get("synthesis.json")
        if md is None:
            pytest.skip("synthesis.json introuvable")
        stats = md.get("statistics", {})
        assert "top_3_priorities" in stats, (
            "Top 3 priorités manquant dans les métadonnées"
        )
        assert len(stats["top_3_priorities"]) == 3, (
            f"Top 3 devrait contenir 3 entrées, "
            f"obtenu {len(stats['top_3_priorities'])}"
        )
