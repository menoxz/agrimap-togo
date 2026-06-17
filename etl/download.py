"""
AgriMap Togo — Module de téléchargement des données (M1).

DEUX MODES :
1. MOCK (par défaut) : génère des données GeoJSON synthétiques
   mais crédibles, basées sur les schémas définis dans config.py.
2. LIVE : télécharge depuis les APIs geodata.gouv.tg / opendata.gouv.tg
   (quand les URLs seront disponibles).

Les données mock sont conçues pour être réalistes :
- Coordonnées aléatoires mais dans les limites du Togo
- Distributions régionales plausibles
- Noms de lieux, cultures, types réalistes
"""

import random
from pathlib import Path
from typing import Any

from etl.config import (
    DATASET_INFO,
    MOCK_SETTINGS,
    REAL_BOUNDARIES,
    REGIONS,
    TOGO_BOUNDS,
    get_schema,
    get_geometry_type,
)
from etl.utils.geo import (
    random_point_in_togo,
    random_point_in_region,
    random_polygon_in_togo,
    random_polygon_in_region,
)
from etl.utils.io import PipelineLogger


# ── Données de référence pour le mock ────────────────────────────────
# Ces listes rendent les données générées plus réalistes.

CROP_TYPES: list[str] = [
    "Maïs", "Sorgho", "Manioc", "Igname", "Riz", "Mil",
    "Café", "Cacao", "Coton", "Arachide", "Niébé",
    "Palmier à huile", "Anacarde", "Banane plantain",
    "Tomate", "Oignon", "Piment", "Gombo", "Soja",
]

REGION_NAMES: list[str] = [r["name"] for r in REGIONS]

PREFECTURES: dict[str, list[str]] = {
    "Maritime": ["Lomé", "Golfe", "Lacs", "Bas-Mono", "Yoto", "Zio", "Vo", "Avé"],
    "Plateaux": ["Ogou", "Haho", "Kloto", "Wawa", "Amou", "Danyi", "Moyen-Mono",
                  "Est-Mono", "Anié", "Kpélé", "Agou", "Akébou"],
    "Centrale": ["Tchaoudjo", "Tchamba", "Sotouboua", "Blitta", "Mô", "Anié"],
    "Kara": ["Kozah", "Binah", "Doufelgou", "Kéran", "Assoli", "Bassar", "Dankpen"],
    "Savanes": ["Tône", "Cinkassé", "Oti", "Tandjouaré", "Kpendjal"],
}

COMMUNES: dict[str, list[str]] = {
    "Maritime": ["Lomé", "Baguida", "Aflao", "Tsévié", "Tabligbo", "Aného",
                  "Vogan", "Noépé", "Davidi", "Assahoun"],
    "Plateaux": ["Atakpamé", "Kpalimé", "Badou", "Notse", "Amlamé", "Anié",
                  "Elavagnon", "Agbélouvé", "Glei", "Kamina"],
    "Centrale": ["Sokodé", "Tchamba", "Sotouboua", "Blitta", "Bafilo",
                  "Koussountou", "Lama-Kara"],
    "Kara": ["Kara", "Pagouda", "Niamtougou", "Kandé", "Bassar", "Guérin-Kouka",
              "Kétao", "Lama-Kara"],
    "Savanes": ["Dapaong", "Mango", "Cinkassé", "Tandjouaré", "Naki-Est",
                 "Nohou", "Biankouri"],
}

EXPLOITANT_NAMES: list[str] = [
    "Exploitant ANONYME-001", "Exploitant ANONYME-002", "Exploitant ANONYME-003",
    "Exploitant ANONYME-004", "Exploitant ANONYME-005", "Exploitant ANONYME-006",
    "Exploitant ANONYME-007", "Exploitant ANONYME-008", "Exploitant ANONYME-009",
    "Exploitant ANONYME-010",
]

EXPLOITATION_NAMES: list[str] = [
    "Ferme Moderne", "Domaine Agricole", "Exploitation Agricole",
    "Ferme Familiale", "Coopérative Agricole", "Ferme Pilote",
    "Domaine Rural", "Ferme Intégrée", "Exploitation Maraîchère",
    "Ferme Agropastorale", "Domaine Agroforestier", "Ferme de Rente",
]

ZAAP_NAMES: list[str] = [
    "ZAAP Zio", "ZAAP Haho", "ZAAP Mono", "ZAAP Ogou", "ZAAP Tchaoudjo",
    "ZAAP Kozah", "ZAAP Tône", "ZAAP Sotouboua", "ZAAP Bas-Mono",
    "ZAAP Amou", "ZAAP Wawa", "ZAAP Kloto",
]

