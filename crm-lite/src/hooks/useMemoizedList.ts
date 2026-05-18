import { useMemo } from 'react';

interface UseMemoizedListOptions<T> {
  items: T[];
  keyExtractor: (item: T) => string | number;
  dependencies?: React.DependencyList;
}

export function useMemoizedList<T>({
  items,
  keyExtractor,
  dependencies = []
}: UseMemoizedListOptions<T>) {
  return useMemo(() => {
    // Criar um mapa para evitar re-renderizações desnecessárias
    const itemMap = new Map<string | number, T>();
    const itemKeys: (string | number)[] = [];
    
    items.forEach(item => {
      const key = keyExtractor(item);
      itemMap.set(key, item);
      itemKeys.push(key);
    });
    
    return {
      items,
      itemMap,
      itemKeys,
      getItem: (key: string | number) => itemMap.get(key),
      hasItem: (key: string | number) => itemMap.has(key)
    };
  }, [items, keyExtractor, ...dependencies]);
}

// Hook para memoizar filtros de lista
export function useMemoizedFilter<T>(
  items: T[],
  filterFn: (item: T) => boolean,
  dependencies: React.DependencyList = []
) {
  return useMemo(() => {
    return items.filter(filterFn);
  }, [items, filterFn, ...dependencies]);
}

// Hook para memoizar ordenação de lista
export function useMemoizedSort<T>(
  items: T[],
  sortFn: (a: T, b: T) => number,
  dependencies: React.DependencyList = []
) {
  return useMemo(() => {
    return [...items].sort(sortFn);
  }, [items, sortFn, ...dependencies]);
}

