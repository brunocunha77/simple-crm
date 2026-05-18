import { defineConfig } from 'vite';
import { createHtmlPlugin } from 'vite-plugin-html';

// Configuração de cache headers para otimização
export const cacheHeadersConfig = {
  // Assets estáticos (JS, CSS, imagens)
  static: {
    'Cache-Control': 'public, max-age=31536000, immutable', // 1 ano
    'Expires': new Date(Date.now() + 31536000 * 1000).toUTCString()
  },
  
  // HTML principal
  html: {
    'Cache-Control': 'public, max-age=3600', // 1 hora
    'Expires': new Date(Date.now() + 3600 * 1000).toUTCString()
  },
  
  // APIs e dados dinâmicos
  api: {
    'Cache-Control': 'public, max-age=300', // 5 minutos
    'Expires': new Date(Date.now() + 300 * 1000).toUTCString()
  },
  
  // Recursos críticos
  critical: {
    'Cache-Control': 'public, max-age=86400', // 1 dia
    'Expires': new Date(Date.now() + 86400 * 1000).toUTCString()
  }
};

// Plugin para otimizar HTML
export const htmlOptimizationPlugin = createHtmlPlugin({
  minify: {
    removeComments: true,
    collapseWhitespace: true,
    removeAttributeQuotes: true,
    collapseBooleanAttributes: true,
    removeEmptyAttributes: true,
    minifyCSS: true,
    minifyJS: true
  },
  inject: {
    data: {
      title: 'SmartChat - Sistema de CRM Inteligente',
      description: 'Sistema de CRM inteligente com automação WhatsApp',
      keywords: 'CRM, WhatsApp, automação, gestão de leads'
    }
  }
});

// Configuração de compressão
export const compressionConfig = {
  gzip: {
    threshold: 1024, // Comprimir arquivos maiores que 1KB
    compressionLevel: 9, // Máxima compressão
    algorithm: 'gzip'
  },
  brotli: {
    threshold: 1024,
    compressionLevel: 11,
    algorithm: 'brotli'
  }
};
