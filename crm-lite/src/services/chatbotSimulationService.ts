import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth';

export interface ChatbotSimulation {
  id_conversa: string;
  id_cliente: string;
  id_prompt_oficial: string;
  data_mensagem: string;
  hora_mensagem: string;
  mensagem: string;
  from_me: boolean;
  created_at?: string;
}

export interface ChatbotPrompt {
  id: string;
  nome: string;
  status: boolean;
  em_uso: boolean;
  id_usuario: string;
  prompt_type_id?: number;
}

export class ChatbotSimulationService {
  private static generateConversationId(idCliente: string, idPromptOficial: string): string {
    // Gera um ID único baseado no cliente e prompt
    const combined = `${idCliente}_${idPromptOficial}`;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString();
  }

  static async getChatbotsByUser(userId: string): Promise<ChatbotPrompt[]> {
    try {
      const { data, error } = await supabase
        .from('prompts_oficial')
        .select('id, nome, status, em_uso, id_usuario, prompt_type_id')
        .eq('id_usuario', userId)
        .eq('status', true);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar chatbots:', error);
      throw error;
    }
  }

  static async startSimulation(idCliente: string, idPromptOficial: string): Promise<string> {
    const idConversa = this.generateConversationId(idCliente, idPromptOficial);
    
    // Verificar se já existe uma conversa para este par
    const { data: existingConversation } = await supabase
      .from('simulacoes_chatbot')
      .select('id_conversa')
      .eq('id_cliente', idCliente)
      .eq('id_prompt_oficial', idPromptOficial)
      .limit(1);

    if (existingConversation && existingConversation.length > 0) {
      return existingConversation[0].id_conversa;
    }

    return idConversa;
  }

  static async saveMessage(simulation: ChatbotSimulation): Promise<void> {
    try {
      const { error } = await supabase
        .from('simulacoes_chatbot')
        .insert([simulation]);

      if (error) throw error;
    } catch (error) {
      console.error('Erro ao salvar mensagem:', error);
      throw error;
    }
  }

  static async sendMessageToWebhook(
    idCliente: string, 
    idConversa: string, 
    idPromptOficial: string,
    message: string
  ): Promise<string> {
    try {
      const payload = {
        id_cliente: idCliente,
        id_conversa: idConversa,
        id_prompt_oficial: idPromptOficial,
        mensagem: message
      };
      
      void 0;
      
      const response = await fetch('https://webhook.dev.usesmartcrm.com/webhook/teste_chatbot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.resposta || data.message || 'Resposta recebida do chatbot';
    } catch (error) {
      console.error('Erro ao enviar mensagem para webhook:', error);
      throw error;
    }
  }

  static async getConversationHistory(idCliente: string, idPromptOficial: string): Promise<ChatbotSimulation[]> {
    try {
      const { data, error } = await supabase
        .from('simulacoes_chatbot')
        .select('*')
        .eq('id_cliente', idCliente)
        .eq('id_prompt_oficial', idPromptOficial)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
      throw error;
    }
  }
} 