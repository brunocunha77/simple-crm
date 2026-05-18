import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface GestorInfo {
  id: string;
  email: string;
  nome?: string;
  telefone?: string;
  created_at?: string;
}

export interface ClienteInfoWithGestores {
  id: string;
  name?: string;
  email?: string;
  id_gestor?: string | string[]; // Suporte para string (atual) e array (futuro)
  gestores?: GestorInfo[];
}

class GestorService {
  /**
   * Adiciona um gestor ao campo id_gestor de um cliente
   * Suporte para formato atual (string) e futuro (array)
   */
  async adicionarGestor(clienteId: string, gestorId: string): Promise<boolean> {
    try {
      void 0;
      
      // Primeiro, verificar se o gestor já existe
      const { data: clienteAtual, error: fetchError } = await supabase
        .from('clientes_info')
        .select('id_gestor')
        .eq('id', clienteId)
        .single();

      if (fetchError) {
        console.error('Erro ao buscar cliente:', fetchError);
        toast.error('Erro ao buscar informações do cliente');
        return false;
      }

      const gestoresAtuais = clienteAtual?.id_gestor;
      
      // Verificar se o gestor já está na lista
      let jaExiste = false;
      if (gestoresAtuais) {
        if (Array.isArray(gestoresAtuais)) {
          // Formato array
          jaExiste = gestoresAtuais.includes(gestorId);
        } else {
          // Formato string
          jaExiste = gestoresAtuais === gestorId;
        }
      }

      if (jaExiste) {
        toast.warning('Este usuário já é gestor deste cliente');
        return false;
      }

      // Adicionar o gestor
      let novosGestores: string | string[];
      
      if (!gestoresAtuais) {
        // Primeiro gestor - usar formato string por compatibilidade
        novosGestores = gestorId;
      } else if (Array.isArray(gestoresAtuais)) {
        // Formato array - adicionar ao array
        novosGestores = [...gestoresAtuais, gestorId];
      } else {
        // Formato string - converter para array com ambos os gestores
        novosGestores = [gestoresAtuais, gestorId];
      }

      const { error: updateError } = await supabase
        .from('clientes_info')
        .update({ id_gestor: novosGestores })
        .eq('id', clienteId);

      if (updateError) {
        console.error('Erro ao adicionar gestor:', updateError);
        toast.error('Erro ao adicionar gestor');
        return false;
      }

      toast.success('Gestor adicionado com sucesso!');
      void 0;
      return true;
    } catch (error) {
      console.error('Erro inesperado ao adicionar gestor:', error);
      toast.error('Erro inesperado ao adicionar gestor');
      return false;
    }
  }

  /**
   * Remove um gestor do campo id_gestor de um cliente
   * Suporte para formato atual (string) e futuro (array)
   */
  async removerGestor(clienteId: string, gestorId: string): Promise<boolean> {
    try {
      void 0;
      
      // Buscar gestores atuais
      const { data: clienteAtual, error: fetchError } = await supabase
        .from('clientes_info')
        .select('id_gestor')
        .eq('id', clienteId)
        .single();

      if (fetchError) {
        console.error('Erro ao buscar cliente:', fetchError);
        toast.error('Erro ao buscar informações do cliente');
        return false;
      }

      const gestoresAtuais = clienteAtual?.id_gestor;
      
      // Verificar se o gestor está na lista
      let gestorExiste = false;
      if (gestoresAtuais) {
        if (Array.isArray(gestoresAtuais)) {
          // Formato array
          gestorExiste = gestoresAtuais.includes(gestorId);
        } else {
          // Formato string
          gestorExiste = gestoresAtuais === gestorId;
        }
      }

      if (!gestorExiste) {
        toast.warning('Este usuário não é gestor deste cliente');
        return false;
      }

      // Remover o gestor
      let novosGestores: string | string[] | null;
      
      if (Array.isArray(gestoresAtuais)) {
        // Formato array - remover do array
        const gestoresFiltrados = gestoresAtuais.filter(id => id !== gestorId);
        novosGestores = gestoresFiltrados.length > 0 ? gestoresFiltrados : null;
      } else {
        // Formato string - remover completamente
        novosGestores = null;
      }

      const { error: updateError } = await supabase
        .from('clientes_info')
        .update({ id_gestor: novosGestores })
        .eq('id', clienteId);

      if (updateError) {
        console.error('Erro ao remover gestor:', updateError);
        toast.error('Erro ao remover gestor');
        return false;
      }

      toast.success('Gestor removido com sucesso!');
      void 0;
      return true;
    } catch (error) {
      console.error('Erro inesperado ao remover gestor:', error);
      toast.error('Erro inesperado ao remover gestor');
      return false;
    }
  }

