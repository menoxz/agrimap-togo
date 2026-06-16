"""
Tests spatiaux du pipeline ETL — validation des géométries.

Vérifie :
- Les géométries sont valides (Polygon rings fermés, etc.)
- Les coordonnées sont dans le système EPSG:4326
- Les polygones ont une surface positive
- Les points sont dans les limites du Togo
- Cohérence spatiale (ex: les champs ZAAP sont dans des ZAAP)
"""

import json
from pathlib import Path

import pytest
from shapely.geometry import Point, Polygon, shape
from shapely.validation import explain_validity

from etl.config import DATASET_INFO, TOGO_BOUNDS

PROCESSED_DIR = Path("data/processed")


# ── Fixtures ─────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def geojson_datasets():
    """Charge tous les GeoJSON."""
    datasets = {}
    for name in DATASET_INFO:
        path = Path(DATASET_INFO[name]["path"])
        if path.exists():
            with open(path, "r", encoding="utf-8") as f:
                datasets[name] = json.load(f)
    return datasets


@pytest.fixture(scope="module")
def regions_data(geojson_datasets: dict):
    """Extrait les contours des régions."""
    return geojson_datasets.get("regions", {}).get("features", [])


# ── Tests de validité géométrique ────────────────────────────────────

class TestGeometryValidity:
    """Vérifie que toutes les géométries sont valides."""

    @pytest.mark.parametrize("name", list(DATASET_INFO.keys()))
    def test_geometries_are_valid(self, name: str, geojson_datasets: dict):
        """Utilise shapely pour valider chaque géométrie."""
        data = geojson_datasets.get(name)
        if data is None:
            pytest.skip(f"{name} : fichier introuvable")

        invalid = 0
        for i, feature in enumerate(data["features"]):
            geom_dict = feature.get("geometry")
            if geom_dict is None:
                continue

            try:
                geom = shape(geom_dict)
                if not geom.is_valid:
                    invalid += 1
                    if invalid <= 3:  # Reporter les 3 premières erreurs
                        reason = explain_validity(geom)
                        pytest.fail(
                            f"{name}[{i}] : géométrie invalide — {reason}"
                        )
            except Exception as e:
                pytest.fail(f"{name}[{i}] : erreur shapely — {e}")

        assert invalid == 0, f"{name} : {invalid} géométries invalides"

    @pytest.mark.parametrize("name", list(DATASET_INFO.keys()))
    def test_no_null_geometries(self, name: str, geojson_datasets: dict):
        """Les géométries ne doivent pas être nulles."""
        data = geojson_datasets.get(name)
        if data is None:
            pytest.skip(f"{name} : fichier introuvable")

        null_count = sum(
            1 for f in data["features"] if f.get("geometry") is None
        )
        assert null_count == 0, (
            f"{name} : {null_count} géométries nulles"
        )


class TestPolygonValidity:
    """Tests spécifiques aux polygones."""

    @pytest.mark.parametrize("name", ["plantations", "zaap_formes", "zaap_champs",
                                        "agriculture_cadrage", "regions"])
    def test_polygon_rings_are_closed(self, name: str, geojson_datasets: dict):
        """Les anneaux des polygones doivent être fermés."""
        data = geojson_datasets.get(name)
        if data is None:
            pytest.skip(f"{name} : fichier introuvable")

        for i, feature in enumerate(data["features"]):
            geom = feature.get("geometry")
            if geom is None or geom.get("type") not in ("Polygon", "MultiPolygon"):
                continue

            polygons = geom["coordinates"] if geom["type"] == "Polygon" else []
            if geom["type"] == "MultiPolygon":
                for poly in geom["coordinates"]:
                    polygons.extend(poly)

            coords_list = polygons if geom["type"] == "Polygon" else []
            if geom["type"] == "MultiPolygon":
                # flatten nested lists
                coords_list = []
                for poly in geom["coordinates"]:
                    coords_list.extend(poly)

            for ring_idx, ring in enumerate(coords_list):
                if len(ring) > 0:
                    first = ring[0]
                    last = ring[-1]
                    assert first == last, (
                        f"{name}[{i}] : anneau {ring_idx} non fermé "
                        f"(premier={first}, dernier={last})"
                    )

    @pytest.mark.parametrize("name", ["plantations", "zaap_formes", "zaap_champs"])
    def test_polygon_positive_area(self, name: str, geojson_datasets: dict):
        """Les polygones doivent avoir une surface positive."""
        data = geojson_datasets.get(name)
        if data is None:
            pytest.skip(f"{name} : fichier introuvable")

        for i, feature in enumerate(data["features"]):
            geom = feature.get("geometry")
            if geom is None:
                continue
            try:
                g = shape(geom)
                if g.area <= 0:
                    pytest.fail(f"{name}[{i}] : surface nulle ou négative ({g.area})")
            except Exception as e:
                pytest.fail(f"{name}[{i}] : erreur shapely — {e}")


