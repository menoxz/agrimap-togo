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


def load_boundaries(level: str = "region") -> gpd.GeoDataFrame:
    """
    Charge le découpage administratif selon le niveau.
    
    - level="region"    → data/processed/regions.geojson (ADM1, 5 entités)
    - level="prefecture" → data/raw/geoBoundaries-TGO-ADM2.geojson (ADM2, ~37 entités)
    """
    if level == "prefecture":
        path = "data/raw/geoBoundaries-TGO-ADM2.geojson"
        if not Path(path).exists():
            raise FileNotFoundError(f"Fichier préfectures introuvable : {path}")
        gdf = gpd.read_file(path)
        # Renommer shapeName → nom_prefecture pour uniformité
        if "shapeName" in gdf.columns:
            gdf = gdf.rename(columns={"shapeName": "nom_prefecture"})
        return gdf
    # Default: region level
    path = "data/processed/regions.geojson"
    if not Path(path).exists():
        raise FileNotFoundError(f"Fichier régions introuvable : {path}")
    return gpd.read_file(path)


def compute_density(
    exploitations: gpd.GeoDataFrame,
    boundaries: gpd.GeoDataFrame,
    logger: PipelineLogger,
    level: str = "region",
) -> tuple[gpd.GeoDataFrame, dict[str, Any]]:
    """
    Calcule la densité d'exploitations par unité administrative.
    
    level="region"    → utilise nom_region, superficie_km2, REGION_AREA_KM2
    level="prefecture" → utilise nom_prefecture, aire calculée depuis géométrie UTM
    
    Retourne le GeoDataFrame avec les champs de densité,
    et les métadonnées de l'analyse.
    """
    name_col = "nom_region" if level == "region" else "nom_prefecture"
    
    # S'assurer que les CRS sont alignés
    if exploitations.crs is None:
        exploitations = exploitations.set_crs("EPSG:4326")
    if boundaries.crs is None:
        boundaries = boundaries.set_crs("EPSG:4326")

    # Compter les exploitations par unité administrative via jointure spatiale
    joined = gpd.sjoin(exploitations, boundaries, how="left", predicate="within")

    # Compter par nom (from boundaries)
    counts = joined.groupby("index_right").size().reset_index(name="nb_exploitations")
    
    # Récupérer les noms
    boundary_names = boundaries.copy()
    boundary_names["boundary_index"] = boundary_names.index
    
    if level == "region":
        merge_cols = ["boundary_index", "nom_region", "region", "superficie_km2"]
    else:
        merge_cols = ["boundary_index", name_col]
        # Ajouter region si disponible dans le GeoJSON préfecture
        if "region" in boundaries.columns:
            merge_cols.append("region")
    
    counts = counts.merge(
        boundary_names[merge_cols],
        left_on="index_right",
        right_on="boundary_index",
        how="right",  # Garder toutes les unités, même sans exploitations
    )
    counts["nb_exploitations"] = counts["nb_exploitations"].fillna(0).astype(int)

    # Surface
    if level == "region":
        # Utiliser superficie_km2 du GeoJSON, fallback vers config
        counts["area_km2"] = counts["superficie_km2"].fillna(
            counts[name_col].map(REGION_AREA_KM2)
        )
    else:
        counts["area_km2"] = 0.0  # Sera calculé depuis la géométrie
    
    # Calculer l'aire depuis la géométrie UTM si nécessaire
    for idx, row in counts.iterrows():
        if pd.isna(row["area_km2"]) or row["area_km2"] == 0:
            geom = boundaries.loc[
                boundaries[name_col] == row[name_col], "geometry"
            ].iloc[0]
            try:
                boundary_gdf = gpd.GeoDataFrame(
                    [{"geometry": geom}], crs="EPSG:4326"
                )
                boundary_utm = boundary_gdf.to_crs("EPSG:32631")
                area_m2 = boundary_utm.geometry.area.iloc[0]
                counts.at[idx, "area_km2"] = area_m2 / 1_000_000
            except Exception:
                if level == "region":
                    counts.at[idx, "area_km2"] = REGION_AREA_KM2.get(
                        row[name_col], 10000
                    )
                else:
                    counts.at[idx, "area_km2"] = 1000  # Fallback pour préfecture

    # Densité (exploitations / km²)
    counts["density"] = counts["nb_exploitations"] / counts["area_km2"]
    counts["density"] = counts["density"].round(4)

    # Classification en 5 classes (quantiles avec pd.qcut)
    density_values = counts["density"].values
    if len(density_values) > 1:
        n_classes = 5
        try:
            counts["density_class"], bins = pd.qcut(
                counts["density"],
                q=n_classes,
                labels=[1, 2, 3, 4, 5],
                retbins=True,
                duplicates="drop",
            )
        except ValueError:
            counts["density_class"] = 3
            bins = [counts["density"].min(), counts["density"].max()]
    else:
        counts["density_class"] = 3
        bins = [density_values[0], density_values[0]]

    # Mettre à jour les classes de couleur avec les seuils réels
    actual_classes = int(counts["density_class"].max())
    for i in range(actual_classes):
        class_val = i + 1
        subset = counts[counts["density_class"] == class_val]
        if not subset.empty:
            COLOR_CLASSES[i]["min"] = round(subset["density"].min(), 4)
            COLOR_CLASSES[i]["max"] = round(subset["density"].max(), 4)

    # Ajouter les champs au GeoDataFrame des boundaries
    result = boundaries.copy()
    merge_fields = [name_col, "nb_exploitations", "area_km2", "density", "density_class"]
    result = result.merge(
        counts[merge_fields],
        on=name_col,
        how="left",
    )

    # Ajouter les champs bilingues et la couleur
    result["name_en"] = result[name_col].map(REGION_NAMES_EN) if level == "region" else result[name_col]
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
            f"Opportunité d'investissement : {r[name_col]} "
            f"a une densité de {r['density']:.2f} expl./km² "
            f"({r['nb_exploitations']} exploitations sur {r['area_km2']:.0f} km²)"
            if pd.notna(r.get("density_class")) and r["density_class"] <= 2
            else (
                f"Densité modérée : {r[name_col]} "
                f"({r['density']:.2f} expl./km²)"
                if pd.notna(r.get("density_class")) and r["density_class"] == 3
                else (
                    f"Zone bien desservie : {r[name_col]} "
                    f"({r['density']:.2f} expl./km²)"
                )
            )
        ),
        axis=1,
    )

    # Métadonnées
    total_exploitations = int(counts["nb_exploitations"].sum())
    noun = "préfecture" if level == "prefecture" else "région"
    noun_pl = "préfectures" if level == "prefecture" else "régions"
    noun_en = "prefecture" if level == "prefecture" else "region"
    noun_pl_en = "prefectures" if level == "prefecture" else "regions"
    metadata = {
        "analysis": f"Densité des exploitations agricoles par {noun}",
        "analysis_en": f"Farm density by {noun_en}",
        "level": level,
        "method": (
            f"Comptage des exploitations (grandes + petites + plantations) par {noun}, "
            f"normalisé par la surface ({noun} km²). Classification par quantiles "
            "en 5 classes avec palette ColorBrewer YlOrBr."
        ),
        "method_en": (
            f"Counting farms (large + small + plantations) by {noun_en}, "
            f"normalized by {noun_en} area (km²). Quantile-based classification "
            "into 5 classes with ColorBrewer YlOrBr palette."
        ),
        "inputs": [
            "grandes_exploitations",
            "petites_exploitations",
            "plantations",
            "regions" if level == "region" else "geoBoundaries-TGO-ADM2",
        ],
        "output_fields": {
            name_col: f"Nom de la {noun}",
            "nb_exploitations": f"Nombre total d'exploitations dans la {noun}",
            "area_km2": f"Superficie de la {noun} en km²",
            "density": "Densité d'exploitations par km²",
            "density_class": "Classe de densité (1-5)",
            "color": "Couleur hexadécimale (palette YlOrBr)",
            "name_en": f"{noun_en.capitalize()} name in English",
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
            f"n_{noun_pl}": len(result),
            "density_min": round(counts["density"].min(), 4),
            "density_max": round(counts["density"].max(), 4),
            "density_mean": round(counts["density"].mean(), 4),
        },
        "interpretation_note": (
            f"Les {noun_pl} à faible densité d'exploitations représentent des "
            "opportunités d'investissement pour le développement des services "
            "agricoles et l'installation de nouvelles exploitations."
        ),
        "interpretation_note_en": (
            f"{noun_pl_en.capitalize()} with low farm density represent investment opportunities "
            "for developing agricultural services and establishing new farms."
        ),
    }

    return result, metadata


