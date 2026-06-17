#!/usr/bin/env python3
"""
AgriMap Togo — Analyse M2 : Accessibilité aux marchés et pépinières.

Méthode
-------
1. Charger les points de service : marchés (50) et pépinières (40)
2. Créer des buffers :
   - 10 km autour des marchés (rayon d'accès raisonnable en zone rurale)
   - 15 km autour des pépinières (déplacement plus long pour les intrants)
3. Fusionner les buffers pour former la zone de couverture des services
4. Zones de production (exploitations) hors buffer = « mal desservies »
5. Indicateur composite par région basé sur le % de zones mal desservies
6. Palette ColorBrewer BuPu (5 classes)

Palette ColorBrewer BuPu (5 classes, colorblind-safe) :
  1. #E0ECF4  (très bien desservi)
  2. #BFD3E6  (bien desservi)
  3. #9EBCDA  (desserte moyenne)
  4. #8C6BB1  (mal desservi)
  5. #88419D  (très mal desservi / prioritaire)

Constructive tone : zones mal desservies = opportunités pour nouveaux
marchés/pépinières.

Output : data/public/analysis/accessibility.geojson
         data/public/analysis/metadata/accessibility.json
"""

import sys
from pathlib import Path
from typing import Any

import geopandas as gpd
import pandas as pd
from shapely.geometry import Polygon

from etl.config import REGIONS
from etl.utils.io import PipelineLogger, ensure_dir, write_json

# ── Palette ColorBrewer BuPu (5 classes) ───────────────────────────
ACCESS_CLASSES = [
    {"class": 1, "color": "#E0ECF4", "label": "Très bien desservi", "label_en": "Very well served"},
    {"class": 2, "color": "#BFD3E6", "label": "Bien desservi", "label_en": "Well served"},
    {"class": 3, "color": "#9EBCDA", "label": "Desserte moyenne", "label_en": "Moderate service"},
    {"class": 4, "color": "#8C6BB1", "label": "Mal desservi - Opportunité", "label_en": "Underserved - Opportunity"},
    {"class": 5, "color": "#88419D", "label": "Très mal desservi - Prioritaire", "label_en": "Severely underserved - Priority"},
]

REGION_NAMES_EN = {
    "Maritime": "Maritime",
    "Plateaux": "Plateaux",
    "Centrale": "Centrale",
    "Kara": "Kara",
    "Savanes": "Savanes",
}


def load_data():
    """Charge les données nécessaires."""
    marches_path = "data/processed/marches.geojson"
    pepinieres_path = "data/processed/pepinieres.geojson"
    exploitations_paths = [
        "data/processed/grandes_exploitations.geojson",
        "data/processed/petites_exploitations.geojson",
        "data/processed/plantations.geojson",
    ]
    regions_path = "data/processed/regions.geojson"

    marches = gpd.read_file(marches_path) if Path(marches_path).exists() else gpd.GeoDataFrame()
    pepinieres = gpd.read_file(pepinieres_path) if Path(pepinieres_path).exists() else gpd.GeoDataFrame()

    expls = []
    for p in exploitations_paths:
        if Path(p).exists():
            expls.append(gpd.read_file(p))
    exploitations = pd.concat(expls, ignore_index=True) if expls else gpd.GeoDataFrame()

    regions = gpd.read_file(regions_path) if Path(regions_path).exists() else gpd.GeoDataFrame()

    return marches, pepinieres, exploitations, regions


