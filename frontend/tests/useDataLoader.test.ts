import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useDataLoader } from '@/hooks/useDataLoader';

const mockGeoJson = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] },
      properties: { region: 'Test', population: 1000 },
    },
  ],
};

function mockFetchResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('useDataLoader', () => {
  it('returns loading state initially when URL is provided', () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useDataLoader('/test.geojson'));
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('returns null data for null URL without fetching', () => {
    const { result } = renderHook(() => useDataLoader(null));
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('successfully fetches and returns GeoJSON data', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockFetchResponse(mockGeoJson));

    const { result } = renderHook(() => useDataLoader('/test.geojson'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).not.toBeNull();
    expect(result.current.data?.type).toBe('FeatureCollection');
    expect(result.current.data?.features).toHaveLength(1);
    expect(result.current.error).toBeNull();
  });

  it('caches fetched data and avoids re-fetching', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockFetchResponse(mockGeoJson));

    const { result, rerender } = renderHook(() => useDataLoader('/cached-test.geojson'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).not.toBeNull();
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Re-render should use cache
    rerender();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(result.current.loading).toBe(false);
  });

  it('handles network errors gracefully', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network failure'));

    const { result } = renderHook(() => useDataLoader('/error-test.geojson'));

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toContain('Network failure');
  });
});
