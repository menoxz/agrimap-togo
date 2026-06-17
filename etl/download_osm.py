#!/usr/bin/env python3
"""
AgriMap Togo — Chargement des données OSM (fichiers locaux pré-téléchargés).

Lit les fichiers raw Overpass JSON / GeoJSON déjà présents dans data/raw/
et produit des GeoDataFrames nettoyés dans data/processed/.

Fonctions principales:
  load_markets()       — marchés OSM + WFP → data/processed/marches.geojson
  load_cooperatives()  — coopératives OSM  → data/processed/cooperatives.geojson
  load_exploitations() — farmland OSM      → data/processed/exploitations.geojson

Aucun mock, aucun fallback réseau. Si un fichier raw est vide,
un FeatureCollection vide est écrit.

Format raw attendu : Overpass native JSON (elements[].type/lat/lon/center/tags).
"""

import json
from math import sqrt
from pathlib import Path

import geopandas as gpd
import pandas as pd
from shapely.geometry import Point

# ── Chemins ──────────────────────────────────────────────────────────
_ROOT = Path(__file__).resolve().parent.parent
_RAW_DIR = _ROOT / "data" / "raw"
_PROCESSED_DIR = _ROOT / "data" / "processed"

# Bbox Togo
TOGO_LON_MIN, TOGO_LON_MAX = 0.0, 1.8
TOGO_LAT_MIN, TOGO_LAT_MAX = 6.0, 11.2

# ── Helpers ──────────────────────────────────────────────────────────

def _in_togo_bbox(lon: float, lat: float) -> bool:
    """Retourne True si le point est dans la bbox Togo."""
    return TOGO_LON_MIN <= lon <= TOGO_LON_MAX and TOGO_LAT_MIN <= lat <= TOGO_LAT_MAX


def _load_raw_json(path: Path) -> list[dict]:
    """Charge un fichier Overpass JSON et retourne la liste d'éléments."""
    if not path.exists():
        return []
    with open(path, encoding="utf-8") as fh:
        data = json.load(fh)
    # Overpass native: {"elements": [...]}
    if "elements" in data:
        return data["elements"]
    # GeoJSON fallback: {"features": [...]}
    if "features" in data:
        return data["features"]
    return []


def _save_geojson(gdf: gpd.GeoDataFrame, path: Path) -> None:
    """Sauvegarde un GeoDataFrame en GeoJSON. Écrit un FeatureCollection vide si vide."""
    path.parent.mkdir(parents=True, exist_ok=True)
    if gdf.empty:
        with open(path, "w", encoding="utf-8") as fh:
            json.dump({"type": "FeatureCollection", "features": []}, fh, ensure_ascii=False)
    else:
        gdf.to_file(str(path), driver="GeoJSON", encoding="utf-8")


