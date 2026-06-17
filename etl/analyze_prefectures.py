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

    # ── 5b. Enrichissement M2 (scores des 4 analyses spatiales) ──────
    logger.step("Enrichissement M2 : chargement des scores spatiaux ...")
    
    # Poids pour le super-score final
    NEW_WEIGHTS = {
        "service_score": 0.35,
        "density_score": 0.20,
        "accessibility_score": 0.20,
        "coop_score": 0.15,
        "zaap_score": 0.10,
    }
    
    m2_synthesis_path = OUTPUT_DIR / "synthesis_prefecture.geojson"
    m2_density_path = OUTPUT_DIR / "density_prefecture.geojson"
    m2_access_path = OUTPUT_DIR / "accessibility_prefecture.geojson"
    m2_coop_path = OUTPUT_DIR / "cooperative_network_prefecture.geojson"
    m2_zaap_path = OUTPUT_DIR / "zaap_coverage_prefecture.geojson"
    
    m2_loaded = False
    
    # Essayer de charger synthesis_prefecture (le plus complet)
    if m2_synthesis_path.exists():
        try:
            syn_gdf = gpd.read_file(str(m2_synthesis_path))
            if not syn_gdf.empty and "synthesis_score" in syn_gdf.columns:
                # Colonnes M2 à importer (éviter les collisions avec les colonnes existantes)
                # On prend les scores normalisés + quelques indicateurs
                m2_cols = ["nom_prefecture"]
                for col in ["density_score", "zaap_score", "access_score", "coop_score",
                            "density", "coverage_pct", "white_zone_pct", "avg_distance_km",
                            "synthesis_score"]:
                    if col in syn_gdf.columns:
                        m2_cols.append(col)
                syn_import = syn_gdf[m2_cols].copy()
                # Renommer access_score → accessibility_score
                if "access_score" in syn_import.columns and "accessibility_score" not in result_gdf.columns:
                    syn_import = syn_import.rename(columns={"access_score": "accessibility_score"})
                result_gdf = result_gdf.merge(
                    syn_import,
                    on="nom_prefecture",
                    how="left",
                    suffixes=("", "_m2"),
                )
                # Supprimer les colonnes suffixées _m2
                m2_suffixed = [c for c in result_gdf.columns if c.endswith("_m2")]
                if m2_suffixed:
                    logger.step(f"  Conflits résolus : {m2_suffixed}", "~")
                    result_gdf = result_gdf.drop(columns=m2_suffixed)
                logger.step(f"  Synthèse M2 chargée : {len(syn_gdf)} préfectures", "OK")
                m2_loaded = True
        except Exception as exc:
            logger.step(f"  Chargement synthesis_prefecture échoué : {exc}", "!!")
    
    # Fallback : chargement individuel des 4 fichiers
    if not m2_loaded:
        # Density
        if m2_density_path.exists():
            try:
                d_gdf = gpd.read_file(str(m2_density_path))
                if not d_gdf.empty and "density" in d_gdf.columns:
                    density_max = d_gdf["density"].max()
                    d_gdf["density_score"] = d_gdf["density"].apply(
                        lambda x: round(x / density_max * 100, 1) if density_max > 0 else 50.0
                    )
                    result_gdf = result_gdf.merge(
                        d_gdf[["nom_prefecture", "density", "density_score"]],
                        on="nom_prefecture", how="left",
                    )
                    logger.step(f"  Density M2 chargée", "OK")
            except Exception as exc:
                logger.step(f"  Density chargement échoué : {exc}", "!!")
        
        # Accessibility
        if m2_access_path.exists():
            try:
                a_gdf = gpd.read_file(str(m2_access_path))
                if not a_gdf.empty and "accessibility_score" in a_gdf.columns:
                    result_gdf = result_gdf.merge(
                        a_gdf[["nom_prefecture", "accessibility_score", "avg_distance_km"]],
                        on="nom_prefecture", how="left",
                    )
                    logger.step(f"  Accessibilité M2 chargée", "OK")
            except Exception as exc:
                logger.step(f"  Accessibilité chargement échoué : {exc}", "!!")
        
        # Coopératives
        if m2_coop_path.exists():
            try:
                c_gdf = gpd.read_file(str(m2_coop_path))
                if not c_gdf.empty and "white_zone_pct" in c_gdf.columns:
                    c_gdf["coop_score"] = c_gdf["white_zone_pct"].apply(lambda x: max(0, 100 - x))
                    merge_cols = ["nom_prefecture", "white_zone_pct", "coop_score"]
                    if "n_cooperatives" in c_gdf.columns:
                        merge_cols.append("n_cooperatives")
                    result_gdf = result_gdf.merge(
                        c_gdf[merge_cols], on="nom_prefecture", how="left",
                    )
                    logger.step(f"  Coopératives M2 chargée", "OK")
            except Exception as exc:
                logger.step(f"  Coopératives chargement échoué : {exc}", "!!")
        
        # ZAAP
        if m2_zaap_path.exists():
            try:
                z_gdf = gpd.read_file(str(m2_zaap_path))
                if not z_gdf.empty and "coverage_pct" in z_gdf.columns:
                    coverage_max = z_gdf["coverage_pct"].max()
                    z_gdf["zaap_score"] = z_gdf["coverage_pct"].apply(
                        lambda x: round(x / coverage_max * 100, 1) if coverage_max > 0 else 50.0
                    )
                    result_gdf = result_gdf.merge(
                        z_gdf[["nom_prefecture", "coverage_pct", "zaap_score"]],
                        on="nom_prefecture", how="left",
                    )
                    logger.step(f"  ZAAP M2 chargée", "OK")
            except Exception as exc:
                logger.step(f"  ZAAP chargement échoué : {exc}", "!!")
    
    # Renommer access_score → accessibility_score si nécessaire
    if "access_score" in result_gdf.columns and "accessibility_score" not in result_gdf.columns:
        result_gdf = result_gdf.rename(columns={"access_score": "accessibility_score"})
    
    # ── Recalcul du super-score avec les 5 dimensions ─────────────────
    logger.step("Calcul du super-score combiné (service + M2)...")
    
    # Remplir les valeurs manquantes pour les scores M2
    for col in ["density_score", "accessibility_score", "coop_score", "zaap_score"]:
        if col in result_gdf.columns:
            result_gdf[col] = result_gdf[col].fillna(50.0)
    
    # Calcul du synthesis_score combiné
    result_gdf["synthesis_score"] = 0.0
    result_gdf["synthesis_score"] += result_gdf["service_score"] * NEW_WEIGHTS["service_score"]
    if "density_score" in result_gdf.columns:
        result_gdf["synthesis_score"] += result_gdf["density_score"] * NEW_WEIGHTS["density_score"]
    if "accessibility_score" in result_gdf.columns:
        result_gdf["synthesis_score"] += result_gdf["accessibility_score"] * NEW_WEIGHTS["accessibility_score"]
    if "coop_score" in result_gdf.columns:
        result_gdf["synthesis_score"] += result_gdf["coop_score"] * NEW_WEIGHTS["coop_score"]
    if "zaap_score" in result_gdf.columns:
        result_gdf["synthesis_score"] += result_gdf["zaap_score"] * NEW_WEIGHTS["zaap_score"]
    
    result_gdf["synthesis_score"] = result_gdf["synthesis_score"].round(1)
    
    # Reclassification en 3 niveaux (tertile) avec le nouveau score
    try:
        labels_int, _bins = pd.qcut(
            result_gdf["synthesis_score"],
            q=3,
            labels=[1, 2, 3],
            retbins=True,
            duplicates="drop",
        )
    except ValueError:
        labels_int = pd.Series([2] * len(result_gdf), index=result_gdf.index)
    
    priority_map = {1: "Priorité haute", 2: "Priorité moyenne", 3: "Bien desservi"}
    color_map    = {1: "#D7191C",        2: "#FFFFC0",          3: "#1A9641"}
    
    result_gdf["priority_level"] = labels_int.astype(int).map(priority_map)
    result_gdf["color"]          = labels_int.astype(int).map(color_map)
    
    # name_en : fallback sur nom_prefecture
    result_gdf["name_en"] = result_gdf["nom_prefecture"]
    
    # Interprétation enrichie
    result_gdf["interpretation"] = result_gdf.apply(
        lambda r: (
            f"PRIORITÉ HAUTE — {r['nom_prefecture']} : score composite "
            f"{r['synthesis_score']:.1f}/100. Cumul de déficits services "
            f"et accès aux marchés/intrants."
            if r["priority_level"] == "Priorité haute"
            else (
                f"PRIORITÉ MOYENNE — {r['nom_prefecture']} : score composite "
                f"{r['synthesis_score']:.1f}/100. Des améliorations ciblées possibles."
                if r["priority_level"] == "Priorité moyenne"
                else (
                    f"BIEN DESSERVI — {r['nom_prefecture']} : score composite "
                    f"{r['synthesis_score']:.1f}/100. Maintien des services recommandé."
                )
            )
        ),
        axis=1,
    )
    
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
    syn_score_s = result_gdf["synthesis_score"] if "synthesis_score" in result_gdf.columns else score_s

    # Détection des colonnes M2 présentes
    m2_cols_present = [c for c in ["density_score", "accessibility_score", "coop_score", "zaap_score"]
                       if c in result_gdf.columns]
    has_m2 = len(m2_cols_present) >= 2

    metadata: dict[str, Any] = {
        "analysis":     "Couche préfecture (ADM2) — Scores agrégés + M2",
        "analysis_en":  "Prefecture layer (ADM2) — Aggregated + M2 scores",
        "version":      "2.0.0",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "crs":          "EPSG:4326",
        "method": {
            "description": (
                "Agrégation des 5 datasets processed (coopératives, marchés, pépinières, "
                "ZAAP, exploitations OSM) par préfecture administrative (ADM2). "
                "Alignement des noms entre geoBoundaries et les données processed via : "
                "overrides manuels → normalisation Unicode → difflib.get_close_matches(cutoff=0.6)."
            ) + (
                " Enrichi par les 4 analyses spatiales M2 (densité, accessibilité, "
                "réseau coopératif, couverture ZAAP) pour produire un super-score "
                "combinant les services de base et l'accès spatial aux marchés/intrants."
                if has_m2 else ""
            ),
            "service_score_formula": (
                "service_score = ( n_coops/max * 0.30 "
                "+ n_marches/max * 0.25 "
                "+ n_pep/max * 0.25 "
                "+ n_zaap/max * 0.20 ) × 100"
            ),
            "synthesis_score_formula": (
                "synthesis_score = service_score * 0.35 + density_score * 0.20 "
                "+ accessibility_score * 0.20 + coop_score * 0.15 + zaap_score * 0.10"
            ) if has_m2 else "Identique à service_score (pas de données M2)",
            "weights": WEIGHTS,
            "m2_weights": NEW_WEIGHTS if has_m2 else None,
            "classification_method": (
                "Tertile (pd.qcut q=3) : les prefectures sont divisees en 3 groupes "
                "d'egale taille selon le synthesis_score. Tier inferieur = Priorite haute, "
                "tier median = Priorite moyenne, tier superieur = Bien desservi."
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
            "m2_analysis_files": [
                "density_prefecture.geojson",
                "accessibility_prefecture.geojson",
                "cooperative_network_prefecture.geojson",
                "zaap_coverage_prefecture.geojson",
                "synthesis_prefecture.geojson",
            ] if has_m2 else [],
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
            "density_score":  "Score de densité d'exploitations (0-100)" if has_m2 else None,
            "accessibility_score": "Score d'accessibilité marchés/pépinières (0-100)" if has_m2 else None,
            "coop_score":     "Score de couverture coopérative (0-100)" if has_m2 else None,
            "zaap_score":     "Score de couverture ZAAP (0-100)" if has_m2 else None,
            "synthesis_score": "Super-score combiné (service + M2) (0-100)" if has_m2 else "Identique à service_score",
            "priority_level": "Niveau : Priorité haute / Priorité moyenne / Bien desservi",
            "color":          "Couleur hexadécimale — palette ColorBrewer RdYlGn 3 classes",
            "interpretation": "Interprétation constructive en français",
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
            "total_cooperatives":  int(result_gdf["n_cooperatives"].sum()) if "n_cooperatives" in result_gdf.columns else int(result_gdf["n_cooperatives_m2"].sum()) if "n_cooperatives_m2" in result_gdf.columns else 0,
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
            "synthesis_score": {
                "min":    float(syn_score_s.min()),
                "max":    float(syn_score_s.max()),
                "mean":   float(round(syn_score_s.mean(), 1)),
                "median": float(round(syn_score_s.median(), 1)),
            } if has_m2 else None,
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
