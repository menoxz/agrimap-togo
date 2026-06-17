import { useState, useCallback, useMemo } from 'react';
import type { AnalysisType, MapFilters } from '@/types/map';

interface UseMapFiltersResult {
  filters: MapFilters;
  setSelectedRegion: (region: string) => void;
  setSelectedPrefecture: (prefecture: string) => void;
  toggleLayer: (layer: AnalysisType) => void;
  setActiveLayer: (layer: AnalysisType) => void;
  setZaapOnlyUncovered: (value: boolean) => void;
  resetFilters: () => void;
  isFiltered: boolean;
}

const defaultFilters: MapFilters = {
  selectedRegion: '',
  selectedPrefecture: '',
  activeLayers: ['density'],
  zaapOnlyUncovered: false,
};

export function useMapFilters(): UseMapFiltersResult {
  const [filters, setFilters] = useState<MapFilters>(defaultFilters);

  /** Changing region always resets the prefecture selection. */
  const setSelectedRegion = useCallback((region: string) => {
    setFilters((prev) => ({ ...prev, selectedRegion: region, selectedPrefecture: '' }));
  }, []);

  const setSelectedPrefecture = useCallback((prefecture: string) => {
    setFilters((prev) => ({ ...prev, selectedPrefecture: prefecture }));
  }, []);

  const toggleLayer = useCallback((layer: AnalysisType) => {
    setFilters((prev) => {
      const exists = prev.activeLayers.includes(layer);
      if (exists) {
        // Don't allow removing the last active layer
        if (prev.activeLayers.length <= 1) return prev;
        return {
          ...prev,
          activeLayers: prev.activeLayers.filter((l) => l !== layer),
        };
      }
      return { ...prev, activeLayers: [...prev.activeLayers, layer] };
    });
  }, []);

  const setActiveLayer = useCallback((layer: AnalysisType) => {
    setFilters((prev) => ({
      ...prev,
      activeLayers: [layer],
    }));
  }, []);

  const setZaapOnlyUncovered = useCallback((value: boolean) => {
    setFilters((prev) => ({ ...prev, zaapOnlyUncovered: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, []);

  const isFiltered = useMemo(() => {
    return (
      filters.selectedRegion !== '' ||
      filters.selectedPrefecture !== '' ||
      filters.activeLayers.length !== 1 ||
      filters.activeLayers[0] !== 'density' ||
      filters.zaapOnlyUncovered
    );
  }, [filters]);

  return {
    filters,
    setSelectedRegion,
    setSelectedPrefecture,
    toggleLayer,
    setActiveLayer,
    setZaapOnlyUncovered,
    resetFilters,
    isFiltered,
  };
}
