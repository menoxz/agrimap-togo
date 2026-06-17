#!/usr/bin/env python3
"""
AgriMap Togo — Analyse M2 : Densité des exploitations agricoles.

Méthode
-------
1. Charger les exploitations (grandes, petites, plantations) et les régions
2. Compter le nombre d'exploitations par région (toutes confondues)
3. Normaliser par la surface de la région (exploitations / km²)
4. Classer en 5 classes selon la méthode Jenks (natural breaks)
5. Produire un GeoJSON choroplèthe par région avec palette ColorBrewer YlOrBr

Palette ColorBrewer YlOrBr (5 classes, colorblind-safe) :
  1. #FFFFB2  (très faible)
  2. #FECC5C  (faible)
  3. #FD8D3C  (moyenne)
  4. #F03B20  (élevée)
  5. #BD0026  (très élevée)

Constructive tone : les régions à faible densité = opportunités de développement
des services agricoles.

Output : data/public/analysis/density.geojson
         data/public/analysis/metadata/density.json
"""

import json
import sys
from pathlib import Path
from typing import Any

import geopandas as gpd
import pandas as pd

from etl.config import REGIONS
from etl.utils.io import PipelineLogger, ensure_dir, write_json

# ── Palette ColorBrewer YlOrBr (5 classes) ───────────────────────────
COLOR_CLASSES = [
    {"min": 0, "max": 0, "color": "#FFFFB2", "label": "Très faible", "label_en": "Very low"},
    {"min": 0, "max": 0, "color": "#FECC5C", "label": "Faible", "label_en": "Low"},
    {"min": 0, "max": 0, "color": "#FD8D3C", "label": "Moyenne", "label_en": "Moderate"},
    {"min": 0, "max": 0, "color": "#F03B20", "label": "Élevée", "label_en": "High"},
    {"min": 0, "max": 0, "color": "#BD0026", "label": "Très élevée", "label_en": "Very high"},
]

# ── Bilingual region names ─────────────────────────────────────────
REGION_NAMES_EN = {
    "Maritime": "Maritime",
    "Plateaux": "Plateaux",
    "Centrale": "Centrale",
    "Kara": "Kara",
    "Savanes": "Savanes",
}

# Fallback area from config if GeoJSON superficie_km2 is missing
REGION_AREA_KM2: dict[str, float] = {r["name"]: r["area_km2"] for r in REGIONS}


def load_exploitations() -> gpd.GeoDataFrame:
    """Charge et concatène les 3 datasets d'exploitations."""
    paths = [
        "data/processed/exploitations.geojson",
        "data/processed/grandes_exploitations.geojson",
        "data/processed/petites_exploitations.geojson",
        "data/processed/plantations.geojson",
    ]
    gdfs = []
    for p in paths:
        if Path(p).exists():
            gdf = gpd.read_file(p)
            if not gdf.empty:
                gdfs.append(gdf)
    if not gdfs:
        raise FileNotFoundError("Aucun fichier d'exploitations trouvé")
    return pd.concat(gdfs, ignore_index=True)


def load_regions() -> gpd.GeoDataFrame:
    """Charge le découpage administratif des régions."""
    path = "data/processed/regions.geojson"
    if not Path(path).exists():
        raise FileNotFoundError(f"Fichier régions introuvable : {path}")
    return gpd.read_file(path)