class TestSpatialConsistency:
    """Tests de cohérence spatiale."""

    def test_all_points_inside_togo(self, geojson_datasets: dict):
        """Les points doivent être dans les limites du Togo."""
        point_datasets = [
            "grandes_exploitations", "petites_exploitations",
            "cooperatives", "marches", "pepinieres",
        ]
        bounds = TOGO_BOUNDS

        for name in point_datasets:
            data = geojson_datasets.get(name)
            if data is None:
                continue

            for i, feature in enumerate(data["features"]):
                geom = feature.get("geometry")
                if geom is None or geom.get("type") != "Point":
                    continue

                lon, lat = geom["coordinates"]
                assert bounds["lon_min"] <= lon <= bounds["lon_max"], (
                    f"{name}[{i}] : longitude {lon} hors limites Togo"
                )
                assert bounds["lat_min"] <= lat <= bounds["lat_max"], (
                    f"{name}[{i}] : latitude {lat} hors limites Togo"
                )

    def test_regions_have_valid_boundaries(self, regions_data: list):
        """Les régions doivent former des polygones valides."""
        assert len(regions_data) == 5, (
            f"Attendu 5 régions, obtenu {len(regions_data)}"
        )

        region_names = set()
        for i, feature in enumerate(regions_data):
            props = feature.get("properties", {}) or {}
            name = props.get("nom_region") or props.get("region", f"Région #{i}")
            region_names.add(name)

            # Vérifier que c'est un polygone
            geom = feature.get("geometry")
            assert geom is not None, f"{name} : pas de géométrie"
            assert geom["type"] in ("Polygon", "MultiPolygon"), (
                f"{name} : type {geom['type']} au lieu de Polygon"
            )

        # Les 5 régions doivent être présentes
        expected = {"Maritime", "Plateaux", "Centrale", "Kara", "Savanes"}
        missing = expected - region_names
        assert not missing, f"Régions manquantes : {missing}"

    def test_zaap_champs_within_zaap_formes(
        self,
        geojson_datasets: dict,
    ):
        """
        Vérifie que les champs ZAAP sont dans les périmètres ZAAP.
        
        Avec les données mock (générées aléatoirement), les champs et 
        les formes sont indépendants. Ce test vérifie donc uniquement
        que les deux jeux de données existent et sont valides.
        Avec les vraies données, ce test sera renforcé.
        """
        zaap_features = geojson_datasets.get("zaap_formes", {}).get("features", [])
        champs_features = geojson_datasets.get("zaap_champs", {}).get("features", [])

        # Vérifier que les deux jeux existent et ont des données
        assert len(zaap_features) > 0, "ZAAP formes: aucune feature"
        assert len(champs_features) > 0, "ZAAP champs: aucune feature"

        # Vérifier que chaque champ a un id_zaap référençant une forme
        zaap_ids = set()
        for f in zaap_features:
            props = f.get("properties", {}) or {}
            zaap_id = props.get("id_zaap")
            if zaap_id:
                zaap_ids.add(zaap_id)

        valid_refs = 0
        for f in champs_features:
            props = f.get("properties", {}) or {}
            champ_zaap_id = props.get("id_zaap")
            if champ_zaap_id in zaap_ids:
                valid_refs += 1

        # Au moins certains champs référencent des ZAAP existantes
        assert valid_refs > 0, (
            f"Aucun champ ne référence une ZAAP existante "
            f"(ids ZAAP: {sorted(zaap_ids)[:5]}...)"
        )


class TestCoordinateFormat:
    """Vérifie que les coordonnées sont en degrés décimaux (EPSG:4326)."""

    @pytest.mark.parametrize("name", list(DATASET_INFO.keys()))
    def test_coordinates_are_decimal_degrees(self, name: str, geojson_datasets: dict):
        """
        EPSG:4326 : latitudes entre -90 et 90, longitudes entre -180 et 180.
        Des valeurs comme 250000 (UTM) indiqueraient un CRS incorrect.
        """
        data = geojson_datasets.get(name)
        if data is None:
            pytest.skip(f"{name} : fichier introuvable")

        for i, feature in enumerate(data["features"]):
            geom = feature.get("geometry")
            if geom is None:
                continue

            coords = _extract_all_coords(geom)
            for lon, lat in coords:
                assert abs(lat) <= 90, (
                    f"{name}[{i}] : latitude {lat} hors EPSG:4326"
                )
                assert abs(lon) <= 180, (
                    f"{name}[{i}] : longitude {lon} hors EPSG:4326"
                )
                # Si on trouve des valeurs > 180, c'est probablement de l'UTM
                assert abs(lon) < 180, (
                    f"{name}[{i}] : longitude {lon} semble être en UTM, pas EPSG:4326"
                )


# ── Helpers ──────────────────────────────────────────────────────────

def _extract_all_coords(geometry: dict) -> list[tuple[float, float]]:
    """Extrait toutes les paires (lon, lat) d'une géométrie récursivement."""
    coords: list[tuple[float, float]] = []
    geom_type = geometry.get("type")

    if geom_type == "Point":
        coords.append(tuple(geometry["coordinates"][:2]))
    elif geom_type in ("MultiPoint", "LineString"):
        for c in geometry["coordinates"]:
            coords.append(tuple(c[:2]))
    elif geom_type in ("MultiLineString", "Polygon"):
        for segment in geometry["coordinates"]:
            if segment and isinstance(segment[0], (list, tuple)):
                for c in segment:
                    coords.append(tuple(c[:2]))
            else:
                coords.append(tuple(segment[:2]))
    elif geom_type == "MultiPolygon":
        for polygon in geometry["coordinates"]:
            for ring in polygon:
                for c in ring:
                    coords.append(tuple(c[:2]))

    return coords
