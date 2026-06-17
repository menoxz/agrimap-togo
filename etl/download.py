"""
AgriMap Togo — Module de téléchargement des données (M1).

Ce module ne génère plus de données mock.
Il orchestre le chargement des données réelles depuis les fichiers OSM/WFP
pré-téléchargés dans data/raw/.

Point d'entrée : run()
"""

from pathlib import Path
from typing import Any

from etl.config import (
    REAL_BOUNDARIES,
    REGIONS,
)
from etl.utils.io import PipelineLogger
from etl import download_osm


# ── Constantes de référence conservées pour compatibilité ────────────
REGION_NAME_MAP: dict[str, str] = {
    "Maritime Region": "Maritime",
    "Plateaux Region": "Plateaux",
    "Centrale Region": "Centrale",
    "Kara Region": "Kara",
    "Savanes Region": "Savanes",
}

REGION_NAMES: list[str] = [r["name"] for r in REGIONS]

REGION_CAPITAL: dict[str, str] = {
    r["name"]: r["capital"] for r in REGIONS
}

REGION_AREA_KM2: dict[str, float] = {
    r["name"]: float(r["area_km2"]) for r in REGIONS
}

CROP_TYPES: list[str] = [
    "Maïs", "Sorgho", "Manioc", "Igname", "Riz", "Mil",
    "Café", "Cacao", "Coton", "Arachide", "Niébé",
    "Palmier à huile", "Anacarde", "Banane plantain",
    "Tomate", "Oignon", "Piment", "Gombo", "Soja",
]


# ── Chargement des frontières réelles ────────────────────────────────

def load_real_regions() -> list[dict[str, Any]]:
    """
    Charge les frontières administratives réelles (ADM1) du Togo depuis geoBoundaries.
    """
    import json

    src = REAL_BOUNDARIES["regions"]
    path = Path(src["path"])
    if not path.exists():
        raise FileNotFoundError(f"Frontières régionales introuvables : {path}")

    with open(path, encoding="utf-8") as f:
        payload = json.load(f)

    features_in = payload.get("features", [])
    if not features_in:
        raise ValueError(f"Aucune feature trouvée dans {path}")

    normalized: list[dict[str, Any]] = []
    for feat in features_in:
        props = feat.get("properties", {}) or {}
        shape_name = str(props.get("shapeName", "")).strip()
        region_name = REGION_NAME_MAP.get(shape_name, shape_name.replace(" Region", "").strip())
        if region_name not in REGION_NAMES:
            continue

        normalized.append({
            "type": "Feature",
            "geometry": feat.get("geometry"),
            "properties": {
                "id_region": REGION_NAMES.index(region_name) + 1,
                "nom_region": region_name,
                "region": region_name,
                "name_en": region_name,
                "capitale": REGION_CAPITAL.get(region_name),
                "superficie_km2": REGION_AREA_KM2.get(region_name),
                "source": f"{src['provider']} ({src['source_url']})",
                "licence": src["license"],
                "dataset_version": src["dataset_version"],
            },
        })

    normalized.sort(key=lambda f: f["properties"]["id_region"])

    if len(normalized) != 5:
        raise ValueError(f"Nombre de régions inattendu depuis geoBoundaries: {len(normalized)}")

    return normalized


# ── Point d'entrée principal ─────────────────────────────────────────

def run(logger: PipelineLogger | None = None) -> dict[str, int]:
    """
    Exécute le chargement des données réelles OSM/WFP.

    Retourne un dict {dataset_name: count_features}.
    """
    if logger is None:
        logger = PipelineLogger()

    logger.section("CHARGEMENT DONNÉES RÉELLES (OSM + WFP)")

    counts = download_osm.run()

    for name, count in counts.items():
        logger.step(f"  {name}: {count} features", "OK")

    logger.step(f"Total: {sum(counts.values())} features chargées", "OK")
    return counts


# Alias backward-compat pour run_all.py
def download_all(
    logger: PipelineLogger | None = None,
) -> dict[str, list[dict[str, Any]]]:
    """
    Compatibilité M1 : retourne les frontières réelles + couches vides pour
    les datasets mock supprimés.

    Les données réelles (marchés/coopératives/exploitations) sont écrites
    directement dans data/processed/ par download_osm.run().
    """
    if logger is None:
        logger = PipelineLogger()

    # Charger OSM (écrit marches/cooperatives/exploitations dans data/processed/)
    run(logger)

    # Charger les frontières réelles
    regions_features = load_real_regions()

    # Retourner un dict minimal pour compatibilité avec le pipeline M1
    return {
        "regions": regions_features,
    }
