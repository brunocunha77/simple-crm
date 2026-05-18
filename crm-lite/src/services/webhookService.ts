interface WebhookData {
  nome: string;
  telefone: string;
  email: string;
  tipo: string;
  timestamp: string;
  origem: string;
  [key: string]: any; // Permite campos adicionais
}

interface WebhookResponse {
  success: boolean;
  status: number;
  message: string;
  data?: any;
}

export class WebhookService {
  private static readonly WEBHOOK_URL =
    'https://webhook.dev.usesmartcrm.com/webhook/mensagens_wpp_site_smartcrm';
  
  /**
   * Envia dados para o webhook principal
   */
  static async sendToWebhook(data: WebhookData): Promise<WebhookResponse> {
    try {
      void 0;
      
      const response = await fetch(this.WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });
      
      const responseData = await response.json().catch(() => null);
      
      if (response.ok) {
        void 0;
        return {
          success: true,
          status: response.status,
          message: 'Dados enviados com sucesso',
          data: responseData
        };
      } else {
        void 0;
        return {
          success: false,
          status: response.status,
          message: `Erro ${response.status}: ${response.statusText}`,
          data: responseData
        };
      }
    } catch (error) {
      console.error('❌ Erro ao enviar para webhook:', error);
      return {
        success: false,
        status: 0,
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }
  
  /**
   * Envia dados de cadastro de usuário
   */
  static async sendUserSignup(nome: string, telefone: string, email: string): Promise<WebhookResponse> {
    const webhookData: WebhookData = {
      nome,
      telefone,
      email,
      tipo: 'cadastro_usuario',
      timestamp: new Date().toISOString(),
      origem: 'site_smartcrm'
    };
    
    return this.sendToWebhook(webhookData);
  }
  
  /**
   * Envia dados de lead
   */
  static async sendLead(nome: string, telefone: string, email: string, origem: string = 'site_smartcrm'): Promise<WebhookResponse> {
    const webhookData: WebhookData = {
      nome,
      telefone,
      email,
      tipo: 'lead',
      timestamp: new Date().toISOString(),
      origem
    };
    
    return this.sendToWebhook(webhookData);
  }
  
  /**
   * Envia dados de contato
   */
  static async sendContact(nome: string, telefone: string, email: string, mensagem?: string): Promise<WebhookResponse> {
    const webhookData: WebhookData = {
      nome,
      telefone,
      email,
      tipo: 'contato',
      timestamp: new Date().toISOString(),
      origem: 'site_smartcrm',
      ...(mensagem && { mensagem })
    };
    
    return this.sendToWebhook(webhookData);
  }
  
  /**
   * Verifica se o webhook está acessível
   */
  static async checkWebhookHealth(): Promise<boolean> {
    try {
      const response = await fetch(this.WEBHOOK_URL, {
        method: 'HEAD',
        mode: 'no-cors'
      });
      
      return true; // Se chegou aqui, o webhook está acessível
    } catch (error) {
      void 0;
      return false;
    }
  }

  /**
   * Envia dados de atualização do dashboard
   */
  static async enviarAtualizacaoDashboard(clienteInfo: any): Promise<boolean> {
    try {
      const webhookData: WebhookData = {
        nome: clienteInfo.name || 'Cliente',
        telefone: clienteInfo.phone || '',
        email: clienteInfo.email || '',
        tipo: 'atualizacao_dashboard',
        timestamp: new Date().toISOString(),
        origem: 'smartcrm_dashboard',
        cliente_id: clienteInfo.id,
        instance_id: clienteInfo.instance_id
      };
      
      const response = await this.sendToWebhook(webhookData);
      return response.success;
    } catch (error) {
      console.error('❌ Erro ao enviar atualização do dashboard:', error);
      return false;
    }
  }
} 