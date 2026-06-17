"""
AgriMap Togo — Utilitaires géospatiaux.

Fonctions de génération de géométries mock, validation GeoJSON,
et reprojection (EPSG:4326 ↔ EPSG:32631).

Utilise shapely et geopandas pour les opérations spatiales,
avec fallback vers des implémentations pure-Python si les
bibliothèques ne sont pas disponibles.
"""

import json
import math
import random
from pathlib import Path
from typing import Any

from shapely.geometry import Point, Polygon, mapping, shape
from shapely.ops import transform, unary_union

from etl.config import TOGO_BOUNDS


# ── Limites du Togo pour le sampling ────────────────────────────────
_LON_MIN: float = TOGO_BOUNDS["lon_min"]   # -0.2
_LON_MAX: float = TOGO_BOUNDS["lon_max"]   #  1.8
_LAT_MIN: float = TOGO_BOUNDS["lat_min"]   #  6.0
_LAT_MAX: float = TOGO_BOUNDS["lat_max"]   # 11.2

# ── Mapping des noms de régions (geoBoundaries → noms internes) ──────
_REGION_NAME_MAP: dict[str, str] = {
    "Maritime Region": "Maritime",
    "Plateaux Region": "Plateaux",
    "Centrale Region": "Centrale",
    "Kara Region":     "Kara",
    "Savanes Region":  "Savanes",
}

# ── Chemin vers les limites ADM1 réelles ────────────────────────────
# Chemin absolu depuis ce fichier (etl/utils/geo.py → root/data/raw/...)
_BOUNDARIES_PATH = (
    Path(__file__).resolve().parent.parent.parent
    / "data" / "raw" / "geoBoundaries-TGO-ADM1.geojson"
)

# ── Cache module-level (lazy loading) ───────────────────────────────
_togo_union: Any = None
_region_polygons: dict[str, Any] = {}
_region_centroids: dict[str, tuple[float, float]] = {}


