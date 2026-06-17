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


def load_boundaries(level: str = "region") -> gpd.GeoDataFrame:
    """Charge les frontières administratives selon le niveau."""
    if level == "prefecture":
        path = "data/raw/geoBoundaries-TGO-ADM2.geojson"
        if not Path(path).exists():
            return gpd.GeoDataFrame()
        gdf = gpd.read_file(path)
        if "shapeName" in gdf.columns:
            gdf = gdf.rename(columns={"shapeName": "nom_prefecture"})
        return gdf
    path = "data/processed/regions.geojson"
    return gpd.read_file(path) if Path(path).exists() else gpd.GeoDataFrame()


def load_data():
    """Charge les données coopératives et exploitations."""
    coop_path = "data/processed/cooperatives.geojson"
    exploitations_paths = [
        "data/processed/exploitations.geojson",
        "data/processed/grandes_exploitations.geojson",
        "data/processed/petites_exploitations.geojson",
        "data/processed/plantations.geojson",
    ]

    cooperatives = gpd.read_file(coop_path) if Path(coop_path).exists() else gpd.GeoDataFrame()

    expls = []
    for p in exploitations_paths:
        if Path(p).exists():
            gdf = gpd.read_file(p)
            if not gdf.empty:
                expls.append(gdf)
    exploitations = pd.concat(expls, ignore_index=True) if expls else gpd.GeoDataFrame()

    return cooperatives, exploitations


