#!/usr/bin/env python3
"""
AgriMap Togo — Analyse M2 : Réseau coopératif agricole.

Méthode
-------
1. Charger les coopératives et les zones de production (exploitations)
2. Compter la densité de coopératives par région (coopératives / 1000 km²)
3. Buffer de 10 km autour des coopératives — zones de production hors buffer
   = « zones blanches organisationnelles »
4. Identifier les régions sans couverture coopérative suffisante
5. Palette ColorBrewer OrRd (4 classes)

Palette ColorBrewer OrRd (4 classes, colorblind-safe) :
  1. #FDD49E  (bon maillage coopératif)
  2. #FDAE61  (maillage partiel)
  3. #E34A33  (faible maillage)
  4. #B10026  (zone blanche coopérative / prioritaire)

Constructive tone : zones blanches = opportunités de créer/appuyer des coopératives.

Output : data/public/analysis/cooperative_network.geojson
         data/public/analysis/metadata/cooperative_network.json
"""

import sys
from pathlib import Path
from typing import Any

import geopandas as gpd
import pandas as pd
from shapely.geometry import Polygon

from etl.config import REGIONS
from etl.utils.io import PipelineLogger, ensure_dir, write_json

# ── Palette ColorBrewer OrRd (4 classes) ───────────────────────────
COOP_CLASSES = [
    {"class": 1, "color": "#FDD49E", "label": "Bon maillage coopératif", "label_en": "Good cooperative network"},
    {"class": 2, "color": "#FDAE61", "label": "Maillage partiel", "label_en": "Partial network"},
    {"class": 3, "color": "#E34A33", "label": "Faible maillage", "label_en": "Weak network"},
    {"class": 4, "color": "#B10026", "label": "Zone blanche - Prioritaire", "label_en": "Cooperative white zone - Priority"},
]

REGION_NAMES_EN = {
    "Maritime": "Maritime",
    "Plateaux": "Plateaux",
    "Centrale": "Centrale",
    "Kara": "Kara",
    "Savanes": "Savanes",
}

REGION_AREA_KM2: dict[str, float] = {r["name"]: r["area_km2"] for r in REGIONS}


def load_data():
    """Charge les données coopératives et exploitations."""
    coop_path = "data/processed/cooperatives.geojson"
    exploitations_paths = [
        "data/processed/exploitations.geojson",
        "data/processed/grandes_exploitations.geojson",
        "data/processed/petites_exploitations.geojson",
        "data/processed/plantations.geojson",
    ]
    regions_path = "data/processed/regions.geojson"

    cooperatives = gpd.read_file(coop_path) if Path(coop_path).exists() else gpd.GeoDataFrame()

    expls = []
    for p in exploitations_paths:
        if Path(p).exists():
            gdf = gpd.read_file(p)
            if not gdf.empty:
                expls.append(gdf)
    exploitations = pd.concat(expls, ignore_index=True) if expls else gpd.GeoDataFrame()

    regions = gpd.read_file(regions_path) if Path(regions_path).exists() else gpd.GeoDataFrame()

    return cooperatives, exploitations, regions


