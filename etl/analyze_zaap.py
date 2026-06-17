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
    """Charge les données ZAAP et zones de production."""
    zaap_path = "data/processed/zaap_formes.geojson"
    plantations_path = "data/processed/plantations.geojson"
    champs_path = "data/processed/zaap_champs.geojson"

    zaap = gpd.read_file(zaap_path) if Path(zaap_path).exists() else gpd.GeoDataFrame()
    plantations = gpd.read_file(plantations_path) if Path(plantations_path).exists() else gpd.GeoDataFrame()
    champs = gpd.read_file(champs_path) if Path(champs_path).exists() else gpd.GeoDataFrame()

    return zaap, plantations, champs


def compute_zaap_coverage(
    zaap: gpd.GeoDataFrame,
    plantations: gpd.GeoDataFrame,
    champs: gpd.GeoDataFrame,
    boundaries: gpd.GeoDataFrame,
    logger: PipelineLogger,
    level: str = "region",
) -> tuple[gpd.GeoDataFrame, dict[str, Any]]:
    """
    Analyse la couverture ZAAP : buffer 5 km autour des ZAAP,
    identifie les zones de production non couvertes.
    """
    name_col = "nom_region" if level == "region" else "nom_prefecture"
    
    # S'assurer du CRS
    for gdf in [zaap, plantations, champs, boundaries]:
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
        result = boundaries.copy()
        if not result.empty:
            result["coverage_class"] = 4
            result["coverage_pct"] = 0.0
            result["total_zones"] = 0
            result["covered_zones"] = 0
            result["uncovered_zones"] = 0
            result["color"] = ZAAP_COVERAGE_CLASSES[3]["color"]
            result["name_en"] = result[name_col].map(REGION_NAMES_EN) if level == "region" else result[name_col]
        return result, {
            "analysis": "Couverture ZAAP",
            "analysis_en": "ZAAP coverage analysis",
            "level": level,
            "inputs": ["zaap_formes", "plantations", "zaap_champs",
                       "regions" if level == "region" else "geoBoundaries-TGO-ADM2"],
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
            "interpretation_note": (
                "Les zones de production non couvertes par des ZAAP représentent "
                "des opportunités d'investissement prioritaires pour l'aménagement "
                "de nouvelles Zones d'Aménagement Agricole Planifiées."
            ),
            "warning": "Aucune zone de production disponible",
        }

    production = pd.concat(production_zones, ignore_index=True)

    # ── Créer les buffers de 5 km autour des ZAAP ──────────────────
    if zaap.empty:
        logger.step("Aucune ZAAP trouvée", "!!")
        zaap_buffers = gpd.GeoSeries()
    else:
        zaap_utm = zaap.to_crs("EPSG:32631")
        production_utm = production.to_crs("EPSG:32631")
        boundaries_utm = boundaries.to_crs("EPSG:32631")

        buffer_5km = zaap_utm.geometry.buffer(5000)
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

        if not production_utm.empty:
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

        # ── Taux de couverture par unité administrative ──────────────
        boundary_stats = []
        for _, boundary in boundaries_utm.iterrows():
            boundary_name = boundary.get(name_col, "Inconnu")
            boundary_geom = boundary.geometry

            production_in_boundary = production_utm[production_utm.intersects(boundary_geom)]
            if production_in_boundary.empty:
                boundary_stats.append({
                    name_col: boundary_name,
                    "total_zones": 0,
                    "covered_zones": 0,
                    "uncovered_zones": 0,
                    "coverage_pct": 0.0,
                })
                continue

            covered_in_boundary = covered[covered.intersects(boundary_geom)]
            uncovered_in_boundary = uncovered[uncovered.intersects(boundary_geom)]

            total = len(production_in_boundary)
            n_covered = len(covered_in_boundary)
            n_uncovered = len(uncovered_in_boundary)
            coverage_pct = round(n_covered / total * 100, 1) if total > 0 else 0.0

            boundary_stats.append({
                name_col: boundary_name,
                "total_zones": total,
                "covered_zones": n_covered,
                "uncovered_zones": n_uncovered,
                "coverage_pct": coverage_pct,
            })

        stats_df = pd.DataFrame(boundary_stats)

        # ── Classification selon le taux de couverture ───────────────
        def classify_coverage(pct: float) -> int:
            if pct >= 75:
                return 1
            elif pct >= 50:
                return 2
            elif pct >= 25:
                return 3
            else:
                return 4

        stats_df["coverage_class"] = stats_df["coverage_pct"].apply(classify_coverage)

        # ── Construction du résultat ──────────────────────────────────
        merge_cols = [name_col, "coverage_pct", "coverage_class",
                       "total_zones", "covered_zones", "uncovered_zones"]
        result = boundaries.copy()
        result = result.merge(
            stats_df[merge_cols],
            on=name_col,
            how="left",
        )

        result["coverage_pct"] = result["coverage_pct"].fillna(0.0)
        result["coverage_class"] = result["coverage_class"].fillna(4).astype(int)
        result["total_zones"] = result["total_zones"].fillna(0).astype(int)
        result["covered_zones"] = result["covered_zones"].fillna(0).astype(int)
        result["uncovered_zones"] = result["uncovered_zones"].fillna(0).astype(int)

        result["name_en"] = result[name_col].map(REGION_NAMES_EN) if level == "region" else result[name_col]
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

        result["interpretation"] = result.apply(
            lambda r: (
                f"Opportunité d'investissement ZAAP : {r[name_col]} "
                f"n'a que {r['coverage_pct']:.0f}% de ses zones de production couvertes "
                f"({r['uncovered_zones']} zones non couvertes sur {r['total_zones']})"
                if pd.notna(r.get("coverage_class")) and r["coverage_class"] >= 3
                else (
                    f"Bonne couverture ZAAP : {r[name_col]} "
                    f"({r['coverage_pct']:.0f}% des zones couvertes)"
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
        metadata = {
            "analysis": "Couverture ZAAP",
            "analysis_en": "ZAAP coverage analysis",
            "level": level,
            "method": (
                "Buffer de 5 km autour des périmètres ZAAP (ZAAP formelles). "
                "Identification des zones de production (plantations + champs ZAAP) "
                f"situées hors de ces buffers. Classification des {noun_pl} selon le "
                "taux de couverture en 4 classes avec palette ColorBrewer Greens."
            ),
            "method_en": (
                "5 km buffer around ZAAP perimeters. "
                "Identification of production zones (plantations + ZAAP fields) "
                f"located outside these buffers. Classification of {noun_pl_en} by "
                "coverage rate into 4 classes with ColorBrewer Greens palette."
            ),
            "parameters": {
                "buffer_radius_km": 5,
                "crs_analysis": "EPSG:32631",
                "n_zaap": len(zaap),
                "n_production_zones": len(production),
            },
            "inputs": ["zaap_formes", "plantations", "zaap_champs",
                       "regions" if level == "region" else "geoBoundaries-TGO-ADM2"],
            "output_fields": {
                name_col: f"Nom de la {noun}",
                "coverage_pct": f"Taux de couverture ZAAP par {noun} (%)",
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
                f"{noun}_stats": boundary_stats,
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

        return result, metadata


def simplify_geometries(gdf: gpd.GeoDataFrame, tolerance: float = 0.01) -> gpd.GeoDataFrame:
    """Simplifie les géométries."""
    gdf = gdf.copy()
    gdf["geometry"] = gdf["geometry"].simplify(tolerance, preserve_topology=True)
    return gdf


def run(level: str = "region", logger: PipelineLogger | None = None) -> tuple[Path, Path]:
    """Exécute l'analyse de couverture ZAAP."""
    if logger is None:
        logger = PipelineLogger()

    level_label = "PRÉFECTURES" if level == "prefecture" else "RÉGIONS"
    logger.section(f"ANALYSE 2 : COUVERTURE ZAAP ({level_label})")

    logger.step("Chargement des données...")
    zaap, plantations, champs = load_data()
    boundaries = load_boundaries(level)
    logger.step(f"  ZAAP : {len(zaap)} · Plantations : {len(plantations)} · "
                f"Champs : {len(champs)} · {level_label} : {len(boundaries)}")

    logger.step("Calcul des buffers 5 km et des zones non couvertes...")
    result, metadata = compute_zaap_coverage(zaap, plantations, champs, boundaries, logger, level)

    result = simplify_geometries(result, tolerance=0.01)
    logger.step("Géométries simplifiées")

    suffix = f"_{level}" if level == "prefecture" else ""
    ensure_dir("data/public/analysis")
    geojson_path = Path(f"data/public/analysis/zaap_coverage{suffix}.geojson")
    result.to_file(geojson_path, driver="GeoJSON", encoding="utf-8")
    logger.step(f"GeoJSON écrit -> {geojson_path}")

    size_mb = geojson_path.stat().st_size / (1024 * 1024)
    logger.step(f"Taille du fichier : {size_mb:.2f} Mo")

    metadata_path = Path(f"data/public/analysis/metadata/zaap_coverage{suffix}.json")
    write_json(metadata, metadata_path)
    logger.step(f"Métadonnées écrites -> {metadata_path}")

    logger.done(f"Analyse ZAAP ({level_label}) terminée")
    return geojson_path, metadata_path


if __name__ == "__main__":
    sys.exit(0 if run() else 1)
