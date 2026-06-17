#!/usr/bin/env python3
"""
AgriMap Togo — Analyse M3 : Couche préfecture (ADM2).

Méthode
-------
1. Charger les frontières ADM2 (geoBoundaries-TGO-ADM2.geojson)
2. Charger les 6 datasets processed (cooperatives, marchés, pépinières,
   zaap_formes, grandes & petites exploitations)
3. Aligner les noms de préfectures (ADM2 ↔ données processed) via
   normalisation Unicode + difflib + overrides manuels
4. Agréger les comptages par préfecture
5. Calculer le service_score composite (0-100) et classifier en 3 niveaux
6. Écrire data/public/analysis/prefecture_synthesis.geojson
   et data/public/analysis/metadata/prefecture_synthesis.json

Score composite — pondération :
  - Coopératives : 30 %  (réseaux collectifs)
  - Marchés      : 25 %  (débouchés commerciaux)
  - Pépinières   : 25 %  (intrants végétaux)
  - ZAAP         : 20 %  (zones d'aménagement planifié)

Palette ColorBrewer RdYlGn (3 classes) :
  #D7191C  → Priorité haute   (score  0–33)
  #FFFFC0  → Priorité moyenne (score 33–67)
  #1A9641  → Bien desservi    (score 67–100)

Usage :
    python etl/analyze_prefectures.py

Output :
    data/public/analysis/prefecture_synthesis.geojson
    data/public/analysis/metadata/prefecture_synthesis.json
"""

import difflib
import json
import sys
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import geopandas as gpd
import pandas as pd

# Ajouter le répertoire racine au PYTHONPATH
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from etl.utils.io import PipelineLogger, ensure_dir, write_json

# ── Chemins ──────────────────────────────────────────────────────────
ADM2_PATH = ROOT / "data" / "raw" / "geoBoundaries-TGO-ADM2.geojson"
PROCESSED_DIR = ROOT / "data" / "processed"
OUTPUT_DIR = ROOT / "data" / "public" / "analysis"
METADATA_DIR = OUTPUT_DIR / "metadata"

# ── Palette ColorBrewer RdYlGn (3 classes) ──────────────────────────
# Score élevé = bien desservi (vert) ; score faible = prioritaire (rouge)
# Classification par tertile — voir classify_by_quantile()
PRIORITY_LABELS = ["Priorité haute", "Priorité moyenne", "Bien desservi"]
PRIORITY_COLORS = {"Priorité haute": "#D7191C", "Priorité moyenne": "#FFFFC0", "Bien desservi": "#1A9641"}

# ── Pondérations du score composite ─────────────────────────────────
WEIGHTS = {
    "cooperatives": 0.30,
    "marches":      0.25,
    "pepinieres":   0.25,
    "zaap":         0.20,
}

# ── Overrides manuels : nom ADM2 → nom dans les données processed ────
# Couvre les absences d'accent et les reformulations dans geoBoundaries
MANUAL_OVERRIDES: dict[str, str] = {
    "Ave":          "Avé",
    "Keran":        "Kéran",
    "Tone":         "Tône",
    "Tandjouare":   "Tandjouaré",
    "Lome Commune": "Lomé",
    "Plaine de Mô": "Mô",
}


# ── Utilitaires de normalisation ─────────────────────────────────────

def normalize_name(name: str) -> str:
    """Normalise un nom pour comparaison : supprime accents + casse."""
    if not isinstance(name, str):
        return ""
    nfd = unicodedata.normalize("NFD", name)
    no_accents = "".join(c for c in nfd if unicodedata.category(c) != "Mn")
    return no_accents.lower().strip()


def build_name_mapping(
    adm2_names: list[str],
    processed_names: list[str],
    logger: PipelineLogger | None = None,
) -> dict[str, str]:
    """
    Construit un mapping adm2_name → processed_name.

    Ordre de priorité :
    1. Override manuel (MANUAL_OVERRIDES)
    2. Égalité exacte
    3. Égalité après normalisation Unicode
    4. difflib.get_close_matches(cutoff=0.6)
    5. Fallback : conserver le nom ADM2
    """
    mapping: dict[str, str] = {}
    norm_to_proc: dict[str, str] = {normalize_name(n): n for n in processed_names}

    for adm2 in adm2_names:
        # 1 — Override manuel
        if adm2 in MANUAL_OVERRIDES:
            mapping[adm2] = MANUAL_OVERRIDES[adm2]
            continue

        # 2 — Égalité exacte
        if adm2 in processed_names:
            mapping[adm2] = adm2
            continue

        # 3 — Normalisation Unicode
        norm = normalize_name(adm2)
        if norm in norm_to_proc:
            mapping[adm2] = norm_to_proc[norm]
            continue

        # 4 — difflib fuzzy
        candidates = list(norm_to_proc.keys())
        matches = difflib.get_close_matches(norm, candidates, n=1, cutoff=0.6)
        if matches:
            mapping[adm2] = norm_to_proc[matches[0]]
            if logger:
                logger.step(
                    f"    Fuzzy match : '{adm2}' -> '{norm_to_proc[matches[0]]}'",
                    "~",
                )
            continue

        # 5 — Fallback
        mapping[adm2] = adm2
        if logger:
            logger.step(f"    Aucun match pour : '{adm2}' (conservé tel quel)", "!!")

    return mapping


