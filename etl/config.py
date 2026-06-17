"""
AgriMap Togo — Configuration centralisée du pipeline ETL (M1).

Contient :
- URLs des sources de données (geodata.gouv.tg, opendata.gouv.tg)
- CRS cible unifié (EPSG:4326)
- Schémas de colonnes (nom, type, description) pour chaque dataset
- Paramètres de génération mock (en attendant les vraies données)
- Métadonnées de licence et attribution

Immuable :
- CRS = EPSG:4326 (WGS 84) — standard GeoJSON
- Colonnes en snake_case
- Pas de données nominatives

Usage:
    from etl.config import DATASETS, CRS_TARGET, MOCK_SETTINGS
"""

from typing import Literal

# ── CRS ──────────────────────────────────────────────────────────────
CRS_TARGET: str = "EPSG:4326"        # WGS 84 — standard GeoJSON
CRS_SOURCE_MERCADOR: str = "EPSG:32631"  # UTM zone 31N (Togo)

# ── Togo bounds ──────────────────────────────────────────────────────
TOGO_BOUNDS = {
    "lat_min": 6.0,
    "lat_max": 11.2,
    "lon_min": -0.2,
    "lon_max": 1.8,
    "center": {"lat": 8.5, "lon": 0.8},
}

# ── Régions du Togo (5 régions administratives) ──────────────────────
REGIONS = [
    {"name": "Maritime",       "capital": "Lomé",        "prefectures": 8,  "area_km2": 6100},
    {"name": "Plateaux",       "capital": "Atakpamé",    "prefectures": 12, "area_km2": 16975},
    {"name": "Centrale",       "capital": "Sokodé",      "prefectures": 6,  "area_km2": 13517},
    {"name": "Kara",           "capital": "Kara",        "prefectures": 7,  "area_km2": 11630},
    {"name": "Savanes",        "capital": "Dapaong",     "prefectures": 5,  "area_km2": 8470},
]

# ── URLs des sources (API geodata.gouv.tg / opendata.gouv.tg) ───────
# Note: URLs officielles à vérifier quand l'accès API sera disponible.
# Actuellement, ces URLs sont des emplacements plausibles basés sur
# les patterns des portails open data togolais.
SOURCE_URLS = {
    "grandes_exploitations": (
        "https://geodata.gouv.tg/api/explore/v2.1/catalog/datasets/"
        "grandes-exploitations-agricoles-togo/records?limit=500"
    ),
    "petites_exploitations": (
        "https://geodata.gouv.tg/api/explore/v2.1/catalog/datasets/"
        "petites-exploitations-agricoles-togo/records?limit=1000"
    ),
    "plantations": (
        "https://geodata.gouv.tg/api/explore/v2.1/catalog/datasets/"
        "plantations-agricoles-togo/records?limit=500"
    ),
    "zaap_formes": (
        "https://geodata.gouv.tg/api/explore/v2.1/catalog/datasets/"
        "zaap-perimetres-togo/records?limit=200"
    ),
    "zaap_champs": (
        "https://geodata.gouv.tg/api/explore/v2.1/catalog/datasets/"
        "zaap-champs-individuels-togo/records?limit=1000"
    ),
    "cooperatives": (
        "https://geodata.gouv.tg/api/explore/v2.1/catalog/datasets/"
        "cooperatives-agricoles-togo/records?limit=500"
    ),
    "marches": (
        "https://opendata.gouv.tg/api/explore/v2.1/catalog/datasets/"
        "marches-togo/records?limit=500"
    ),
    "pepinieres": (
        "https://opendata.gouv.tg/api/explore/v2.1/catalog/datasets/"
        "pepinieres-agricoles-togo/records?limit=500"
    ),
    "agriculture_cadrage": (
        "https://opendata.gouv.tg/api/explore/v2.1/catalog/datasets/"
        "agriculture-rural-cadrage-regional-togo/records?limit=100"
    ),
    "regions": (
        "https://geodata.gouv.tg/api/explore/v2.1/catalog/datasets/"
        "decoupage-administratif-regions-togo/records?limit=10"
    ),
}