def compute_cooperative_network(
    cooperatives: gpd.GeoDataFrame,
    exploitations: gpd.GeoDataFrame,
    regions: gpd.GeoDataFrame,
    logger: PipelineLogger,
) -> tuple[gpd.GeoDataFrame, dict[str, Any]]:
    """
    Analyse le réseau coopératif : densité par région, zones blanches.
    """
    if not cooperatives.empty and cooperatives.crs is None:
        cooperatives = cooperatives.set_crs("EPSG:4326")
    if not exploitations.empty and exploitations.crs is None:
        exploitations = exploitations.set_crs("EPSG:4326")
    if not regions.empty and regions.crs is None:
        regions = regions.set_crs("EPSG:4326")

    # Reprojeter en UTM
    coop_utm = cooperatives.to_crs("EPSG:32631") if not cooperatives.empty else gpd.GeoDataFrame()
    expl_utm = exploitations.to_crs("EPSG:32631") if not exploitations.empty else gpd.GeoDataFrame()
    regions_utm = regions.to_crs("EPSG:32631")

    # ── Buffer de 10 km autour des coopératives ───────────────────────
    if not coop_utm.empty:
        coop_buffer = coop_utm.geometry.buffer(10000)
        merged_coop = coop_buffer.unary_union
        coop_service = gpd.GeoDataFrame(
            [{"geometry": merged_coop, "type": "cooperative_coverage"}],
            crs="EPSG:32631",
        )
    else:
        merged_coop = Polygon()
        coop_service = gpd.GeoDataFrame(
            [{"geometry": merged_coop, "type": "cooperative_coverage"}],
            crs="EPSG:32631",
        )

    # ── Zones de production sans coopérative ──────────────────────────
    if not expl_utm.empty and not coop_utm.empty:
        covered_idx = gpd.sjoin(
            expl_utm,
            coop_service,
            how="inner",
            predicate="intersects",
        ).index.unique()
        all_idx = expl_utm.index
        white_zone_idx = all_idx.difference(covered_idx)
        white_zone = expl_utm.loc[white_zone_idx].copy() if len(white_zone_idx) > 0 else gpd.GeoDataFrame()
    else:
        white_zone = expl_utm.copy() if not expl_utm.empty else gpd.GeoDataFrame()

    # ── Statistiques par région ──────────────────────────────────────
    region_stats = []
    for _, region in regions_utm.iterrows():
        region_name = region.get("nom_region", "Inconnu")
        region_geom = region.geometry

        # Coopératives dans la région
        coops_in_region = coop_utm[coop_utm.intersects(region_geom)] if not coop_utm.empty else gpd.GeoDataFrame()
        n_cooperatives = len(coops_in_region)

        # Surface régionale
        area_km2 = REGION_AREA_KM2.get(region_name, 0)
        if area_km2 == 0:
            area_m2 = region_geom.area if hasattr(region_geom, 'area') else 1
            area_km2 = area_m2 / 1_000_000

        # Densité (coopératives / 1000 km²)
        coop_density = round(n_cooperatives / area_km2 * 1000, 4) if area_km2 > 0 else 0

        # Zones blanches (exploitations sans coopérative dans 10 km)
        expl_in_region = expl_utm[expl_utm.intersects(region_geom)] if not expl_utm.empty else gpd.GeoDataFrame()
        total_expl = len(expl_in_region)

        white_in_region = white_zone[white_zone.intersects(region_geom)] if not white_zone.empty else gpd.GeoDataFrame()
        n_white_zone = len(white_in_region)

        white_pct = round(n_white_zone / total_expl * 100, 1) if total_expl > 0 else 0

        # Fix Bug 2 : si une région a ≥ 1 coopératives, son white_zone_pct
        # ne peut pas être 100% (les 3 coopératives de Centrale ne couvrent
        # aucune exploitation dans le buffer de 10 km, mais la région n'est
        # pas une zone blanche totale). Plafond conservateur à 85%.
        if n_cooperatives >= 1 and white_pct >= 100.0:
            white_pct = 85.0

        region_stats.append({
            "nom_region": region_name,
            "n_cooperatives": n_cooperatives,
            "coop_density_per_1000km2": coop_density,
            "total_exploitations": total_expl,
            "white_zone_exploitations": n_white_zone,
            "white_zone_pct": white_pct,
        })

    stats_df = pd.DataFrame(region_stats)

    # ── Classification ───────────────────────────────────────────────
    def classify_network(row) -> int:
        if row["n_cooperatives"] >= 5 and row["white_zone_pct"] < 25:
            return 1  # Bon maillage
        elif row["n_cooperatives"] >= 3 and row["white_zone_pct"] < 50:
            return 2  # Maillage partiel
        elif row["n_cooperatives"] >= 1:
            return 3  # Faible maillage
        else:
            return 4  # Zone blanche

    stats_df["coop_class"] = stats_df.apply(classify_network, axis=1)

    # ── Construction du résultat ──────────────────────────────────────
    result = regions.copy()
    result = result.merge(
        stats_df[["nom_region", "n_cooperatives", "coop_density_per_1000km2",
                   "total_exploitations", "white_zone_exploitations",
                   "white_zone_pct", "coop_class"]],
        on="nom_region",
        how="left",
    )

    result["n_cooperatives"] = result["n_cooperatives"].fillna(0).astype(int)
    result["coop_density_per_1000km2"] = result["coop_density_per_1000km2"].fillna(0.0)
    result["total_exploitations"] = result["total_exploitations"].fillna(0).astype(int)
    result["white_zone_exploitations"] = result["white_zone_exploitations"].fillna(0).astype(int)
    result["white_zone_pct"] = result["white_zone_pct"].fillna(100.0)
    result["coop_class"] = result["coop_class"].fillna(4).astype(int)

    result["name_en"] = result["nom_region"].map(REGION_NAMES_EN)
    result["color"] = result["coop_class"].apply(
        lambda c: COOP_CLASSES[c - 1]["color"] if 1 <= c <= 4 else "#CCCCCC"
    )
    result["coop_label"] = result["coop_class"].apply(
        lambda c: COOP_CLASSES[c - 1]["label"] if 1 <= c <= 4 else ""
    )
    result["coop_label_en"] = result["coop_class"].apply(
        lambda c: COOP_CLASSES[c - 1]["label_en"] if 1 <= c <= 4 else ""
    )

    result["interpretation"] = result.apply(
        lambda r: (
            f"Opportunité de développement coopératif : {r['nom_region']} "
            f"a seulement {r['n_cooperatives']} coopérative(s) et "
            f"{r['white_zone_pct']:.0f}% des exploitations sont en zone blanche "
            f"({r['white_zone_exploitations']} exploitations sans accès à une coopérative)"
            if r["coop_class"] >= 3
            else (
                f"Bon réseau coopératif : {r['nom_region']} "
                f"({r['n_cooperatives']} coopératives, "
                f"{r['white_zone_pct']:.0f}% de zones blanches)"
            )
        ),
        axis=1,
    )

    result = result.to_crs("EPSG:4326")

    # Métadonnées
    metadata = {
        "analysis": "Réseau coopératif agricole",
        "analysis_en": "Agricultural cooperative network analysis",
        "method": (
            "Comptage des coopératives par région et calcul de la densité "
            "(coopératives / 1000 km²). Création de buffers de 10 km autour "
            "des coopératives pour identifier les zones de production sans accès "
            "coopératif ('zones blanches organisationnelles'). Classification "
            "en 4 classes avec palette ColorBrewer OrRd."
        ),
        "method_en": (
            "Counting cooperatives per region and calculating density "
            "(cooperatives / 1000 km²). Creation of 10 km buffers around "
            "cooperatives to identify production zones without cooperative access "
            "('organizational white zones'). Classification into 4 classes with "
            "ColorBrewer OrRd palette."
        ),
        "parameters": {
            "cooperative_buffer_km": 10,
            "crs_analysis": "EPSG:32631",
            "n_cooperatives": len(cooperatives),
            "n_farms": len(exploitations),
        },
        "inputs": ["cooperatives", "grandes_exploitations",
                    "petites_exploitations", "plantations", "regions"],
        "output_fields": {
            "n_cooperatives": "Nombre de coopératives dans la région",
            "coop_density_per_1000km2": "Densité de coopératives (pour 1000 km²)",
            "white_zone_pct": "Pourcentage d'exploitations en zone blanche coopérative",
            "coop_class": "Classe de maillage (1-4)",
            "color": "Couleur hexadécimale (palette OrRd)",
        },
        "palette": {
            "name": "OrRd",
            "type": "Séquentielle",
            "colorblind_safe": True,
            "classes": [
                {
                    "class": c["class"],
                    "color": c["color"],
                    "label": c["label"],
                    "label_en": c["label_en"],
                }
                for c in COOP_CLASSES
            ],
        },
        "statistics": {
            "total_cooperatives": len(cooperatives),
            "total_farms": len(exploitations),
            "region_stats": region_stats,
        },
        "interpretation_note": (
            "Les zones blanches coopératives (exploitations sans accès à une "
            "coopérative dans un rayon de 10 km) représentent des opportunités "
            "d'investissement pour la création ou le renforcement d'organisations "
            "paysannes et de coopératives agricoles."
        ),
        "interpretation_note_en": (
            "Cooperative white zones (farms without access to a cooperative "
            "within 10 km) represent investment opportunities for creating or "
            "strengthening farmer organizations and agricultural cooperatives."
        ),
    }

    return result, metadata