MARCHE_TYPES: list[str] = ["Rural", "Urbain", "Hebdomadaire"]
JOURS_MARCHE: list[str] = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]

PEPINIERE_TYPES: list[str] = ["Forestière", "Agricole", "Ornementale", "Mixte"]
COOPERATIVE_TYPES: list[str] = ["Agricole", "Élevage", "Mixte"]
FILIERES: list[str] = [
    "Céréales", "Racines/Tubercules", "Café/Cacao", "Coton",
    "Fruits/Légumes", "Élevage", "Palmeraie", "Anacarde",
]

STATUTS_ZAAP: list[str] = ["Opérationnel", "En construction", "Planifié"]
MODE_EXPLOITATION: list[str] = ["Familial", "Industriel", "Coopératif"]

REGION_NAME_MAP: dict[str, str] = {
    "Maritime Region": "Maritime",
    "Plateaux Region": "Plateaux",
    "Centrale Region": "Centrale",
    "Kara Region": "Kara",
    "Savanes Region": "Savanes",
}

REGION_POPULATION: dict[str, int] = {
    "Maritime": 2800000,
    "Plateaux": 1800000,
    "Centrale": 800000,
    "Kara": 900000,
    "Savanes": 700000,
}

REGION_CAPITAL: dict[str, str] = {
    r["name"]: r["capital"] for r in REGIONS
}

REGION_AREA_KM2: dict[str, float] = {
    r["name"]: float(r["area_km2"]) for r in REGIONS
}

# Rapprocher l'offset du centre pour que les points soient réalistes
def _pick_region(rng: random.Random) -> str:
    """Sélectionne une région avec probabilité basée sur l'activité agricole."""
    # Poids : Plateaux et Maritime ont plus d'activité agricole
    weights = [0.25, 0.30, 0.20, 0.15, 0.10]  # Maritime, Plateaux, Centrale, Kara, Savanes
    return rng.choices(REGION_NAMES, weights=weights)[0]


def _pick_region_marches(rng: random.Random) -> str:
    """Sélectionne une région pour les marchés, avec surpondération Maritime.

    Fix Bug 4 : Maritime est la région côtière la plus urbanisée du Togo.
    Avec les poids généraux (_pick_region, 25%), elle ne recevait pas assez
    de marchés pour que les buffers d'accessibilité la couvrent correctement.
    On porte son poids à 40% pour générer ~20 marchés en Maritime (vs ~13).
    """
    weights = [0.40, 0.25, 0.15, 0.12, 0.08]  # Maritime, Plateaux, Centrale, Kara, Savanes
    return rng.choices(REGION_NAMES, weights=weights)[0]


# ── Générateurs de datasets ──────────────────────────────────────────

def generate_grandes_exploitations(
    rng: random.Random,
    count: int,
) -> list[dict[str, Any]]:
    """Génère des grandes exploitations (>10 ha)."""
    features = []
    for i in range(1, count + 1):
        region = _pick_region(rng)
        lon, lat = random_point_in_region(rng, region)
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [lon, lat]},
            "properties": {
                "id_etablissement": i,
                "nom_exploitation": rng.choice(EXPLOITATION_NAMES),
                "type_culture": rng.choice(CROP_TYPES),
                "superficie_ha": round(rng.uniform(10.0, 200.0), 2),
                "annee_installation": rng.randint(1990, 2024),
                "region": region,
                "prefecture": rng.choice(PREFECTURES[region]),
                "commune": rng.choice(COMMUNES[region]),
                "source": "geodata.gouv.tg",
                "licence": "CC-BY-4.0",
            },
        })
    return features


def generate_petites_exploitations(
    rng: random.Random,
    count: int,
) -> list[dict[str, Any]]:
    """Génère des petites exploitations familiales (<10 ha)."""
    features = []
    for i in range(1, count + 1):
        region = _pick_region(rng)
        lon, lat = random_point_in_region(rng, region)
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [lon, lat]},
            "properties": {
                "id_exploitation": i,
                "nom_exploitant": rng.choice(EXPLOITANT_NAMES),
                "type_culture": rng.choice(CROP_TYPES[:10]),  # cultures vivrières surtout
                "superficie_ha": round(rng.uniform(0.5, 9.5), 2),
                "nombre_actifs": rng.randint(1, 8),
                "adhesion_cooperative": rng.random() < 0.35,
                "region": region,
                "prefecture": rng.choice(PREFECTURES[region]),
                "commune": rng.choice(COMMUNES[region]),
            },
        })
    return features


