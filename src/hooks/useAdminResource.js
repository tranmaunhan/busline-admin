import { useEffect, useState } from 'react';

export function useAdminResource(loader, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');

      try {
        const result = await loader(controller.signal);

        if (!cancelled) {
          setData(result);
        }
      } catch (loadError) {
        if (!cancelled && loadError.name !== 'AbortError') {
          setError(loadError.message || 'Không tải được dữ liệu.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [...deps, reloadKey]);

  return {
    data,
    loading,
    error,
    reload: () => setReloadKey((value) => value + 1),
  };
}
