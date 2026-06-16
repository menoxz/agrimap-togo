#!/usr/bin/env python3
"""
AgriMap Togo — Analyse M2 : Synthèse pondérée et priorisation.

Méthode
-------
1. Charger les résultats des 4 analyses précédentes
2. Normaliser les scores de chaque analyse en base 100
3. Appliquer la pondération :
   - Densité: 0.25
   - Couverture ZAAP: 0.30
   - Accessibilité: 0.25
   - Réseau coopératif: 0.20
4. Calculer le score composite par région (0-100)
5. Classer les régions par priorité d'investissement
6. Palette ColorBrewer RdYlGn divergente (5 classes) : rouge = prioritaire, vert = bien desservi

Palette ColorBrewer RdYlGn (5 classes, divergente, colorblind-safe) :
  1. #1A9641  (bien desservi — priorité faible)
  2. #A6D96A  (partiellement desservi)
  3. #FFFFC0  (priorité moyenne)
  4. #FDAE61  (priorité élevée)
  5. #D7191C  (priorité maximale)

Constructive tone : les scores élevés = zones bien servies ; les scores faibles
= opportunités d'investissement claires et priorisées.

Output : data/public/analysis/synthesis.geojson
         data/public/analysis/metadata/synthesis.json
"""

import json
import sys
from pathlib import Path
from typing import Any

import geopandas as gpd
import pandas as pd

from etl.utils.io import PipelineLogger, ensure_dir, write_json

# ── Pondérations ────────────────────────────────────────────────────
WEIGHTS = {
    "density": 0.25,
    "zaap": 0.30,
    "accessibility": 0.25,
    "cooperatives": 0.20,
}

# ── Palette ColorBrewer RdYlGn (5 classes, divergente) ─────────────
SYNTHESIS_CLASSES = [
    {"class": 1, "color": "#1A9641", "label": "Zone bien desservie", "label_en": "Well-served area",
     "priority": "Faible", "priority_en": "Low"},
    {"class": 2, "color": "#A6D96A", "label": "Zone partiellement desservie", "label_en": "Partially served area",
     "priority": "Modérée", "priority_en": "Moderate"},
    {"class": 3, "color": "#FFFFC0", "label": "Priorité moyenne", "label_en": "Medium priority",
     "priority": "Moyenne", "priority_en": "Medium"},
    {"class": 4, "color": "#FDAE61", "label": "Priorité élevée", "label_en": "High priority",
     "priority": "Élevée", "priority_en": "High"},
    {"class": 5, "color": "#D7191C", "label": "Priorité maximale - Investir", "label_en": "Maximum priority - Invest",
     "priority": "Maximale", "priority_en": "Maximum"},
]

REGION_NAMES_EN = {
    "Maritime": "Maritime",
    "Plateaux": "Plateaux",
    "Centrale": "Centrale",
    "Kara": "Kara",
    "Savanes": "Savanes",
}


def load_analysis(path: str) -> gpd.GeoDataFrame:
    """Charge un GeoJSON d'analyse."""
    if not Path(path).exists():
        raise FileNotFoundError(f"Fichier introuvable : {path}")
    return gpd.read_file(path)


def normalize_score(series: pd.Series, invert: bool = False) -> pd.Series:
    """
    Normalise une série en score 0-100.
    Si invert=True, les valeurs élevées deviennent faibles (pour les classes).
    """
    min_val = series.min()
    max_val = series.max()
    if max_val == min_val:
        return pd.Series([50.0] * len(series), index=series.index)
    if invert:
        return 100 - ((series - min_val) / (max_val - min_val) * 100)
    return (series - min_val) / (max_val - min_val) * 100