# ── Schémas de colonnes ──────────────────────────────────────────────
# Chaque entrée : {nom_colonne: (type_python, description)}
# Types : str, float, int, bool
COLUMN_SCHEMAS: dict[str, dict[str, tuple[type, str]]] = {
    "grandes_exploitations": {
        "id_etablissement": (int, "Identifiant unique de l'établissement"),
        "nom_exploitation": (str, "Nom de l'exploitation"),
        "type_culture": (str, "Type de culture principale"),
        "superficie_ha": (float, "Superficie en hectares"),
        "annee_installation": (int, "Année d'installation"),
        "region": (str, "Région administrative"),
        "prefecture": (str, "Préfecture"),
        "commune": (str, "Commune"),
        "source": (str, "Source de la donnée"),
        "licence": (str, "Licence d'utilisation"),
    },
    "petites_exploitations": {
        "id_exploitation": (int, "Identifiant de l'exploitation"),
        "nom_exploitant": (str, "Nom de l'exploitant (anonymisé)"),
        "type_culture": (str, "Type de culture principale"),
        "superficie_ha": (float, "Superficie en hectares"),
        "nombre_actifs": (int, "Nombre de travailleurs familiaux"),
        "adhesion_cooperative": (bool, "Adhésion à une coopérative"),
        "region": (str, "Région administrative"),
        "prefecture": (str, "Préfecture"),
        "commune": (str, "Commune"),
    },
    "plantations": {
        "id_plantation": (int, "Identifiant de la plantation"),
        "nom_plantation": (str, "Nom de la plantation"),
        "type_culture": (str, "Culture principale"),
        "superficie_ha": (float, "Superficie en hectares"),
        "annee_plantation": (int, "Année de plantation"),
        "mode_exploitation": (str, "Mode d'exploitation (familial/industriel/coopératif)"),
        "irrigation": (bool, "Dispose d'un système d'irrigation"),
        "region": (str, "Région administrative"),
        "prefecture": (str, "Préfecture"),
    },
    "zaap_formes": {
        "id_zaap": (int, "Identifiant de la ZAAP"),
        "nom_zaap": (str, "Nom de la zone"),
        "type_zaap": (str, "Type (ZAAP / ZAPB)"),
        "statut": (str, "Statut (opérationnel/en construction/planifié)"),
        "superficie_ha": (float, "Superficie totale en hectares"),
        "nombre_exploitants": (int, "Nombre d'exploitants"),
        "annee_creation": (int, "Année de création"),
        "region": (str, "Région administrative"),
        "prefecture": (str, "Préfecture"),
    },
    "zaap_champs": {
        "id_champ": (int, "Identifiant du champ"),
        "id_zaap": (int, "Identifiant de la ZAAP de rattachement"),
        "nom_exploitant": (str, "Nom de l'exploitant (anonymisé)"),
        "superficie_ha": (float, "Superficie en hectares"),
        "type_culture": (str, "Culture pratiquée"),
        "annee_attribution": (int, "Année d'attribution"),
        "region": (str, "Région administrative"),
    },
    "cooperatives": {
        "id_cooperative": (int, "Identifiant de la coopérative"),
        "nom_cooperative": (str, "Nom de la coopérative"),
        "type_cooperative": (str, "Type (agricole/élevage/mixte)"),
        "nombre_membres": (int, "Nombre de membres"),
        "annee_fondation": (int, "Année de fondation"),
        "filiere_principale": (str, "Filière principale"),
        "region": (str, "Région administrative"),
        "prefecture": (str, "Préfecture"),
        "commune": (str, "Commune"),
    },
    "marches": {
        "id_marché": (int, "Identifiant du marché"),
        "nom_marché": (str, "Nom du marché"),
        "type_marché": (str, "Type (rural/urbain/hebdomadaire)"),
        "jour_marché": (str, "Jour du marché"),
        "nombre_commercants": (int, "Nombre estimé de commerçants"),
        "acces_vehicule": (bool, "Accessible en véhicule"),
        "region": (str, "Région administrative"),
        "prefecture": (str, "Préfecture"),
        "commune": (str, "Commune"),
    },
    "pepinieres": {
        "id_pepiniere": (int, "Identifiant de la pépinière"),
        "nom_pepiniere": (str, "Nom de la pépinière"),
        "type_pepiniere": (str, "Type (forestière/agricole/ornementale)"),
        "capacite_plants": (int, "Capacité de production (plants/an)"),
        "especes_principales": (str, "Espèces principales"),
        "annee_creation": (int, "Année de création"),
        "region": (str, "Région administrative"),
        "prefecture": (str, "Préfecture"),
    },
    "regions": {
        "id_region": (int, "Identifiant région"),
        "nom_region": (str, "Nom de la région"),
        "region": (str, "Nom de la région"),
        "name_en": (str, "Nom de la région (anglais)"),
        "capitale": (str, "Capitale régionale"),
        "population": (int, "Population estimée"),
        "superficie_km2": (float, "Superficie en km²"),
        "source": (str, "Source de la donnée"),
        "licence": (str, "Licence"),
        "dataset_version": (str, "Version du dataset source"),
    },
    "agriculture_cadrage": {
        "id_region": (int, "Identifiant région"),
        "region": (str, "Nom de la région"),
        "population_active_agricole": (int, "Population active agricole"),
        "nombre_exploitations": (int, "Nombre total d'exploitations"),
        "surface_agricole_ha": (float, "Surface agricole utile en hectares"),
        "taux_securite_alimentaire": (float, "Taux de sécurité alimentaire (%)"),
        "production_vivriere_t": (float, "Production vivrière en tonnes"),
        "production_rente_t": (float, "Production de rente en tonnes"),
        "taux_acces_eau": (float, "Taux d'accès à l'eau potable (%)"),
    },
}

