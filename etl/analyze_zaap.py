#!/usr/bin/env python3
"""
AgriMap Togo — Analyse M2 : Couverture ZAAP.

Méthode
-------
1. Charger les ZAAP (zaap_formes) et les zones de production (plantations + zaap_champs)
2. Créer un buffer de 5 km autour des ZAAP (rayon de couverture raisonnable)
3. Fusionner les buffers pour former la zone de couverture
4. Identifier les zones de production hors buffer = « non couvertes »
5. Calculer le taux de couverture par région
6. Produire un GeoJSON avec palette ColorBrewer Greens (4 classes)

Palette ColorBrewer Greens (4 classes, colorblind-safe) :
  1. #E5F5E0  (bien couvert)
  2. #A1D99B  (couvert)
  3. #41B27C  (faible couverture)
  4. #005A32  (non couvert / prioritaire)

Constructive tone : zones non couvertes = opportunités d'investissement ZAAP.

Output : data/public/analysis/zaap_coverage.geojson
         data/public/analysis/metadata/zaap_coverage.json
"""

import sys
from pathlib import Path
from typing import Any

import geopandas as gpd
import pandas as pd
from shapely.geometry import Polygon

from etl.config import REGIONS
from etl.utils.io import PipelineLogger, ensure_dir, write_json

# ── Palette ColorBrewer Greens (4 classes) ──────────────────────────
ZAAP_COVERAGE_CLASSES = [
    {"class": 1, "color": "#E5F5E0", "label": "Bien couvert", "label_en": "Well covered"},
    {"class": 2, "color": "#A1D99B", "label": "Couverture partielle", "label_en": "Partial coverage"},
    {"class": 3, "color": "#41B27C", "label": "Faible couverture", "label_en": "Low coverage"},
    {"class": 4, "color": "#005A32", "label": "Non couvert - Prioritaire", "label_en": "Uncovered - Priority"},
]

REGION_NAMES_EN = {
    "Maritime": "Maritime",
    "Plateaux": "Plateaux",
    "Centrale": "Centrale",
    "Kara": "Kara",
    "Savanes": "Savanes",
}


def load_data():
    """Charge les données ZAAP et zones de production."""
    zaap_path = "data/processed/zaap_formes.geojson"
    plantations_path = "data/processed/plantations.geojson"
    champs_path = "data/processed/zaap_champs.geojson"
    regions_path = "data/processed/regions.geojson"

    zaap = gpd.read_file(zaap_path) if Path(zaap_path).exists() else gpd.GeoDataFrame()
    plantations = gpd.read_file(plantations_path) if Path(plantations_path).exists() else gpd.GeoDataFrame()
    champs = gpd.read_file(champs_path) if Path(champs_path).exists() else gpd.GeoDataFrame()
    regions = gpd.read_file(regions_path) if Path(regions_path).exists() else gpd.GeoDataFrame()

    return zaap, plantations, champs, regions


