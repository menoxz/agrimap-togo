import { useState, useEffect, useRef } from 'react';
import type { GeoJsonFeatureCollection } from '@/types/map';

/**
 * Module-level cache: shared across all component instances.
 * GeoJSON files are relatively small (regions data), so caching in memory is fine.
 */
const dataCache = new Map<string, GeoJsonFeatureCollection>();

interface UseDataLoaderResult {
  data: GeoJsonFeatureCollection | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Load a GeoJSON file from a URL with caching.
 * Only fetches when the URL hasn't been loaded before.
 * An optional filter function can be used to reduce the data client-side.
 */
export function useDataLoader(url: string | null): UseDataLoaderResult {
  const [data, setData] = useState<GeoJsonFeatureCollection | null>(() => {
    if (url && dataCache.has(url)) {
      return dataCache.get(url)!;
    }
    return null;
  });
  const [loading, setLoading] = useState(!(url && dataCache.has(url)));
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = (targetUrl: string) => {
    // Check cache first
    if (dataCache.has(targetUrl)) {
      setData(dataCache.get(targetUrl)!);
      setLoading(false);
      setError(null);
      return;
    }

    // Cancel any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    fetch(targetUrl, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        return res.json() as Promise<GeoJsonFeatureCollection>;
      })
      .then((json) => {
        if (!json || json.type !== 'FeatureCollection') {
          throw new Error('Invalid GeoJSON: not a FeatureCollection');
        }
        dataCache.set(targetUrl, json);
        if (!controller.signal.aborted) {
          setData(json);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : 'Failed to load data');
          setLoading(false);
        }
      });
  };

  useEffect(() => {
    if (url) {
      fetchData(url);
    } else {
      setData(null);
      setLoading(false);
      setError(null);
    }
    return () => {
      abortRef.current?.abort();
    };
  }, [url]);

  const refetch = () => {
    if (url) {
      dataCache.delete(url);
      fetchData(url);
    }
  };

  return { data, loading, error, refetch };
}
