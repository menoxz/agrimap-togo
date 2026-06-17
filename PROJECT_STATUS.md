# PROJECT STATUS — AgriMap Togo

> **Status**: Production — Complete  
> **Date**: 2026-06-17  
> **Commit**: [fa9da99](https://github.com/menoxz/agrimap-togo/commit/fa9da99)  
> **Live**: https://agrimap.favoured.cloud

---

## Definition of Done — Final Checklist

| # | Item | Status |
|---|------|--------|
| 1 | Anomalies ETL corrigées : `density_score` Savanes 0→16, `coop_score` Centrale 0→15, classification Plateaux cohérente, `avg_distance_km` calculé (7–33 km range) | ✅ |
| 2 | Couche préfecture ADM2 générée et affichée sur Explorer (37 préfectures, geoBoundaries) | ✅ |
| 3 | Marqueurs individuels (marchés, coopératives, ZAAP, pépinières) visibles avec popups | ✅ |
| 4 | Boutons download GeoJSON/CSV par couche dans FilterPanel | ✅ |
| 5 | ZoneDetailPanel affiche chiffres absolus (`n_exploitations`, `n_cooperatives`, `avg_distance_km`) | ✅ |
| 6 | 0 erreur TypeScript — 35/35 Vitest — 210/210 pytest — bundle ~175 kB gzip (< 300 kB) | ✅ |
| 7 | Déployé sur agrimap.favoured.cloud — 7/7 routes HTTP 200 | ✅ |

---

## Module Status

| Module | Status | Tests | Notes |
|--------|--------|-------|-------|
| ETL Pipeline | Production | 210/210 pytest | Real ADM1 bounds, OSM Overpass, `avg_distance_km` |
| Data Quality | Production | — | 50/50 marchés dans Togo, 35/35 coopératives dans Togo |
| Frontend Explorer | Production | 35/35 Vitest | Markers, Prefecture layer, download buttons |
| ZoneDetailPanel | Production | — | Chiffres absolus, fallback distances |
| Docker Deploy | Production | 7/7 smoke | VPS 62.72.32.138, port 3080, healthcheck IPv4 fixed |

---

## Key Technical Decisions

| Decision | Rationale |
|----------|-----------|
| **Rejection sampling** via `shapely.within()` | Génère des points strictement à l'intérieur des polygones ADM1 réels — élimine les artefacts hors-frontières |
| **`avg_distance_km` via geopandas UTM EPSG:32631** | Distances métriques réelles (non-distordues) calculées en projection conforme pour le Togo |
| **`coop_count` = alias `n_cooperatives`** dans `synthesis.geojson` | Compatibilité frontend sans duplication de champ |
| **Couche préfecture opt-in** (`default: false`) | GeoJSON 371 kB chargé à la demande seulement — évite le surcoût réseau au démarrage |
| **Healthcheck docker-compose** : `wget http://127.0.0.1/` | Fix IPv6 → IPv4 pour compatibilité VPS sans double-stack configuré |
| **VPS deploy flow** : clone dans `/tmp/agrimap-build`, build, `docker compose up` depuis `/opt/agrimap` | Sépare build temporaire du répertoire de service permanent |

---

## Infrastructure

| Resource | Value |
|----------|-------|
| VPS IP | 62.72.32.138 |
| Exposed port | 3080 → 80 (nginx reverse proxy) |
| Docker healthcheck | `wget http://127.0.0.1/` (IPv4 forced) |
| Deploy path | `/opt/agrimap` |
| Build path | `/tmp/agrimap-build` (ephemeral) |

---

## Links

- **Application** : https://agrimap.favoured.cloud  
- **Repository** : https://github.com/menoxz/agrimap-togo  
- **Commit** : `fa9da99`

---

## Test Summary

```
ETL / Python
  pytest: 210/210 passed

Frontend / TypeScript
  vitest:  35/35  passed
  TS errors: 0

Smoke (production)
  HTTP routes: 7/7 → 200 OK
  Bundle size: ~175 kB gzip (limit: 300 kB)
```

---

*Document generated automatically from final DoD — AgriMap Togo v1.0.0*
