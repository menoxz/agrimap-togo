#!/usr/bin/env python3
"""
AgriMap Togo — Téléchargement des données OSM via l'API Overpass.

Télécharge les marchés et coopératives agricoles du Togo
depuis OpenStreetMap via l'API Overpass.

Règle d'activation :
  >= OSM_MIN_FEATURES (10) features → écrase data/processed/marches.geojson
                                       ou data/processed/cooperatives.geojson
  < OSM_MIN_FEATURES               → WARNING, données mock conservées

Timeout : 90 s max (OVERPASS_TIMEOUT). Les erreurs réseau sont gérées
gracefully (urllib.error.URLError) : le pipeline continue sans crash.

Dépendances : json, urllib (stdlib) + geopandas, shapely (déjà disponibles).
"""

import json
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

# ── Constantes ───────────────────────────────────────────────────────
OVERPASS_URL = "https://overpass-api.de/api/interpreter"
OVERPASS_TIMEOUT = 90       # secondes
OSM_MIN_FEATURES = 10       # seuil minimal pour utiliser les données OSM

# Chemins depuis ce fichier (etl/download_osm.py → root)
_ROOT = Path(__file__).resolve().parent.parent
_PROCESSED_DIR = _ROOT / "data" / "processed"
_REGIONS_PATH = _PROCESSED_DIR / "regions.geojson"


# ── Helpers Overpass ─────────────────────────────────────────────────

def _overpass_query(query: str, logger: Any) -> dict | None:
    """
    Exécute une requête Overpass et retourne le JSON parsé.
    Retourne None si l'API est inaccessible ou si la requête échoue.
    """
    encoded = urllib.parse.urlencode({"data": query}).encode("utf-8")
    req = urllib.request.Request(
        OVERPASS_URL,
        data=encoded,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    try:
        with urllib.request.urlopen(req, timeout=OVERPASS_TIMEOUT) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.URLError as e:
        logger.step(f"Overpass API inaccessible : {e}", "WARN")
        return None
    except Exception as e:
        logger.step(f"Erreur Overpass inattendue : {e}", "WARN")
        return None


def _get_point(element: dict) -> tuple[float, float] | None:
    """
    Extrait (lon, lat) depuis un élément OSM.
    - node  → (lon, lat) directs
    - way   → (center.lon, center.lat) (requête `out center`)
    """
    if element.get("type") == "node":
        lon = element.get("lon")
        lat = element.get("lat")
        if lon is not None and lat is not None:
            return float(lon), float(lat)
    elif "center" in element:
        c = element["center"]
        lon = c.get("lon")
        lat = c.get("lat")
        if lon is not None and lat is not None:
            return float(lon), float(lat)
    return None


def _assign_regions(features: list[dict], logger: Any) -> list[dict]:
    """
    Assigne la région Togo à chaque feature par jointure spatiale ponctuelle.
    Utilise data/processed/regions.geojson comme référence.
    Fallback : region = "Unknown" (string non-nulle, compatible tests).
    """
    if not _REGIONS_PATH.exists():
        logger.step("regions.geojson absent — région = Unknown", "WARN")
        for f in features:
            f["properties"]["region"] = "Unknown"
        return features

    try:
        import geopandas as gpd
        from shapely.geometry import shape as shp_shape

        regions_gdf = gpd.read_file(_REGIONS_PATH)
        if regions_gdf.crs is None:
            regions_gdf.set_crs("EPSG:4326", inplace=True)

        for feature in features:
            coords = feature["geometry"]["coordinates"]
            pt = shp_shape({"type": "Point", "coordinates": coords})
            region_name = "Unknown"
            for _, row in regions_gdf.iterrows():
                if row.geometry is not None and pt.within(row.geometry):
                    region_name = str(row.get("nom_region", "Unknown"))
                    break
            feature["properties"]["region"] = region_name

    except Exception as e:
        logger.step(f"Jointure spatiale région échouée : {e}", "WARN")
        for f in features:
            if "region" not in f["properties"]:
                f["properties"]["region"] = "Unknown"

    return features


# ── Téléchargement marchés ───────────────────────────────────────────

def download_markets(logger: Any) -> list[dict]:
    """
    Télécharge les marchés du Togo depuis OSM via Overpass.
    Retourne une liste de features GeoJSON (Point).
    """
    # Bounding box Togo : lat_min, lon_min, lat_max, lon_max (format Overpass)
    query = """[out:json][timeout:90];
(
  node["amenity"="marketplace"](6.0,-0.2,11.2,1.8);
  way["amenity"="marketplace"](6.0,-0.2,11.2,1.8);
  node["shop"="market"](6.0,-0.2,11.2,1.8);
  way["shop"="market"](6.0,-0.2,11.2,1.8);
  node["landuse"="retail"]["market"](6.0,-0.2,11.2,1.8);
);
out center;
"""
    logger.step("Requête OSM : marchés du Togo (Overpass)...")
    result = _overpass_query(query, logger)
    if result is None:
        return []

    elements = result.get("elements", [])
    features: list[dict] = []
    for el in elements:
        coords = _get_point(el)
        if coords is None:
            continue
        lon, lat = coords
        tags = el.get("tags", {})
        osm_id = f"osm_{el['type']}_{el['id']}"
        feature: dict = {
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [lon, lat]},
            "properties": {
                "id": osm_id,
                "nom": tags.get("name", tags.get("name:fr", f"Marché {el['id']}")),
                "type_marche": tags.get("market", tags.get("amenity", "marketplace")),
                "source": "osm",
                "region": "Unknown",  # sera rempli par _assign_regions
            },
        }
        features.append(feature)

    logger.step(f"  OSM marchés bruts : {len(features)} features")
    return features


