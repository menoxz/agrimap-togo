import { useMemo } from 'react';
import { useDataLoader } from './useDataLoader';
import type { GeoJsonFeature } from '@/types/map';

// ── Types ──────────────────────────────────────────────────────────────────
export interface RegionStats {
  n_marches: number;
  n_cooperatives: number;
  n_zaap: number;
  n_pepinieres: number;
  n_exploitations: number;
  loading: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────
/**
 * Count GeoJSON features whose `properties.region` matches regionName
 * (case-insensitive, trimmed).
 */
function countByRegion(
  features: GeoJsonFeature[] | undefined,
  regionNorm: string,
): number {
  if (!features || !regionNorm) return 0;
  return features.filter((f) => {
    const r = f.properties.region;
    return typeof r === 'string' && r.trim().toLowerCase() === regionNorm;
  }).length;
}

// ── Hook ───────────────────────────────────────────────────────────────────
/**
 * useRegionStats — Fetches point-level GeoJSON files and counts features per
 * region.
 *
 * All files are fetched from `/data/` (Vite `public/` folder) and results
 * are cached by `useDataLoader`'s module-level Map.
 *
 * @param regionName  Title-case region name matching `properties.region`,
 *                    e.g. "Maritime". Pass empty string to skip.
 */
export function useRegionStats(regionName: string): RegionStats {
  const norm = regionName.trim().toLowerCase();

  // Point datasets — all served from /public/data/
  const { data: marchesData, loading: lM } = useDataLoader(
    norm ? '/data/marches.geojson' : null,
  );
  const { data: coopData, loading: lC } = useDataLoader(
    norm ? '/data/cooperatives.geojson' : null,
  );
  const { data: zaapData, loading: lZ } = useDataLoader(
    norm ? '/data/zaap_formes.geojson' : null,
  );
  const { data: pepData, loading: lP } = useDataLoader(
    norm ? '/data/pepinieres.geojson' : null,
  );
  const { data: grandesData, loading: lG } = useDataLoader(
    norm ? '/data/grandes_exploitations.geojson' : null,
  );
  const { data: petitesData, loading: lPe } = useDataLoader(
    norm ? '/data/petites_exploitations.geojson' : null,
  );
  const { data: plantationsData, loading: lPl } = useDataLoader(
    norm ? '/data/plantations.geojson' : null,
  );

  const loading = lM || lC || lZ || lP || lG || lPe || lPl;

  const stats = useMemo<Omit<RegionStats, 'loading'>>(() => {
    if (!norm) {
      return {
        n_marches: 0,
        n_cooperatives: 0,
        n_zaap: 0,
        n_pepinieres: 0,
        n_exploitations: 0,
      };
    }
    return {
      n_marches: countByRegion(marchesData?.features, norm),
      n_cooperatives: countByRegion(coopData?.features, norm),
      n_zaap: countByRegion(zaapData?.features, norm),
      n_pepinieres: countByRegion(pepData?.features, norm),
      n_exploitations:
        countByRegion(grandesData?.features, norm) +
        countByRegion(petitesData?.features, norm) +
        countByRegion(plantationsData?.features, norm),
    };
  }, [
    norm,
    marchesData,
    coopData,
    zaapData,
    pepData,
    grandesData,
    petitesData,
    plantationsData,
  ]);

  return { ...stats, loading };
}
