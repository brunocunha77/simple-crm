import { supabase } from '@/lib/supabase';
import { FunilRD, EtapaFunilRD, FunilRDComEtapas } from '@/types/global';

export class FunisRdService {
  // Buscar todos os funis RD do cliente
  static async getFunisRd(): Promise<FunilRD[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Obter o id_cliente do user_metadata
      const userMetadata = user.user_metadata || {};
      const id_cliente = userMetadata.id_cliente || userMetadata?.raw_user_meta_data?.id_cliente;
      
      if (!id_cliente) {
        throw new Error('ID do cliente não encontrado');
      }

      void 0;

      const { data, error } = await supabase
        .from('funis_rd')
        .select('*')
        .eq('id_cliente', id_cliente)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ FunisRdService: Erro na consulta:', error);
        throw error;
      }

      void 0;

      // Processar os dados para garantir que funil_padrao seja boolean
      const processedData = (data || []).map(funil => ({
        ...funil,
        funil_padrao: funil.funil_padrao === true || funil.funil_padrao === 'true'
      }));

      return processedData;
    } catch (error) {
      console.error('❌ FunisRdService: Erro ao buscar funis RD:', error);
      throw error;
    }
  }

  // Buscar funil RD específico com suas etapas
  static async getFunilRdComEtapas(id: number): Promise<FunilRDComEtapas | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const userMetadata = user.user_metadata || {};
      const id_cliente = userMetadata.id_cliente || userMetadata?.raw_user_meta_data?.id_cliente;
      
      if (!id_cliente) {
        throw new Error('ID do cliente não encontrado');
      }

      // Buscar o funil
      const { data: funil, error: funilError } = await supabase
        .from('funis_rd')
        .select('*')
        .eq('id', id)
        .eq('id_cliente', id_cliente)
        .single();

      if (funilError) throw funilError;
      if (!funil) return null;

      // Buscar as etapas do funil
      const { data: etapas, error: etapasError } = await supabase
        .from('etapas_funis_rd')
        .select('*')
        .eq('id_funil_rd', funil.id_funil_rd)
        .eq('id_cliente', id_cliente)
        .order('created_at', { ascending: true });

      if (etapasError) throw etapasError;

      return {
        ...funil,
        etapas: etapas || []
      };
    } catch (error) {
      console.error('Erro ao buscar funil RD com etapas:', error);
      throw error;
    }
  }

  // Definir funil RD como padrão
  static async setFunilRdPadrao(id: number): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const userMetadata = user.user_metadata || {};
      const id_cliente = userMetadata.id_cliente || userMetadata?.raw_user_meta_data?.id_cliente;
      
      if (!id_cliente) {
        throw new Error('ID do cliente não encontrado');
      }

      // Primeiro, remover o padrão de todos os funis do cliente
      const { error: removeError } = await supabase
        .from('funis_rd')
        .update({ funil_padrao: false })
        .eq('id_cliente', id_cliente);

      if (removeError) throw removeError;

      // Depois, definir o funil selecionado como padrão
      const { error: setError } = await supabase
        .from('funis_rd')
        .update({ funil_padrao: true })
        .eq('id', id)
        .eq('id_cliente', id_cliente);

      if (setError) throw setError;

      return true;
    } catch (error) {
      console.error('Erro ao definir funil RD padrão:', error);
      return false;
    }
  }

  // Atualizar palavras-chave das etapas
  static async atualizarPalavrasChaveEtapas(etapas: { id: number; palavra_chave: string }[]): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const userMetadata = user.user_metadata || {};
      const id_cliente = userMetadata.id_cliente || userMetadata?.raw_user_meta_data?.id_cliente;
      
      if (!id_cliente) {
        throw new Error('ID do cliente não encontrado');
      }

      // Atualizar cada etapa
      for (const etapa of etapas) {
        const { error } = await supabase
          .from('etapas_funis_rd')
          .update({ palavra_chave: etapa.palavra_chave })
          .eq('id', etapa.id)
          .eq('id_cliente', id_cliente);

        if (error) throw error;
      }

      return true;
    } catch (error) {
      console.error('Erro ao atualizar palavras-chave das etapas:', error);
      return false;
    }
  }

  // Verificar se há funis RD disponíveis
  static async hasFunisRd(): Promise<boolean> {
    try {
      const funis = await this.getFunisRd();
      return funis.length > 0;
    } catch (error) {
      console.error('Erro ao verificar funis RD:', error);
      return false;
    }
  }

  // Buscar funil RD padrão
  static async getFunilRdPadrao(): Promise<FunilRD | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const userMetadata = user.user_metadata || {};
      const id_cliente = userMetadata.id_cliente || userMetadata?.raw_user_meta_data?.id_cliente;
      
      if (!id_cliente) {
        throw new Error('ID do cliente não encontrado');
      }

      const { data, error } = await supabase
        .from('funis_rd')
        .select('*')
        .eq('id_cliente', id_cliente)
        .eq('funil_padrao', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Nenhum registro encontrado
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Erro ao buscar funil RD padrão:', error);
      return null;
    }
  }
}