# ── Agrégation par préfecture ────────────────────────────────────────

def count_by_prefecture(filepath: Path) -> dict[str, int]:
    """Compte les features GeoJSON par valeur du champ `prefecture`."""
    if not filepath.exists():
        return {}
    with open(filepath, encoding="utf-8") as fh:
        gj = json.load(fh)
    counts: dict[str, int] = {}
    for feat in gj.get("features", []):
        val = (feat.get("properties") or {}).get("prefecture", "")
        if val:
            counts[val] = counts.get(val, 0) + 1
    return counts


def count_by_prefecture_sjoin(filepath: Path, adm2_gdf: gpd.GeoDataFrame) -> dict[str, int]:
    """
    Compte les features GeoJSON par préfecture ADM2 via spatial join.

    Retourne {shapeName: count} — les clés sont les valeurs ADM2 shapeName.
    Remplace count_by_prefecture() pour les données OSM qui n'ont pas
    d'attribut 'prefecture' dans leurs propriétés.
    """
    if not filepath.exists():
        return {}
    gdf = gpd.read_file(str(filepath))
    if gdf.empty:
        return {}
    if gdf.crs is None:
        gdf = gdf.set_crs("EPSG:4326")
    elif gdf.crs.to_epsg() != 4326:
        gdf = gdf.to_crs("EPSG:4326")
    adm2 = adm2_gdf[["shapeName", "geometry"]].copy()
    if adm2.crs is None:
        adm2 = adm2.set_crs("EPSG:4326")
    joined = gpd.sjoin(gdf, adm2, how="left", predicate="within")
    counts = joined.groupby("shapeName").size()
    return counts.to_dict()


def build_region_map(processed_dir: Path) -> dict[str, str]:
    """
    Construit un mapping prefecture → région depuis les datasets processed.
    Utilise coopératives + marchés comme sources (les deux ont region + prefecture).
    """
    region_map: dict[str, str] = {}
    sources = [
        "cooperatives.geojson",
        "marches.geojson",
    ]
    for fname in sources:
        fp = processed_dir / fname
        if not fp.exists():
            continue
        with open(fp, encoding="utf-8") as fh:
            gj = json.load(fh)
        for feat in gj.get("features", []):
            props = feat.get("properties") or {}
            r = props.get("region", "")
            p = props.get("prefecture", "")
            if r and p:
                region_map[p] = r
    return region_map


# ── Score composite ──────────────────────────────────────────────────

def compute_service_score(
    n_coops: int,
    n_marches: int,
    n_pep: int,
    n_zaap: int,
    max_coops: float,
    max_marches: float,
    max_pep: float,
    max_zaap: float,
) -> float:
    """
    Calcule le score de services composite (0–100).

    Formule :
        score = (n_coops/max * 0.30 + n_marches/max * 0.25
                 + n_pep/max * 0.25 + n_zaap/max * 0.20) × 100

    Semantique : 100 = préfecture bien desservie, 0 = aucun service.
    """

    def norm(val: float, mx: float) -> float:
        return min(1.0, val / mx) if mx > 0 else 0.0

    raw = (
        norm(n_coops, max_coops)   * WEIGHTS["cooperatives"]
        + norm(n_marches, max_marches) * WEIGHTS["marches"]
        + norm(n_pep, max_pep)         * WEIGHTS["pepinieres"]
        + norm(n_zaap, max_zaap)       * WEIGHTS["zaap"]
    ) * 100
    return round(raw, 1)