  /**
   * Lista todos os gestores de um cliente
   * Suporte para formato atual (string) e futuro (array)
   */
  async listarGestores(clienteId: string): Promise<GestorInfo[]> {
    try {
      void 0;
      
      const { data: cliente, error: fetchError } = await supabase
        .from('clientes_info')
        .select('id_gestor')
        .eq('id', clienteId)
        .single();

      if (fetchError) {
        console.error('Erro ao buscar cliente:', fetchError);
        return [];
      }

      const gestoresAtuais = cliente?.id_gestor;
      let gestorIds: string[] = [];
      
      // Converter para array se necessário
      if (gestoresAtuais) {
        if (Array.isArray(gestoresAtuais)) {
          gestorIds = gestoresAtuais;
        } else {
          gestorIds = [gestoresAtuais];
        }
      }
      
      if (gestorIds.length === 0) {
        return [];
      }

      // Buscar informações dos gestores na tabela auth.users
      const { data: gestores, error: gestoresError } = await supabase.auth.admin.listUsers();
      
      if (gestoresError) {
        console.error('Erro ao buscar gestores:', gestoresError);
        return [];
      }

      // Filtrar apenas os gestores que estão na lista
      const gestoresFiltrados = gestores.users
        .filter(user => gestorIds.includes(user.id))
        .map(user => ({
          id: user.id,
          email: user.email || '',
          nome: user.user_metadata?.full_name || user.user_metadata?.name || '',
          telefone: user.user_metadata?.phone || '',
          created_at: user.created_at
        }));

      void 0;
      return gestoresFiltrados;
    } catch (error) {
      console.error('Erro inesperado ao listar gestores:', error);
      return [];
    }
  }

  /**
   * Busca um cliente pelo ID e retorna suas informações com gestores
   */
  async buscarClienteComGestores(clienteId: string): Promise<ClienteInfoWithGestores | null> {
    try {
      void 0;
      
      const { data: cliente, error: fetchError } = await supabase
        .from('clientes_info')
        .select('*')
        .eq('id', clienteId)
        .single();

      if (fetchError) {
        console.error('Erro ao buscar cliente:', fetchError);
        return null;
      }

      // Buscar informações dos gestores
      const gestores = await this.listarGestores(clienteId);

      return {
        id: cliente.id,
        name: cliente.name,
        email: cliente.email,
        id_gestor: cliente.id_gestor || [],
        gestores
      };
    } catch (error) {
      console.error('Erro inesperado ao buscar cliente com gestores:', error);
      return null;
    }
  }

  /**
   * Verifica se um usuário é gestor de um cliente específico
   * Suporte para formato atual (string) e futuro (array)
   */
  async isGestor(clienteId: string, userId: string): Promise<boolean> {
    try {
      const { data: cliente, error } = await supabase
        .from('clientes_info')
        .select('id_gestor')
        .eq('id', clienteId)
        .single();

      if (error || !cliente) {
        return false;
      }

      const gestoresAtuais = cliente.id_gestor;
      
      if (!gestoresAtuais) {
        return false;
      }

      // Verificar se é gestor (suporte para string e array)
      if (Array.isArray(gestoresAtuais)) {
        return gestoresAtuais.includes(userId);
      } else {
        return gestoresAtuais === userId;
      }
    } catch (error) {
      console.error('Erro ao verificar se é gestor:', error);
      return false;
    }
  }

  /**
   * Busca usuários disponíveis para serem gestores (usuários autenticados)
   */
  async buscarUsuariosDisponiveis(clienteId: string, searchTerm?: string): Promise<GestorInfo[]> {
    try {
      void 0;
      
      // Buscar todos os usuários autenticados
      const { data: users, error } = await supabase.auth.admin.listUsers();
      
      if (error) {
        console.error('Erro ao buscar usuários:', error);
        return [];
      }

      // Buscar gestores atuais do cliente
      const { data: cliente, error: clienteError } = await supabase
        .from('clientes_info')
        .select('id_gestor')
        .eq('id', clienteId)
        .single();

      const gestoresAtuais = cliente?.id_gestor;
      let gestoresIds: string[] = [];
      
      // Converter para array se necessário
      if (gestoresAtuais) {
        if (Array.isArray(gestoresAtuais)) {
          gestoresIds = gestoresAtuais;
        } else {
          gestoresIds = [gestoresAtuais];
        }
      }

      // Filtrar usuários que não são gestores e que não são o admin do cliente
      const usuariosDisponiveis = users.users
        .filter(user => {
          // Não incluir gestores já existentes
          if (gestoresIds.includes(user.id)) return false;
          
          // Não incluir o admin do cliente (se houver busca por email)
          if (cliente?.email === user.email) return false;
          
          // Filtrar por termo de busca se fornecido
          if (searchTerm) {
            const term = searchTerm.toLowerCase();
            const email = user.email?.toLowerCase() || '';
            const nome = user.user_metadata?.full_name?.toLowerCase() || 
                        user.user_metadata?.name?.toLowerCase() || '';
            return email.includes(term) || nome.includes(term);
          }
          
          return true;
        })
        .map(user => ({
          id: user.id,
          email: user.email || '',
          nome: user.user_metadata?.full_name || user.user_metadata?.name || '',
          telefone: user.user_metadata?.phone || '',
          created_at: user.created_at
        }));

      void 0;
      return usuariosDisponiveis;
    } catch (error) {
      console.error('Erro inesperado ao buscar usuários disponíveis:', error);
      return [];
    }
  }
}

export const gestorService = new GestorService();