def generate_plantations(
    rng: random.Random,
    count: int,
) -> list[dict[str, Any]]:
    """Génère des plantations (polygones)."""
    plantation_crops = ["Café", "Cacao", "Palmier à huile", "Anacarde",
                        "Coton", "Banane plantain", "Hévéa"]
    features = []
    for i in range(1, count + 1):
        region = _pick_region(rng)
        coords = random_polygon_in_region(rng, region, radius_deg=0.015 + rng.random() * 0.025)
        features.append({
            "type": "Feature",
            "geometry": {"type": "Polygon", "coordinates": [coords]},
            "properties": {
                "id_plantation": i,
                "nom_plantation": f"{rng.choice(EXPLOITATION_NAMES)} #{i}",
                "type_culture": rng.choice(plantation_crops),
                "superficie_ha": round(rng.uniform(5.0, 80.0), 2),
                "annee_plantation": rng.randint(1995, 2024),
                "mode_exploitation": rng.choice(MODE_EXPLOITATION),
                "irrigation": rng.random() < 0.3,
                "region": region,
                "prefecture": rng.choice(PREFECTURES[region]),
            },
        })
    return features


def generate_zaap_formes(
    rng: random.Random,
    count: int,
) -> list[dict[str, Any]]:
    """Génère des périmètres ZAAP (polygones)."""
    features = []
    for i in range(1, count + 1):
        region = _pick_region(rng)
        # Les ZAAP sont plus grandes
        coords = random_polygon_in_region(
            rng, region,
            radius_deg=0.03 + rng.random() * 0.05,
            vertices=8,
        )
        features.append({
            "type": "Feature",
            "geometry": {"type": "Polygon", "coordinates": [coords]},
            "properties": {
                "id_zaap": i,
                "nom_zaap": rng.choice(ZAAP_NAMES) + f" #{i}",
                "type_zaap": rng.choice(["ZAAP", "ZAAP", "ZAAP", "ZAPB"]),
                "statut": rng.choice(STATUTS_ZAAP),
                "superficie_ha": round(rng.uniform(20.0, 500.0), 2),
                "nombre_exploitants": rng.randint(20, 500),
                "annee_creation": rng.randint(2010, 2024),
                "region": region,
                "prefecture": rng.choice(PREFECTURES[region]),
            },
        })
    return features


def generate_zaap_champs(
    rng: random.Random,
    count: int,
) -> list[dict[str, Any]]:
    """Génère des champs individuels ZAAP (polygones)."""
    features = []
    for i in range(1, count + 1):
        region = _pick_region(rng)
        coords = random_polygon_in_region(
            rng, region,
            radius_deg=0.005 + rng.random() * 0.015,
            vertices=5,
        )
        features.append({
            "type": "Feature",
            "geometry": {"type": "Polygon", "coordinates": [coords]},
            "properties": {
                "id_champ": i,
                "id_zaap": rng.randint(1, 30),
                "nom_exploitant": rng.choice(EXPLOITANT_NAMES),
                "superficie_ha": round(rng.uniform(0.1, 5.0), 2),
                "type_culture": rng.choice(CROP_TYPES),
                "annee_attribution": rng.randint(2015, 2024),
                "region": region,
            },
        })
    return features


def generate_cooperatives(
    rng: random.Random,
    count: int,
) -> list[dict[str, Any]]:
    """Génère des coopératives agricoles (points)."""
    features = []
    for i in range(1, count + 1):
        region = _pick_region(rng)
        lon, lat = random_point_in_region(rng, region)
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [lon, lat]},
            "properties": {
                "id_cooperative": i,
                "nom_cooperative": f"Coopérative {rng.choice(FILIERES)} #{i}",
                "type_cooperative": rng.choice(COOPERATIVE_TYPES),
                "nombre_membres": rng.randint(10, 500),
                "annee_fondation": rng.randint(1990, 2024),
                "filiere_principale": rng.choice(FILIERES),
                "region": region,
                "prefecture": rng.choice(PREFECTURES[region]),
                "commune": rng.choice(COMMUNES[region]),
            },
        })
    return features


