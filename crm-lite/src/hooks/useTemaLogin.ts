import { useState, useEffect } from 'react';
import { Tema } from '@/types/theme';
import { TemaService } from '@/services/temaService';

/**
 * Hook para aplicar tema na página de login baseado no domínio
 */
export const useTemaLogin = () => {
  const [tema, setTema] = useState<Tema | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasTema, setHasTema] = useState(false);

  useEffect(() => {
    const carregarTemaPorDominio = async () => {
      try {
        setLoading(true);
        
        // Buscar tema por domínio (agora aceita localhost com portas)
        const temaData = await TemaService.getTemaByCurrentDomain();
        
        if (temaData) {
          void 0;
          setTema(temaData);
          setHasTema(true);

          // Aplicar título da página se definido
          if (temaData.nome_pagina) {
            document.title = temaData.nome_pagina;
            void 0;
          }

          // Aplicar favicon se definido
          if (temaData.url_favicon) {
            const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
            if (favicon) {
              favicon.href = temaData.url_favicon;
            } else {
              const newFavicon = document.createElement('link');
              newFavicon.rel = 'icon';
              newFavicon.href = temaData.url_favicon;
              document.head.appendChild(newFavicon);
            }
            void 0;
          }
        } else {
          void 0;
          setTema(null);
          setHasTema(false);

          // Restaurar título padrão
          document.title = 'SmartChat - Login';
          
          // Restaurar favicon padrão
          const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
          if (favicon) {
            favicon.href = '/favicon.ico';
          }
        }
      } catch (error) {
        console.error('Erro ao carregar tema por domínio:', error);
        setTema(null);
        setHasTema(false);
      } finally {
        setLoading(false);
      }
    };

    carregarTemaPorDominio();
  }, []);

  return {
    tema,
    loading,
    hasTema
  };
};