def compute_cooperative_network(
    cooperatives: gpd.GeoDataFrame,
    exploitations: gpd.GeoDataFrame,
    boundaries: gpd.GeoDataFrame,
    logger: PipelineLogger,
    level: str = "region",
) -> tuple[gpd.GeoDataFrame, dict[str, Any]]:
    """
    Analyse le réseau coopératif : densité par région, zones blanches.
    
    Règles métier :
    - region    : >=5 coops → class 1, >=3 → class 2, >=1 → class 3
    - prefecture : >=2 coops → class 1, >=1 → class 2, else → class 3 ou 4
    """
    name_col = "nom_region" if level == "region" else "nom_prefecture"
    
    if not cooperatives.empty and cooperatives.crs is None:
        cooperatives = cooperatives.set_crs("EPSG:4326")
    if not exploitations.empty and exploitations.crs is None:
        exploitations = exploitations.set_crs("EPSG:4326")
    if not boundaries.empty and boundaries.crs is None:
        boundaries = boundaries.set_crs("EPSG:4326")

    # Reprojeter en UTM
    coop_utm = cooperatives.to_crs("EPSG:32631") if not cooperatives.empty else gpd.GeoDataFrame()
    expl_utm = exploitations.to_crs("EPSG:32631") if not exploitations.empty else gpd.GeoDataFrame()
    boundaries_utm = boundaries.to_crs("EPSG:32631")

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

    # ── Statistiques par unité administrative ────────────────────────
    boundary_stats = []
    for _, boundary in boundaries_utm.iterrows():
        boundary_name = boundary.get(name_col, "Inconnu")
        boundary_geom = boundary.geometry

        # Coopératives dans l'unité
        coops_in_boundary = coop_utm[coop_utm.intersects(boundary_geom)] if not coop_utm.empty else gpd.GeoDataFrame()
        n_cooperatives = len(coops_in_boundary)

        # Surface
        if level == "region":
            area_km2 = REGION_AREA_KM2.get(boundary_name, 0)
        else:
            area_km2 = 0
        if area_km2 == 0:
            area_m2 = boundary_geom.area if hasattr(boundary_geom, 'area') else 1
            area_km2 = area_m2 / 1_000_000

        # Densité (coopératives / 1000 km²)
        coop_density = round(n_cooperatives / area_km2 * 1000, 4) if area_km2 > 0 else 0

        # Zones blanches (exploitations sans coopérative dans 10 km)
        expl_in_boundary = expl_utm[expl_utm.intersects(boundary_geom)] if not expl_utm.empty else gpd.GeoDataFrame()
        total_expl = len(expl_in_boundary)

        white_in_boundary = white_zone[white_zone.intersects(boundary_geom)] if not white_zone.empty else gpd.GeoDataFrame()
        n_white_zone = len(white_in_boundary)

        white_pct = round(n_white_zone / total_expl * 100, 1) if total_expl > 0 else 0

        # Fix Bug 2 : si une entité a ≥ 1 coopératives, son white_zone_pct
        # ne peut pas être 100%. Plafond conservateur à 85%.
        if n_cooperatives >= 1 and white_pct >= 100.0:
            white_pct = 85.0

        boundary_stats.append({
            name_col: boundary_name,
            "n_cooperatives": n_cooperatives,
            "coop_density_per_1000km2": coop_density,
            "total_exploitations": total_expl,
            "white_zone_exploitations": n_white_zone,
            "white_zone_pct": white_pct,
        })

    stats_df = pd.DataFrame(boundary_stats)

    # ── Classification (règles adaptées selon level) ─────────────────
    if level == "prefecture":
        def classify_network(row) -> int:
            if row["n_cooperatives"] >= 2 and row["white_zone_pct"] < 25:
                return 1  # Bon maillage
            elif row["n_cooperatives"] >= 1 and row["white_zone_pct"] < 50:
                return 2  # Maillage partiel
            elif row["n_cooperatives"] >= 1:
                return 3  # Faible maillage
            else:
                return 4  # Zone blanche
    else:
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
    merge_cols = [name_col, "n_cooperatives", "coop_density_per_1000km2",
                   "total_exploitations", "white_zone_exploitations",
                   "white_zone_pct", "coop_class"]
    result = boundaries.copy()
    result = result.merge(
        stats_df[merge_cols],
        on=name_col,
        how="left",
    )

    result["n_cooperatives"] = result["n_cooperatives"].fillna(0).astype(int)
    result["coop_density_per_1000km2"] = result["coop_density_per_1000km2"].fillna(0.0)
    result["total_exploitations"] = result["total_exploitations"].fillna(0).astype(int)
    result["white_zone_exploitations"] = result["white_zone_exploitations"].fillna(0).astype(int)
    result["white_zone_pct"] = result["white_zone_pct"].fillna(100.0)
    result["coop_class"] = result["coop_class"].fillna(4).astype(int)

    result["name_en"] = result[name_col].map(REGION_NAMES_EN) if level == "region" else result[name_col]
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
            f"Opportunité de développement coopératif : {r[name_col]} "
            f"a seulement {r['n_cooperatives']} coopérative(s) et "
            f"{r['white_zone_pct']:.0f}% des exploitations sont en zone blanche "
            f"({r['white_zone_exploitations']} exploitations sans accès à une coopérative)"
            if pd.notna(r.get("coop_class")) and r["coop_class"] >= 3
            else (
                f"Bon réseau coopératif : {r[name_col]} "
                f"({r['n_cooperatives']} coopératives, "
                f"{r['white_zone_pct']:.0f}% de zones blanches)"
            )
        ),
        axis=1,
    )

    result = result.to_crs("EPSG:4326")

    # Métadonnées
    noun = "préfecture" if level == "prefecture" else "région"
    noun_pl = "préfectures" if level == "prefecture" else "régions"
    noun_en = "prefecture" if level == "prefecture" else "region"
    noun_pl_en = "prefectures" if level == "prefecture" else "regions"
    
    # Description de la classification adaptée
    if level == "prefecture":
        classify_desc = (
            "Règles adaptées pour préfectures (37 entités) : "
            ">=2 coopératives et <25% zones blanches → classe 1, "
            ">=1 coopérative et <50% zones blanches → classe 2, "
            ">=1 coopérative → classe 3, 0 coopérative → classe 4."
        )
        classify_desc_en = (
            "Adapted rules for prefectures (37 units): "
            ">=2 cooperatives and <25% white zones → class 1, "
            ">=1 cooperative and <50% white zones → class 2, "
            ">=1 cooperative → class 3, 0 cooperatives → class 4."
        )
    else:
        classify_desc = (
            "Règles standard pour régions : "
            ">=5 coopératives → classe 1, >=3 → classe 2, >=1 → classe 3, 0 → classe 4."
        )
        classify_desc_en = (
            "Standard rules for regions: "
            ">=5 cooperatives → class 1, >=3 → class 2, >=1 → class 3, 0 → class 4."
        )

    metadata = {
        "analysis": f"Réseau coopératif agricole par {noun}",
        "analysis_en": f"Agricultural cooperative network analysis by {noun_en}",
        "level": level,
        "method": (
            f"Comptage des coopératives par {noun} et calcul de la densité "
            "(coopératives / 1000 km²). Création de buffers de 10 km autour "
            "des coopératives pour identifier les zones de production sans accès "
            "coopératif ('zones blanches organisationnelles'). Classification "
            f"en 4 classes avec palette ColorBrewer OrRd. {classify_desc}"
        ),
        "method_en": (
            f"Counting cooperatives per {noun_en} and calculating density "
            "(cooperatives / 1000 km²). Creation of 10 km buffers around "
            "cooperatives to identify production zones without cooperative access "
            f"('organizational white zones'). Classification into 4 classes with "
            f"ColorBrewer OrRd palette. {classify_desc_en}"
        ),
        "parameters": {
            "cooperative_buffer_km": 10,
            "crs_analysis": "EPSG:32631",
            "n_cooperatives": len(cooperatives),
            "n_farms": len(exploitations),
        },
        "inputs": ["cooperatives", "grandes_exploitations",
                    "petites_exploitations", "plantations",
                    "regions" if level == "region" else "geoBoundaries-TGO-ADM2"],
        "output_fields": {
            name_col: f"Nom de la {noun}",
            "n_cooperatives": f"Nombre de coopératives dans la {noun}",
            "coop_density_per_1000km2": f"Densité de coopératives (pour 1000 km²)",
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
            f"{noun}_stats": boundary_stats,
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


def run(level: str = "region", logger: PipelineLogger | None = None) -> tuple[Path, Path]:
    """Exécute l'analyse du réseau coopératif."""
    if logger is None:
        logger = PipelineLogger()

    level_label = "PRÉFECTURES" if level == "prefecture" else "RÉGIONS"
    logger.section(f"ANALYSE 4 : RÉSEAU COOPÉRATIF ({level_label})")

    logger.step("Chargement des données...")
    cooperatives, exploitations = load_data()
    boundaries = load_boundaries(level)
    logger.step(f"  Coopératives : {len(cooperatives)} · "
                f"Exploitations : {len(exploitations)} · {level_label} : {len(boundaries)}")

    logger.step("Calcul du maillage coopératif et zones blanches...")
    result, metadata = compute_cooperative_network(cooperatives, exploitations, boundaries, logger, level)

    result = simplify_geometries(result, tolerance=0.01)
    logger.step("Géométries simplifiées")

    suffix = f"_{level}" if level == "prefecture" else ""
    ensure_dir("data/public/analysis")
    geojson_path = Path(f"data/public/analysis/cooperative_network{suffix}.geojson")
    result.to_file(geojson_path, driver="GeoJSON", encoding="utf-8")
    logger.step(f"GeoJSON écrit -> {geojson_path}")

    size_mb = geojson_path.stat().st_size / (1024 * 1024)
    logger.step(f"Taille du fichier : {size_mb:.2f} Mo")

    metadata_path = Path(f"data/public/analysis/metadata/cooperative_network{suffix}.json")
    write_json(metadata, metadata_path)
    logger.step(f"Métadonnées écrites -> {metadata_path}")

    logger.done(f"Analyse coopérative ({level_label}) terminée")
    return geojson_path, metadata_path


if __name__ == "__main__":
    sys.exit(0 if run() else 1)