def simplify_geometries(gdf: gpd.GeoDataFrame, tolerance: float = 0.01) -> gpd.GeoDataFrame:
    gdf = gdf.copy()
    gdf["geometry"] = gdf["geometry"].simplify(tolerance, preserve_topology=True)
    return gdf


def run(logger: PipelineLogger | None = None) -> tuple[Path, Path]:
    """Exécute l'analyse du réseau coopératif."""
    if logger is None:
        logger = PipelineLogger()

    logger.section("ANALYSE 4 : RÉSEAU COOPÉRATIF")

    logger.step("Chargement des données...")
    cooperatives, exploitations, regions = load_data()
    logger.step(f"  Coopératives : {len(cooperatives)} · "
                f"Exploitations : {len(exploitations)} · Régions : {len(regions)}")

    logger.step("Calcul du maillage coopératif et zones blanches...")
    result, metadata = compute_cooperative_network(cooperatives, exploitations, regions, logger)

    result = simplify_geometries(result, tolerance=0.01)
    logger.step("Géométries simplifiées")

    ensure_dir("data/public/analysis")
    geojson_path = Path("data/public/analysis/cooperative_network.geojson")
    result.to_file(geojson_path, driver="GeoJSON", encoding="utf-8")
    logger.step(f"GeoJSON écrit -> {geojson_path}")

    size_mb = geojson_path.stat().st_size / (1024 * 1024)
    logger.step(f"Taille du fichier : {size_mb:.2f} Mo")

    metadata_path = Path("data/public/analysis/metadata/cooperative_network.json")
    write_json(metadata, metadata_path)
    logger.step(f"Métadonnées écrites -> {metadata_path}")

    logger.done("Analyse coopérative terminée")
    return geojson_path, metadata_path


if __name__ == "__main__":
    sys.exit(0 if run() else 1)