def generate_marches(
    rng: random.Random,
    count: int,
) -> list[dict[str, Any]]:
    """Génère des marchés (points)."""
    features = []
    for i in range(1, count + 1):
        region = _pick_region_marches(rng)  # surpondération Maritime (fix Bug 4)
        lon, lat = random_point_in_region(rng, region)
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [lon, lat]},
            "properties": {
                "id_marché": i,
                "nom_marché": f"Marché {['Central', 'Rural', 'Hebdo', 'Nord', 'Sud', 'Est', 'Ouest', 'Principal'][rng.randint(0, 7)]} #{i}",
                "type_marché": rng.choice(MARCHE_TYPES),
                "jour_marché": rng.choice(JOURS_MARCHE),
                "nombre_commercants": rng.randint(10, 2000),
                "acces_vehicule": rng.random() < 0.7,
                "region": region,
                "prefecture": rng.choice(PREFECTURES[region]),
                "commune": rng.choice(COMMUNES[region]),
            },
        })
    return features


def generate_pepinieres(
    rng: random.Random,
    count: int,
) -> list[dict[str, Any]]:
    """Génère des pépinières agricoles (points)."""
    especes_options = [
        "Acacia, Eucalyptus, Teck",
        "Manguier, Avocatier, Agrumes",
        "Caféier, Cacaoyer",
        "Anacardier, Palmier à huile",
        "Goyavier, Moringa, Baobab",
        "Eucalyptus, Acacia, Leucaena",
        "Agrumes, Manguier, Goyavier",
    ]
    features = []
    for i in range(1, count + 1):
        region = _pick_region(rng)
        lon, lat = random_point_in_region(rng, region)
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [lon, lat]},
            "properties": {
                "id_pepiniere": i,
                "nom_pepiniere": f"Pépinière {['Forestière', 'Agricole', 'Fruitière', 'Communautaire'][rng.randint(0, 3)]} #{i}",
                "type_pepiniere": rng.choice(PEPINIERE_TYPES),
                "capacite_plants": rng.randint(1000, 100000),
                "especes_principales": rng.choice(especes_options),
                "annee_creation": rng.randint(2000, 2024),
                "region": region,
                "prefecture": rng.choice(PREFECTURES[region]),
            },
        })
    return features


def generate_agriculture_cadrage(
    rng: random.Random,
) -> list[dict[str, Any]]:
    """Génère des données de cadrage régional (1 polygone par région)."""
    # Statistiques agricoles fictives mais crédibles par région
    cadrage_data: list[dict[str, Any]] = [
        {
            "id_region": 1, "region": "Maritime",
            "population_active_agricole": 280000,
            "nombre_exploitations": 65000,
            "surface_agricole_ha": 180000.0,
            "taux_securite_alimentaire": 82.0,
            "production_vivriere_t": 350000.0,
            "production_rente_t": 85000.0,
            "taux_acces_eau": 75.0,
        },
        {
            "id_region": 2, "region": "Plateaux",
            "population_active_agricole": 420000,
            "nombre_exploitations": 95000,
            "surface_agricole_ha": 350000.0,
            "taux_securite_alimentaire": 78.0,
            "production_vivriere_t": 520000.0,
            "production_rente_t": 180000.0,
            "taux_acces_eau": 62.0,
        },
        {
            "id_region": 3, "region": "Centrale",
            "population_active_agricole": 220000,
            "nombre_exploitations": 50000,
            "surface_agricole_ha": 220000.0,
            "taux_securite_alimentaire": 72.0,
            "production_vivriere_t": 280000.0,
            "production_rente_t": 60000.0,
            "taux_acces_eau": 55.0,
        },
        {
            "id_region": 4, "region": "Kara",
            "population_active_agricole": 190000,
            "nombre_exploitations": 42000,
            "surface_agricole_ha": 160000.0,
            "taux_securite_alimentaire": 70.0,
            "production_vivriere_t": 220000.0,
            "production_rente_t": 45000.0,
            "taux_acces_eau": 50.0,
        },
        {
            "id_region": 5, "region": "Savanes",
            "population_active_agricole": 170000,
            "nombre_exploitations": 38000,
            "surface_agricole_ha": 140000.0,
            "taux_securite_alimentaire": 65.0,
            "production_vivriere_t": 180000.0,
            "production_rente_t": 30000.0,
            "taux_acces_eau": 45.0,
        },
    ]

    real_region_geometries = {
        f["properties"]["nom_region"]: f["geometry"]
        for f in load_real_regions()
    }

    features = []
    for data in cadrage_data:
        geometry = real_region_geometries.get(data["region"])
        if geometry is None:
            continue
        features.append({
            "type": "Feature",
            "geometry": geometry,
            "properties": data,
        })
    return features


