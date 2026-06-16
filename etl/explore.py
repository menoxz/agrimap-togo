"""
AgriMap Togo — Module d'inspection et documentation des colonnes (M1).

Analyse la structure de chaque dataset :
- Schéma (noms, types, valeurs uniques)
- Statistiques descriptives
- Détection des anomalies
- Rapport de qualité initial
"""

from typing import Any

from etl.config import (
    COLUMN_SCHEMAS,
    DATASET_INFO,
    get_schema,
)
from etl.utils.io import PipelineLogger
from etl.utils.stats import compute_quality_report


def inspect_dataset(
    dataset_name: str,
    features: list[dict[str, Any]],
    logger: PipelineLogger | None = None,
) -> dict[str, Any]:
    """
    Inspecte un dataset et produit un rapport de structure.

    Paramètres
    ----------
    dataset_name : str
        Nom du dataset
    features : list[dict]
        Liste des features GeoJSON
    logger : PipelineLogger, optional

    Retourne
    --------
    dict
        Rapport d'inspection structuré
    """
    if logger:
        logger.step(f"Inspection : {DATASET_INFO[dataset_name]['label']}")

    # Rapport de qualité complet
    info = DATASET_INFO.get(dataset_name, {})
    quality = compute_quality_report(
        dataset_name,
        features,
        source_url=info.get("raw_url", ""),
    )

    # Ajouter les infos de schéma attendu
    schema = get_schema(dataset_name)
    quality["expected_schema"] = {
        field: {
            "type": type_.__name__,
            "description": desc,
        }
        for field, (type_, desc) in schema.items()
    }

    return quality


def inspect_all(
    all_data: dict[str, list[dict[str, Any]]],
    logger: PipelineLogger | None = None,
) -> dict[str, dict[str, Any]]:
    """
    Inspecte tous les datasets et retourne les rapports.

    Retourne un dict {nom_dataset: rapport_qualité}.
    """
    if logger is None:
        logger = PipelineLogger()

    logger.section("INSPECTION ET RAPPORT DE QUALITÉ")

    reports: dict[str, dict[str, Any]] = {}

    for name, features in all_data.items():
        report = inspect_dataset(name, features, logger)
        reports[name] = report

        # Afficher un résumé
        score = report.get("completeness_score", 0)
        flags = report.get("quality_flags", [])

        status_text = "OK" if score >= 85 else "WARN" if score >= 60 else "ISSUE"
        logger.step(
            f"  {DATASET_INFO.get(name, {}).get('label', name)} : "
            f"{len(features)} enr., complétude {score}% "
            f"{''.join(f'| {f["message"]}' for f in flags[:2])}",
            status_text,
        )

    logger.step("Inspection terminée", "OK")
    return reports
