/**
 * Tipos para gestão de Templates WhatsApp Business
 *
 * Descrição: Define todas as interfaces e tipos usados nos componentes de templates.
 * Tabela: whatsapp_templates
 * Webhook: submit-template, send-template-message
 * Props: N/A (arquivo de tipos)
 *
 * Criado em: 2026-04-11
 * Última alteração: 2026-04-11
 */

// Status possíveis de um template na Meta
export type TemplateStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAUSED' | 'DISABLED' | 'IN_APPEAL';

// Categorias de template da Meta
export type TemplateCategory = 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';

// Idiomas suportados
export type TemplateLanguage = 'pt_BR' | 'en_US' | 'es';

// Formato do header
export type HeaderFormat = 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';

// Tipo de botão
export type ButtonType = 'URL' | 'QUICK_REPLY' | 'PHONE_NUMBER';

// Componente individual do template (formato Meta API)
export interface MetaComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  format?: HeaderFormat;
  text?: string;
  buttons?: MetaButton[];
  /**
   * Exemplos de valores para variáveis — obrigatório pela Meta quando o componente
   * contém variáveis {{n}}.
   * - BODY: example.body_text = [["val1", "val2"]] (array externo = instâncias, sempre 1;
   *         array interno = valores para {{1}}, {{2}}... em ordem)
   * - HEADER TEXT: example.header_text = ["val1"] (array simples com valor para {{1}})
   */
  example?: {
    body_text?: string[][];
    header_text?: string[];
  };
}

// Botão do template
export interface MetaButton {
  type: ButtonType;
  text: string;
  url?: string;           // Apenas para type: URL
  phone_number?: string;  // Apenas para type: PHONE_NUMBER
}

// Registro da tabela whatsapp_templates
export interface WhatsAppTemplate {
  id: string;
  id_cliente: number;
  waba_id: string;
  meta_template_id: string | null;
  name: string;
  category: TemplateCategory;
  language: TemplateLanguage;
  status: TemplateStatus;
  content_json: {
    components: MetaComponent[];
  };
  mapping_rules: Record<string, string>;  // {"1": "nome", "2": "valor"}
  created_at: string;
  updated_at: string;
}

// Dados do formulário de criação
export interface TemplateFormData {
  name: string;
  category: TemplateCategory;
  language: TemplateLanguage;
  headerText?: string;
  bodyText: string;
  footerText?: string;
  buttons: MetaButton[];
  mappingRules: Record<string, string>;
}

// Colunas da tabela leads disponíveis para mapeamento de variáveis
export const LEAD_MAPPABLE_COLUMNS = [
  { value: 'nome', label: 'Nome' },
  // { value: 'telefone', label: 'Telefone' },
  // { value: 'email', label: 'Email' },
  // { value: 'valor', label: 'Valor' },
  // { value: 'nome_vendedor', label: 'Vendedor' },
  // { value: 'origem', label: 'Origem' },
  // { value: 'utm_source', label: 'UTM Source' },
  // { value: 'utm_campaign', label: 'UTM Campaign' },
  // { value: 'observacao', label: 'Observação' },
  // { value: 'canal', label: 'Canal' },
  // { value: 'nome_medico', label: 'Médico' },
  // { value: 't_origem', label: 'Origem Tracking' },
  // { value: 't_campanha_nome', label: 'Campanha Tracking' },
  // { value: 't_anuncio_nome', label: 'Anúncio' },
  // { value: 'status', label: 'Status' },
] as const;

// Resposta do webhook de submit (Fluxo 2 - Submit template para Meta)
export interface SubmitTemplateResponse {
  success: boolean;
  meta_template_id?: string;
  status?: string;
  error?: string;
}

// Resposta do webhook de envio (Fluxo 4 - Enviar mensagem de template)
export interface SendTemplateResponse {
  success: boolean;
  message_id?: string;
  to?: string;
  error?: string;
  errors?: string[];
}

// Labels de exibição para categorias
export const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  MARKETING: 'Marketing',
  UTILITY: 'Utilitário',
  AUTHENTICATION: 'Autenticação',
};

// Labels de exibição para idiomas
export const LANGUAGE_LABELS: Record<TemplateLanguage, string> = {
  pt_BR: 'Português (BR)',
  en_US: 'Inglês (US)',
  es: 'Espanhol',
};