def load_real_regions() -> list[dict[str, Any]]:
    """
    Charge les frontières administratives réelles (ADM1) du Togo depuis geoBoundaries.
    """
    src = REAL_BOUNDARIES["regions"]
    path = Path(src["path"])
    if not path.exists():
        raise FileNotFoundError(f"Frontières régionales introuvables : {path}")

    import json

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
                "population": REGION_POPULATION.get(region_name),
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


def generate_regions(rng: random.Random) -> list[dict[str, Any]]:
    """Retourne les contours administratifs réels des 5 régions du Togo."""
    return load_real_regions()


# ── GÉNÉRATEUR PRINCIPAL ─────────────────────────────────────────────

GENERATORS: dict[str, callable] = {
    "grandes_exploitations": generate_grandes_exploitations,
    "petites_exploitations": generate_petites_exploitations,
    "plantations": generate_plantations,
    "zaap_formes": generate_zaap_formes,
    "zaap_champs": generate_zaap_champs,
    "cooperatives": generate_cooperatives,
    "marches": generate_marches,
    "pepinieres": generate_pepinieres,
    "agriculture_cadrage": generate_agriculture_cadrage,
    "regions": generate_regions,
}


def generate_mock_dataset(
    dataset_name: str,
    rng: random.Random | None = None,
    count: int | None = None,
) -> list[dict[str, Any]]:
    """
    Génère un dataset mock complet.

    Paramètres
    ----------
    dataset_name : str
        Nom du dataset (clé dans GENERATORS)
    rng : Random, optional
        Générateur aléatoire (pour reproductibilité)
    count : int, optional
        Nombre d'enregistrements (defaut: depuis MOCK_SETTINGS)

    Retourne
    --------
    list[dict]
        Liste de features GeoJSON
    """
    if rng is None:
        rng = random.Random(MOCK_SETTINGS["seed"])

    if count is None:
        count = MOCK_SETTINGS["records_per_dataset"].get(dataset_name, 50)

    generator = GENERATORS.get(dataset_name)
    if generator is None:
        raise ValueError(f"Dataset inconnu : {dataset_name}")

    if dataset_name == "agriculture_cadrage":
        return generator(rng)  # Nombre fixe (5 régions)
    elif dataset_name == "regions":
        return generator(rng)  # Nombre fixe (5 régions)
    else:
        return generator(rng, count)


def download_all(
    logger: PipelineLogger | None = None,
) -> dict[str, list[dict[str, Any]]]:
    """
    Exécute le téléchargement (ou génération) de tous les datasets.

    Retourne un dict {nom_dataset: [features]}.
    """
    if logger is None:
        logger = PipelineLogger()

    logger.section("TÉLÉCHARGEMENT / GÉNÉRATION DES DONNÉES")

    rng = random.Random(MOCK_SETTINGS["seed"])
    all_data: dict[str, list[dict[str, Any]]] = {}

    if MOCK_SETTINGS["use_mock"]:
        logger.step("Mode MOCK activé (génération de données synthétiques)", "MOCK")
    else:
        logger.step("Mode LIVE activé (téléchargement depuis les APIs)", "LIVE")
        # TODO: implémenter le téléchargement HTTP quand les URLs seront disponibles
        logger.step("⚠ Mode LIVE non disponible — basculement en mode MOCK", "WARN")
        MOCK_SETTINGS["use_mock"] = True

    # Générer les datasets dans l'ordre
    dataset_names = [
        "grandes_exploitations", "petites_exploitations", "plantations",
        "zaap_formes", "zaap_champs", "cooperatives",
        "marches", "pepinieres", "agriculture_cadrage",
    ]

    for name in dataset_names:
        count = MOCK_SETTINGS["records_per_dataset"][name]
        logger.step(f"{DATASET_INFO[name]['label']} ({count} enregistrements)", "GÉN")
        all_data[name] = generate_mock_dataset(name, rng, count)

    # Régions (frontières réelles)
    logger.step("Contours administratifs réels — Régions du Togo (5 régions)", "SRC")
    all_data["regions"] = generate_mock_dataset("regions", rng)

    logger.step(f"{sum(len(v) for v in all_data.values())} enregistrements générés", "OK")

    return all_data