# ── Geometry types ───────────────────────────────────────────────────
GEOMETRY_TYPES: dict[str, str] = {
    "grandes_exploitations": "Point",
    "petites_exploitations": "Point",
    "plantations": "Polygon",
    "zaap_formes": "Polygon",
    "zaap_champs": "Polygon",
    "cooperatives": "Point",
    "marches": "Point",
    "pepinieres": "Point",
    "agriculture_cadrage": "Polygon",
    "regions": "Polygon",
}

# ── Paramètres de génération mock ────────────────────────────────────
MOCK_SETTINGS = {
    "seed": 42,                     # Pour reproductibilité
    "records_per_dataset": {
        "grandes_exploitations": 55,
        "petites_exploitations": 80,
        "plantations": 50,
        "zaap_formes": 30,
        "zaap_champs": 65,
        "cooperatives": 35,
        "marches": 50,
        "pepinieres": 40,
        "agriculture_cadrage": 5,
        "regions": 5,
    },
    "use_mock": True,               # True = génération mock (hors régions), False = téléchargement réel
}

# ── Frontières administratives réelles (ADM1 + ADM2) ─────────────────
REAL_BOUNDARIES = {
    "regions": {
        "enabled": True,
        "path": "data/raw/geoBoundaries-TGO-ADM1.geojson",
        "provider": "geoBoundaries (gbOpen)",
        "source_url": "https://www.geoboundaries.org/api/current/gbOpen/TGO/ADM1/",
        "download_url": (
            "https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/"
            "9469f09/releaseData/gbOpen/TGO/ADM1/geoBoundaries-TGO-ADM1.geojson"
        ),
        "license": "ODbL-1.0",
        "dataset_version": "gbOpen-TGO-ADM1-9469f09",
    },
    "prefectures": {
        "enabled": True,
        "path": "data/raw/geoBoundaries-TGO-ADM2.geojson",
        "provider": "geoBoundaries (gbOpen)",
        "source_url": "https://www.geoboundaries.org/api/current/gbOpen/TGO/ADM2/",
        "download_url": (
            "https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/"
            "9469f09/releaseData/gbOpen/TGO/ADM2/geoBoundaries-TGO-ADM2.geojson"
        ),
        "license": "ODbL-1.0",
        "dataset_version": "gbOpen-TGO-ADM2-9469f09",
    },
}

# ── Licence et attribution ───────────────────────────────────────────
LICENSE = {
    "spdx": "CC-BY-4.0",
    "name": "Creative Commons Attribution 4.0 International",
    "url": "https://creativecommons.org/licenses/by/4.0/",
}