def simplify_geometries(gdf: gpd.GeoDataFrame, tolerance: float = 0.01) -> gpd.GeoDataFrame:
    """Simplifie les géométries pour réduire la taille du fichier."""
    gdf = gdf.copy()
    gdf["geometry"] = gdf["geometry"].simplify(tolerance, preserve_topology=True)
    return gdf


def run(level: str = "region", logger: PipelineLogger | None = None) -> tuple[Path, Path]:
    """
    Exécute l'analyse de densité.
    
    level="region"    → ADM1 (5 régions), output density.geojson
    level="prefecture" → ADM2 (~37 préfectures), output density_prefecture.geojson
    
    Retourne les chemins du GeoJSON et du metadata.
    """
    if logger is None:
        logger = PipelineLogger()

    level_label = "PRÉFECTURES" if level == "prefecture" else "RÉGIONS"
    logger.section(f"ANALYSE 1 : DENSITÉ DES EXPLOITATIONS ({level_label})")

    # Chargement
    logger.step("Chargement des données...")
    exploitations = load_exploitations()
    boundaries = load_boundaries(level)
    logger.step(
        f"  Exploitations : {len(exploitations)} · {level_label} : {len(boundaries)}"
    )

    # Analyse
    logger.step(f"Calcul de la densité par {level_label.lower()}...")
    result, metadata = compute_density(exploitations, boundaries, logger, level)

    # Simplification si nécessaire
    result = simplify_geometries(result, tolerance=0.01)
    logger.step("Géométries simplifiées (tolérance 0.01)")

    # Export GeoJSON
    suffix = f"_{level}" if level == "prefecture" else ""
    ensure_dir("data/public/analysis")
    geojson_path = Path(f"data/public/analysis/density{suffix}.geojson")
    result.to_file(geojson_path, driver="GeoJSON", encoding="utf-8")
    logger.step(f"GeoJSON écrit -> {geojson_path}")

    # Vérifier la taille
    size_mb = geojson_path.stat().st_size / (1024 * 1024)
    logger.step(f"Taille du fichier : {size_mb:.2f} Mo")
    if size_mb > 5:
        logger.step("ATTENTION : fichier > 5 Mo, simplification recommandée", "!!")

    # Export métadonnées
    metadata_path = Path(f"data/public/analysis/metadata/density{suffix}.json")
    write_json(metadata, metadata_path)
    logger.step(f"Métadonnées écrites -> {metadata_path}")

    logger.done(f"Analyse de densité ({level_label}) terminée")
    return geojson_path, metadata_path


if __name__ == "__main__":
    sys.exit(0 if run() else 1)
