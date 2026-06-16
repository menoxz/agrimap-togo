#!/usr/bin/env python3
"""
AgriMap Togo — Pipeline ETL M1 + M2 : Orchestrateur principal.

Usage:
    python etl/run_all.py

Étapes M1 :
1. Téléchargement (ou génération mock) des 10 jeux de données
2. Inspection et rapport de qualité
3. Nettoyage et normalisation
4. Écriture des GeoJSON dans data/processed/
5. Génération du rapport de qualité consolidé dans data/public/metadata/quality.json

Étapes M2 :
6. Analyse densité des exploitations
7. Analyse couverture ZAAP
8. Analyse accessibilité marchés/pépinières
9. Analyse réseau coopératif
10. Synthèse pondérée et priorisation

Le pipeline est conçu pour fonctionner intégralement en mode mock,
et basculer vers les vraies données en changeant un paramètre dans config.py.
"""

import sys
import shutil
from pathlib import Path

# Ajouter le repertoire racine au PYTHONPATH
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from etl.config import DATASET_INFO, MOCK_SETTINGS
from etl.utils.io import (
    PipelineLogger,
    ensure_dir,
    write_geojson,
    write_json,
)
from etl.download import download_all
from etl.explore import inspect_all
from etl.clean import clean_all

# ── Import M2 Analyses ────────────────────────────────────────────────
from etl import (
    analyze_density,
    analyze_zaap,
    analyze_accessibility,
    analyze_cooperatives,
    synthesize,
)


