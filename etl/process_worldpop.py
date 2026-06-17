#!/usr/bin/env python3
"""
AgriMap Togo — Module de traitement WorldPop.

Calcule la population sum par région ADM1 et par préfecture ADM2 à partir
du raster WorldPop 2020 (tgo_ppp_2020_constrained.tif).

Outputs:
  data/raw/worldpop_by_region.json     — {region: {population, area_km2, density_pop_km2}}
  data/raw/worldpop_by_prefecture.json — idem par préfecture

Dépendances: rasterio, geopandas, numpy
CRS d'analyse: EPSG:32631 (UTM zone 31N) pour l'aire en km²
"""

import json
import sys
from pathlib import Path

import geopandas as gpd
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from etl.utils.io import PipelineLogger, ensure_dir

RASTER_PATH = ROOT / "data" / "raw" / "worldpop_tgo_2020.tif"
ADM1_PATH = ROOT / "data" / "raw" / "geoBoundaries-TGO-ADM1.geojson"
ADM2_PATH = ROOT / "data" / "raw" / "geoBoundaries-TGO-ADM2.geojson"
OUT_REGION_PATH = ROOT / "data" / "raw" / "worldpop_by_region.json"
OUT_PREF_PATH = ROOT / "data" / "raw" / "worldpop_by_prefecture.json"


def _sum_raster_in_polygon(src, geom, nodata_val) -> float:
    """
    Masque le raster avec la géométrie et retourne la somme des pixels valides.
    Retourne 0.0 si aucun pixel valide.
    """
    try:
        from rasterio.mask import mask as rio_mask
        out_image, _ = rio_mask(src, [geom.__geo_interface__], crop=True, nodata=nodata_val)
        data = out_image[0]
        valid = data[data != nodata_val]
        valid = valid[valid > 0]
        return float(valid.sum()) if len(valid) > 0 else 0.0
    except Exception:
        return 0.0


def compute_population_by_boundaries(
    boundaries_path: Path,
    name_field: str,
    logger: PipelineLogger,
) -> dict[str, dict]:
    """
    Calcule population + aire + densité pour chaque unité administrative.

    Parameters
    ----------
    boundaries_path : Path vers le GeoJSON ADM
    name_field : champ contenant le nom (ex: "shapeName")

    Returns
    -------
    dict  {nom: {population, area_km2, density_pop_km2}}
    """
    import rasterio

    if not RASTER_PATH.exists():
        raise FileNotFoundError(f"Raster WorldPop introuvable : {RASTER_PATH}")
    if not boundaries_path.exists():
        raise FileNotFoundError(f"Frontières introuvables : {boundaries_path}")

    # Charger les frontières
    gdf = gpd.read_file(str(boundaries_path))
    if gdf.crs is None:
        gdf = gdf.set_crs("EPSG:4326")
    if gdf.crs.to_epsg() != 4326:
        gdf = gdf.to_crs("EPSG:4326")

    # Projection UTM pour l'aire
    gdf_utm = gdf.to_crs("EPSG:32631")

    results: dict[str, dict] = {}

    with rasterio.open(str(RASTER_PATH)) as src:
        nodata_val = src.nodata if src.nodata is not None else -99999.0

        for idx, row in gdf.iterrows():
            name = str(row.get(name_field, f"unit_{idx}")).strip()
            # Normaliser Maritime/Plateaux etc.
            if name.endswith(" Region"):
                name = name[:-7].strip()

            geom_4326 = row.geometry
            if geom_4326 is None:
                continue

            pop = _sum_raster_in_polygon(src, geom_4326, nodata_val)

            # Aire en km² depuis UTM
            geom_utm = gdf_utm.loc[idx, "geometry"]
            area_m2 = geom_utm.area if geom_utm is not None else 0.0
            area_km2 = round(area_m2 / 1_000_000, 2)

            density = round(pop / area_km2, 4) if area_km2 > 0 else 0.0

            results[name] = {
                "population": round(pop),
                "area_km2": area_km2,
                "density_pop_km2": density,
            }

            logger.step(f"  {name}: pop={round(pop):,}, area={area_km2:.0f} km², density={density:.1f}/km²")

    return results


def run(logger: PipelineLogger | None = None) -> tuple[Path, Path]:
    """Traite le raster WorldPop et génère les 2 JSON de sortie."""
    if logger is None:
        logger = PipelineLogger()

    logger.section("PROCESS WORLDPOP — Population par région et préfecture")

    # ── Régions ADM1 ────────────────────────────────────────────────
    logger.step(f"Calcul population par région ADM1 ({ADM1_PATH.name}) ...")
    region_data = compute_population_by_boundaries(ADM1_PATH, "shapeName", logger)
    logger.step(f"  {len(region_data)} régions traitées", "OK")

    ensure_dir(OUT_REGION_PATH.parent)
    with open(OUT_REGION_PATH, "w", encoding="utf-8") as fh:
        json.dump(region_data, fh, ensure_ascii=False, indent=2)
    logger.step(f"  Sauvegardé -> {OUT_REGION_PATH}", "OK")

    # ── Préfectures ADM2 ────────────────────────────────────────────
    logger.step(f"Calcul population par préfecture ADM2 ({ADM2_PATH.name}) ...")
    pref_data = compute_population_by_boundaries(ADM2_PATH, "shapeName", logger)
    logger.step(f"  {len(pref_data)} préfectures traitées", "OK")

    with open(OUT_PREF_PATH, "w", encoding="utf-8") as fh:
        json.dump(pref_data, fh, ensure_ascii=False, indent=2)
    logger.step(f"  Sauvegardé -> {OUT_PREF_PATH}", "OK")

    logger.done("process_worldpop terminé")
    return OUT_REGION_PATH, OUT_PREF_PATH


if __name__ == "__main__":
    sys.exit(0 if run() else 1)