def compute_accessibility(
    marches: gpd.GeoDataFrame,
    pepinieres: gpd.GeoDataFrame,
    exploitations: gpd.GeoDataFrame,
    regions: gpd.GeoDataFrame,
    logger: PipelineLogger,
) -> tuple[gpd.GeoDataFrame, dict[str, Any]]:
    """
    Analyse l'accessibilité : buffers marchés (10 km) + pépinières (15 km),
    identifie les zones de production mal desservies.
    """
    # CRS
    for gdf in [marches, pepinieres, exploitations, regions]:
        if not gdf.empty and gdf.crs is None:
            gdf.set_crs("EPSG:4326", inplace=True)

    # Vérifier disponibilité
    if marches.empty and pepinieres.empty:
        logger.step("Aucun point de service disponible", "!!")
        result = regions.copy()
        if not result.empty:
            result["accessibility_class"] = 4
            result["accessibility_score"] = 0.0
        return result, {"analysis": "Accessibilité", "warning": "Aucun service disponible"}

    # Reprojeter en UTM pour buffers en mètres
    marches_utm = marches.to_crs("EPSG:32631") if not marches.empty else gpd.GeoDataFrame()
    pepinieres_utm = pepinieres.to_crs("EPSG:32631") if not pepinieres.empty else gpd.GeoDataFrame()
    exploitations_utm = exploitations.to_crs("EPSG:32631") if not exploitations.empty else gpd.GeoDataFrame()
    regions_utm = regions.to_crs("EPSG:32631")

    # ── Buffers combinés ─────────────────────────────────────────────
    buffers = []
    if not marches_utm.empty:
        # 10 km autour des marchés
        marches_buf = marches_utm.geometry.buffer(10000)
        buffers.append(marches_buf)
    if not pepinieres_utm.empty:
        # 15 km autour des pépinières
        pep_buf = pepinieres_utm.geometry.buffer(15000)
        buffers.append(pep_buf)

    if not buffers:
        logger.step("Aucun buffer généré", "!!")
        result = regions.copy()
        result["accessibility_class"] = 5
        result["accessibility_score"] = 0.0
        return result, {"analysis": "Accessibilité", "warning": "Aucun buffer"}

    all_buffers = pd.concat(
        [gpd.GeoDataFrame([{"geometry": b}], crs="EPSG:32631") for buf_series in buffers for b in buf_series],
        ignore_index=True,
    ) if len(buffers) > 1 else gpd.GeoDataFrame(
        [{"geometry": b} for b in buffers[0]], crs="EPSG:32631"
    )

    # Buffer unifié
    merged_service = all_buffers.geometry.unary_union
    service_gdf = gpd.GeoDataFrame(
        [{"geometry": merged_service, "type": "service_area"}],
        crs="EPSG:32631",
    )

    # ── Zones de production mal desservies ────────────────────────────
    if not exploitations_utm.empty:
        served_idx = gpd.sjoin(
            exploitations_utm,
            service_gdf,
            how="inner",
            predicate="intersects",
        ).index.unique()

        all_idx = exploitations_utm.index
        unserved_idx = all_idx.difference(served_idx)
        unserved = exploitations_utm.loc[unserved_idx].copy() if len(unserved_idx) > 0 else gpd.GeoDataFrame()
        served = exploitations_utm.loc[served_idx].copy() if len(served_idx) > 0 else gpd.GeoDataFrame()
    else:
        unserved = gpd.GeoDataFrame()
        served = gpd.GeoDataFrame()

    # ── Indicateur composite par région ──────────────────────────────
    region_stats = []
    for _, region in regions_utm.iterrows():
        region_name = region.get("nom_region", "Inconnu")
        region_geom = region.geometry

        exploitations_in_region = exploitations_utm[exploitations_utm.intersects(region_geom)]
        if exploitations_in_region.empty:
            region_stats.append({
                "nom_region": region_name,
                "total_exploitations": 0,
                "served": 0,
                "unserved": 0,
                "unserved_pct": 0.0,
                "avg_distance_km": 0.0,
            })
            continue

        served_in_region = served[served.intersects(region_geom)] if not served.empty else gpd.GeoDataFrame()
        unserved_in_region = unserved[unserved.intersects(region_geom)] if not unserved.empty else gpd.GeoDataFrame()

        total = len(exploitations_in_region)
        n_served = len(served_in_region)
        n_unserved = len(unserved_in_region)
        unserved_pct = round(n_unserved / total * 100, 1) if total > 0 else 0.0

        # Distance moyenne réelle au marché le plus proche (en km, UTM EPSG:32631)
        if not marches_utm.empty and not exploitations_in_region.empty:
            market_geoms = list(marches_utm.geometry)
            distances_m: list[float] = []
            for expl_geom in exploitations_in_region.geometry:
                min_dist = min(expl_geom.distance(m) for m in market_geoms)
                distances_m.append(min_dist)
            avg_distance_km = round(sum(distances_m) / len(distances_m) / 1000, 2)
        else:
            avg_distance_km = 0.0

        region_stats.append({
            "nom_region": region_name,
            "total_exploitations": total,
            "served": n_served,
            "unserved": n_unserved,
            "unserved_pct": unserved_pct,
            "avg_distance_km": avg_distance_km,
        })

    stats_df = pd.DataFrame(region_stats)

    # ── Score d'accessibilité (0-100, 100 = parfait) ────────────────
    # Formule : 100 - (% mal desservi), puis normalisé
    max_unserved = stats_df["unserved_pct"].max()
    min_unserved = stats_df["unserved_pct"].min()
    range_unserved = max_unserved - min_unserved if max_unserved != min_unserved else 1

    stats_df["accessibility_score"] = stats_df["unserved_pct"].apply(
        lambda pct: round(100 * (1 - pct / 100), 1)
    )

    # Classification (5 classes basées sur le score)
    def classify_access(score: float) -> int:
        if score >= 80:
            return 1
        elif score >= 60:
            return 2
        elif score >= 40:
            return 3
        elif score >= 20:
            return 4
        else:
            return 5

    stats_df["accessibility_class"] = stats_df["accessibility_score"].apply(classify_access)

    # ── Construction du résultat ──────────────────────────────────────
    result = regions.copy()
    result = result.merge(
        stats_df[["nom_region", "accessibility_score", "accessibility_class",
                   "total_exploitations", "served", "unserved", "unserved_pct",
                   "avg_distance_km"]],
        on="nom_region",
        how="left",
    )

    result["accessibility_score"] = result["accessibility_score"].fillna(50.0)
    result["accessibility_class"] = result["accessibility_class"].fillna(3).astype(int)
    result["total_exploitations"] = result["total_exploitations"].fillna(0).astype(int)
    result["served"] = result["served"].fillna(0).astype(int)
    result["unserved"] = result["unserved"].fillna(0).astype(int)
    result["unserved_pct"] = result["unserved_pct"].fillna(0.0)
    result["avg_distance_km"] = result["avg_distance_km"].fillna(0.0)

    result["name_en"] = result["nom_region"].map(REGION_NAMES_EN)
    result["color"] = result["accessibility_class"].apply(
        lambda c: ACCESS_CLASSES[c - 1]["color"] if 1 <= c <= 5 else "#CCCCCC"
    )
    result["accessibility_label"] = result["accessibility_class"].apply(
        lambda c: ACCESS_CLASSES[c - 1]["label"] if 1 <= c <= 5 else ""
    )
    result["accessibility_label_en"] = result["accessibility_class"].apply(
        lambda c: ACCESS_CLASSES[c - 1]["label_en"] if 1 <= c <= 5 else ""
    )

    result["interpretation"] = result.apply(
        lambda r: (
            f"Opportunité d'investissement : {r['nom_region']} est mal desservi "
            f"(score {r['accessibility_score']:.0f}/100, {r['unserved_pct']:.0f}% "
            f"des exploitations hors des buffers marchés/pépinières)"
            if r["accessibility_class"] >= 4
            else (
                f"Accessibilité modérée : {r['nom_region']} "
                f"(score {r['accessibility_score']:.0f}/100)"
                if r["accessibility_class"] == 3
                else (
                    f"Bonne accessibilité : {r['nom_region']} "
                    f"(score {r['accessibility_score']:.0f}/100)"
                )
            )
        ),
        axis=1,
    )

    # Convertir en 4326
    result = result.to_crs("EPSG:4326")

    # Métadonnées
    metadata = {
        "analysis": "Accessibilité aux marchés et pépinières",
        "analysis_en": "Accessibility to markets and nurseries",
        "method": (
            "Création de buffers autour des marchés (10 km) et pépinières (15 km). "
            "Identification des exploitations situées hors de ces buffers = 'mal desservies'. "
            "Calcul d'un score d'accessibilité par région (0-100) basé sur le pourcentage "
            "d'exploitations mal desservies. Classification en 5 classes avec palette "
            "ColorBrewer BuPu."
        ),
        "method_en": (
            "Creation of buffers around markets (10 km) and nurseries (15 km). "
            "Identification of farms located outside these buffers = 'underserved'. "
            "Calculation of an accessibility score per region (0-100) based on the "
            "percentage of underserved farms. Classification into 5 classes with "
            "ColorBrewer BuPu palette."
        ),
        "parameters": {
            "market_buffer_km": 10,
            "nursery_buffer_km": 15,
            "crs_analysis": "EPSG:32631",
            "n_markets": len(marches),
            "n_nurseries": len(pepinieres),
            "n_farms": len(exploitations),
        },
        "inputs": ["marches", "pepinieres", "grandes_exploitations",
                    "petites_exploitations", "plantations", "regions"],
        "output_fields": {
            "accessibility_score": "Score d'accessibilité (0-100, 100 = parfait)",
            "accessibility_class": "Classe d'accessibilité (1-5)",
            "unserved_pct": "Pourcentage d'exploitations mal desservies",
            "color": "Couleur hexadécimale (palette BuPu)",
        },
        "palette": {
            "name": "BuPu",
            "type": "Séquentielle",
            "colorblind_safe": True,
            "classes": [
                {
                    "class": c["class"],
                    "color": c["color"],
                    "label": c["label"],
                    "label_en": c["label_en"],
                }
                for c in ACCESS_CLASSES
            ],
        },
        "statistics": {
            "n_markets": len(marches),
            "n_nurseries": len(pepinieres),
            "n_farms": len(exploitations),
            "region_stats": region_stats,
        },
        "interpretation_note": (
            "Les régions avec un score d'accessibilité faible (< 40) représentent "
            "des opportunités prioritaires pour l'implantation de nouveaux marchés "
            "et pépinières agricoles, afin de réduire les distances d'accès aux "
            "intrants et aux débouchés commerciaux."
        ),
        "interpretation_note_en": (
            "Regions with low accessibility scores (< 40) represent priority "
            "opportunities for establishing new markets and agricultural nurseries, "
            "reducing travel distances to inputs and market outlets."
        ),
    }

    return result, metadata


