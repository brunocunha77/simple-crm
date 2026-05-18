import { supabase } from '@/lib/supabase';
import { Tema } from '@/types/theme';

export class TemaService {
  /**
   * Busca o tema do cliente pelo id_cliente
   * @param idCliente ID do cliente
   * @returns Tema do cliente ou null se não encontrado
   */
  static async getTemaByClienteId(idCliente: number): Promise<Tema | null> {
    try {
      const { data, error } = await supabase
        .from('temas')
        .select('*')
        .eq('id_cliente', idCliente)
        .maybeSingle();

      if (error) {
        if (error.code === 'PGRST116') {
          // Nenhum tema encontrado
          return null;
        }
        console.error('Erro ao buscar tema:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Erro inesperado ao buscar tema:', error);
      return null;
    }
  }

  /**
   * Busca o tema do cliente pelo user_id_auth
   * @param userId ID do usuário autenticado
   * @returns Tema do cliente ou null se não encontrado
   */
  static async getTemaByUserId(userId: string): Promise<Tema | null> {
    try {
      // Primeiro buscar o id_cliente do usuário
      const { data: cliente, error: clienteError } = await supabase
        .from('clientes_info')
        .select('id')
        .eq('user_id_auth', userId)
        .single();

      if (clienteError || !cliente) {
        console.error('Erro ao buscar cliente:', clienteError);
        return null;
      }

      // Buscar o tema usando o id_cliente
      return await this.getTemaByClienteId(cliente.id);
    } catch (error) {
      console.error('Erro inesperado ao buscar tema por userId:', error);
      return null;
    }
  }

  /**
   * Verifica se o cliente tem tema personalizado
   * @param idCliente ID do cliente
   * @returns true se tem tema personalizado, false caso contrário
   */
  static async hasTemaPersonalizado(idCliente: number): Promise<boolean> {
    const tema = await this.getTemaByClienteId(idCliente);
    return tema !== null;
  }

  /**
   * Busca o tema pelo domínio
   * @param dominio Domínio da aplicação (ex: app.cliente.com)
   * @returns Tema do cliente ou null se não encontrado
   */
  static async getTemaByDominio(dominio: string): Promise<Tema | null> {
    try {
      const { data, error } = await supabase
        .from('temas')
        .select('*')
        .eq('dominio', dominio)
        .maybeSingle();

      if (error) {
        if (error.code === 'PGRST116') {
          // Nenhum tema encontrado para este domínio
          return null;
        }
        console.error('Erro ao buscar tema por domínio:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Erro inesperado ao buscar tema por domínio:', error);
      return null;
    }
  }

  /**
   * Busca o tema baseado no domínio atual (hostname + porta)
   * @returns Tema do cliente ou null se domínio for padrão ou não encontrado
   */
  static async getTemaByCurrentDomain(): Promise<Tema | null> {
    try {
      const currentDomain = window.location.hostname;
      const currentPort = window.location.port;
      
      // Montar string do domínio com porta se houver
      const fullDomain = currentPort ? `${currentDomain}:${currentPort}` : currentDomain;
      
      void 0;
      
      // Se for domínio padrão, não aplicar tema
      if (currentDomain === 'app.usesmartcrm.com') {
        void 0;
        return null;
      }

      // Buscar tema pelo domínio completo (com porta)
      let tema = await this.getTemaByDominio(fullDomain);
      
      // Se não encontrar com porta, tentar só com hostname
      if (!tema && currentPort) {
        void 0;
        tema = await this.getTemaByDominio(currentDomain);
      }
      
      if (tema) {
        void 0;
      } else {
        void 0;
      }
      
      return tema;
    } catch (error) {
      console.error('Erro ao buscar tema pelo domínio atual:', error);
      return null;
    }
  }
}