def main() -> int:
    """Exécute le pipeline ETL complet. Retourne 0 si succès."""
    logger = PipelineLogger()

    logger.section("AGRI MAP TOGO — PIPELINE ETL M1")
    logger.step(f"Mode : {'MOCK (données synthétiques)' if MOCK_SETTINGS['use_mock'] else 'LIVE'}")
    logger.step(f"Seed : {MOCK_SETTINGS['seed']}")

    # ── 1. Téléchargement / Génération ──────────────────────────────
    all_data = download_all(logger)

    # ── 2. Inspection ────────────────────────────────────────────────
    quality_reports = inspect_all(all_data, logger)

    # ── 3. Nettoyage ─────────────────────────────────────────────────
    cleaned_data = clean_all(all_data, logger)

    # ── 4. Écriture des GeoJSON ──────────────────────────────────────
    logger.section("EXPORT")

    ensure_dir("data/processed")

    for name, features in cleaned_data.items():
        filepath = DATASET_INFO[name]["path"]
        write_geojson(features, filepath)

    # ── 5. Rapport de qualité consolidé ──────────────────────────────
    logger.section("RAPPORT DE QUALITÉ")

    quality_report = {
        "pipeline": {
            "name": "AgriMap Togo — Pipeline ETL M1",
            "version": "1.0.0",
            "generated_at": quality_reports.get("grandes_exploitations", {}).get(
                "generated_at", ""
            ),
            "mode": "mock" if MOCK_SETTINGS["use_mock"] else "live",
            "crs": "EPSG:4326",
            "licence": "CC-BY-4.0",
        },
        "datasets": {},
        "summary": {
            "total_datasets": 0,
            "total_records": 0,
            "average_completeness": 0.0,
            "datasets_with_issues": 0,
        },
    }

    total_records = 0
    total_completeness = 0.0
    issues = 0

    for name in [
        "grandes_exploitations", "petites_exploitations", "plantations",
        "zaap_formes", "zaap_champs", "cooperatives",
        "marches", "pepinieres", "agriculture_cadrage", "regions",
    ]:
        report = quality_reports.get(name, {})
        label = DATASET_INFO.get(name, {}).get("label", name)
        quality_report["datasets"][name] = {
            "label": label,
            "record_count": report.get("record_count", 0),
            "completeness_score": report.get("completeness_score", 0),
            "geometry_types": report.get("geometry_types", {}),
            "missing_rate_by_field": report.get("missing_rate_by_field", {}),
            "field_types": report.get("field_types", {}),
            "regional_distribution": report.get("regional_distribution", {}),
            "quality_flags": report.get("quality_flags", []),
            "has_geometry": report.get("has_geometry", True),
        }

        total_records += report.get("record_count", 0)
        total_completeness += report.get("completeness_score", 0)
        if report.get("quality_flags"):
            issues += 1

    n_datasets = len(quality_report["datasets"])
    quality_report["summary"] = {
        "total_datasets": n_datasets,
        "total_records": total_records,
        "average_completeness": round(total_completeness / n_datasets, 1) if n_datasets else 0,
        "datasets_with_issues": issues,
    }

    # Écrire le rapport
    write_json(quality_report, "data/public/metadata/quality.json")

    # ── 6-10. Analyses M2 ────────────────────────────────────────────
    logger.section("ANALYSES SPATIALES (M2)")

    logger.step("Mode : analyse sur les donnees nettoyees de data/processed/", "INFO")

    # 6. Densité
    analyze_density.run(logger)

    # 7. Couverture ZAAP
    analyze_zaap.run(logger)

    # 8. Accessibilité
    analyze_accessibility.run(logger)

    # 9. Réseau coopératif
    analyze_cooperatives.run(logger)

    # 10. Synthèse
    synthesize.run(logger)

    # ── Synchronisation des données publiques frontend ───────────────
    logger.section("SYNCHRONISATION FRONTEND")
    frontend_data_dir = ROOT / "frontend" / "public" / "data"
    ensure_dir(frontend_data_dir)

    sync_pairs = [
        (ROOT / "data" / "processed" / "regions.geojson", frontend_data_dir / "regions.geojson"),
        (ROOT / "data" / "public" / "analysis" / "density.geojson", frontend_data_dir / "density.geojson"),
        (ROOT / "data" / "public" / "analysis" / "zaap_coverage.geojson", frontend_data_dir / "zaap_coverage.geojson"),
        (ROOT / "data" / "public" / "analysis" / "accessibility.geojson", frontend_data_dir / "accessibility.geojson"),
        (ROOT / "data" / "public" / "analysis" / "cooperative_network.geojson", frontend_data_dir / "cooperative_network.geojson"),
        (ROOT / "data" / "public" / "analysis" / "synthesis.geojson", frontend_data_dir / "synthesis.geojson"),
    ]

    for src, dst in sync_pairs:
        if src.exists():
            shutil.copy2(src, dst)
            logger.step(f"Synchro -> {dst.relative_to(ROOT)}", "OK")
        else:
            logger.step(f"Source absente pour synchro : {src.relative_to(ROOT)}", "WARN")

    # ── Bilan M2 ──────────────────────────────────────────────────────
    logger.section("BILAN M2")
    logger.step("5 analyses spatiales produites dans data/public/analysis/", "OK")
    logger.step("5 fichiers de métadonnées dans data/public/analysis/metadata/", "OK")
    logger.step("Palettes ColorBrewer : YlOrBr · Greens · BuPu · OrRd · RdYlGn", "OK")

    # ── Bilan global ─────────────────────────────────────────────────
    logger.section("BILAN GLOBAL")
    summary = quality_report["summary"]
    logger.step(
        f"M1 : {summary['total_datasets']} datasets · "
        f"{summary['total_records']} enregistrements · "
        f"Complétude moyenne : {summary['average_completeness']}%",
    )
    if summary['datasets_with_issues'] > 0:
        logger.step(
            f"{summary['datasets_with_issues']} dataset(s) avec anomalies signalees "
            f"(consulter quality.json pour les details)",
            "!!",
        )
    else:
        logger.step("Aucune anomalie detectee", "OK")

    logger.done("Pipeline ETL (M1 + M2) terminé avec succès")
    return 0


if __name__ == "__main__":
    sys.exit(main())