def compute_synthesis(
    logger: PipelineLogger,
) -> tuple[gpd.GeoDataFrame, dict[str, Any]]:
    """
    Calcule la synthèse pondérée des 4 analyses.
    
    Loads each analysis result, extracts the region-level data,
    normalizes scores, applies weights, and produces a composite score.
    """
    # ── Chargement des 4 analyses ────────────────────────────────────
    analyses_dir = Path("data/public/analysis")
    
    logger.step("Chargement des analyses...")
    
    density_gdf = load_analysis(str(analyses_dir / "density.geojson"))
    zaap_gdf = load_analysis(str(analyses_dir / "zaap_coverage.geojson"))
    access_gdf = load_analysis(str(analyses_dir / "accessibility.geojson"))
    coop_gdf = load_analysis(str(analyses_dir / "cooperative_network.geojson"))
    
    logger.step(f"  Densité: {len(density_gdf)} régions · ZAAP: {len(zaap_gdf)} · "
                f"Access: {len(access_gdf)} · Coop: {len(coop_gdf)}")

    # ── Extraire les colonnes pertinentes ────────────────────────────
    def get_region_data(gdf: gpd.GeoDataFrame, region_col: str) -> pd.DataFrame:
        """Extrait les données par région avec géométrie."""
        df = gdf.copy()
        # Garder la géométrie des régions (on utilise density_gdf comme base)
        return df
    
    # Utiliser le GeoJSON des régions comme base (depuis density ou regions)
    base_regions = density_gdf.copy()

    # Extraire les scores de chaque analyse
    # Density: plus la densité est élevée, mieux c'est (inverser la classe)
    # density_class: 1=faible densité (besoin), 5=forte densité
    # On veut score inversé: forte densité = bon = score élevé
    if "density_class" in density_gdf.columns:
        density_scores = density_gdf[["nom_region", "density_class", "density"]].copy()
        # Normaliser la densité: plus = mieux
        density_scores["density_score"] = normalize_score(density_scores["density"])
    else:
        density_scores = pd.DataFrame()

    # ZAAP: coverage_class: 1=bien couvert, 4=non couvert
    # Score normal: bien couvert = score élevé
    if "coverage_class" in zaap_gdf.columns:
        zaap_scores = zaap_gdf[["nom_region", "coverage_class", "coverage_pct"]].copy()
        zaap_scores["zaap_score"] = normalize_score(zaap_scores["coverage_pct"])
    else:
        zaap_scores = pd.DataFrame()

    # Accessibilité: accessibility_score déjà en 0-100
    if "accessibility_score" in access_gdf.columns:
        access_scores = access_gdf[["nom_region", "accessibility_score", "accessibility_class"]].copy()
        access_scores["access_score"] = access_scores["accessibility_score"]
    else:
        access_scores = pd.DataFrame()

    # Coopératives: coop_class: 1=bon maillage, 4=zone blanche
    # Inverser white_zone_pct: plus de zones blanches = plus de besoin
    if "white_zone_pct" in coop_gdf.columns:
        coop_scores = coop_gdf[["nom_region", "coop_class", "white_zone_pct", "coop_density_per_1000km2"]].copy()
        # Score = 100 - white_zone_pct (moins de zones blanches = mieux)
        coop_scores["coop_score"] = coop_scores["white_zone_pct"].apply(lambda x: max(0, 100 - x))
    else:
        coop_scores = pd.DataFrame()

    # ── Fusionner tous les scores ─────────────────────────────────────
    merged = base_regions[["nom_region", "geometry"]].copy()
    
    if not density_scores.empty:
        merged = merged.merge(density_scores[["nom_region", "density_score", "density"]],
                              on="nom_region", how="left")
    if not zaap_scores.empty:
        merged = merged.merge(zaap_scores[["nom_region", "zaap_score", "coverage_pct"]],
                              on="nom_region", how="left")
    if not access_scores.empty:
        merged = merged.merge(access_scores[["nom_region", "access_score"]],
                              on="nom_region", how="left")
    if not coop_scores.empty:
        merged = merged.merge(coop_scores[["nom_region", "coop_score", "white_zone_pct"]],
                              on="nom_region", how="left")

    # Remplir les valeurs manquantes (50 = neutre)
    for col in ["density_score", "zaap_score", "access_score", "coop_score"]:
        if col in merged.columns:
            merged[col] = merged[col].fillna(50.0)

    # ── Calcul du score composite (pondéré) ──────────────────────────
    # Le score composite = somme pondérée des scores individuels
    # Plus le score est élevé, mieux la région est servie
    # Plus le score est bas, plus la région est prioritaire pour l'investissement
    merged["synthesis_score"] = 0.0
    if "density_score" in merged.columns:
        merged["synthesis_score"] += merged["density_score"] * WEIGHTS["density"]
    if "zaap_score" in merged.columns:
        merged["synthesis_score"] += merged["zaap_score"] * WEIGHTS["zaap"]
    if "access_score" in merged.columns:
        merged["synthesis_score"] += merged["access_score"] * WEIGHTS["accessibility"]
    if "coop_score" in merged.columns:
        merged["synthesis_score"] += merged["coop_score"] * WEIGHTS["cooperatives"]

    merged["synthesis_score"] = merged["synthesis_score"].round(1)

    # ── Classification (5 classes RdYlGn) ───────────────────────────
    # La palette RdYlGn est divergente :
    # Classe 5 (rouge) = score FAIBLE = prioritaire (investir)
    # Classe 1 (vert) = score ÉLEVÉ = bien desservi
    # pd.qcut attribue les plus petites valeurs aux plus petits labels,
    # donc on INVERSE les labels : label 1 (petites valeurs) → classe 5 (haute priorité)
    try:
        merged["synthesis_class"], syn_bins = pd.qcut(
            merged["synthesis_score"],
            q=5,
            labels=[5, 4, 3, 2, 1],  # Inversé : score faible = classe haute (prioritaire)
            retbins=True,
            duplicates="drop",
        )
    except ValueError:
        # Fallback si les valeurs sont identiques
        merged["synthesis_class"] = 3
        syn_bins = [merged["synthesis_score"].min(), merged["synthesis_score"].max()]

    merged["synthesis_class"] = merged["synthesis_class"].astype(int)

    # ── Champs de sortie ─────────────────────────────────────────────
    merged["name_en"] = merged["nom_region"].map(REGION_NAMES_EN)
    merged["color"] = merged["synthesis_class"].apply(
        lambda c: SYNTHESIS_CLASSES[c - 1]["color"] if pd.notna(c) and 1 <= c <= 5 else "#CCCCCC"
    )
    merged["priority_label"] = merged["synthesis_class"].apply(
        lambda c: SYNTHESIS_CLASSES[c - 1]["label"] if pd.notna(c) and 1 <= c <= 5 else ""
    )
    merged["priority_label_en"] = merged["synthesis_class"].apply(
        lambda c: SYNTHESIS_CLASSES[c - 1]["label_en"] if pd.notna(c) and 1 <= c <= 5 else ""
    )
    merged["priority_level"] = merged["synthesis_class"].apply(
        lambda c: SYNTHESIS_CLASSES[c - 1]["priority"] if pd.notna(c) and 1 <= c <= 5 else ""
    )
    merged["priority_level_en"] = merged["synthesis_class"].apply(
        lambda c: SYNTHESIS_CLASSES[c - 1]["priority_en"] if pd.notna(c) and 1 <= c <= 5 else ""
    )

    # Interprétation
    merged["interpretation"] = merged.apply(
        lambda r: (
            f"PRIORITÉ MAXIMALE — {r['nom_region']} : score composite de "
            f"{r['synthesis_score']:.1f}/100. Opportunité d'investissement "
            f"multisectorielle (densité, ZAAP, accessibilité, coopératives)."
            if r["synthesis_class"] >= 4
            else (
                f"PRIORITÉ MOYENNE — {r['nom_region']} : score composite de "
                f"{r['synthesis_score']:.1f}/100. Des améliorations ciblées "
                f"sont recommandées."
                if r["synthesis_class"] == 3
                else (
                    f"BIEN DESSERVI — {r['nom_region']} : score composite de "
                    f"{r['synthesis_score']:.1f}/100. Maintenir les services existants."
                )
            )
        ),
        axis=1,
    )

    # Calculer le besoin d'investissement (score inversé pour lisibilité)
    merged["investment_priority_score"] = merged["synthesis_score"].apply(
        lambda s: round(100 - s, 1)
    )

    # ── Top 3 priorités ──────────────────────────────────────────────
    merged_sorted = merged.sort_values("investment_priority_score", ascending=False)
    top3 = []
    for idx, row in merged_sorted.head(3).iterrows():
        top3.append({
            "rank": len(top3) + 1,
            "region": row.get("nom_region", ""),
            "region_en": row.get("name_en", ""),
            "composite_score": row.get("synthesis_score", 0),
            "investment_priority_score": row.get("investment_priority_score", 0),
            "priority_level": row.get("priority_label", ""),
        })

    # ── Métadonnées ──────────────────────────────────────────────────
    metadata = {
        "analysis": "Synthèse pondérée et priorisation",
        "analysis_en": "Weighted synthesis and prioritization",
        "method": (
            "Superposition pondérée de 4 analyses spatiales : "
            f"Densité (poids {WEIGHTS['density']}), "
            f"Couverture ZAAP (poids {WEIGHTS['zaap']}), "
            f"Accessibilité (poids {WEIGHTS['accessibility']}), "
            f"Réseau coopératif (poids {WEIGHTS['cooperatives']}). "
            "Chaque analyse est normalisée en score 0-100. "
            "Le score composite est la somme pondérée des 4 scores individuels. "
            "Classification divergente en 5 classes avec palette ColorBrewer RdYlGn : "
            "vert = bien desservi (priorité faible), rouge = prioritaire (investir)."
        ),
        "method_en": (
            "Weighted overlay of 4 spatial analyses: "
            f"Density (weight {WEIGHTS['density']}), "
            f"ZAAP coverage (weight {WEIGHTS['zaap']}), "
            f"Accessibility (weight {WEIGHTS['accessibility']}), "
            f"Cooperative network (weight {WEIGHTS['cooperatives']}). "
            "Each analysis is normalized to a 0-100 score. "
            "The composite score is the weighted sum of the 4 individual scores. "
            "Divergent classification into 5 classes with ColorBrewer RdYlGn palette: "
            "green = well-served (low priority), red = priority (invest)."
        ),
        "weights": WEIGHTS,
        "inputs": [
            "density.geojson",
            "zaap_coverage.geojson",
            "accessibility.geojson",
            "cooperative_network.geojson",
        ],
        "output_fields": {
            "synthesis_score": "Score composite pondéré (0-100, élevé = bien desservi)",
            "synthesis_class": "Classe de synthèse (1-5, 5 = prioritaire)",
            "investment_priority_score": "Score de priorité d'investissement (0-100, élevé = prioritaire)",
            "color": "Couleur hexadécimale (palette RdYlGn)",
            "priority_label": "Label de priorité en français",
            "priority_label_en": "Priority label in English",
        },
        "palette": {
            "name": "RdYlGn",
            "type": "Divergente",
            "colorblind_safe": True,
            "classes": [
                {
                    "class": c["class"],
                    "color": c["color"],
                    "label": c["label"],
                    "label_en": c["label_en"],
                    "priority": c["priority"],
                    "priority_en": c["priority_en"],
                }
                for c in SYNTHESIS_CLASSES
            ],
        },
        "statistics": {
            "n_regions": len(merged),
            "score_min": round(merged["synthesis_score"].min(), 1),
            "score_max": round(merged["synthesis_score"].max(), 1),
            "score_mean": round(merged["synthesis_score"].mean(), 1),
            "score_median": round(merged["synthesis_score"].median(), 1),
            "top_3_priorities": top3,
        },
        "interpretation_note": (
            "Le score composite (0-100) intègre 4 dimensions de l'accès aux "
            "services agricoles. Plus le score est faible, plus la région est "
            "prioritaire pour les investissements. Les régions en rouge (classe 5) "
            "cumulent des déficits sur plusieurs dimensions et constituent des "
            "opportunités d'investissement prioritaires pour l'intervention."
        ),
        "interpretation_note_en": (
            "The composite score (0-100) integrates 4 dimensions of agricultural "
            "service access. The lower the score, the more the region is a priority "
            "for investment. Regions in red (class 5) cumulate deficits across "
            "multiple dimensions and represent priority investment opportunities."
        ),
    }

    return merged, metadata


