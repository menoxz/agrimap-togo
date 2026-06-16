# TASK-M4 : Map & Visualization — Intégration Leaflet

## Mission
Intégrer Leaflet (via react-leaflet) dans l'application React pour afficher la carte interactive du Togo. Implémenter les couches de données (Density, ZAAP, Accessibilité, Coopératives, Synthèse), les filtres (région, type, présence ZAAP), la légende dynamique, et les popups d'information.

## Input
- `data/public/analysis/*.geojson` — données d'analyse pré-calculées
- `data/public/boundaries/*.geojson` — limites administratives
- Composants React de M3 (Layout existant)

## Output
- Composants : TogoMap, DataLayer, DensityLayer, ZAAPLayer, AccessibilityLayer, CoopLayer, SynthesisLayer
- Composants UI : FilterPanel, MapLegend, RegionPopup
- Hooks : useDataLoader, useMapFilters
- Fichier de configuration carte : `src/utils/mapConfig.ts`

## Contraintes spécifiques
- [IMMUTABLE] Bas débit → charger les GeoJSON lazy (uniquement quand l'utilisateur active la couche)
- [IMMUTABLE] Accessibilité visuelle → palettes ColorBrewer pour daltoniens, contrastes suffisants
- [IMMUTABLE] Mobile → Leaflet doit gérer le tactile (zoom, pan, popups)
- Les couches doivent pouvoir s'activer/désactiver indépendamment
- Les points (exploitations, marchés, coopératives) doivent utiliser le clustering si > 500 points
- La légende doit s'adapter dynamiquement à la couche active
- pas de clé API (basemap OSM gratuit)

## Définition of Done (vérifiable)
- [ ] Carte Leaflet centrée sur Togo (lat: 8.5, lon: 1.0, zoom: 7) avec basemap OSM
- [ ] 5 couches d'analyse chargées et affichées correctement
- [ ] Filtres fonctionnels : région (dropdown), type d'exploitation (checkbox)
- [ ] Légende dynamique change selon la couche active
- [ ] Popup région affiche indicateurs (nom FR/EN, densité, score)
- [ ] Performance : rendu initial < 2s, changement de couche < 500ms
- [ ] Clustering actif pour les couches avec > 500 entités
- [ ] Tests Vitest des composants map passent