def compute_zaap_coverage(
    zaap: gpd.GeoDataFrame,
    plantations: gpd.GeoDataFrame,
    champs: gpd.GeoDataFrame,
    regions: gpd.GeoDataFrame,
    logger: PipelineLogger,
) -> tuple[gpd.GeoDataFrame, dict[str, Any]]:
    """
    Analyse la couverture ZAAP : buffer 5 km autour des ZAAP,
    identifie les zones de production non couvertes.
    """
    # S'assurer du CRS
    for gdf in [zaap, plantations, champs, regions]:
        if not gdf.empty and gdf.crs is None:
            gdf.set_crs("EPSG:4326", inplace=True)

    # Zones de production = plantations + champs ZAAP
    production_zones = []
    if not plantations.empty:
        production_zones.append(plantations)
    if not champs.empty:
        production_zones.append(champs)

    if not production_zones:
        logger.step("Aucune zone de production trouvée", "!!")
        # Créer un résultat vide
        result = regions.copy()
        if not result.empty:
            result["zaap_coverage_class"] = 0
            result["zaap_coverage_pct"] = 0.0
            result["color"] = "#CCCCCC"
        return result, {
            "analysis": "Couverture ZAAP",
            "analysis_en": "ZAAP coverage analysis",
            "warning": "Aucune zone de production disponible",
        }

    production = pd.concat(production_zones, ignore_index=True)

    # ── Créer les buffers de 5 km autour des ZAAP ──────────────────
    if zaap.empty:
        logger.step("Aucune ZAAP trouvée", "!!")
        zaap_buffers = gpd.GeoSeries()
    else:
        # Reprojeter en EPSG:32631 (UTM) pour buffers en mètres
        zaap_utm = zaap.to_crs("EPSG:32631")
        production_utm = production.to_crs("EPSG:32631")
        regions_utm = regions.to_crs("EPSG:32631")

        # Buffer de 5 km
        buffer_5km = zaap_utm.geometry.buffer(5000)
        # Fusionner les buffers
        if len(buffer_5km) > 0:
            merged_buffer = buffer_5km.unary_union
            buffer_gdf = gpd.GeoDataFrame(
                [{"geometry": merged_buffer, "type": "zaap_coverage"}],
                crs="EPSG:32631",
            )
        else:
            buffer_gdf = gpd.GeoDataFrame(
                [{"geometry": Polygon(), "type": "zaap_coverage"}],
                crs="EPSG:32631",
            )

        # ── Identifier les zones de production non couvertes ──────────
        # Points/polygones de production hors buffer
        # Utiliser une jointure spatiale inverse
        if not production_utm.empty:
            # Sélectionner les zones de production qui n'intersectent PAS le buffer
            covered_idx = gpd.sjoin(
                production_utm,
                buffer_gdf,
                how="inner",
                predicate="intersects",
            ).index.unique()

            all_idx = production_utm.index
            uncovered_idx = all_idx.difference(covered_idx)
            uncovered = production_utm.loc[uncovered_idx].copy()
            uncovered["status"] = "non_couvert"
            covered = production_utm.loc[covered_idx].copy()
            covered["status"] = "couvert"
        else:
            uncovered = gpd.GeoDataFrame()
            covered = gpd.GeoDataFrame()

        # ── Calculer le taux de couverture par région ────────────────
        region_stats = []
        for _, region in regions_utm.iterrows():
            region_name = region.get("nom_region", "Inconnu")
            region_geom = region.geometry

            # Intersecter les zones de production avec la région
            production_in_region = production_utm[production_utm.intersects(region_geom)]
            if production_in_region.empty:
                region_stats.append({
                    "nom_region": region_name,
                    "total_zones": 0,
                    "covered_zones": 0,
                    "uncovered_zones": 0,
                    "coverage_pct": 0.0,
                })
                continue

            # Zones couvertes dans cette région
            covered_in_region = covered[covered.intersects(region_geom)]
            uncovered_in_region = uncovered[uncovered.intersects(region_geom)]

            total = len(production_in_region)
            n_covered = len(covered_in_region)
            n_uncovered = len(uncovered_in_region)
            coverage_pct = round(n_covered / total * 100, 1) if total > 0 else 0.0

            region_stats.append({
                "nom_region": region_name,
                "total_zones": total,
                "covered_zones": n_covered,
                "uncovered_zones": n_uncovered,
                "coverage_pct": coverage_pct,
            })

        stats_df = pd.DataFrame(region_stats)

        # ── Classifier les régions selon le taux de couverture ───────
        def classify_coverage(pct: float) -> int:
            if pct >= 75:
                return 1  # Bien couvert
            elif pct >= 50:
                return 2  # Couverture partielle
            elif pct >= 25:
                return 3  # Faible couverture
            else:
                return 4  # Non couvert

        stats_df["coverage_class"] = stats_df["coverage_pct"].apply(classify_coverage)

        # ── Construire le GeoJSON de résultat ─────────────────────────
        result = regions.copy()
        result = result.merge(
            stats_df[["nom_region", "coverage_pct", "coverage_class",
                       "total_zones", "covered_zones", "uncovered_zones"]],
            on="nom_region",
            how="left",
        )

        # Remplir les valeurs manquantes
        result["coverage_pct"] = result["coverage_pct"].fillna(0.0)
        result["coverage_class"] = result["coverage_class"].fillna(4).astype(int)
        result["total_zones"] = result["total_zones"].fillna(0).astype(int)
        result["covered_zones"] = result["covered_zones"].fillna(0).astype(int)
        result["uncovered_zones"] = result["uncovered_zones"].fillna(0).astype(int)

        # Couleur et label
        result["name_en"] = result["nom_region"].map(REGION_NAMES_EN)
        result["color"] = result["coverage_class"].apply(
            lambda c: ZAAP_COVERAGE_CLASSES[c - 1]["color"]
            if 1 <= c <= 4 else "#CCCCCC"
        )
        result["zaap_label"] = result["coverage_class"].apply(
            lambda c: ZAAP_COVERAGE_CLASSES[c - 1]["label"]
            if 1 <= c <= 4 else ""
        )
        result["zaap_label_en"] = result["coverage_class"].apply(
            lambda c: ZAAP_COVERAGE_CLASSES[c - 1]["label_en"]
            if 1 <= c <= 4 else ""
        )

        # Interprétation constructive
        result["interpretation"] = result.apply(
            lambda r: (
                f"Opportunité d'investissement ZAAP : {r['nom_region']} "
                f"n'a que {r['coverage_pct']:.0f}% de ses zones de production couvertes "
                f"({r['uncovered_zones']} zones non couvertes sur {r['total_zones']})"
                if r["coverage_class"] >= 3
                else (
                    f"Bonne couverture ZAAP : {r['nom_region']} "
                    f"({r['coverage_pct']:.0f}% des zones couvertes)"
                )
            ),
            axis=1,
        )

        # Convertir en EPSG:4326 pour l'export
        result = result.to_crs("EPSG:4326")

        # Métadonnées
        metadata = {
            "analysis": "Couverture ZAAP",
            "analysis_en": "ZAAP coverage analysis",
            "method": (
                "Buffer de 5 km autour des périmètres ZAAP (ZAAP formelles). "
                "Identification des zones de production (plantations + champs ZAAP) "
                "situées hors de ces buffers. Classification des régions selon le "
                "taux de couverture en 4 classes avec palette ColorBrewer Greens."
            ),
            "method_en": (
                "5 km buffer around ZAAP perimeters. "
                "Identification of production zones (plantations + ZAAP fields) "
                "located outside these buffers. Classification of regions by "
                "coverage rate into 4 classes with ColorBrewer Greens palette."
            ),
            "parameters": {
                "buffer_radius_km": 5,
                "crs_analysis": "EPSG:32631",
                "n_zaap": len(zaap),
                "n_production_zones": len(production),
            },
            "inputs": ["zaap_formes", "plantations", "zaap_champs", "regions"],
            "output_fields": {
                "coverage_pct": "Taux de couverture ZAAP (%)",
                "coverage_class": "Classe de couverture (1-4)",
                "total_zones": "Nombre total de zones de production",
                "covered_zones": "Zones de production couvertes",
                "uncovered_zones": "Zones de production non couvertes",
                "color": "Couleur hexadécimale (palette Greens)",
            },
            "palette": {
                "name": "Greens",
                "type": "Séquentielle",
                "colorblind_safe": True,
                "classes": [
                    {
                        "class": c["class"],
                        "color": c["color"],
                        "label": c["label"],
                        "label_en": c["label_en"],
                    }
                    for c in ZAAP_COVERAGE_CLASSES
                ],
            },
            "statistics": {
                "total_zaap": len(zaap),
                "total_production_zones": len(production),
                "region_stats": region_stats,
            },
            "interpretation_note": (
                "Les zones de production non couvertes par des ZAAP représentent "
                "des opportunités d'investissement prioritaires pour l'aménagement "
                "de nouvelles Zones d'Aménagement Agricole Planifiées."
            ),
            "interpretation_note_en": (
                "Production zones not covered by ZAAPs represent priority investment "
                "opportunities for establishing new Planned Agricultural Development Zones."
            ),
        }

        # Reprojeter result en 4326 (déjà fait ci-dessus)
        return result, metadata