ATTRIBUTION = {
    "author": "AgriMap Togo — Projet de cartographie des zones blanches de services agricoles",
    "sources": [
        "Géoportail National du Togo — geodata.gouv.tg",
        "Portail Open Data du Togo — opendata.gouv.tg",
    ],
    "note": (
        "Données générées de manière synthétique pour la phase M1 du pipeline. "
        "Les coordonnées sont fictives bien que géographiquement plausibles. "
        "À remplacer par les données officielles dès l'accès API disponible."
    ),
}

# ── Dataset metadata ─────────────────────────────────────────────────
DATASET_INFO: dict[str, dict[str, str]] = {
    "grandes_exploitations": {
        "label": "Grandes exploitations agricoles",
        "description": "Établissements agricoles de grande taille (>10 ha)",
        "path": "data/processed/grandes_exploitations.geojson",
        "raw_url": SOURCE_URLS["grandes_exploitations"],
    },
    "petites_exploitations": {
        "label": "Petites exploitations agricoles",
        "description": "Exploitations familiales de petite taille (<10 ha)",
        "path": "data/processed/petites_exploitations.geojson",
        "raw_url": SOURCE_URLS["petites_exploitations"],
    },
    "plantations": {
        "label": "Plantations agricoles",
        "description": "Plantations (café, cacao, palmier à huile, etc.)",
        "path": "data/processed/plantations.geojson",
        "raw_url": SOURCE_URLS["plantations"],
    },
    "zaap_formes": {
        "label": "ZAAP — formes (périmètres)",
        "description": "Périmètres des Zones d'Aménagement Agricole Planifiées",
        "path": "data/processed/zaap_formes.geojson",
        "raw_url": SOURCE_URLS["zaap_formes"],
    },
    "zaap_champs": {
        "label": "ZAAP et ZAPB — champs individuels",
        "description": "Champs individuels au sein des ZAAP/ZAPB",
        "path": "data/processed/zaap_champs.geojson",
        "raw_url": SOURCE_URLS["zaap_champs"],
    },
    "cooperatives": {
        "label": "Coopératives agricoles",
        "description": "Coopératives et groupements agricoles",
        "path": "data/processed/cooperatives.geojson",
        "raw_url": SOURCE_URLS["cooperatives"],
    },
    "marches": {
        "label": "Marchés",
        "description": "Marchés agricoles et ruraux",
        "path": "data/processed/marches.geojson",
        "raw_url": SOURCE_URLS["marches"],
    },
    "pepinieres": {
        "label": "Pépinières agricoles",
        "description": "Pépinières forestières et agricoles",
        "path": "data/processed/pepinieres.geojson",
        "raw_url": SOURCE_URLS["pepinieres"],
    },
    "agriculture_cadrage": {
        "label": "Agriculture & développement rural",
        "description": "Données de cadrage régional (recensement, statistiques)",
        "path": "data/processed/agriculture_cadrage.geojson",
        "raw_url": SOURCE_URLS["agriculture_cadrage"],
    },
    "regions": {
        "label": "Régions du Togo",
        "description": "Découpage administratif des 5 régions",
        "path": "data/processed/regions.geojson",
        "raw_url": REAL_BOUNDARIES["regions"]["source_url"],
    },
}

# ── Qualité minimale attendue ────────────────────────────────────────
QUALITY_THRESHOLDS = {
    "min_records": 1,                      # Minimum d'enregistrements
    "max_missing_rate": 0.15,              # Taux max de données manquantes (15%)
    "required_fields": ["region"],          # Champs obligatoires
    "geometry_required": True,              # Géométrie toujours requise
}


# ── Helper ───────────────────────────────────────────────────────────
def get_dataset_names() -> list[str]:
    """Retourne la liste des noms de datasets (hors regions)."""
    return [k for k in DATASET_INFO.keys() if k != "regions"]


def get_schema(dataset_name: str) -> dict[str, tuple[type, str]]:
    """Retourne le schéma d'un dataset."""
    return COLUMN_SCHEMAS.get(dataset_name, {})


def get_geometry_type(dataset_name: str) -> str:
    """Retourne le type de géométrie d'un dataset."""
    return GEOMETRY_TYPES.get(dataset_name, "Point")
