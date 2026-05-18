import { supabase } from '@/lib/supabase';

export interface ClienteInfo {
  id: number;
  created_at?: string;
  updated_at?: string; // Timestamp de atualização do registro
  name?: string;
  email?: string;
  phone?: string;
  user_id_auth?: string;
  instance_id?: string;
  instance_id_2?: string;
  sender_number?: string;
  instance_name?: string;
  instance_name_2?: string;
  apikey?: string;
  atendimento_humano?: boolean;
  atendimento_ia?: boolean;
  prompt_type?: string;
  id_chatbot?: number;
  atualizando_relatorio?: boolean;
  data_hora_atualizacao_relatorio?: string;
  id_departamento_padrao?: number | null;
  // Propriedades de planos
  trial?: boolean;
  data_limite?: string; // Data de expiração do trial
  plano_starter?: boolean;
  plano_pro?: boolean;
  plano_plus?: boolean;
  plano_agentes?: boolean;
  plano_crm?: boolean; // Adicionado para verificar acesso ao plano CRM
  // Propriedades de integração
  id_agenda?: string;
  id_funil_padrao?: number | null; // Adicionado para funil padrão
  start_aut_followup?: boolean; // Adicionado para controle de início automático do followup
  int_rd?: boolean; // Adicionado para integração RD Station
  int_rd_token?: string; // Adicionado para token RD Station
  int_kommo?: boolean; // Adicionado para integração Kommo
  int_kommo_token?: string; // Adicionado para token Kommo
  int_instagram?: boolean; // Adicionado para integração Instagram
  token_facebook?: string | null; // Token da integração com Facebook
  gmail_on?: boolean; // Gmail conectado
  id_gmail?: string | null; // ID do usuário Gmail
  email_gmail?: string | null; // E-mail da conta Gmail conectada
  cs_on?: boolean; // Exibir Score CS no CRM
  charge_on?: boolean; // Login automatico no Charge Simples
  charge_email?: string | null; // E-mail de acesso ao Charge Simples
  charge_token?: string | null; // Token/senha de acesso ao Charge Simples
}

class ClientesService {
  // Cache para evitar múltiplas consultas para o mesmo usuário
  private clientCache: Map<string, ClienteInfo | null> = new Map();

  // Buscar cliente pelo ID do usuário autenticado
  async getClienteByUserId(userId: string): Promise<ClienteInfo | null> {
    if (!userId) {
      console.error('ID não fornecido para getClienteByUserId');
      return null;
    }

    // Verificar se já temos no cache
    if (this.clientCache.has(userId)) {
      const cached = this.clientCache.get(userId);
      // Se o cache tem null, tentar buscar novamente
      if (cached === null) {
        this.clientCache.delete(userId);
      } else {
        return cached;
      }
    }

    try {
      // Buscar pelo user_id_auth na tabela clientes_info
      const { data, error } = await supabase
        .from('clientes_info')
        .select('*')
        .eq('user_id_auth', userId)
        .single();

      if (error) {
        console.error('Erro do Supabase ao buscar cliente por user_id_auth:', error);
        this.clientCache.set(userId, null);
        return null;
      }
      
      // Armazenar no cache
      this.clientCache.set(userId, data);
      return data;
    } catch (error) {
      console.error('Erro ao buscar cliente:', error);
      this.clientCache.set(userId, null); // Cache o resultado negativo
      return null;
    }
  }

  // Definir funil padrão para um cliente
  async setFunilPadrao(userId: string, funilId: number): Promise<boolean> {
    try {
      // Primeiro, remover o funil padrão de todos os outros clientes (garantir que só um funil seja padrão)
      const { error: clearError } = await supabase
        .from('clientes_info')
        .update({ id_funil_padrao: null })
        .not('user_id_auth', 'eq', userId);

      if (clearError) {
        console.error('Erro ao limpar outros funis padrão:', clearError);
        return false;
      }

      // Agora definir o funil padrão para o cliente específico
      const { error: updateError } = await supabase
        .from('clientes_info')
        .update({ id_funil_padrao: funilId })
        .eq('user_id_auth', userId);

      if (updateError) {
        console.error('Erro ao definir funil padrão:', updateError);
        return false;
      }

      // Limpar o cache para forçar uma nova busca
      this.clientCache.delete(userId);
      
      return true;
    } catch (error) {
      console.error('Erro ao definir funil padrão:', error);
      return false;
    }
  }