def simplify_geometries(gdf: gpd.GeoDataFrame, tolerance: float = 0.01) -> gpd.GeoDataFrame:
    """Simplifie les géométries."""
    gdf = gdf.copy()
    gdf["geometry"] = gdf["geometry"].simplify(tolerance, preserve_topology=True)
    return gdf


def run(logger: PipelineLogger | None = None) -> tuple[Path, Path]:
    """Exécute l'analyse d'accessibilité."""
    if logger is None:
        logger = PipelineLogger()

    logger.section("ANALYSE 3 : ACCESSIBILITÉ MARCHÉS / PÉPINIÈRES")

    logger.step("Chargement des données...")
    marches, pepinieres, exploitations, regions = load_data()
    logger.step(f"  Marchés : {len(marches)} · Pépinières : {len(pepinieres)} · "
                f"Exploitations : {len(exploitations)} · Régions : {len(regions)}")

    logger.step("Calcul des buffers et identification zones mal desservies...")
    result, metadata = compute_accessibility(marches, pepinieres, exploitations, regions, logger)

    result = simplify_geometries(result, tolerance=0.01)
    logger.step("Géométries simplifiées")

    ensure_dir("data/public/analysis")
    geojson_path = Path("data/public/analysis/accessibility.geojson")
    result.to_file(geojson_path, driver="GeoJSON", encoding="utf-8")
    logger.step(f"GeoJSON écrit -> {geojson_path}")

    size_mb = geojson_path.stat().st_size / (1024 * 1024)
    logger.step(f"Taille du fichier : {size_mb:.2f} Mo")

    metadata_path = Path("data/public/analysis/metadata/accessibility.json")
    write_json(metadata, metadata_path)
    logger.step(f"Métadonnées écrites -> {metadata_path}")

    logger.done("Analyse d'accessibilité terminée")
    return geojson_path, metadata_path


if __name__ == "__main__":
    sys.exit(0 if run() else 1)