def simplify_geometries(gdf: gpd.GeoDataFrame, tolerance: float = 0.01) -> gpd.GeoDataFrame:
    gdf = gdf.copy()
    gdf["geometry"] = gdf["geometry"].simplify(tolerance, preserve_topology=True)
    return gdf


def run(logger: PipelineLogger | None = None) -> tuple[Path, Path]:
    """Exécute l'analyse de synthèse."""
    if logger is None:
        logger = PipelineLogger()

    logger.section("ANALYSE 5 : SYNTHÈSE PONDÉRÉE")

    logger.step("Calcul de la synthèse pondérée...")
    result, metadata = compute_synthesis(logger)

    result = simplify_geometries(result, tolerance=0.01)
    logger.step("Géométries simplifiées")

    ensure_dir("data/public/analysis")
    geojson_path = Path("data/public/analysis/synthesis.geojson")
    result.to_file(geojson_path, driver="GeoJSON", encoding="utf-8")
    logger.step(f"GeoJSON écrit -> {geojson_path}")

    size_mb = geojson_path.stat().st_size / (1024 * 1024)
    logger.step(f"Taille du fichier : {size_mb:.2f} Mo")

    metadata_path = Path("data/public/analysis/metadata/synthesis.json")
    write_json(metadata, metadata_path)
    logger.step(f"Métadonnées écrites -> {metadata_path}")

    # Afficher le top 3
    top3 = metadata.get("statistics", {}).get("top_3_priorities", [])
    logger.step("Top 3 priorités d'investissement :")
    for t in top3:
        logger.step(
            f"  #{t['rank']} {t['region']} — "
            f"score composite {t['composite_score']:.1f}/100 "
            f"(priorité: {t['priority_level']})"
        )

    logger.done("Synthèse terminée")
    return geojson_path, metadata_path


if __name__ == "__main__":
    sys.exit(0 if run() else 1)
