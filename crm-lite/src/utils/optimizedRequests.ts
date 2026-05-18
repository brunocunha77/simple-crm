import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

// Cache simples em memória para requisições
class RequestCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  set(key: string, data: any, ttl: number = 5 * 60 * 1000) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > cached.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  clear() {
    this.cache.clear();
  }

  delete(key: string) {
    this.cache.delete(key);
  }
}

const requestCache = new RequestCache();

// Instância otimizada do Axios
export const optimizedAxios: AxiosInstance = axios.create({
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para cache de requisições GET
optimizedAxios.interceptors.request.use((config) => {
  if (config.method === 'get' && config.cache !== false) {
    const cacheKey = `${config.url}${JSON.stringify(config.params)}`;
    const cachedData = requestCache.get(cacheKey);
    
    if (cachedData) {
      // Retornar dados do cache
      return Promise.reject({
        isCached: true,
        data: cachedData,
        config
      });
    }
  }
  return config;
});

// Interceptor para armazenar respostas no cache
optimizedAxios.interceptors.response.use(
  (response) => {
    const config = response.config;
    if (config.method === 'get' && config.cache !== false) {
      const cacheKey = `${config.url}${JSON.stringify(config.params)}`;
      const ttl = config.cacheTTL || 5 * 60 * 1000; // 5 minutos por padrão
      requestCache.set(cacheKey, response.data, ttl);
    }
    return response;
  },
  (error) => {
    // Se for um erro de cache, retornar os dados cached
    if (error.isCached) {
      return Promise.resolve({
        data: error.data,
        status: 200,
        statusText: 'OK (cached)',
        headers: {},
        config: error.config
      });
    }
    return Promise.reject(error);
  }
);

// Utilitário para batch de requisições
export const batchRequests = async <T>(
  requests: (() => Promise<T>)[],
  batchSize: number = 5
): Promise<T[]> => {
  const results: T[] = [];
  
  for (let i = 0; i < requests.length; i += batchSize) {
    const batch = requests.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(request => request()));
    results.push(...batchResults);
  }
  
  return results;
};

// Utilitário para debounce de requisições
export const debounceRequest = <T>(
  requestFn: () => Promise<T>,
  delay: number = 300
): (() => Promise<T>) => {
  let timeoutId: NodeJS.Timeout;
  let lastPromise: Promise<T> | null = null;

  return () => {
    return new Promise((resolve, reject) => {
      clearTimeout(timeoutId);
      
      timeoutId = setTimeout(async () => {
        try {
          if (lastPromise) {
            const result = await lastPromise;
            resolve(result);
          } else {
            lastPromise = requestFn();
            const result = await lastPromise;
            resolve(result);
          }
        } catch (error) {
          reject(error);
        }
      }, delay);
    });
  };
};

// Hook para otimizar requisições com retry automático
export const useOptimizedRequest = () => {
  const retryRequest = async <T>(
    requestFn: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> => {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt)));
        }
      }
    }
    
    throw lastError!;
  };

  return { retryRequest };
};

// Limpar cache quando necessário
export const clearRequestCache = () => {
  requestCache.clear();
};

export default optimizedAxios;
