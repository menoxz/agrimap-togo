import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMapFilters } from '@/hooks/useMapFilters';

describe('useMapFilters', () => {
  it('initializes with default filters', () => {
    const { result } = renderHook(() => useMapFilters());
    expect(result.current.filters.selectedRegion).toBe('');
    expect(result.current.filters.activeLayers).toEqual(['density']);
    expect(result.current.filters.zaapOnlyUncovered).toBe(false);
    expect(result.current.isFiltered).toBe(false);
  });

  it('updates selected region', () => {
    const { result } = renderHook(() => useMapFilters());
    act(() => {
      result.current.setSelectedRegion('kara');
    });
    expect(result.current.filters.selectedRegion).toBe('kara');
    expect(result.current.isFiltered).toBe(true);
  });

  it('sets active layer', () => {
    const { result } = renderHook(() => useMapFilters());
    act(() => {
      result.current.setActiveLayer('zaap');
    });
    expect(result.current.filters.activeLayers).toEqual(['zaap']);
  });

  it('toggles layer on and off', () => {
    const { result } = renderHook(() => useMapFilters());
    act(() => {
      result.current.setActiveLayer('access');
      result.current.toggleLayer('zaap');
    });
    expect(result.current.filters.activeLayers).toEqual(['access', 'zaap']);

    // Toggle off zaap
    act(() => {
      result.current.toggleLayer('zaap');
    });
    expect(result.current.filters.activeLayers).toEqual(['access']);

    // Removing last layer should not change
    act(() => {
      result.current.toggleLayer('access');
    });
    expect(result.current.filters.activeLayers).toEqual(['access']);
  });

  it('toggles zaapOnlyUncovered', () => {
    const { result } = renderHook(() => useMapFilters());
    act(() => {
      result.current.setZaapOnlyUncovered(true);
    });
    expect(result.current.filters.zaapOnlyUncovered).toBe(true);
  });

  it('resets filters to defaults', () => {
    const { result } = renderHook(() => useMapFilters());
    act(() => {
      result.current.setSelectedRegion('savanes');
      result.current.setActiveLayer('synthesis');
      result.current.setZaapOnlyUncovered(true);
    });
    expect(result.current.isFiltered).toBe(true);

    act(() => {
      result.current.resetFilters();
    });
    expect(result.current.filters.selectedRegion).toBe('');
    expect(result.current.filters.activeLayers).toEqual(['density']);
    expect(result.current.filters.zaapOnlyUncovered).toBe(false);
    expect(result.current.isFiltered).toBe(false);
  });
});
