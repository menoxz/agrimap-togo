#!/usr/bin/env python3
"""
AgriMap Togo — Vérification des traductions (i18n)

Vérifie :
1. Que tous les fichiers frontend/public/locales/{fr,en}/*.json existent
2. Que les structures de clés sont identiques entre FR et EN
3. Qu'il n'y a pas de clés manquantes côté FR ou EN
4. Que les GeoJSON contiennent bien des champs bilingues (name, name_en)

Usage:
    python scripts/check_i18n.py

Sortie :
    JSON avec status (pass/fail) et liste des différences
    Code de retour : 0 (pass) ou 1 (fail)
"""

import json
import sys
from pathlib import Path
from collections.abc import Mapping

# ── Configuration ────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parent.parent
LOCALES_DIR = PROJECT_ROOT / "frontend" / "public" / "locales"
DATA_ANALYSIS_DIR = PROJECT_ROOT / "data" / "public" / "analysis"
LANGUAGES = ["fr", "en"]

# Paires bilingues connues dans les GeoJSON
# Format: champ_fr -> champ_en
BILINGUAL_PAIRS = [
    ("nom_region", "name_en"),
    ("priority_label", "priority_label_en"),
    ("priority_level", "priority_level_en"),
]

# Champs pour lesquels des valeurs identiques FR/EN sont acceptables
# (noms propres géographiques, acronymes, etc.)
IDENTICAL_OK_FIELDS = {"nom_region", "name_en"}

# Champs suffixés _en qui doivent avoir un équivalent sans _en
KNOWN_EN_SUFFIX_PAIRS = {
    "priority_label_en",
    "priority_level_en",
    "priority_label",
    "priority_level",
}

# ── Helpers ──────────────────────────────────────────────────


def flatten_keys(obj, parent_key="", separator="."):
    """Aplatit un dictionnaire嵌套 en clés séparées par des points."""
    items = []
    if isinstance(obj, Mapping):
        for k, v in obj.items():
            new_key = f"{parent_key}{separator}{k}" if parent_key else k
            if isinstance(v, Mapping):
                items.extend(flatten_keys(v, new_key, separator).items())
            else:
                items.append((new_key, type(v).__name__))
    return dict(items)


def get_locale_files(lang: str) -> dict:
    """Retourne {namespace: path} pour une langue donnée."""
    lang_dir = LOCALES_DIR / lang
    if not lang_dir.exists():
        return {}
    return {
        f.stem: f
        for f in sorted(lang_dir.glob("*.json"))
    }


def load_json(path: Path) -> dict:
    """Charge un fichier JSON. Retourne {} si le fichier est invalide."""
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, FileNotFoundError) as e:
        return {"__ERROR__": str(e)}


def check_geojson_bilingual(filepath: Path) -> list:
    """Vérifie les champs bilingues dans un fichier GeoJSON."""
    issues = []
    try:
        with open(filepath, encoding="utf-8") as f:
            data = json.load(f)
    except (json.JSONDecodeError, FileNotFoundError):
        issues.append(f"  Fichier invalide: {filepath.name}")
        return issues

    features = data.get("features", [])
    if not features:
        return issues

    # Collecter tous les champs 'properties' présents
    all_props = set()
    for feat in features:
        props = feat.get("properties", {})
        all_props.update(props.keys())

    # Vérifier les paires bilingues connues
    for fr_field, en_field in BILINGUAL_PAIRS:
        has_fr = fr_field in all_props
        has_en = en_field in all_props

        if has_fr and not has_en:
            issues.append(
                f"  Champ EN manquant: '{en_field}' — '{fr_field}' présent "
                f"dans {filepath.name}"
            )
        elif has_en and not has_fr:
            issues.append(
                f"  Champ FR manquant: '{fr_field}' — '{en_field}' présent "
                f"dans {filepath.name}"
            )

        # Si les deux présents, vérifier que les valeurs diffèrent
        # (sauf pour les noms propres géographiques)
        if has_fr and has_en and features:
            fr_val = str(features[0]["properties"].get(fr_field, ""))
            en_val = str(features[0]["properties"].get(en_field, ""))
            if fr_val and en_val and fr_val == en_val:
                field_set = {fr_field, en_field}
                if not field_set & IDENTICAL_OK_FIELDS:
                    issues.append(
                        f"  Valeurs identiques FR/EN pour "
                        f"'{fr_field}'/'{en_field}': '{fr_val}'"
                    )

    # Vérification générique pour les champs suffixés _en (ex: description_en)
    for field in sorted(all_props):
        if field.endswith("_en") and field not in KNOWN_EN_SUFFIX_PAIRS:
            base = field[:-3]
            if base in all_props:
                # C'est une paire _en non déclarée — vérifier qu'elle n'est pas vide
                if features:
                    fr_val = str(features[0]["properties"].get(base, ""))
                    en_val = str(features[0]["properties"].get(field, ""))
                    if not en_val and fr_val:
                        issues.append(
                            f"  Champ '{field}' vide alors que '{base}' est renseigné"
                        )

    return issues