  // Remover funil padrão de um cliente
  async removeFunilPadrao(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('clientes_info')
        .update({ id_funil_padrao: null })
        .eq('user_id_auth', userId);

      if (error) {
        console.error('Erro ao remover funil padrão:', error);
        return false;
      }

      // Limpar o cache para forçar uma nova busca
      this.clientCache.delete(userId);
      
      return true;
    } catch (error) {
      console.error('Erro ao remover funil padrão:', error);
      return false;
    }
  }

  // Verificar se um funil é padrão para um cliente
  async isFunilPadrao(userId: string, funilId: number): Promise<boolean> {
    try {
      const cliente = await this.getClienteByUserId(userId);
      return cliente?.id_funil_padrao === funilId;
    } catch (error) {
      console.error('Erro ao verificar se funil é padrão:', error);
      return false;
    }
  }
  
  // Buscar cliente pelo email
  async getClienteByEmail(email: string): Promise<ClienteInfo | null> {
    if (!email) {
      console.error('Email não fornecido para getClienteByEmail');
      return null;
    }
    
    try {
      // Buscar todos os registros com este email e pegar o mais antigo (ID menor)
      const { data, error } = await supabase
        .from('clientes_info')
        .select('*')
        .eq('email', email)
        .order('id', { ascending: true })
        .limit(1);
        
      if (error) {
        console.error('Erro do Supabase ao buscar cliente pelo email:', error);
        return null;
      }
      
      // Retornar o primeiro resultado (mais antigo)
      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('Erro ao buscar cliente pelo email:', error);
      return null;
    }
  }

  // Buscar cliente pelo ID numérico
  async getClienteById(id: number): Promise<ClienteInfo | null> {
    if (!id) {
      console.error('ID não fornecido para getClienteById');
      return null;
    }
    try {
      const { data, error } = await supabase
        .from('clientes_info')
        .select('*')
        .eq('id', id)
        .single();
      if (error) {
        console.error('Erro do Supabase ao buscar cliente por id:', error);
        return null;
      }
      return data;
    } catch (error) {
      console.error('Erro ao buscar cliente por id:', error);
      return null;
    }
  }

  // Buscar cliente pelo id_cliente do user_metadata (multi-tenant seguro)
  async getClienteByIdCliente(id_cliente: number): Promise<ClienteInfo | null> {
    if (!id_cliente) {
      console.error('id_cliente não fornecido para getClienteByIdCliente');
      return null;
    }
    try {
      const { data, error } = await supabase
        .from('clientes_info')
        .select('*')
        .eq('id', id_cliente)
        .maybeSingle(); // permite 0 ou 1 resultado
      if (error) {
        console.error('Erro do Supabase ao buscar cliente por id_cliente:', error);
        return null;
      }
      return data;
    } catch (error) {
      console.error('Erro ao buscar cliente por id_cliente:', error);
      return null;
    }
  }

  // Limpar o cache para um usuário específico
  clearCache(userId?: string) {
    if (userId) {
      this.clientCache.delete(userId);
    } else {
      this.clientCache.clear();
    }
  }

  // Atualizar campo atualizando_relatorio
  async setAtualizandoRelatorio(userId: string, value: boolean): Promise<boolean> {
    if (!userId) return false;
    try {
      const { error } = await supabase
        .from('clientes_info')
        .update({ atualizando_relatorio: value })
        .eq('user_id_auth', userId);
      return !error;
    } catch (e) {
      return false;
    }
  }

  // Atualizar o departamento padrão do cliente
  async setDepartamentoPadrao(userId: string, idDepartamentoPadrao: number | null): Promise<boolean> {
    if (!userId) return false;
    try {
      const { error } = await supabase
        .from('clientes_info')
        .update({ id_departamento_padrao: idDepartamentoPadrao })
        .eq('user_id_auth', userId);
      return !error;
    } catch (e) {
      return false;
    }
  }

  // Atualizar o ID da agenda do Google
  async setIdAgenda(userId: string, idAgenda: string): Promise<boolean> {
    if (!userId) return false;
    try {
      const { error } = await supabase
        .from('clientes_info')
        .update({ id_agenda: idAgenda })
        .eq('user_id_auth', userId);
      
      if (!error) {
        // Limpar cache para forçar atualização
        this.clearCache(userId);
        return true;
      }
      return false;
    } catch (e) {
      console.error('Erro ao atualizar ID da agenda:', e);
      return false;
    }
  }

  // Disparar webhook para planilha de agenda
  async dispararWebhookAgenda(userId: string, idAgenda: string): Promise<boolean> {
    if (!userId) return false;
    
    try {
      // Buscar dados completos do cliente
      const cliente = await this.getClienteByUserId(userId);
      if (!cliente) {
        console.error('Cliente não encontrado para webhook');
        return false;
      }

      // Preparar dados para o webhook
      const webhookData = {
        cliente_id: cliente.id,
        user_id_auth: cliente.user_id_auth,
        nome: cliente.name || 'N/A',
        email: cliente.email || 'N/A',
        id_agenda: idAgenda,
        plano_starter: cliente.plano_starter || false,
        plano_pro: cliente.plano_pro || false,
        plano_plus: cliente.plano_plus || false,
        plano_agentes: cliente.plano_agentes || false,
        trial: cliente.trial || false,
        data_conexao: new Date().toISOString(),
        tipo_conexao: 'google_agenda'
      };

      // Disparar webhook
      const response = await fetch('https://webhook.dev.usesmartcrm.com/webhook/planilha-agenda', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookData)
      });

      if (response.ok) {
        void 0;
        return true;
      } else {
        console.error('❌ Erro ao disparar webhook:', response.status, response.statusText);
        return false;
      }
    } catch (error) {
      console.error('❌ Erro ao disparar webhook da agenda:', error);
      return false;
    }
  }

  // Alternar o estado do início automático do followup
  async toggleStartAutFollowup(userId: string): Promise<boolean> {
    if (!userId) return false;
    
    try {
      // Buscar o estado atual
      const cliente = await this.getClienteByUserId(userId);
      if (!cliente) {
        console.error('Cliente não encontrado para alternar followup automático');
        return false;
      }

      // Alternar o valor (se for true vira false, se for false/null vira true)
      const novoValor = !cliente.start_aut_followup;

      // Atualizar no banco
      const { error } = await supabase
        .from('clientes_info')
        .update({ start_aut_followup: novoValor })
        .eq('user_id_auth', userId);

      if (error) {
        console.error('Erro ao alternar followup automático:', error);
        return false;
      }

      // Limpar cache para forçar atualização
      this.clearCache(userId);
      
      return true;
    } catch (error) {
      console.error('Erro ao alternar followup automático:', error);
      return false;
    }
  }

  // Salvar dados do Kommo no banco e enviar para webhook
  async setKommoData(userId: string, token: string, url: string): Promise<boolean> {
    if (!userId || !token || !url) return false;
    
    try {
      // Obter o id_cliente do user_metadata
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('Usuário não autenticado');
        return false;
      }

      const userMetadata = user.user_metadata || {};
      const id_cliente = userMetadata.id_cliente || userMetadata?.raw_user_meta_data?.id_cliente;
      
      if (!id_cliente) {
        console.error('ID do cliente não encontrado no user_metadata');
        return false;
      }

      // Atualizar os dados no banco
      const { error } = await supabase
        .from('clientes_info')
        .update({ 
          int_kommo: true,
          int_kommo_token: token 
        })
        .eq('user_id_auth', userId);

      if (error) {
        console.error('Erro ao atualizar dados Kommo no banco:', error);
        return false;
      }

      // Limpar cache para forçar recarregamento
      this.clientCache.delete(userId);

      // Enviar dados para o webhook
      const webhookResponse = await fetch('https://webhook.dev.usesmartcrm.com/webhook/integracao-kommo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id_cliente: id_cliente,
          token: token,
          url: url
        })
      });

      if (!webhookResponse.ok) {
        console.error('Erro ao enviar dados para webhook Kommo:', webhookResponse.status);
        return false;
      }

      void 0;
      return true;
    } catch (error) {
      console.error('Erro ao enviar dados para webhook Kommo:', error);
      return false;
    }
  }

  // Salvar token do RD Station e disparar webhook
  async setRdStationToken(userId: string, token: string): Promise<boolean> {
    if (!userId || !token) return false;
    
    try {
      // Obter o id_cliente do user_metadata
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('Usuário não autenticado');
        return false;
      }

      const userMetadata = user.user_metadata || {};
      const id_cliente = userMetadata.id_cliente || userMetadata?.raw_user_meta_data?.id_cliente;
      
      if (!id_cliente) {
        console.error('ID do cliente não encontrado no user_metadata');
        return false;
      }

      // Atualizar o token no banco
      const { error } = await supabase
        .from('clientes_info')
        .update({ 
          int_rd: true,
          int_rd_token: token 
        })
        .eq('user_id_auth', userId);

      if (error) {
        console.error('Erro ao salvar token RD Station:', error);
        return false;
      }

      // Disparar webhook para buscar funis do RD Station
      try {
        const webhookResponse = await fetch('https://webhook.dev.usesmartcrm.com/webhook/conectando_funis', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id_cliente: id_cliente,
            token: token
          })
        });

        if (!webhookResponse.ok) {
          console.error('Erro ao disparar webhook:', webhookResponse.status);
          // Não falhar a operação se o webhook falhar
        } else {
          void 0;
        }
      } catch (webhookError) {
        console.error('Erro ao disparar webhook:', webhookError);
        // Não falhar a operação se o webhook falhar
      }

      // Limpar cache para forçar atualização
      this.clearCache(userId);
      
      return true;
    } catch (error) {
      console.error('Erro ao salvar token RD Station:', error);
      return false;
    }
  }

  // Desconectar RD Station
  async disconnectRdStation(userId: string): Promise<boolean> {
    if (!userId) return false;
    
    try {
      const { error } = await supabase
        .from('clientes_info')
        .update({ 
          int_rd: false,
          int_rd_token: null 
        })
        .eq('user_id_auth', userId);

      if (error) {
        console.error('Erro ao desconectar RD Station:', error);
        return false;
      }

      // Limpar cache para forçar atualização
      this.clearCache(userId);
      
      return true;
    } catch (error) {
      console.error('Erro ao desconectar RD Station:', error);
      return false;
    }
  }

  // Desconectar Gmail
  async disconnectGmail(userId: string): Promise<boolean> {
    if (!userId) return false;

    try {
      const { error } = await supabase
        .from('clientes_info')
        .update({
          gmail_on: false,
          id_gmail: null,
          email_gmail: null,
        })
        .eq('user_id_auth', userId);

      if (error) {
        console.error('Erro ao desconectar Gmail:', error);
        return false;
      }

      this.clearCache(userId);
      return true;
    } catch (error) {
      console.error('Erro ao desconectar Gmail:', error);
      return false;
    }
  }

  // Salva o token do ClickUp do cliente
  async setClickUpToken(userId: string, token: string): Promise<boolean> {
    if (!userId || !token) return false;
    try {
      const { error } = await supabase
        .from('clientes_info')
        .update({ int_clickup: true, int_clickup_token: token })
        .eq('user_id_auth', userId);
      if (error) { console.error('Erro ao salvar token ClickUp:', error); return false; }
      this.clearCache(userId);
      return true;
    } catch (error) {
      console.error('Erro ao salvar token ClickUp:', error);
      return false;
    }
  }

  // Remove a integração com ClickUp
  async disconnectClickUp(userId: string): Promise<boolean> {
    if (!userId) return false;
    try {
      const { error } = await supabase
        .from('clientes_info')
        .update({ int_clickup: false, int_clickup_token: null })
        .eq('user_id_auth', userId);
      if (error) { console.error('Erro ao desconectar ClickUp:', error); return false; }
      this.clearCache(userId);
      return true;
    } catch (error) {
      console.error('Erro ao desconectar ClickUp:', error);
      return false;
    }
  }

  async updateClienteProfileByIdCliente(
    id_cliente: number,
    updates: { name?: string; phone?: string }
  ): Promise<boolean> {
    if (!id_cliente) return false;

    try {
      const { error } = await supabase
        .from('clientes_info')
        .update({
          ...(updates.name !== undefined ? { name: updates.name } : {}),
          ...(updates.phone !== undefined ? { phone: updates.phone } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id_cliente);

      if (error) {
        console.error('Erro ao atualizar perfil do cliente:', error);
        return false;
      }

      // Limpar cache (se existir) para forçar reload em próximas leituras
      this.clientCache.clear();
      return true;
    } catch (error) {
      console.error('Erro inesperado ao atualizar perfil do cliente:', error);
      return false;
    }
  }
}

export const clientesService = new ClientesService(); 
