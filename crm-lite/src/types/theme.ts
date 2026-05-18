// Interface para o tema white label
export interface Tema {
  id: number;
  id_cliente: number;
  dominio: string | null;
  cor_primaria: string;
  cor_secundaria: string;
  cor_texto: string;
  logo_url: string | null;
  fonte: string;
  cor_botao: string | null;
  cor_botao_selecionado: string | null;
  cor_botao_ao_passar: string | null;
  nome_pagina: string | null;
  url_favicon: string | null;
  criado_em: string;
  atualizado_em: string;
}

// Interface para configurações de tema aplicadas
export interface TemaAplicado {
  corPrimaria: string;
  corSecundaria: string;
  corTexto: string;
  logoUrl: string | null;
  fonte: string;
  corBotao: string | null;
  corBotaoSelecionado: string | null;
  corBotaoAoPassar: string | null;
  nomePagina: string | null;
  urlFavicon: string | null;
  cssVars: {
    '--primary-color': string;
    '--secondary-color': string;
    '--text-color': string;
    '--font-family': string;
    '--button-color'?: string;
    '--button-selected-color'?: string;
    '--button-hover-color'?: string;
  };
}
