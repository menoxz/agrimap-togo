"""
AgriMap Togo — Utilitaires d'entrée/sortie pour le pipeline ETL.

Lecture/écriture de fichiers GeoJSON, création de répertoires,
journalisation des opérations.
"""

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, TextIO


# ── Chemins ──────────────────────────────────────────────────────────

def project_root() -> Path:
    """Retourne le chemin absolu vers la racine du projet."""
    # Remonter depuis etl/utils/io.py
    return Path(__file__).resolve().parent.parent.parent


def ensure_dir(path: str | Path) -> Path:
    """Crée un répertoire s'il n'existe pas."""
    p = Path(path)
    p.mkdir(parents=True, exist_ok=True)
    return p


# ── GeoJSON I/O ──────────────────────────────────────────────────────

def write_geojson(
    features: list[dict[str, Any]],
    filepath: str | Path,
    pretty: bool = True,
) -> Path:
    """
    Écrit une FeatureCollection GeoJSON dans un fichier.

    Paramètres
    ----------
    features : list[dict]
        Liste de features GeoJSON (type: Feature)
    filepath : str | Path
        Chemin de sortie
    pretty : bool
        Indentation lisible (defaut: True)

    Retourne
    --------
    Path
        Chemin du fichier écrit
    """
    path = Path(filepath)
    ensure_dir(path.parent)

    collection: dict[str, Any] = {
        "type": "FeatureCollection",
        "features": features,
        "metadata": {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "generator": "AgriMap Togo ETL Pipeline (M1)",
            "crs": "EPSG:4326",
            "count": len(features),
        },
    }

    with open(path, "w", encoding="utf-8") as f:
        if pretty:
            json.dump(collection, f, indent=2, ensure_ascii=False)
        else:
            json.dump(collection, f, ensure_ascii=False)

    print(f"  [OK] Ecrit {len(features)} features -> {path}")
    return path


def read_geojson(filepath: str | Path) -> dict[str, Any] | None:
    """
    Lit un fichier GeoJSON et retourne le dictionnaire.

    Retourne None si le fichier est introuvable ou invalide.
    """
    path = Path(filepath)
    if not path.exists():
        print(f"  [ERR] Fichier introuvable : {path}")
        return None

    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data
    except (json.JSONDecodeError, IOError) as e:
        print(f"  [ERR] Erreur de lecture {path} : {e}")
        return None


def list_geojson_files(directory: str | Path) -> list[Path]:
    """Liste les fichiers .geojson dans un répertoire."""
    return sorted(Path(directory).glob("*.geojson"))


# ── JSON I/O ─────────────────────────────────────────────────────────

def write_json(
    data: Any,
    filepath: str | Path,
    pretty: bool = True,
) -> Path:
    """Écrit un fichier JSON."""
    path = Path(filepath)
    ensure_dir(path.parent)
    with open(path, "w", encoding="utf-8") as f:
        if pretty:
            json.dump(data, f, indent=2, ensure_ascii=False)
        else:
            json.dump(data, f, ensure_ascii=False)
    print(f"  [OK] Ecrit -> {path}")
    return path


def read_json(filepath: str | Path) -> Any | None:
    """Lit un fichier JSON."""
    path = Path(filepath)
    if not path.exists():
        return None
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


# ── Rapport de progression ───────────────────────────────────────────

class PipelineLogger:
    """Journalise la progression du pipeline avec section et timestamp."""

    def __init__(self, stream: TextIO = sys.stdout):
        self.stream = stream
        self.start_time = datetime.now()
        self.steps: list[dict[str, Any]] = []

    def section(self, title: str) -> None:
        """Affiche un titre de section."""
        self.stream.write(f"\n{'='*60}\n")
        self.stream.write(f"  {title}\n")
        self.stream.write(f"{'='*60}\n")

    def step(self, msg: str, status: str = "..") -> None:
        """Affiche une étape avec statut."""
        self.stream.write(f"  [{status}] {msg}\n")
        self.steps.append({
            "timestamp": datetime.now().isoformat(),
            "message": msg,
            "status": status,
        })

    def done(self, msg: str = "") -> None:
        """Marque la fin du pipeline."""
        elapsed = datetime.now() - self.start_time
        self.stream.write(f"\n  OK Termine en {elapsed.total_seconds():.1f}s")
        if msg:
            self.stream.write(f" - {msg}")
        self.stream.write("\n")
