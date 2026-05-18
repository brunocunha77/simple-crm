import { useState, useEffect, useCallback } from 'react';
import { Tema, TemaAplicado } from '@/types/theme';
import { TemaService } from '@/services/temaService';
import { useAuth } from '@/contexts/auth';

export const useTema = () => {
  const { user } = useAuth();
  const [tema, setTema] = useState<Tema | null>(null);
  const [temaAplicado, setTemaAplicado] = useState<TemaAplicado | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasTemaPersonalizado, setHasTemaPersonalizado] = useState(false);

  // Função para verificar se há apenas logo (sem cores ou fonte)
  const temApenasLogo = useCallback((temaData: Tema) => {
    const temCores = temaData.cor_primaria || temaData.cor_secundaria || temaData.cor_texto;
    const temFonte = temaData.fonte;
    const temCoresBotao = temaData.cor_botao || temaData.cor_botao_selecionado || temaData.cor_botao_ao_passar;
    const temLogo = temaData.logo_url;
    
    // Apenas logo se tem logo mas nenhuma outra personalização
    return temLogo && !temCores && !temFonte && !temCoresBotao;
  }, []);

  // Função para aplicar o tema no CSS
  const aplicarTema = useCallback((temaData: Tema) => {
    const cssVars: TemaAplicado['cssVars'] = {
      '--primary-color': temaData.cor_primaria,
      '--secondary-color': temaData.cor_secundaria,
      '--text-color': temaData.cor_texto,
      '--font-family': temaData.fonte,
    };

    // Adicionar cores de botão apenas se existirem
    if (temaData.cor_botao) {
      cssVars['--button-color'] = temaData.cor_botao;
    }
    if (temaData.cor_botao_selecionado) {
      cssVars['--button-selected-color'] = temaData.cor_botao_selecionado;
    }
    if (temaData.cor_botao_ao_passar) {
      cssVars['--button-hover-color'] = temaData.cor_botao_ao_passar;
    }

    const temaAplicado: TemaAplicado = {
      corPrimaria: temaData.cor_primaria,
      corSecundaria: temaData.cor_secundaria,
      corTexto: temaData.cor_texto,
      logoUrl: temaData.logo_url,
      fonte: temaData.fonte,
      corBotao: temaData.cor_botao,
      corBotaoSelecionado: temaData.cor_botao_selecionado,
      corBotaoAoPassar: temaData.cor_botao_ao_passar,
      nomePagina: temaData.nome_pagina,
      urlFavicon: temaData.url_favicon,
      cssVars
    };

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

    // Se tem apenas logo, não aplicar estilos CSS
    if (temApenasLogo(temaData)) {
      void 0;
      setTemaAplicado(temaAplicado);
      return;
    }

    // Aplicar variáveis CSS no root
    const root = document.documentElement;
    Object.entries(temaAplicado.cssVars).forEach(([property, value]) => {
      if (value) {
        root.style.setProperty(property, value);
      }
    });

    // Aplicar fonte globalmente apenas se houver fonte
    if (temaData.fonte) {
      document.body.style.fontFamily = temaData.fonte;
    }

    // Adicionar classe para indicar tema personalizado APENAS se houver cores principais (não apenas botões)
    if (temaData.cor_primaria || temaData.cor_secundaria || temaData.cor_texto) {
      document.body.classList.add('tema-personalizado');
    }

    // Adicionar classe específica para cores de botão (sem afetar layout)
    if (temaData.cor_botao || temaData.cor_botao_selecionado || temaData.cor_botao_ao_passar) {
      document.body.classList.add('tema-botoes-personalizados');
    }

    setTemaAplicado(temaAplicado);
    void 0;
  }, [temApenasLogo]);

  // Função para remover tema personalizado
  const removerTema = useCallback(() => {
    const root = document.documentElement;
    
    // Remover variáveis CSS
    root.style.removeProperty('--primary-color');
    root.style.removeProperty('--secondary-color');
    root.style.removeProperty('--text-color');
    root.style.removeProperty('--font-family');
    root.style.removeProperty('--button-color');
    root.style.removeProperty('--button-selected-color');
    root.style.removeProperty('--button-hover-color');

    // Remover fonte personalizada
    document.body.style.fontFamily = '';

    // Remover classes de tema personalizado
    document.body.classList.remove('tema-personalizado');
    document.body.classList.remove('tema-botoes-personalizados');

    // Restaurar título padrão
    document.title = 'SmartChat';

    // Restaurar favicon padrão
    const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
    if (favicon) {
      favicon.href = '/favicon.ico';
    }

    setTemaAplicado(null);
    void 0;
  }, []);

  // Carregar tema quando o usuário mudar
  useEffect(() => {
    const carregarTema = async () => {
      if (!user?.id_cliente) {
        setLoading(false);
        setHasTemaPersonalizado(false);
        return;
      }

      try {
        setLoading(true);
        void 0;

        const temaData = await TemaService.getTemaByClienteId(user.id_cliente);
        
        if (temaData) {
          setTema(temaData);
          setHasTemaPersonalizado(true);
          aplicarTema(temaData);
        } else {
          setTema(null);
          setHasTemaPersonalizado(false);
          removerTema();
        }
      } catch (error) {
        console.error('Erro ao carregar tema:', error);
        setTema(null);
        setHasTemaPersonalizado(false);
        removerTema();
      } finally {
        setLoading(false);
      }
    };

    carregarTema();
  }, [user?.id_cliente, aplicarTema, removerTema]);

  // Limpar tema quando o usuário fizer logout
  useEffect(() => {
    if (!user) {
      removerTema();
      setTema(null);
      setTemaAplicado(null);
      setHasTemaPersonalizado(false);
      document.body.classList.remove('tema-botoes-personalizados');
    }
  }, [user, removerTema]);

  return {
    tema,
    temaAplicado,
    loading,
    hasTemaPersonalizado,
    aplicarTema,
    removerTema
  };
};