def compute_density(
    exploitations: gpd.GeoDataFrame,
    regions: gpd.GeoDataFrame,
    logger: PipelineLogger,
) -> tuple[gpd.GeoDataFrame, dict[str, Any]]:
    """
    Calcule la densité d'exploitations par région.
    
    Retourne le GeoDataFrame des régions avec les champs de densité,
    et les métadonnées de l'analyse.
    """
    # S'assurer que les CRS sont alignés
    if exploitations.crs is None:
        exploitations = exploitations.set_crs("EPSG:4326")
    if regions.crs is None:
        regions = regions.set_crs("EPSG:4326")

    # Compter les exploitations par région
    # On utilise une jointure spatiale pour associer chaque exploitation à sa région
    # (les données ont déjà un champ 'region', mais la jointure spatiale est plus robuste)
    joined = gpd.sjoin(exploitations, regions, how="left", predicate="within")

    # Fallback : si la jointure spatiale échoue, utiliser le champ 'region'
    region_col = None
    if "region_left" in joined.columns:
        # left = exploitations, right = regions
        pass

    # Compter par nom de région (from regions)
    counts = joined.groupby("index_right").size().reset_index(name="nb_exploitations")
    
    # Récupérer les noms de régions
    region_names = regions.copy()
    region_names["region_index"] = region_names.index
    counts = counts.merge(
        region_names[["region_index", "nom_region", "region", "superficie_km2"]],
        left_on="index_right",
        right_on="region_index",
        how="right",  # Garder toutes les régions, même sans exploitations
    )
    counts["nb_exploitations"] = counts["nb_exploitations"].fillna(0).astype(int)

    # Surface : utiliser superficie_km2 du GeoJSON, fallback vers config
    counts["area_km2"] = counts["superficie_km2"].fillna(
        counts["nom_region"].map(REGION_AREA_KM2)
    )
    # Fallback ultime : calculer depuis la géométrie
    for idx, row in counts.iterrows():
        if pd.isna(row["area_km2"]) or row["area_km2"] == 0:
            # Calculer la surface à partir de la géométrie (reprojection en Mercator)
            geom = regions.loc[
                regions["nom_region"] == row["nom_region"], "geometry"
            ].iloc[0]
            # Reprojection en EPSG:32631 (UTM zone 31N) pour surface en m²
            try:
                region_gdf = gpd.GeoDataFrame(
                    [{"geometry": geom}], crs="EPSG:4326"
                )
                region_utm = region_gdf.to_crs("EPSG:32631")
                area_m2 = region_utm.geometry.area.iloc[0]
                counts.at[idx, "area_km2"] = area_m2 / 1_000_000
            except Exception:
                counts.at[idx, "area_km2"] = REGION_AREA_KM2.get(
                    row["nom_region"], 10000
                )

    # Densité (exploitations / km²)
    counts["density"] = counts["nb_exploitations"] / counts["area_km2"]
    counts["density"] = counts["density"].round(4)

    # Classification en 5 classes (natural breaks / quantiles simplifiés)
    density_values = counts["density"].values
    if len(density_values) > 1:
        # Simple quantile-based classification
        n_classes = 5
        # Calculer les seuils avec pandas.qcut (gère les doublons automatiquement)
        try:
            counts["density_class"], bins = pd.qcut(
                counts["density"],
                q=n_classes,
                labels=[1, 2, 3, 4, 5],
                retbins=True,
                duplicates="drop",
            )
        except ValueError:
            # Si tous les valeurs sont identiques
            counts["density_class"] = 3
            bins = [counts["density"].min(), counts["density"].max()]
    else:
        counts["density_class"] = 3
        bins = [density_values[0], density_values[0]]

    # Mettre à jour les classes de couleur avec les seuils réels
    actual_classes = counts["density_class"].max()
    for i in range(actual_classes):
        class_val = i + 1
        subset = counts[counts["density_class"] == class_val]
        if not subset.empty:
            COLOR_CLASSES[i]["min"] = round(subset["density"].min(), 4)
            COLOR_CLASSES[i]["max"] = round(subset["density"].max(), 4)

    # Ajouter les champs au GeoDataFrame des régions
    result = regions.copy()
    result = result.merge(
        counts[
            ["nom_region", "nb_exploitations", "area_km2", "density", "density_class"]
        ],
        on="nom_region",
        how="left",
    )

    # Ajouter les champs bilingues et la couleur
    result["name_en"] = result["nom_region"].map(REGION_NAMES_EN)
    result["color"] = result["density_class"].apply(
        lambda c: COLOR_CLASSES[c - 1]["color"] if pd.notna(c) and 1 <= c <= 5 else "#CCCCCC"
    )
    result["density_label"] = result["density_class"].apply(
        lambda c: COLOR_CLASSES[c - 1]["label"] if pd.notna(c) and 1 <= c <= 5 else ""
    )
    result["density_label_en"] = result["density_class"].apply(
        lambda c: COLOR_CLASSES[c - 1]["label_en"] if pd.notna(c) and 1 <= c <= 5 else ""
    )
    result["interpretation"] = result.apply(
        lambda r: (
            f"Opportunité d'investissement : {r['nom_region']} "
            f"a une densité de {r['density']:.2f} expl./km² "
            f"({r['nb_exploitations']} exploitations sur {r['area_km2']:.0f} km²)"
            if r["density_class"] <= 2
            else (
                f"Densité modérée : {r['nom_region']} "
                f"({r['density']:.2f} expl./km²)"
                if r["density_class"] == 3
                else (
                    f"Zone bien desservie : {r['nom_region']} "
                    f"({r['density']:.2f} expl./km²)"
                )
            )
        ),
        axis=1,
    )

    # Métadonnées
    total_exploitations = int(counts["nb_exploitations"].sum())
    metadata = {
        "analysis": "Densité des exploitations agricoles",
        "analysis_en": "Farm density analysis",
        "method": (
            "Comptage des exploitations (grandes + petites + plantations) par région, "
            "normalisé par la surface régionale (km²). Classification par quantiles "
            "en 5 classes avec palette ColorBrewer YlOrBr."
        ),
        "method_en": (
            "Counting farms (large + small + plantations) by region, "
            "normalized by regional area (km²). Quantile-based classification "
            "into 5 classes with ColorBrewer YlOrBr palette."
        ),
        "inputs": [
            "grandes_exploitations",
            "petites_exploitations",
            "plantations",
            "regions",
        ],
        "output_fields": {
            "nb_exploitations": "Nombre total d'exploitations dans la région",
            "area_km2": "Superficie de la région en km²",
            "density": "Densité d'exploitations par km²",
            "density_class": "Classe de densité (1-5)",
            "color": "Couleur hexadécimale (palette YlOrBr)",
            "name_en": "Region name in English",
        },
        "palette": {
            "name": "YlOrBr",
            "type": "Séquentielle",
            "colorblind_safe": True,
            "classes": [
                {
                    "class": i + 1,
                    "color": c["color"],
                    "label": c["label"],
                    "label_en": c["label_en"],
                    "min": c["min"],
                    "max": c["max"],
                }
                for i, c in enumerate(COLOR_CLASSES[:actual_classes])
            ],
        },
        "statistics": {
            "total_exploitations": total_exploitations,
            "n_regions": len(result),
            "density_min": round(counts["density"].min(), 4),
            "density_max": round(counts["density"].max(), 4),
            "density_mean": round(counts["density"].mean(), 4),
        },
        "interpretation_note": (
            "Les régions à faible densité d'exploitations représentent des "
            "opportunités d'investissement pour le développement des services "
            "agricoles et l'installation de nouvelles exploitations."
        ),
        "interpretation_note_en": (
            "Regions with low farm density represent investment opportunities "
            "for developing agricultural services and establishing new farms."
        ),
    }

    return result, metadata