def simplify_geometries(gdf: gpd.GeoDataFrame, tolerance: float = 0.01) -> gpd.GeoDataFrame:
    """Simplifie les géométries."""
    gdf = gdf.copy()
    gdf["geometry"] = gdf["geometry"].simplify(tolerance, preserve_topology=True)
    return gdf


def run(logger: PipelineLogger | None = None) -> tuple[Path, Path]:
    """Exécute l'analyse de couverture ZAAP."""
    if logger is None:
        logger = PipelineLogger()

    logger.section("ANALYSE 2 : COUVERTURE ZAAP")

    logger.step("Chargement des données...")
    zaap, plantations, champs, regions = load_data()
    logger.step(f"  ZAAP : {len(zaap)} · Plantations : {len(plantations)} · "
                f"Champs : {len(champs)} · Régions : {len(regions)}")

    logger.step("Calcul des buffers 5 km et des zones non couvertes...")
    result, metadata = compute_zaap_coverage(zaap, plantations, champs, regions, logger)

    # Simplification
    result = simplify_geometries(result, tolerance=0.01)
    logger.step("Géométries simplifiées")

    # Export
    ensure_dir("data/public/analysis")
    geojson_path = Path("data/public/analysis/zaap_coverage.geojson")
    result.to_file(geojson_path, driver="GeoJSON", encoding="utf-8")
    logger.step(f"GeoJSON écrit -> {geojson_path}")

    size_mb = geojson_path.stat().st_size / (1024 * 1024)
    logger.step(f"Taille du fichier : {size_mb:.2f} Mo")

    metadata_path = Path("data/public/analysis/metadata/zaap_coverage.json")
    write_json(metadata, metadata_path)
    logger.step(f"Métadonnées écrites -> {metadata_path}")

    logger.done("Analyse ZAAP terminée")
    return geojson_path, metadata_path


if __name__ == "__main__":
    sys.exit(0 if run() else 1)
