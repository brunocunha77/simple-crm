import { supabase } from '@/lib/supabase';

export interface Atendente {
  id: number;
  id_cliente: number;
  nome: string;
  email: string;
  tipo_usuario: string;
  user_id_auth?: string | null;
  id_departamento?: number | null;
  id_departamento_2?: number | null;
  id_departamento_3?: number | null;
  departamentos?: string[];
  created_at: string;
}

const TABLE = 'atendentes';

// Função para verificar se o e-mail já existe nas tabelas clientes_info e atendentes
async function checkEmailExists(email: string): Promise<{ exists: boolean; table: string | null }> {
  try {
    void 0;
    
    // Verificar na tabela clientes_info
    const { data: clienteData, error: clienteError } = await supabase
      .from('clientes_info')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (clienteData) {
      void 0;
      return { exists: true, table: 'clientes_info' };
    }

    // Verificar na tabela atendentes
    const { data: atendenteData, error: atendenteError } = await supabase
      .from('atendentes')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (atendenteData) {
      void 0;
      return { exists: true, table: 'atendentes' };
    }

    void 0;
    return { exists: false, table: null };
  } catch (error) {
    // Se não encontrou em nenhuma tabela, o e-mail está disponível
    void 0;
    return { exists: false, table: null };
  }
}

export const atendentesService = {
  // Função para verificar se o e-mail já existe (exportada para uso no componente)
  async checkEmailExists(email: string): Promise<{ exists: boolean; table: string | null }> {
    return await checkEmailExists(email);
  },

  // Lista todos os atendentes de um cliente
  async listByCliente(id_cliente: number): Promise<Atendente[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('id_cliente', id_cliente)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  // Cria um novo atendente via backend (n8n)
  async createAtendente({ nome, email, senha, id_cliente, tipo, departamentos }: { 
    nome: string; 
    email: string; 
    senha: string; 
    id_cliente: number;
    tipo?: 'Gestor' | 'Atendente';
    departamentos?: string[];
  }): Promise<any> {
    // Validar dados de entrada
    if (!nome || !email || !senha || !id_cliente) {
      throw new Error('Todos os campos são obrigatórios');
    }

    // Normalizar e-mail
    const normalizedEmail = email.toLowerCase().trim();
    
    // Verificar se o e-mail já existe antes de criar
    void 0;
    const emailCheck = await checkEmailExists(normalizedEmail);
    
    if (emailCheck.exists) {
      const tableName = emailCheck.table === 'clientes_info' ? 'cliente' : 'atendente';
      const errorMessage = `Este e-mail já está registrado em outra conta de ${tableName}.`;
      console.error("E-mail já existe:", emailCheck);
      throw new Error(errorMessage);
    }

    void 0;

    const response = await fetch('https://webhook.dev.usesmartcrm.com/webhook/cria_atendente', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_cliente,
        nome,
        tipo: tipo || 'Gestor',
        email: normalizedEmail,
        senha,
        departamentos: departamentos || []
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Erro na resposta do webhook:", response.status, errorText);
      throw new Error(errorText || 'Erro ao criar atendente no servidor');
    }
    
    const result = await response.json();
    void 0;
    return result;
  },

  // Remove atendente (e opcionalmente do Auth)
  async removeAtendente(id: number, email: string) {
    // 1. Remove do Auth (opcional, se quiser remover o login)
    // const { error: authError } = await supabase.auth.admin.deleteUserByEmail(email);
    // if (authError) throw authError;
    // 2. Remove da tabela atendentes
    const { error } = await supabase
      .from(TABLE)
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  }
}; 