def classify_by_quantile(
    gdf: "gpd.GeoDataFrame",
) -> "gpd.GeoDataFrame":
    """
    Classifie les préfectures en 3 niveaux par quantile (tertile).

    Méthode : pd.qcut(q=3) — répartition en 3 tiers d'égale taille.
    Avantage : toujours 3 classes représentées quelle que soit la distribution.
    Sémantique : le tier inférieur = Priorité haute, le tier supérieur = Bien desservi.
    """
    # Assigner un label entier (1=bas, 2=mid, 3=haut)
    try:
        labels_int, _bins = pd.qcut(
            gdf["service_score"],
            q=3,
            labels=[1, 2, 3],
            retbins=True,
            duplicates="drop",
        )
    except ValueError:
        labels_int = pd.Series([2] * len(gdf), index=gdf.index)

    priority_map = {1: "Priorité haute", 2: "Priorité moyenne", 3: "Bien desservi"}
    color_map    = {1: "#D7191C",        2: "#FFFFC0",          3: "#1A9641"}

    gdf = gdf.copy()
    gdf["priority_level"] = labels_int.astype(int).map(priority_map)
    gdf["color"]          = labels_int.astype(int).map(color_map)
    return gdf


# ── Analyse principale ───────────────────────────────────────────────

def run(logger: PipelineLogger | None = None) -> tuple[Path, Path]:
    """Exécute l'analyse préfecture ADM2 et retourne (geojson_path, metadata_path)."""
    if logger is None:
        logger = PipelineLogger()

    logger.section("ANALYSE M3 : COUCHE PRÉFECTURE (ADM2)")

    # ── 1. Frontières ADM2 ───────────────────────────────────────────
    logger.step(f"Chargement des frontières ADM2 : {ADM2_PATH.name} ...")
    if not ADM2_PATH.exists():
        raise FileNotFoundError(
            f"Fichier ADM2 introuvable : {ADM2_PATH}\n"
            "Télécharger depuis : https://www.geoboundaries.org/api/current/gbOpen/TGO/ADM2/"
        )

    adm2_gdf = gpd.read_file(str(ADM2_PATH))
    logger.step(f"  {len(adm2_gdf)} préfectures chargées — CRS source : {adm2_gdf.crs}", "OK")

    # Reprojection en EPSG:4326 si nécessaire
    if adm2_gdf.crs is None or adm2_gdf.crs.to_epsg() != 4326:
        adm2_gdf = adm2_gdf.to_crs("EPSG:4326")
        logger.step("  Reprojection EPSG:4326 effectuée", "OK")

    # ── 2. Datasets processed ────────────────────────────────────────
    logger.step("Chargement des datasets processed ...")

    coops_counts        = count_by_prefecture_sjoin(PROCESSED_DIR / "cooperatives.geojson", adm2_gdf)
    marches_counts      = count_by_prefecture_sjoin(PROCESSED_DIR / "marches.geojson", adm2_gdf)
    pep_counts          = count_by_prefecture_sjoin(PROCESSED_DIR / "pepinieres.geojson", adm2_gdf)
    zaap_counts         = count_by_prefecture_sjoin(PROCESSED_DIR / "zaap_formes.geojson", adm2_gdf)
    exploitations_counts = count_by_prefecture_sjoin(PROCESSED_DIR / "exploitations.geojson", adm2_gdf)

    logger.step(
        f"  Coopératives : {sum(coops_counts.values())} | "
        f"Marchés : {sum(marches_counts.values())} | "
        f"Pépinières : {sum(pep_counts.values())} | "
        f"ZAAP : {sum(zaap_counts.values())}",
        "OK",
    )
    logger.step(
        f"  Exploitations OSM : {sum(exploitations_counts.values())}",
        "OK",
    )

    # ── 3. Mapping des noms ──────────────────────────────────────────
    logger.step("Construction du mapping ADM2 -> donnees processed ...")

    all_processed_names = (
        set(coops_counts)
        | set(marches_counts)
        | set(pep_counts)
        | set(zaap_counts)
        | set(exploitations_counts)
    )

    region_map = build_region_map(PROCESSED_DIR)
    adm2_names = adm2_gdf["shapeName"].tolist()
    name_map = build_name_mapping(adm2_names, list(all_processed_names), logger)

    applied_overrides = {k: v for k, v in name_map.items() if k != v}
    if applied_overrides:
        logger.step(f"  {len(applied_overrides)} correspondance(s) adaptée(s) :", "OK")
        for adm2_n, proc_n in sorted(applied_overrides.items()):
            logger.step(f"    '{adm2_n}' -> '{proc_n}'")

    # ── 4. Indicateurs par préfecture ────────────────────────────────
    logger.step("Calcul des indicateurs par préfecture ...")

    max_coops   = max(coops_counts.values(),        default=1) or 1
    max_marches = max(marches_counts.values(),      default=1) or 1
    max_pep     = max(pep_counts.values(),          default=1) or 1
    max_zaap    = max(zaap_counts.values(),         default=1) or 1

    rows: list[dict[str, Any]] = []
    for _, row in adm2_gdf.iterrows():
        adm2_name   = row["shapeName"]
        n_coops     = coops_counts.get(adm2_name, 0)
        n_marches   = marches_counts.get(adm2_name, 0)
        n_pep       = pep_counts.get(adm2_name, 0)
        n_zaap      = zaap_counts.get(adm2_name, 0)
        n_exploits  = exploitations_counts.get(adm2_name, 0)

        score = compute_service_score(
            n_coops, n_marches, n_pep, n_zaap,
            max_coops, max_marches, max_pep, max_zaap,
        )

        rows.append(
            {
                "geometry":        row.geometry,
                "nom_prefecture":  adm2_name,
                "region":          region_map.get(adm2_name, ""),
                "n_cooperatives":  int(n_coops),
                "n_marches":       int(n_marches),
                "n_pepinieres":    int(n_pep),
                "n_zaap":          int(n_zaap),
                "n_exploitations": int(n_exploits),
                "service_score":   score,
            }
        )

    result_gdf = gpd.GeoDataFrame(rows, crs="EPSG:4326")

    # ── 5. Classification quantile (tertile) ─────────────────────────
    result_gdf = classify_by_quantile(result_gdf)

    # ── 6. Vérifications ─────────────────────────────────────────────
    logger.step("Vérifications ...")

    n_features    = len(result_gdf)
    total_marches = int(result_gdf["n_marches"].sum())
    src_marches   = sum(marches_counts.values())

    # Compter le total réel dans le fichier (incluant les features sans préfecture)
    marches_fp = PROCESSED_DIR / "marches.geojson"
    if marches_fp.exists():
        with open(marches_fp, encoding="utf-8") as _fh:
            _gj = json.load(_fh)
        file_total_marches = len(_gj.get("features", []))
    else:
        file_total_marches = src_marches

    logger.step(f"  Préfectures dans l'output : {n_features}", "OK")
    logger.step(
        f"  Marchés agrégés : {total_marches}/{file_total_marches} total "
        f"({file_total_marches - total_marches} sans préfecture renseignée)",
        "OK" if total_marches == file_total_marches else "!!",
    )

    if total_marches != src_marches:
        logger.step(
            f"  AVERTISSEMENT : {src_marches - total_marches} marché(s) "
            "non rattaché(s) à une préfecture ADM2 (mapping incomplet)",
            "!!",
        )

    # Distribution priorités
    for level in ["Priorité haute", "Priorité moyenne", "Bien desservi"]:
        n = int((result_gdf["priority_level"] == level).sum())
        logger.step(f"  {level} : {n} préfecture(s)")

    # ── 7. Écriture des fichiers ─────────────────────────────────────
    ensure_dir(OUTPUT_DIR)
    ensure_dir(METADATA_DIR)

    output_path = OUTPUT_DIR / "prefecture_synthesis.geojson"
    result_gdf.to_file(str(output_path), driver="GeoJSON", encoding="utf-8")
    size_kb = output_path.stat().st_size / 1024
    logger.step(f"GeoJSON écrit -> {output_path} ({size_kb:.1f} Ko)", "OK")

    # ── 8. Métadonnées ────────────────────────────────────────────────
    score_s = result_gdf["service_score"]

    metadata: dict[str, Any] = {
        "analysis":     "Couche préfecture (ADM2) — Scores agrégés",
        "analysis_en":  "Prefecture layer (ADM2) — Aggregated scores",
        "version":      "1.0.0",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "crs":          "EPSG:4326",
        "method": {
            "description": (
                "Agrégation des 5 datasets processed (coopératives, marchés, pépinières, "
                "ZAAP, exploitations OSM) par préfecture administrative (ADM2). "
                "Alignement des noms entre geoBoundaries et les données processed via : "
                "overrides manuels → normalisation Unicode → difflib.get_close_matches(cutoff=0.6)."
            ),
            "service_score_formula": (
                "service_score = ( n_coops/max * 0.30 "
                "+ n_marches/max * 0.25 "
                "+ n_pep/max * 0.25 "
                "+ n_zaap/max * 0.20 ) × 100"
            ),
            "weights": WEIGHTS,
            "classification_method": (
                "Tertile (pd.qcut q=3) : les 37 prefectures sont divisees en 3 groupes "
                "d'egale taille selon le service_score. Tier inferieur = Priorite haute, "
                "tier median = Priorite moyenne, tier superieur = Bien desservi. "
                "Cette methode garantit toujours 3 classes representees quelle que soit la distribution."
            ),
            "name_matching_pipeline": [
                "1. Overrides manuels (6 cas connus)",
                "2. Égalité exacte",
                "3. Normalisation Unicode (suppression accents + casse)",
                "4. difflib.get_close_matches(cutoff=0.6)",
                "5. Fallback : conserver le nom ADM2",
            ],
        },
        "sources": {
            "boundaries": {
                "provider": "geoBoundaries (gbOpen)",
                "file":     "geoBoundaries-TGO-ADM2.geojson",
                "url":      "https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/9469f09/releaseData/gbOpen/TGO/ADM2/geoBoundaries-TGO-ADM2.geojson",
                "api":      "https://www.geoboundaries.org/api/current/gbOpen/TGO/ADM2/",
                "license":  "ODbL-1.0",
                "n_features_in_source": len(adm2_gdf),
            },
            "data_files": [
                "cooperatives.geojson",
                "marches.geojson",
                "pepinieres.geojson",
                "zaap_formes.geojson",
                "exploitations.geojson",
            ],
        },
        "output_fields": {
            "nom_prefecture": "Nom normalisé de la préfecture (depuis données processed)",
            "region":         "Région administrative parente (Maritime/Plateaux/Centrale/Kara/Savanes)",
            "n_cooperatives": "Nombre de coopératives agricoles",
            "n_marches":      "Nombre de marchés agricoles et ruraux",
            "n_pepinieres":   "Nombre de pépinières",
            "n_zaap":         "Nombre de ZAAP (périmètres)",
            "n_exploitations": "Nombre total d'exploitations (grandes + petites)",
            "service_score":  "Score composite de services (0-100 ; 100 = bien desservi)",
            "priority_level": "Niveau : Priorité haute / Priorité moyenne / Bien desservi",
            "color":          "Couleur hexadécimale — palette ColorBrewer RdYlGn 3 classes",
        },
        "palette": {
            "name":           "RdYlGn (3 classes)",
            "type":           "Divergente",
            "colorblind_safe": True,
            "classes": [
                {
                    "color":       "#D7191C",
                    "label":       "Priorité haute",
                    "score_range": "0–33.3",
                    "meaning":     "Préfecture peu desservie — opportunité d'investissement prioritaire",
                },
                {
                    "color":       "#FFFFC0",
                    "label":       "Priorité moyenne",
                    "score_range": "33.3–66.7",
                    "meaning":     "Préfecture partiellement desservie — amélioration ciblée recommandée",
                },
                {
                    "color":       "#1A9641",
                    "label":       "Bien desservi",
                    "score_range": "66.7–100",
                    "meaning":     "Préfecture bien desservie — maintien des services",
                },
            ],
        },
        "statistics": {
            "n_prefectures":      n_features,
            "note_on_count": (
                f"La source geoBoundaries contient {len(adm2_gdf)} entites ADM2. "
                "La cible initiale de 39 prefectures correspond au decoupage "
                "administratif officiel le plus recent ; geoBoundaries consolide "
                "certaines unites (ex : 'Lome Commune' pour Golfe/Lome)."
            ),
            "total_cooperatives":  int(result_gdf["n_cooperatives"].sum()),
            "total_marches":       int(total_marches),
            "total_marches_in_file": file_total_marches,
            "marches_without_prefecture": file_total_marches - total_marches,
            "total_pepinieres":    int(result_gdf["n_pepinieres"].sum()),
            "total_zaap":          int(result_gdf["n_zaap"].sum()),
            "total_exploitations": int(result_gdf["n_exploitations"].sum()),
            "service_score": {
                "min":    float(score_s.min()),
                "max":    float(score_s.max()),
                "mean":   float(round(score_s.mean(), 1)),
                "median": float(round(score_s.median(), 1)),
            },
            "priority_distribution": {
                "Priorite haute":   int((result_gdf["priority_level"] == "Priorité haute").sum()),
                "Priorite moyenne": int((result_gdf["priority_level"] == "Priorité moyenne").sum()),
                "Bien desservi":    int((result_gdf["priority_level"] == "Bien desservi").sum()),
            },
        },
        "name_mapping_applied": applied_overrides,
    }

    metadata_path = METADATA_DIR / "prefecture_synthesis.json"
    write_json(metadata, metadata_path)
    logger.step(f"Métadonnées écrites -> {metadata_path}", "OK")

    logger.done("Analyse préfecture ADM2 terminée")
    return output_path, metadata_path


if __name__ == "__main__":
    sys.exit(0 if run() else 1)
