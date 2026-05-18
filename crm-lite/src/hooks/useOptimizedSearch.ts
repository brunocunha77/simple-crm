import { useState, useEffect, useCallback } from 'react';

/**
 * Hook otimizado para debounce de buscas
 * Reduz requisições HTTP desnecessárias
 */
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

/**
 * Hook para otimizar buscas com debounce
 */
export const useOptimizedSearch = (initialValue: string = '', delay: number = 300) => {
  const [searchTerm, setSearchTerm] = useState(initialValue);
  const debouncedSearchTerm = useDebounce(searchTerm, delay);

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchTerm('');
  }, []);

  return {
    searchTerm,
    debouncedSearchTerm,
    handleSearchChange,
    clearSearch,
    isSearching: searchTerm !== debouncedSearchTerm
  };
};

/**
 * Hook para otimizar requisições HTTP com cache
 */
export const useOptimizedFetch = <T>(
  fetchFn: () => Promise<T>,
  dependencies: any[] = [],
  cacheTime: number = 5 * 60 * 1000 // 5 minutos
) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastFetch, setLastFetch] = useState<number>(0);

  const fetchData = useCallback(async () => {
    const now = Date.now();
    
    // Verificar se os dados ainda estão válidos no cache
    if (data && (now - lastFetch) < cacheTime) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fetchFn();
      setData(result);
      setLastFetch(now);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Erro desconhecido'));
    } finally {
      setLoading(false);
    }
  }, [fetchFn, data, lastFetch, cacheTime]);

  useEffect(() => {
    fetchData();
  }, dependencies);

  return {
    data,
    loading,
    error,
    refetch: fetchData
  };
};
