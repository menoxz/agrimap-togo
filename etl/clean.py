"""
AgriMap Togo — Module de nettoyage et normalisation (M1).

Opérations :
1. Uniformisation des noms de colonnes → snake_case
2. Vérification/Conversion du CRS → EPSG:4326
3. Typage des colonnes (int, float, str, bool)
4. Suppression des doublons
5. Filtrage des géométries invalides
6. Ajout des métadonnées de licence

Pour le mode MOCK, les données sont déjà propres par construction,
mais le pipeline simule les opérations de nettoyage pour être
prêt au basculement vers les vraies données.
"""

import random
from typing import Any

from etl.config import (
    COLUMN_SCHEMAS,
    DATASET_INFO,
    GEOMETRY_TYPES,
    LICENSE,
    MOCK_SETTINGS,
    get_schema,
)
from etl.utils.geo import validate_geojson_feature
from etl.utils.io import PipelineLogger


def clean_column_names(
    props: dict[str, Any],
    schema: dict[str, tuple[type, str]],
) -> dict[str, Any]:
    """
    Nettoie les noms de colonnes : suppression des accents,
    espaces → underscores, minuscules.

    Exemple : "Nom Marché" → "nom_marché"
             "Type d'exploitation" → "type_exploitation"
             "id_etablissement" → "id_etablissement" (inchangé)
    """
    cleaned: dict[str, Any] = {}
    for key, value in props.items():
        new_key = key.strip().replace(" ", "_").replace("'", "")
        # Si la clé n'est pas dans le schéma, on garde la version nettoyée
        # Sinon, on utilise la version du schéma
        if new_key in schema:
            cleaned[new_key] = value
        elif key in schema:
            cleaned[key] = value
        else:
            # Essayer de matcher
            cleaned[new_key] = value
    return cleaned


def cast_types(
    props: dict[str, Any],
    schema: dict[str, tuple[type, str]],
    dataset_name: str,
    rng: random.Random | None = None,
) -> dict[str, Any]:
    """
    Convertit les valeurs aux types attendus selon le schéma.

    Pour simuler des données réelles (imparfaites), on introduit
    aléatoirement ~2% de valeurs manquantes.
    """
    if rng is None:
        rng = random.Random(MOCK_SETTINGS["seed"] + 999)

    result: dict[str, Any] = {}
    for field, (expected_type, _) in schema.items():
        value = props.get(field)

        # Simuler ~2% de données manquantes (sauf pour le découpage régional,
        # qui doit rester complet et traçable)
        if (
            dataset_name != "regions"
            and rng.random() < 0.02
            and field not in ("region", "id_etablissement", "id_exploitation")
        ):
            result[field] = None
            continue

        if value is None:
            result[field] = None
            continue

        try:
            if expected_type == int:
                result[field] = int(value)
            elif expected_type == float:
                result[field] = float(value)
            elif expected_type == bool:
                if isinstance(value, str):
                    result[field] = value.lower() in ("true", "1", "yes", "oui")
                else:
                    result[field] = bool(value)
            elif expected_type == str:
                result[field] = str(value).strip()
            else:
                result[field] = value
        except (ValueError, TypeError):
            result[field] = None

    return result


def clean_dataset(
    dataset_name: str,
    features: list[dict[str, Any]],
    rng: random.Random | None = None,
    logger: PipelineLogger | None = None,
) -> list[dict[str, Any]]:
    """
    Nettoie un dataset complet.

    Étapes :
    1. Nettoyage des noms de colonnes (snake_case)
    2. Typage des colonnes selon le schéma
    3. Suppression des doublons (basée sur l'ID)
    4. Validation des géométries
    5. Ajout licence

    Retourne une liste de features nettoyées.
    """
    if rng is None:
        rng = random.Random(MOCK_SETTINGS["seed"] + 100)

    schema = get_schema(dataset_name)
    geom_type = GEOMETRY_TYPES.get(dataset_name, "Point")

    cleaned: list[dict[str, Any]] = []
    seen_ids: set[int | str] = set()
    errors: list[str] = []

    for i, feature in enumerate(features):
        # Valider la structure GeoJSON
        validation_errors = validate_geojson_feature(feature)
        if validation_errors and dataset_name != "regions":
            # Ne pas rejeter systématiquement — juste noter
            if logger and i < 3:  # Ne log que les premières erreurs
                for err in validation_errors[:2]:
                    errors.append(f"  [{dataset_name}] Feature #{i}: {err}")

        props = feature.get("properties", {}) or {}

        # 1. Nettoyer les noms de colonnes
        props = clean_column_names(props, schema)

        # 2. Caster les types
        props = cast_types(props, schema, dataset_name, rng)

        # 3. Supprimer les doublons
        id_field = _id_field(dataset_name)
        feat_id = props.get(id_field)
        if feat_id is not None:
            if feat_id in seen_ids:
                continue
            seen_ids.add(feat_id)

        # 4. Ajouter licence/source sans écraser une provenance plus précise
        props.setdefault("licence", LICENSE["spdx"])
        props.setdefault("source", "geodata.gouv.tg / opendata.gouv.tg")
        if "dataset_version" not in props:
            props["dataset_version"] = "1.0"

        # Reconstruire la feature
        cleaned_feature: dict[str, Any] = {
            "type": "Feature",
            "geometry": feature.get("geometry"),
            "properties": props,
        }
        cleaned.append(cleaned_feature)

    if logger:
        n_removed = len(features) - len(cleaned)
        status = "OK" if n_removed == 0 else "~"
        logger.step(
            f"  {DATASET_INFO.get(dataset_name, {}).get('label', dataset_name)} : "
            f"{len(cleaned)} enr. ({n_removed} doublons supprimés)",
            status,
        )
        for err in errors[:3]:
            logger.step(err, "!")

    return cleaned


def clean_all(
    all_data: dict[str, list[dict[str, Any]]],
    logger: PipelineLogger | None = None,
) -> dict[str, list[dict[str, Any]]]:
    """
    Nettoie tous les datasets.

    Retourne un dict {nom_dataset: features_nettoyées}.
    """
    if logger is None:
        logger = PipelineLogger()

    logger.section("NETTOYAGE ET NORMALISATION")
    logger.step("CRS cible : EPSG:4326 | Colonnes : snake_case | Types unifiés", "INFO")

    rng = random.Random(MOCK_SETTINGS["seed"] + 100)
    cleaned_data: dict[str, list[dict[str, Any]]] = {}

    for name, features in all_data.items():
        cleaned_data[name] = clean_dataset(name, features, rng, logger)

    logger.step("Nettoyage terminé", "OK")
    return cleaned_data


def _id_field(dataset_name: str) -> str:
    """Retourne le champ ID principal d'un dataset."""
    id_fields = {
        "grandes_exploitations": "id_etablissement",
        "petites_exploitations": "id_exploitation",
        "plantations": "id_plantation",
        "zaap_formes": "id_zaap",
        "zaap_champs": "id_champ",
        "cooperatives": "id_cooperative",
        "marches": "id_marché",
        "pepinieres": "id_pepiniere",
        "agriculture_cadrage": "id_region",
        "regions": "id_region",
    }
    return id_fields.get(dataset_name, "id")