# ── Téléchargement coopératives ──────────────────────────────────────

def download_cooperatives(logger: Any) -> list[dict]:
    """
    Télécharge les coopératives agricoles du Togo depuis OSM via Overpass.
    Retourne une liste de features GeoJSON (Point).
    """
    query = """[out:json][timeout:90];
(
  node["amenity"="cooperative"](6.0,-0.2,11.2,1.8);
  way["amenity"="cooperative"](6.0,-0.2,11.2,1.8);
  node["office"="cooperative"](6.0,-0.2,11.2,1.8);
  way["office"="cooperative"](6.0,-0.2,11.2,1.8);
  node["amenity"="association"]["agricultural"](6.0,-0.2,11.2,1.8);
);
out center;
"""
    logger.step("Requête OSM : coopératives du Togo (Overpass)...")
    result = _overpass_query(query, logger)
    if result is None:
        return []

    elements = result.get("elements", [])
    features: list[dict] = []
    for el in elements:
        coords = _get_point(el)
        if coords is None:
            continue
        lon, lat = coords
        tags = el.get("tags", {})
        osm_id = f"osm_{el['type']}_{el['id']}"
        feature: dict = {
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [lon, lat]},
            "properties": {
                "id": osm_id,
                "nom": tags.get("name", tags.get("name:fr", f"Coopérative {el['id']}")),
                "type_coop": tags.get("amenity", tags.get("office", "cooperative")),
                "cultures": tags.get("crop", tags.get("produce", "")),
                "source": "osm",
                "region": "Unknown",
            },
        }
        features.append(feature)

    logger.step(f"  OSM coopératives brutes : {len(features)} features")
    return features


# ── Point d'entrée principal ─────────────────────────────────────────

def download_osm_data(logger: Any | None = None) -> dict[str, int]:
    """
    Télécharge marchés + coopératives depuis OSM et met à jour
    data/processed/ si les données dépassent OSM_MIN_FEATURES.

    Returns
    -------
    dict[str, int]
        Nombre de features OSM sauvegardées par dataset
        (0 = seuil non atteint, données mock conservées).
    """
    if logger is None:
        from etl.utils.io import PipelineLogger
        logger = PipelineLogger()

    logger.section("TÉLÉCHARGEMENT OSM (Overpass API)")
    results: dict[str, int] = {}

    # ── Marchés ─────────────────────────────────────────────────────
    market_features = download_markets(logger)
    if len(market_features) >= OSM_MIN_FEATURES:
        market_features = _assign_regions(market_features, logger)
        geojson: dict = {
            "type": "FeatureCollection",
            "features": market_features,
        }
        out_path = _PROCESSED_DIR / "marches.geojson"
        with open(out_path, "w", encoding="utf-8") as fh:
            json.dump(geojson, fh, ensure_ascii=False, indent=2)
        logger.step(
            f"OSM marchés sauvegardés : {len(market_features)} → {out_path.relative_to(_ROOT)}",
            "OK",
        )
        results["marches"] = len(market_features)
    else:
        logger.step(
            f"OSM marchés : {len(market_features)} < {OSM_MIN_FEATURES} — données mock conservées",
            "WARN",
        )
        results["marches"] = 0

    # ── Coopératives ────────────────────────────────────────────────
    coop_features = download_cooperatives(logger)
    if len(coop_features) >= OSM_MIN_FEATURES:
        coop_features = _assign_regions(coop_features, logger)
        geojson = {
            "type": "FeatureCollection",
            "features": coop_features,
        }
        out_path = _PROCESSED_DIR / "cooperatives.geojson"
        with open(out_path, "w", encoding="utf-8") as fh:
            json.dump(geojson, fh, ensure_ascii=False, indent=2)
        logger.step(
            f"OSM coopératives sauvegardées : {len(coop_features)} → {out_path.relative_to(_ROOT)}",
            "OK",
        )
        results["cooperatives"] = len(coop_features)
    else:
        logger.step(
            f"OSM coopératives : {len(coop_features)} < {OSM_MIN_FEATURES} — données mock conservées",
            "WARN",
        )
        results["cooperatives"] = 0

    return results


if __name__ == "__main__":
    import sys
    from etl.utils.io import PipelineLogger
    sys.exit(0 if download_osm_data(PipelineLogger()) is not None else 1)
