"""Script de vérification des scores post-pipeline."""
import json
from pathlib import Path

BASE = Path("data/public/analysis")

s = json.loads((BASE / "synthesis.geojson").read_text(encoding="utf-8"))
c = json.loads((BASE / "cooperative_network.geojson").read_text(encoding="utf-8"))
d = json.loads((BASE / "density.geojson").read_text(encoding="utf-8"))

print("=== SCORES SYNTHESE ===")
for f in sorted(s["features"], key=lambda x: x["properties"]["synthesis_class"]):
    p = f["properties"]
    lbl = p.get("priority_label", "")[:32]
    ds = p.get("density_score", 0)
    cs = p.get("coop_score", 0)
    zs = p.get("zaap_score", 0)
    as_ = p.get("access_score", 0)
    print(
        f"  {p['nom_region']:10s}  synth={p['synthesis_score']:.1f}"
        f"  cls={p['synthesis_class']}"
        f"  dens={ds:.1f}  zaap={zs:.1f}  acc={as_:.1f}  coop={cs:.1f}"
        f"  [{lbl}]"
    )

print()
print("=== WHITE_ZONE_PCT (coopératives) ===")
for f in c["features"]:
    p = f["properties"]
    wz = p["white_zone_pct"]
    nc = p["n_cooperatives"]
    coop_sc = 100 - wz
    print(
        f"  {p['nom_region']:10s}  white_pct={wz:.1f}%"
        f"  n_coop={nc}  coop_score={coop_sc:.1f}"
    )

print()
print("=== DENSITY RAW ===")
for f in d["features"]:
    p = f["properties"]
    dn = p.get("density", 0)
    dc = p.get("density_class", "?")
    print(f"  {p['nom_region']:10s}  density={dn:.5f}  density_class={dc}")

print()
print("=== VALIDATIONS ===")
synth = {f["properties"]["nom_region"]: f["properties"] for f in s["features"]}
coop  = {f["properties"]["nom_region"]: f["properties"] for f in c["features"]}

checks = [
    ("Bug 1: Savanes density_score > 0",
     synth["Savanes"]["density_score"] > 0),
    ("Bug 2: Centrale coop_score > 0",
     synth["Centrale"]["coop_score"] > 0),
    ("Bug 3: Plateaux density_score < 100",
     synth["Plateaux"]["density_score"] < 100),
    ("Bug 4: Maritime coop_score coheent",
     synth["Maritime"]["synthesis_score"] > 0),
    ("Coherence: Plateaux label != 'Zone bien desservie' (white_pct=77%)",
     synth["Plateaux"]["priority_label"] != "Zone bien desservie"),
    ("Centrale white_zone_pct < 100 (a 2 coops)",
     coop["Centrale"]["white_zone_pct"] < 100),
]

all_ok = True
for desc, result in checks:
    status = "OK" if result else "FAIL"
    if not result:
        all_ok = False
    print(f"  [{status}] {desc}")

print()
print("BILAN:", "TOUS LES CHECKS PASSENT" if all_ok else "ECHECS DETECTES")