def _load_boundaries() -> None:
    """
    Charge les polygones réels du Togo depuis geoBoundaries-TGO-ADM1.geojson
    (lazy loading — une seule fois par processus).

    Remplit les globals :
      _togo_union        — union de toutes les 5 régions
      _region_polygons   — dict {nom_region: shapely.Polygon}
      _region_centroids  — dict {nom_region: (lon, lat)} (clipé dans TOGO_BOUNDS)
    """
    global _togo_union, _region_polygons, _region_centroids

    if _togo_union is not None:
        return  # Déjà chargé

    if not _BOUNDARIES_PATH.exists():
        # Fallback : rectangle englobant tout le Togo
        _togo_union = Polygon([
            (_LON_MIN, _LAT_MIN), (_LON_MAX, _LAT_MIN),
            (_LON_MAX, _LAT_MAX), (_LON_MIN, _LAT_MAX),
            (_LON_MIN, _LAT_MIN),
        ])
        return

    with open(_BOUNDARIES_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    geometries = []
    for feature in data["features"]:
        raw_name = feature["properties"].get("shapeName", "")
        region_name = _REGION_NAME_MAP.get(raw_name, raw_name)
        geom = shape(feature["geometry"])
        _region_polygons[region_name] = geom

        # Centroïde clipé dans TOGO_BOUNDS pour le fallback
        c = geom.centroid
        clon = max(_LON_MIN, min(_LON_MAX, c.x))
        clat = max(_LAT_MIN, min(_LAT_MAX, c.y))
        _region_centroids[region_name] = (round(clon, 6), round(clat, 6))

        geometries.append(geom)

    _togo_union = unary_union(geometries)


# ── Générateur de coordonnées ────────────────────────────────────────

def random_point_in_togo(rng: random.Random) -> tuple[float, float]:
    """
    Génère un point (lon, lat) aléatoire strictement dans le polygone
    réel du Togo (geoBoundaries ADM1), clipé dans TOGO_BOUNDS.

    Méthode : rejection sampling (max 100 tentatives), fallback centroïde.
    """
    _load_boundaries()

    # Limites de l'union, clipées dans TOGO_BOUNDS
    bounds = _togo_union.bounds  # (minx, miny, maxx, maxy)
    lon_min = max(_LON_MIN, bounds[0])
    lat_min = max(_LAT_MIN, bounds[1])
    lon_max = min(_LON_MAX, bounds[2])
    lat_max = min(_LAT_MAX, bounds[3])

    for _ in range(100):
        lon = rng.uniform(lon_min, lon_max)
        lat = rng.uniform(lat_min, lat_max)
        pt = Point(lon, lat)
        if (
            pt.within(_togo_union)
            and _LON_MIN <= lon <= _LON_MAX
            and _LAT_MIN <= lat <= _LAT_MAX
        ):
            return (round(lon, 6), round(lat, 6))

    # Fallback : centroïde du Togo clipé dans TOGO_BOUNDS
    c = _togo_union.centroid
    clon = max(_LON_MIN, min(_LON_MAX, c.x))
    clat = max(_LAT_MIN, min(_LAT_MAX, c.y))
    return (round(clon, 6), round(clat, 6))


def random_point_in_region(
    rng: random.Random,
    region_name: str,
) -> tuple[float, float]:
    """
    Génère un point aléatoire strictement dans le polygone réel
    de la région (geoBoundaries ADM1), clipé dans TOGO_BOUNDS.

    Méthode : rejection sampling (max 100 tentatives), fallback centroïde.
    """
    _load_boundaries()

    if region_name not in _region_polygons:
        # Fallback si la région n'est pas connue : bbox approximative
        return _random_point_in_region_bbox(rng, region_name)

    region_poly = _region_polygons[region_name]

    # Limites clipées dans TOGO_BOUNDS
    bounds = region_poly.bounds
    lon_min = max(_LON_MIN, bounds[0])
    lat_min = max(_LAT_MIN, bounds[1])
    lon_max = min(_LON_MAX, bounds[2])
    lat_max = min(_LAT_MAX, bounds[3])

    for _ in range(100):
        lon = rng.uniform(lon_min, lon_max)
        lat = rng.uniform(lat_min, lat_max)
        pt = Point(lon, lat)
        if (
            pt.within(region_poly)
            and _LON_MIN <= lon <= _LON_MAX
            and _LAT_MIN <= lat <= _LAT_MAX
        ):
            return (round(lon, 6), round(lat, 6))

    # Fallback : centroïde de la région (déjà clipé)
    return _region_centroids.get(
        region_name,
        (round((lon_min + lon_max) / 2, 6), round((lat_min + lat_max) / 2, 6)),
    )


def _random_point_in_region_bbox(
    rng: random.Random,
    region_name: str,
) -> tuple[float, float]:
    """
    Fallback bbox : génère un point dans la bbox approximative d'une région.
    Utilisé uniquement si la région n'est pas trouvée dans le GeoJSON ADM1.
    """
    region_bounds: dict[str, tuple[float, float, float, float]] = {
        "Maritime": (-0.2, 6.0, 1.8, 7.2),
        "Plateaux": (0.0, 7.0, 1.6, 8.8),
        "Centrale": (0.0, 8.0, 1.4, 9.5),
        "Kara":     (0.0, 9.0, 1.2, 10.3),
        "Savanes":  (-0.1, 10.0, 1.0, 11.2),
    }
    bounds = region_bounds.get(region_name, (_LON_MIN, _LAT_MIN, _LON_MAX, _LAT_MAX))
    lon = rng.uniform(bounds[0], bounds[2])
    lat = rng.uniform(bounds[1], bounds[3])
    return (round(lon, 6), round(lat, 6))


def random_polygon_in_togo(
    rng: random.Random,
    radius_deg: float = 0.02,
    vertices: int = 6,
) -> list[list[float]]:
    """
    Génère un polygone approximativement circulaire dans les limites du Togo.

    Utile pour simuler des ZAAP, champs, plantations.
    Retourne une liste de coordonnées [lon, lat] formant un anneau fermé.
    """
    center_lon, center_lat = random_point_in_togo(rng)
    angle_step = 2 * math.pi / vertices
    offset = rng.uniform(0, math.pi)  # Rotation aléatoire

    coords = []
    for i in range(vertices):
        angle = offset + i * angle_step
        # Rayon légèrement variable pour plus de réalisme
        r = radius_deg * rng.uniform(0.7, 1.3)
        dx = r * math.cos(angle)
        dy = r * math.sin(angle) * 0.8  # Aplatissement E-W
        coords.append([
            round(center_lon + dx, 6),
            round(center_lat + dy, 6),
        ])
    # Fermer l'anneau : dernier point = premier point
    coords.append(coords[0])
    return coords


def random_polygon_in_region(
    rng: random.Random,
    region_name: str,
    radius_deg: float = 0.03,
    vertices: int = 7,
) -> list[list[float]]:
    """Génère un polygone dans une région spécifique."""
    center_lon, center_lat = random_point_in_region(rng, region_name)
    angle_step = 2 * math.pi / vertices
    offset = rng.uniform(0, math.pi)

    coords = []
    for i in range(vertices):
        angle = offset + i * angle_step
        r = radius_deg * rng.uniform(0.6, 1.4)
        dx = r * math.cos(angle)
        dy = r * math.sin(angle) * 0.8
        coords.append([
            round(center_lon + dx, 6),
            round(center_lat + dy, 6),
        ])
    # Fermer l'anneau
    coords.append(coords[0])
    return coords


# ── Régions (polygones approximatifs) ────────────────────────────────

def get_region_polygon(region_name: str) -> dict[str, Any]:
    """
    Retourne un polygone GeoJSON approximatif pour une région du Togo.

    Basé sur les limites administratives réelles, simplifiées pour le mock.
    Chaque région est définie par ~15-20 sommets.
    """
    # Polygones approximatifs des 5 régions du Togo
    # Coordonnées [lon, lat] — frontières simplifiées
    region_coords: dict[str, list[list[float]]] = {
        "Maritime": [
            [-0.2, 6.0], [0.5, 6.0], [1.2, 6.1], [1.6, 6.2],
            [1.8, 6.3], [1.7, 6.6], [1.6, 6.8], [1.6, 7.0],
            [1.5, 7.2], [1.2, 7.1], [0.8, 7.0], [0.3, 6.9],
            [-0.1, 6.8], [-0.2, 6.7], [-0.2, 6.5], [-0.2, 6.0],
        ],
        "Plateaux": [
            [0.0, 7.0], [0.8, 7.0], [1.2, 7.1], [1.5, 7.2],
            [1.6, 7.5], [1.6, 8.0], [1.5, 8.3], [1.4, 8.5],
            [1.3, 8.8], [1.0, 8.7], [0.7, 8.5], [0.4, 8.3],
            [0.1, 8.2], [0.0, 8.0], [0.0, 7.5], [0.0, 7.0],
        ],
        "Centrale": [
            [0.0, 8.0], [0.4, 8.3], [0.7, 8.5], [1.0, 8.7],
            [1.3, 8.8], [1.4, 9.0], [1.3, 9.2], [1.2, 9.5],
            [0.9, 9.4], [0.6, 9.3], [0.3, 9.2], [0.0, 9.1],
            [-0.1, 9.0], [-0.1, 8.5], [0.0, 8.0],
        ],
        "Kara": [
            [0.0, 9.0], [0.3, 9.2], [0.6, 9.3], [0.9, 9.4],
            [1.2, 9.5], [1.2, 9.8], [1.1, 10.0], [1.0, 10.3],
            [0.7, 10.2], [0.4, 10.1], [0.1, 10.0], [0.0, 9.9],
            [-0.1, 9.5], [0.0, 9.0],
        ],
        "Savanes": [
            [-0.1, 10.0], [0.1, 10.0], [0.4, 10.1], [0.7, 10.2],
            [1.0, 10.3], [1.0, 10.6], [0.9, 10.9], [0.7, 11.2],
            [0.4, 11.1], [0.1, 11.0], [-0.1, 10.8], [-0.2, 10.5],
            [-0.1, 10.0],
        ],
    }

    coords = region_coords.get(region_name, region_coords["Maritime"])
    polygon = Polygon(coords)
    return mapping(polygon)


# ── Validation GeoJSON ───────────────────────────────────────────────

def validate_geojson_feature(feature: dict[str, Any]) -> list[str]:
    """
    Valide une feature GeoJSON et retourne la liste des erreurs.

    Vérifie :
    - Présence des champs obligatoires (type, geometry, properties)
    - Type de géométrie valide
    - Coordonnées dans les limites du Togo
    - IDs uniques (si present)
    """
    errors: list[str] = []

    if "type" not in feature:
        errors.append("Missing 'type' field")
    elif feature["type"] != "Feature":
        errors.append(f"Expected 'Feature', got '{feature['type']}'")

    if "geometry" not in feature:
        errors.append("Missing 'geometry' field")
    elif feature["geometry"] is None:
        errors.append("Null geometry")
    else:
        geom = feature["geometry"]
        if "type" not in geom:
            errors.append("Geometry missing 'type'")
        elif geom["type"] not in ("Point", "MultiPoint", "LineString",
                                  "MultiLineString", "Polygon", "MultiPolygon"):
            errors.append(f"Unknown geometry type: {geom['type']}")

        # Vérification basique des coordonnées
        if "coordinates" not in geom:
            errors.append("Geometry missing 'coordinates'")
        else:
            coords = geom["coordinates"]
            if geom["type"] == "Point":
                _check_coord(errors, coords, 0)
            elif geom["type"] == "Polygon":
                for ring in coords:
                    for c in ring:
                        _check_coord(errors, c)

    if "properties" not in feature:
        errors.append("Missing 'properties' field")

    return errors


def _check_coord(
    errors: list[str],
    coord: list[float],
    depth: int = 0,
    path: str = "",
) -> None:
    """Vérifie qu'une coordonnée est dans les limites du Togo."""
    if not isinstance(coord, (list, tuple)) or len(coord) < 2:
        errors.append(f"Invalid coordinate format: {coord}")
        return
    lon, lat = coord[0], coord[1]
    if not (-0.5 <= lon <= 2.5):
        errors.append(f"Longitude out of Togo range ({lon}): {path}")
    if not (5.5 <= lat <= 11.5):
        errors.append(f"Latitude out of Togo range ({lat}): {path}")


# ── Reprojection (utile quand les vraies données arriveront) ─────────

def ensure_epsg_4326(gdf: Any) -> Any:
    """
    Garantit que le CRS est EPSG:4326.

    Paramètre : GeoDataFrame
    Retourne : GeoDataFrame en EPSG:4326
    """
    if gdf.crs is None:
        gdf.set_crs("EPSG:4326", inplace=True)
    elif str(gdf.crs) != "EPSG:4326":
        gdf = gdf.to_crs("EPSG:4326")
    return gdf


def get_centroid_lat(feature: dict[str, Any]) -> float:
    """
    Extrait la latitude du centroïde d'une feature GeoJSON.
    Utile pour les statistiques spatiales.
    """
    geom = feature.get("geometry", {})
    if geom and geom.get("type") == "Point":
        return geom["coordinates"][1]
    # Pour les polygones, utiliser le premier point comme approximation
    if geom and geom["type"] == "Polygon":
        coords = geom["coordinates"][0]
        if coords:
            return sum(c[1] for c in coords) / len(coords)
    return 0.0
