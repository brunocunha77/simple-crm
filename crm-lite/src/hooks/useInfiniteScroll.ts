import { useState, useEffect, useCallback, useRef } from 'react';

interface UseInfiniteScrollOptions {
  threshold?: number; // Distância do final para triggerar carregamento
  rootMargin?: string; // Margem do root para intersection observer
  enabled?: boolean; // Se o scroll infinito está habilitado
}

interface UseInfiniteScrollReturn<T> {
  data: T[];
  loading: boolean;
  hasMore: boolean;
  error: string | null;
  loadMore: () => void;
  setData: React.Dispatch<React.SetStateAction<T[]>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setHasMore: React.Dispatch<React.SetStateAction<boolean>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  lastElementRef: (node: HTMLDivElement | null) => void;
}

export function useInfiniteScroll<T>(
  fetchFunction: (page: number, fromDate?: string) => Promise<{ data: T[]; hasMore: boolean; totalCount: number }>,
  options: UseInfiniteScrollOptions = {}
): UseInfiniteScrollReturn<T> {
  const {
    threshold = 0.1,
    rootMargin = '100px',
    enabled = true
  } = options;

  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [lastDate, setLastDate] = useState<string | undefined>();

  const observer = useRef<IntersectionObserver | null>(null);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    setError(null);

    try {
      const result = await fetchFunction(page, lastDate);
      
      setData(prevData => {
        // Evitar duplicatas baseado no ID ou data_criacao
        const existingIds = new Set(prevData.map((item: any) => item.id));
        const newData = result.data.filter((item: any) => !existingIds.has(item.id));
        return [...prevData, ...newData];
      });

      setHasMore(result.hasMore);
      setPage(prevPage => prevPage + 1);
      
      // Atualizar lastDate baseado no último item
      if (result.data.length > 0) {
        const lastItem = result.data[result.data.length - 1] as any;
        if (lastItem.data_criacao) {
          setLastDate(lastItem.data_criacao);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, [fetchFunction, page, lastDate, loading, hasMore]);

  const lastElementRef = useCallback((node: HTMLDivElement | null) => {
    if (loading) return;
    
    if (observer.current) {
      observer.current.disconnect();
    }

    observer.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && enabled) {
          loadMore();
        }
      },
      {
        threshold,
        rootMargin
      }
    );

    if (node) {
      observer.current.observe(node);
    }
  }, [loading, hasMore, enabled, threshold, rootMargin, loadMore]);

  // Função para resetar o estado (útil quando filtros mudam)
  const reset = useCallback(() => {
    setData([]);
    setPage(0);
    setLastDate(undefined);
    setHasMore(true);
    setError(null);
  }, []);

  // Expor função de reset
  useEffect(() => {
    (setData as any).reset = reset;
  }, [reset]);

  // Carregamento inicial automático quando habilitado
  useEffect(() => {
    if (enabled && data.length === 0 && !loading && hasMore) {
      loadMore();
    }
  }, [enabled, data.length, loading, hasMore, loadMore]);

  return {
    data,
    loading,
    hasMore,
    error,
    loadMore,
    setData,
    setLoading,
    setHasMore,
    setError,
    lastElementRef
  };
}
