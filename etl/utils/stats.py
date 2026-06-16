"""
AgriMap Togo — Statistiques descriptives pour le rapport de qualité.

Calcule les métriques de qualité des datasets :
- Nombre d'enregistrements
- Taux de données manquantes par champ
- Complétude géographique
- Distribution par région
- Types de géométries
"""

from typing import Any


def compute_missing_rate(features: list[dict[str, Any]]) -> dict[str, float]:
    """
    Calcule le taux de valeurs manquantes pour chaque champ.

    Retourne un dict {nom_champ: taux_manquant} où le taux est
    un float entre 0.0 (aucune donnée manquante) et 1.0 (tout manquant).
    """
    if not features:
        return {}

    # Collecter tous les noms de champs
    all_keys: set[str] = set()
    for feat in features:
        props = feat.get("properties", {}) or {}
        all_keys.update(props.keys())

    missing: dict[str, int] = {k: 0 for k in all_keys}
    total = len(features)

    for feat in features:
        props = feat.get("properties", {}) or {}
        for key in all_keys:
            val = props.get(key)
            if val is None or (isinstance(val, str) and val.strip() == ""):
                missing[key] = missing.get(key, 0) + 1

    return {k: round(v / total, 4) for k, v in missing.items() if k in missing}


def compute_field_types(
    features: list[dict[str, Any]],
) -> dict[str, str]:
    """
    Détecte le type Python majoritaire pour chaque champ.
    """
    if not features:
        return {}

    all_keys: set[str] = set()
    for feat in features:
        props = feat.get("properties", {}) or {}
        all_keys.update(props.keys())

    type_counts: dict[str, dict[str, int]] = {}
    for feat in features:
        props = feat.get("properties", {}) or {}
        for key in all_keys:
            val = props.get(key)
            if val is not None:
                tname = type(val).__name__
                if key not in type_counts:
                    type_counts[key] = {}
                type_counts[key][tname] = type_counts[key].get(tname, 0) + 1

    result: dict[str, str] = {}
    for key, counts in type_counts.items():
        dominant = max(counts, key=counts.get)
        result[key] = dominant
    return result


def count_by_region(
    features: list[dict[str, Any]],
    region_field: str = "region",
) -> dict[str, int]:
    """Compte les enregistrements par région."""
    counts: dict[str, int] = {}
    for feat in features:
        props = feat.get("properties", {}) or {}
        region = props.get(region_field, "Inconnu")
        if region is None:
            region = "Inconnu"
        counts[region] = counts.get(region, 0) + 1
    return dict(sorted(counts.items(), key=lambda x: -x[1]))


def geometry_types(features: list[dict[str, Any]]) -> dict[str, int]:
    """Compte les types de géométrie."""
    counts: dict[str, int] = {}
    for feat in features:
        geom = feat.get("geometry")
        if geom:
            gtype = geom.get("type", "Unknown")
            counts[gtype] = counts.get(gtype, 0) + 1
        else:
            counts["null"] = counts.get("null", 0) + 1
    return dict(sorted(counts.items(), key=lambda x: -x[1]))


def compute_quality_report(
    dataset_name: str,
    features: list[dict[str, Any]],
    source_url: str = "",
) -> dict[str, Any]:
    """
    Génère un rapport de qualité complet pour un dataset.

    Retourne un dict structuré avec :
    - Informations générales (nom, date, source)
    - Statistiques (nb enregistrements, types géométrie)
    - Complétude (taux manquants par champ)
    - Distribution régionale
    - Note globale
    """
    missing = compute_missing_rate(features)
    field_types = compute_field_types(features)
    region_dist = count_by_region(features)
    geom_types = geometry_types(features)
    total = len(features)

    # Champs avec taux manquant > 15%
    problem_fields = {
        k: v for k, v in missing.items() if v > 0.15
    }

    # Note globale (0-100)
    completeness_scores = [1.0 - v for v in missing.values()]
    completeness = round(
        (sum(completeness_scores) / len(completeness_scores) * 100)
        if completeness_scores else 100.0
    )

    return {
        "dataset": dataset_name,
        "generated_at": __import__("datetime").datetime.now(
            __import__("datetime").timezone.utc
        ).isoformat(),
        "source_url": source_url,
        "record_count": total,
        "geometry_types": geom_types,
        "completeness_score": completeness,
        "missing_rate_by_field": dict(sorted(missing.items())),
        "field_types": dict(sorted(field_types.items())),
        "regional_distribution": region_dist,
        "problem_fields": problem_fields,
        "has_geometry": all(
            f.get("geometry") is not None for f in features
        ),
        "quality_flags": _quality_flags(total, missing, features),
    }


def _quality_flags(
    total: int,
    missing: dict[str, float],
    features: list[dict[str, Any]],
) -> list[dict[str, str]]:
    """Génère des alertes de qualité."""
    flags: list[dict[str, str]] = []

    if total == 0:
        flags.append({
            "severity": "error",
            "message": "Dataset vide — aucun enregistrement",
        })

    for field, rate in missing.items():
        if rate > 0.5:
            flags.append({
                "severity": "critical",
                "message": f"Champ '{field}' : {rate:.1%} de données manquantes",
            })
        elif rate > 0.15:
            flags.append({
                "severity": "warning",
                "message": f"Champ '{field}' : {rate:.1%} de données manquantes",
            })

    # Vérifier les géométries nulles
    null_geoms = sum(1 for f in features if f.get("geometry") is None)
    if null_geoms > 0:
        flags.append({
            "severity": "error" if null_geoms > total * 0.1 else "warning",
            "message": f"{null_geoms}/{total} entrées sans géométrie",
        })

    return flags