def simplify_geometries(gdf: gpd.GeoDataFrame, tolerance: float = 0.01) -> gpd.GeoDataFrame:
    """Simplifie les géométries pour réduire la taille du fichier."""
    gdf = gdf.copy()
    gdf["geometry"] = gdf["geometry"].simplify(tolerance, preserve_topology=True)
    return gdf


def run(logger: PipelineLogger | None = None) -> tuple[Path, Path]:
    """
    Exécute l'analyse de densité.
    
    Retourne les chemins du GeoJSON et du metadata.
    """
    if logger is None:
        logger = PipelineLogger()

    logger.section("ANALYSE 1 : DENSITÉ DES EXPLOITATIONS")

    # Chargement
    logger.step("Chargement des données...")
    exploitations = load_exploitations()
    regions = load_regions()
    logger.step(
        f"  Exploitations : {len(exploitations)} · Régions : {len(regions)}"
    )

    # Analyse
    logger.step("Calcul de la densité par région...")
    result, metadata = compute_density(exploitations, regions, logger)

    # Simplification si nécessaire
    result = simplify_geometries(result, tolerance=0.01)
    logger.step("Géométries simplifiées (tolérance 0.01)")

    # Export GeoJSON
    ensure_dir("data/public/analysis")
    geojson_path = Path("data/public/analysis/density.geojson")
    result.to_file(geojson_path, driver="GeoJSON", encoding="utf-8")
    logger.step(f"GeoJSON écrit -> {geojson_path}")

    # Vérifier la taille
    size_mb = geojson_path.stat().st_size / (1024 * 1024)
    logger.step(f"Taille du fichier : {size_mb:.2f} Mo")
    if size_mb > 5:
        logger.step("ATTENTION : fichier > 5 Mo, simplification recommandée", "!!")

    # Export métadonnées
    metadata_path = Path("data/public/analysis/metadata/density.json")
    write_json(metadata, metadata_path)
    logger.step(f"Métadonnées écrites -> {metadata_path}")

    logger.done("Analyse de densité terminée")
    return geojson_path, metadata_path


if __name__ == "__main__":
    sys.exit(0 if run() else 1)