def _filter_to_togo(gdf: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    """
    Filtre les features à l'intérieur du polygone ADM1 Togo (pas seulement la bbox).

    Lit geoBoundaries-TGO-ADM1.geojson et calcule l'union des polygones.
    Retourne une copie filtrée.
    """
    if gdf.empty:
        return gdf.copy()
    adm1_path = _ROOT / "data" / "raw" / "geoBoundaries-TGO-ADM1.geojson"
    if not adm1_path.exists():
        return gdf.copy()
    adm1 = gpd.read_file(str(adm1_path)).to_crs("EPSG:4326")
    togo_union = adm1.geometry.union_all()
    return gdf[gdf.geometry.within(togo_union)].copy()


def _assign_prefecture(gdf: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    """
    Ajoute la colonne 'prefecture' à chaque feature via sjoin contre ADM2.

    Utilise geoBoundaries-TGO-ADM2.geojson. Le champ 'shapeName' contient
    le nom de la préfecture. Si le fichier est absent ou vide, la colonne
    'prefecture' est ajoutée avec None.
    """
    if gdf.empty:
        result = gdf.copy()
        result["prefecture"] = None
        return result
    adm2_path = _ROOT / "data" / "raw" / "geoBoundaries-TGO-ADM2.geojson"
    if not adm2_path.exists():
        result = gdf.copy()
        result["prefecture"] = None
        return result
    adm2 = gpd.read_file(str(adm2_path)).to_crs("EPSG:4326")
    left = gdf.reset_index(drop=True)
    joined = gpd.sjoin(left, adm2[["shapeName", "geometry"]], how="left", predicate="within")
    # Drop duplicates from ties (equidistant border points) — keep first match
    joined = joined[~joined.index.duplicated(keep="first")]
    left = left.copy()
    left["prefecture"] = joined["shapeName"].values
    return left


def _assign_region(gdf: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    """
    Ajoute la colonne 'region' (= nom_region) à chaque feature via sjoin_nearest.

    Utilise regions.geojson depuis data/processed/. Si le fichier est absent
    ou vide, la colonne 'region' est ajoutée avec None pour chaque feature.
    """
    if gdf.empty:
        result = gdf.copy()
        result["region"] = None
        return result

    regions_path = _PROCESSED_DIR / "regions.geojson"
    if not regions_path.exists():
        result = gdf.copy()
        result["region"] = None
        return result

    regions = gpd.read_file(str(regions_path))
    if regions.empty or "nom_region" not in regions.columns:
        result = gdf.copy()
        result["region"] = None
        return result

    # Reset index for clean alignment after join
    left = gdf.reset_index(drop=True)
    right = regions[["nom_region", "geometry"]].reset_index(drop=True)

    # sjoin_nearest: each point gets the nearest region (handles points near
    # region boundaries that may fall slightly outside polygons)
    joined = gpd.sjoin_nearest(left, right, how="left")
    # Drop duplicate rows in case of equidistant ties — keep first match
    joined = joined[~joined.index.duplicated(keep="first")]

    left["region"] = joined["nom_region"].values
    return left


def _market_type_from_tags(tags: dict) -> str:
    """Infère le type de marché depuis les tags OSM."""
    name = (tags.get("name") or "").lower()
    market_tag = (tags.get("market") or "").lower()
    amenity = (tags.get("amenity") or "").lower()

    if any(k in name for k in ["hebdo", "semaine", "weekly"]):
        return "Hebdomadaire"
    if any(k in name for k in ["urb", "ville", "central", "grand"]):
        return "Urbain"
    if market_tag in ("weekly", "periodic"):
        return "Hebdomadaire"
    return "Rural"


def _coop_type_from_name(name: str) -> str:
    """Infère le type de coopérative depuis le nom."""
    n = (name or "").lower()
    if any(k in n for k in ["élevage", "elevage", "pastoral", "bovins", "ovins", "volaille"]):
        return "Élevage"
    if any(k in n for k in ["mixte", "agropastoral", "polyvalent"]):
        return "Mixte"
    return "Agricole"


def _dedup_by_proximity(
    base_features: list[dict],
    new_features: list[dict],
    threshold_m: float = 50.0,
) -> list[dict]:
    """
    Ajoute les features de new_features non dupliquées avec base_features.

    Critère: distance haversine approx. < threshold_m (par défaut 50 m).
    Utilise une approximation euclidienne en degrés (valide pour ~50 m).
    """
    DEG_PER_METER_LAT = 1.0 / 111_000.0

    def dist_deg(f1: dict, f2: dict) -> float:
        lon1, lat1 = f1["lon"], f1["lat"]
        lon2, lat2 = f2["lon"], f2["lat"]
        cos_lat = abs(lat1 + lat2) / 2.0
        cos_lat_rad = cos_lat * 3.14159 / 180.0
        import math
        dlon = (lon2 - lon1) * math.cos(cos_lat_rad) / DEG_PER_METER_LAT
        dlat = (lat2 - lat1) / DEG_PER_METER_LAT
        return math.sqrt(dlon * dlon + dlat * dlat)

    merged = list(base_features)
    for nf in new_features:
        is_dup = any(dist_deg(nf, bf) < threshold_m for bf in merged)
        if not is_dup:
            merged.append(nf)
    return merged


# ── load_markets ─────────────────────────────────────────────────────

def load_markets() -> gpd.GeoDataFrame:
    """
    Parse osm_markets_raw.json + wfp_markets_tgo.geojson → marches.geojson.

    - Nodes OSM: lon/lat directs
    - Ways OSM: center.lon/lat si présent, sinon sautés
    - WFP: fusionné avec déduplication à 50 m de proximité
    - Filtre: bbox Togo (lon 0.0–1.8, lat 6.0–11.2)
    - Champs normalisés: id, nom, type, source, lon, lat
    """
    raw_elements = _load_raw_json(_RAW_DIR / "osm_markets_raw.json")

    # Collecter (lon, lat, tags, osm_id) pour chaque feature utilisable
    interim: list[dict] = []
    for el in raw_elements:
        el_type = el.get("type")
        if el_type == "node":
            lon = el.get("lon")
            lat = el.get("lat")
        elif el_type == "way":
            center = el.get("center") or {}
            lon = center.get("lon")
            lat = center.get("lat")
        else:
            # GeoJSON Feature fallback
            geom = el.get("geometry") or {}
            coords = geom.get("coordinates")
            if coords and len(coords) >= 2:
                lon, lat = float(coords[0]), float(coords[1])
            else:
                continue
            el_type = "node"  # treat as point

        if lon is None or lat is None:
            continue
        lon, lat = float(lon), float(lat)

        # Tags: Overpass native uses "tags", GeoJSON uses "properties"
        tags = el.get("tags") or el.get("properties") or {}
        osm_id = f"osm_{el_type}_{el.get('id', 'unknown')}"

        interim.append({
            "id": osm_id,
            "nom": tags.get("name") or tags.get("name:fr") or "Marché",
            "type": _market_type_from_tags(tags),
            "source": "OSM",
            "lon": lon,
            "lat": lat,
        })

    # Charger WFP et merger
    wfp_interim: list[dict] = []
    wfp_path = _RAW_DIR / "wfp_markets_tgo.geojson"
    if wfp_path.exists():
        with open(wfp_path, encoding="utf-8") as fh:
            wfp_data = json.load(fh)
        for feat in wfp_data.get("features", []):
            geom = feat.get("geometry") or {}
            coords = geom.get("coordinates")
            props = feat.get("properties") or {}
            if not coords or len(coords) < 2:
                continue
            lon_w = float(coords[0])
            lat_w = float(coords[1])
            wfp_interim.append({
                "id": f"wfp_{props.get('market_id', 'unknown')}",
                "nom": props.get("market") or props.get("name") or "Marché WFP",
                "type": "Urbain",
                "source": "WFP",
                "lon": lon_w,
                "lat": lat_w,
            })

    # Déduplication WFP vs OSM
    all_features = _dedup_by_proximity(interim, wfp_interim, threshold_m=50.0)

    # Filtre bbox Togo
    filtered = [f for f in all_features if _in_togo_bbox(f["lon"], f["lat"])]

    # Construire GeoDataFrame
    if not filtered:
        gdf = gpd.GeoDataFrame(
            columns=["id", "nom", "type", "source", "lon", "lat"],
            geometry=[],
            crs="EPSG:4326",
        )
    else:
        gdf = gpd.GeoDataFrame(
            filtered,
            geometry=[Point(f["lon"], f["lat"]) for f in filtered],
            crs="EPSG:4326",
        )

    # Step A — Filter to real ADM1 polygon (not just bbox)
    gdf = _filter_to_togo(gdf)
    # Step B — Assign prefecture via spatial join against ADM2
    gdf = _assign_prefecture(gdf)
    gdf = _assign_region(gdf)
    _save_geojson(gdf, _PROCESSED_DIR / "marches.geojson")
    return gdf


# ── load_cooperatives ────────────────────────────────────────────────

def load_cooperatives() -> gpd.GeoDataFrame:
    """
    Parse osm_cooperatives_raw.json → cooperatives.geojson.

    - Nodes OSM uniquement (lat/lon directs)
    - Filtre: bbox Togo
    - Champs: id, nom, type ("Agricole"/"Élevage"/"Mixte"), source="OSM"
    """
    raw_elements = _load_raw_json(_RAW_DIR / "osm_cooperatives_raw.json")

    interim: list[dict] = []
    for el in raw_elements:
        el_type = el.get("type")
        if el_type == "node":
            lon = el.get("lon")
            lat = el.get("lat")
        elif el_type == "way":
            # Utiliser center si présent
            center = el.get("center") or {}
            lon = center.get("lon")
            lat = center.get("lat")
        else:
            geom = el.get("geometry") or {}
            coords = geom.get("coordinates")
            if coords and len(coords) >= 2:
                lon, lat = float(coords[0]), float(coords[1])
            else:
                continue

        if lon is None or lat is None:
            continue
        lon, lat = float(lon), float(lat)

        tags = el.get("tags") or el.get("properties") or {}
        nom = tags.get("name") or tags.get("name:fr") or f"Coopérative {el.get('id', '')}"
        osm_id = f"osm_{el_type}_{el.get('id', 'unknown')}"

        interim.append({
            "id": osm_id,
            "nom": nom,
            "type": _coop_type_from_name(nom),
            "source": "OSM",
            "lon": lon,
            "lat": lat,
        })

    # Filtre bbox Togo
    filtered = [f for f in interim if _in_togo_bbox(f["lon"], f["lat"])]

    if not filtered:
        gdf = gpd.GeoDataFrame(
            columns=["id", "nom", "type", "source", "lon", "lat"],
            geometry=[],
            crs="EPSG:4326",
        )
    else:
        gdf = gpd.GeoDataFrame(
            filtered,
            geometry=[Point(f["lon"], f["lat"]) for f in filtered],
            crs="EPSG:4326",
        )

    # Step A — Filter to real ADM1 polygon (not just bbox)
    gdf = _filter_to_togo(gdf)
    # Step B — Assign prefecture via spatial join against ADM2
    gdf = _assign_prefecture(gdf)
    gdf = _assign_region(gdf)
    _save_geojson(gdf, _PROCESSED_DIR / "cooperatives.geojson")
    return gdf


# ── load_exploitations ───────────────────────────────────────────────

def load_exploitations() -> gpd.GeoDataFrame:
    """
    Parse osm_farmland_raw.json (ways avec center) → exploitations.geojson.

    - Ways OSM: center.lon / center.lat
    - Champs: id, type="farmland", area_ha, source="OSM"
    - Filtre: bbox Togo
    """
    raw_elements = _load_raw_json(_RAW_DIR / "osm_farmland_raw.json")

    interim: list[dict] = []
    for el in raw_elements:
        el_type = el.get("type")
        if el_type == "way":
            center = el.get("center") or {}
            lon = center.get("lon")
            lat = center.get("lat")
        elif el_type == "node":
            lon = el.get("lon")
            lat = el.get("lat")
        else:
            geom = el.get("geometry") or {}
            coords = geom.get("coordinates")
            if coords and len(coords) >= 2:
                lon, lat = float(coords[0]), float(coords[1])
            else:
                continue

        if lon is None or lat is None:
            continue
        lon, lat = float(lon), float(lat)

        tags = el.get("tags") or el.get("properties") or {}
        osm_id = f"osm_{el_type}_{el.get('id', 'unknown')}"

        # area en ha depuis tags (certains ont area= en m²)
        area_raw = tags.get("area")
        area_ha = None
        if area_raw is not None:
            try:
                area_ha = round(float(area_raw) / 10_000.0, 4)
            except (ValueError, TypeError):
                area_ha = None

        interim.append({
            "id": osm_id,
            "type": "farmland",
            "area_ha": area_ha,
            "source": "OSM",
            "lon": lon,
            "lat": lat,
        })

    # Filtre bbox Togo
    filtered = [f for f in interim if _in_togo_bbox(f["lon"], f["lat"])]

    if not filtered:
        gdf = gpd.GeoDataFrame(
            columns=["id", "type", "area_ha", "source", "lon", "lat"],
            geometry=[],
            crs="EPSG:4326",
        )
    else:
        gdf = gpd.GeoDataFrame(
            filtered,
            geometry=[Point(f["lon"], f["lat"]) for f in filtered],
            crs="EPSG:4326",
        )

    # Step A — Filter to real ADM1 polygon (not just bbox)
    gdf = _filter_to_togo(gdf)
    # Step B — Assign prefecture via spatial join against ADM2
    gdf = _assign_prefecture(gdf)
    _save_geojson(gdf, _PROCESSED_DIR / "exploitations.geojson")
    return gdf


# ── Point d'entrée ───────────────────────────────────────────────────

def run() -> dict[str, int]:
    """Charge les 3 couches OSM. Retourne les comptes."""
    markets_gdf = load_markets()
    coops_gdf = load_cooperatives()
    exploits_gdf = load_exploitations()
    return {
        "marches": len(markets_gdf),
        "cooperatives": len(coops_gdf),
        "exploitations": len(exploits_gdf),
    }


if __name__ == "__main__":
    import sys
    counts = run()
    for k, v in counts.items():
        print(f"  {k}: {v} features")
    sys.exit(0)
