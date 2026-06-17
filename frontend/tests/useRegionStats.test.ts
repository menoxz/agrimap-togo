import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useRegionStats } from '@/hooks/useRegionStats';

// ── Fixtures ──────────────────────────────────────────────────────────────
const makeFc = (features: Array<{ region: string }>) => ({
  type: 'FeatureCollection',
  features: features.map((f) => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [0, 0] },
    properties: f,
  })),
});

const MARCHES = makeFc([
  { region: 'Maritime' },
  { region: 'Maritime' },
  { region: 'Kara' },
]);
const COOPS = makeFc([
  { region: 'Maritime' },
  { region: 'Savanes' },
]);
const ZAAP = makeFc([
  { region: 'Maritime' },
  { region: 'Maritime' },
  { region: 'Maritime' },
]);
const PEPINIERES = makeFc([
  { region: 'Maritime' },
]);
const GRANDES = makeFc([
  { region: 'Maritime' },
  { region: 'Maritime' },
]);
const PETITES = makeFc([
  { region: 'Maritime' },
  { region: 'Maritime' },
  { region: 'Maritime' },
]);
const PLANTATIONS = makeFc([
  { region: 'Maritime' },
]);

function mockFetch(data: unknown) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('useRegionStats', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns zeros and loading:false when regionName is empty', () => {
    const { result } = renderHook(() => useRegionStats(''));
    expect(result.current.n_marches).toBe(0);
    expect(result.current.n_cooperatives).toBe(0);
    expect(result.current.n_zaap).toBe(0);
    expect(result.current.n_pepinieres).toBe(0);
    expect(result.current.n_exploitations).toBe(0);
    expect(result.current.loading).toBe(false);
  });

  it('correctly counts features per region after fetch', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((url) => {
      const u = String(url);
      if (u.includes('marches')) return Promise.resolve(mockFetch(MARCHES));
      if (u.includes('cooperatives')) return Promise.resolve(mockFetch(COOPS));
      if (u.includes('zaap_formes')) return Promise.resolve(mockFetch(ZAAP));
      if (u.includes('pepinieres')) return Promise.resolve(mockFetch(PEPINIERES));
      if (u.includes('grandes_exploitations')) return Promise.resolve(mockFetch(GRANDES));
      if (u.includes('petites_exploitations')) return Promise.resolve(mockFetch(PETITES));
      if (u.includes('plantations')) return Promise.resolve(mockFetch(PLANTATIONS));
      return Promise.resolve(mockFetch({ type: 'FeatureCollection', features: [] }));
    });

    const { result } = renderHook(() => useRegionStats('Maritime'));

    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 3000 });

    expect(result.current.n_marches).toBe(2);
    expect(result.current.n_cooperatives).toBe(1);
    expect(result.current.n_zaap).toBe(3);
    expect(result.current.n_pepinieres).toBe(1);
    // 2 grandes + 3 petites + 1 plantation = 6
    expect(result.current.n_exploitations).toBe(6);
  });

  it('is case-insensitive when matching region names', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((url) => {
      const u = String(url);
      if (u.includes('marches')) return Promise.resolve(mockFetch(MARCHES));
      return Promise.resolve(mockFetch({ type: 'FeatureCollection', features: [] }));
    });

    const { result } = renderHook(() => useRegionStats('maritime')); // lowercase

    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 3000 });

    expect(result.current.n_marches).toBe(2); // still matches "Maritime"
  });

  it('returns 0 counts for a region with no matching features', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(mockFetch(MARCHES)),
    );

    const { result } = renderHook(() => useRegionStats('Savanes'));

    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 3000 });

    expect(result.current.n_marches).toBe(0);
  });
});
