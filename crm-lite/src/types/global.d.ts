// Tipos globais para o projeto SmartCRM

// Google Tag Manager - Data Layer
declare global {
  interface Window {
    dataLayer: any[];
    fbq: any;
    mixpanel: any;
  }
}

// Tipos para o sistema de funis
export interface Funil {
  id: number;
  id_cliente: number;
  nome: string;
  funil_padrao?: boolean;
  created_at: string;
}

export interface FunilEtapa {
  id: number;
  id_funil: number;
  id_cliente: number;
  nome: string;
  palavras_chave?: string;
  etapa_de_ganho?: boolean;
  ordem?: number;
  created_at: string;
}

export interface FunilComEtapas extends Funil {
  etapas: FunilEtapa[];
  id_funil_padrao?: boolean; // Indica se este funil é o padrão para o cliente
}

export interface CriarFunilData {
  nome: string;
  etapas: {
    nome: string;
    palavras_chave?: string;
    etapa_de_ganho?: boolean;
  }[];
}

export interface EditarFunilData {
  nome: string;
  etapas: {
    id?: number;
    nome: string;
    palavras_chave?: string;
    etapa_de_ganho?: boolean;
  }[];
}

// Tipos para leads com funis
export interface Lead {
  id: number;
  id_cliente: number;
  id_funil: number | null;
  id_funil_etapa: number | null;
  nome: string;
  email?: string;
  telefone?: string;
  valor?: number | string | null;
  status?: string;
  observacao?: string;
  venda?: boolean;
  venda_realizada?: boolean;
  venda_perdida?: boolean;
  data_venda?: string;
  data_perda?: string | null;
  id_usuario_venda?: string | number | null;
  nome_vendedor?: string | null;
  id_usuario_perda?: string | number | null;
  probabilidade_final_fechamento?: number;
  data_ultimo_status?: string;
  followup_programado?: string | boolean;
  id_departamento?: number;
  id_etiquetas?: string;
  data_criacao?: string;
  score_final_qualificacao?: number;
  score_final_vendedor?: number;
  cs_nota?: number | string | null;
  insight?: string | null;
  // Propriedades para instâncias de WhatsApp
  instance_id?: string;
  instance_id_2?: string;
  nome_instancia?: string;
  nome_instancia_2?: string;
  instance_name?: string;
  // Propriedades para telefone e leitura
  telefone_id?: string;
  foi_lida?: boolean;
  // Propriedades para atendimento e status
  atendimento_ia?: boolean;
  atendimento_humano?: boolean;
  chatbot?: boolean;
  status_conversa?: string | null;
  msg_nao_lida?: boolean;
  horario_agendado?: string | null;
  primeiro_lembrete?: string | null;
  segundo_lembrete?: string | null;
  terceiro_lembrete?: string | null;
  nome_medico?: string | null;
  lembrete_ativo?: boolean;
  // Grupos
  is_group?: boolean;
  // Propriedades de tráfego
  t_campanha_nome?: string;
  t_anuncio_nome?: string;
  t_conjunto_de_anuncio?: string;
  t_origem?: string;
  created_at: string;
  updated_at: string;
}

export interface LeadComFunil extends Lead {
  funil?: Funil;
  etapa?: FunilEtapa;
}

// Tipos para integração RD Station
export interface FunilRD {
  id: number;
  id_cliente: number;
  id_funil_rd: string;
  nome_funil: string;
  funil_padrao: boolean;
  created_at: string;
  updated_at: string;
}

export interface EtapaFunilRD {
  id: number;
  id_cliente: number;
  id_funil_rd: string;
  nome_etapa: string;
  palavra_chave?: string;
  created_at: string;
}

export interface FunilRDComEtapas extends FunilRD {
  etapas: EtapaFunilRD[];
}

// Tipos para integração Kommo
export interface FunilKommo {
  id: number;
  id_cliente: number;
  id_funil_kommo: string;
  nome_funil: string;
  funil_padrao: boolean;
  created_at: string;
  updated_at: string;
}

export interface EtapaFunilKommo {
  id: number;
  id_cliente: number;
  id_funil_kommo: string;
  nome_etapa: string;
  palavra_chave?: string;
  created_at: string;
}

export interface FunilKommoComEtapas extends FunilKommo {
  etapas: EtapaFunilKommo[];
}

// Tipo para cliente com funil padrão
export interface ClienteInfo {
  id: number;
  id_funil_padrao: number | null;
  // ... outros campos existentes
}

export {};