# ── Main ─────────────────────────────────────────────────────


def main() -> int:
    """Exécute toutes les vérifications. Retourne 0 si OK."""
    report = {
        "tool": "AgriMap Togo — i18n Checker",
        "status": "pass",
        "summary": {"files_checked": 0, "issues": 0, "warnings": 0},
        "locales": {},
        "geojson_bilingual": {},
        "differences": [],
    }

    # ── 1. Vérification des fichiers de locales ────────────
    all_namespaces = set()
    lang_files = {}

    for lang in LANGUAGES:
        files = get_locale_files(lang)
        lang_files[lang] = files
        all_namespaces.update(files.keys())
        report["locales"][lang] = {
            "files": list(files.keys()),
            "count": len(files),
        }

    # Vérifier que les mêmes fichiers existent dans les deux langues
    for ns in sorted(all_namespaces):
        for lang in LANGUAGES:
            if ns not in lang_files[lang]:
                report["status"] = "fail"
                report["differences"].append(
                    f"Fichier manquant: {lang}/{ns}.json"
                )
                report["summary"]["issues"] += 1

    # ── 2. Vérification de la structure des clés ──────────
    fr_keys = {}
    en_keys = {}

    for ns in sorted(all_namespaces):
        # Charger FR
        fr_path = lang_files.get("fr", {}).get(ns)
        if fr_path:
            fr_data = load_json(fr_path)
            fr_keys[ns] = flatten_keys(fr_data) if isinstance(fr_data, dict) else {}
        else:
            fr_keys[ns] = {}

        # Charger EN
        en_path = lang_files.get("en", {}).get(ns)
        if en_path:
            en_data = load_json(en_path)
            en_keys[ns] = flatten_keys(en_data) if isinstance(en_data, dict) else {}
        else:
            en_keys[ns] = {}

        if not fr_keys[ns] and not en_keys[ns]:
            continue

        # Comparer les clés
        keys_fr = set(fr_keys[ns].keys())
        keys_en = set(en_keys[ns].keys())

        missing_in_en = keys_fr - keys_en
        missing_in_fr = keys_en - keys_fr

        if missing_in_en:
            report["status"] = "fail"
            for key in sorted(missing_in_en):
                report["differences"].append(
                    f"Clé manquante dans EN/{ns}.json: '{key}' "
                    f"(présente dans FR/{ns}.json)"
                )
                report["summary"]["issues"] += 1

        if missing_in_fr:
            report["status"] = "fail"
            for key in sorted(missing_in_fr):
                report["differences"].append(
                    f"Clé manquante dans FR/{ns}.json: '{key}' "
                    f"(présente dans EN/{ns}.json)"
                )
                report["summary"]["issues"] += 1

        # Vérifier les types (string vs object)
        for key in keys_fr & keys_en:
            type_fr = fr_keys[ns][key]
            type_en = en_keys[ns][key]
            if type_fr != type_en:
                report["differences"].append(
                    f"Type mismatch dans '{ns}.json' pour la clé '{key}': "
                    f"FR={type_fr}, EN={type_en}"
                )
                report["summary"]["warnings"] += 1

    # Statistiques
    total_files = sum(len(files) for files in lang_files.values())
    report["summary"]["files_checked"] = total_files

    # ── 3. Vérification des GeoJSON bilingues ─────────────
    if DATA_ANALYSIS_DIR.exists():
        for geojson_file in sorted(DATA_ANALYSIS_DIR.glob("*.geojson")):
            issues = check_geojson_bilingual(geojson_file)
            if issues:
                report["status"] = "fail"
                report["geojson_bilingual"][geojson_file.name] = issues
                report["summary"]["issues"] += len(issues)
            else:
                report["geojson_bilingual"][geojson_file.name] = "ok"

    # ── 4. Rapport final ──────────────────────────────────
    print(json.dumps(report, indent=2, ensure_ascii=False))

    if report["status"] == "pass":
        msg = (f"[PASS] i18n check OK — {report['summary']['files_checked']} fichiers, "
               f"{report['summary']['warnings']} avertissement(s)")
        print(f"\n{msg}")
        return 0
    else:
        msg = (f"[FAIL] i18n check FAIL — {report['summary']['issues']} probleme(s), "
               f"{report['summary']['warnings']} avertissement(s)")
        print(f"\n{msg}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
