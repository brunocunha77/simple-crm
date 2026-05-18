import { supabase } from '@/lib/supabase';
import { Funil, FunilEtapa, FunilComEtapas, CriarFunilData, EditarFunilData } from '@/types/global';

export class FunisService {
  // Buscar todos os funis do cliente
  static async getFunis(): Promise<Funil[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Obter o id_cliente do user_metadata
      const userMetadata = user.user_metadata || {};
      const id_cliente = userMetadata.id_cliente || userMetadata?.raw_user_meta_data?.id_cliente;
      
      if (!id_cliente) {
        throw new Error('ID do cliente não encontrado');
      }

      const { data, error } = await supabase
        .from('funis')
        .select('*')
        .eq('id_cliente', id_cliente)
        .order('funil_padrao', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar funis:', error);
      throw error;
    }
  }

  // Buscar funil específico com suas etapas
  static async getFunilComEtapas(id: number): Promise<FunilComEtapas | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Obter o id_cliente do user_metadata
      const userMetadata = user.user_metadata || {};
      const id_cliente = userMetadata.id_cliente || userMetadata?.raw_user_meta_data?.id_cliente;
      
      if (!id_cliente) {
        throw new Error('ID do cliente não encontrado');
      }

      // Buscar o funil
      const { data: funil, error: funilError } = await supabase
        .from('funis')
        .select('*')
        .eq('id', id)
        .eq('id_cliente', id_cliente)
        .single();

      if (funilError) throw funilError;
      if (!funil) return null;

      // Buscar as etapas do funil ordenadas pela coluna ordem
      const { data: etapas, error: etapasError } = await supabase
        .from('funis_etapas')
        .select('*')
        .eq('id_funil', id)
        .eq('id_cliente', id_cliente)
        .order('ordem', { ascending: true });

      if (etapasError) throw etapasError;

      return {
        ...funil,
        etapas: etapas || [],
        id_funil_padrao: funil.funil_padrao === true
      };
    } catch (error) {
      console.error('Erro ao buscar funil com etapas:', error);
      throw error;
    }
  }

  // Criar novo funil com etapas
  static async criarFunil(funilData: CriarFunilData): Promise<FunilComEtapas> {
    try {
      void 0;
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      void 0;

      // Obter o id_cliente do user_metadata
      const userMetadata = user.user_metadata || {};
      const id_cliente = userMetadata.id_cliente || userMetadata?.raw_user_meta_data?.id_cliente;
      
      void 0;
      void 0;
      
      if (!id_cliente) {
        throw new Error('ID do cliente não encontrado');
      }

      if (funilData.etapas.length < 2) {
        throw new Error('O funil deve ter pelo menos duas etapas');
      }

      void 0;
      void 0;
      
      // Inserir o funil
      const insertResult = await supabase
        .from('funis')
        .insert({
          id_cliente: id_cliente,
          nome: funilData.nome,
          funil_padrao: false // Por padrão, novos funis não são padrão
        })
        .select()
        .single();

      void 0;
      void 0;
      void 0;
      void 0;
      void 0;

      if (insertResult.error) {
        console.error('FunisService: Erro ao inserir funil:', insertResult.error);
        console.error('FunisService: Tipo do erro:', typeof insertResult.error);
        console.error('FunisService: Mensagem do erro:', insertResult.error.message);
        console.error('FunisService: Código do erro:', insertResult.error.code);
        console.error('FunisService: Detalhes do erro:', insertResult.error.details);
        console.error('FunisService: Dica do erro:', insertResult.error.hint);
        throw insertResult.error;
      }
      
      const funil = insertResult.data;
      if (!funil) {
        console.error('FunisService: Funil não foi criado');
        throw new Error('Erro ao criar funil');
      }

      void 0;

      void 0;
      
      // Garantir que apenas uma etapa tenha etapa_de_ganho = true
      let jaTemEtapaDeGanho = false;
      const etapasData = funilData.etapas.map((etapa, index) => {
        const isEtapaDeGanho = etapa.etapa_de_ganho && !jaTemEtapaDeGanho;
        if (isEtapaDeGanho) jaTemEtapaDeGanho = true;
        
        return {
          id_funil: funil.id,
          id_cliente: id_cliente,
          nome: etapa.nome,
          palavras_chave: etapa.palavras_chave || null,
          etapa_de_ganho: isEtapaDeGanho,
          ordem: index + 1 // Ordem começa em 1
        };
      });

      void 0;

      const etapasResult = await supabase
        .from('funis_etapas')
        .insert(etapasData)
        .select();

      void 0;
      void 0;
      void 0;

      if (etapasResult.error) {
        console.error('FunisService: Erro ao inserir etapas:', etapasResult.error);
        throw etapasResult.error;
      }

      const etapas = etapasResult.data;
      void 0;

      const resultado = {
        ...funil,
        etapas: etapas || []
      };

      void 0;
      return resultado;
      
    } catch (error: any) {
      console.error('FunisService: Erro detalhado ao criar funil:', error);
      console.error('FunisService: Tipo do erro:', typeof error);
      console.error('FunisService: Mensagem do erro:', error.message);
      console.error('FunisService: Stack trace:', error.stack);
      
      // Log adicional para erros do Supabase
      if (error && typeof error === 'object') {
        console.error('FunisService: Chaves do objeto de erro:', Object.keys(error));
        console.error('FunisService: Valores do objeto de erro:', Object.values(error));
        console.error('FunisService: JSON do erro:', JSON.stringify(error, null, 2));
        
        // Verificar se é um erro do Supabase
        if ('code' in error) {
          console.error('FunisService: Código do erro Supabase:', error.code);
        }
        if ('details' in error) {
          console.error('FunisService: Detalhes do erro Supabase:', error.details);
        }
        if ('hint' in error) {
          console.error('FunisService: Dica do erro Supabase:', error.hint);
        }
      }
      
      throw error;
    }
  }

  // Atualizar funil existente
  static async atualizarFunil(id: number, funilData: EditarFunilData): Promise<FunilComEtapas> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Obter o id_cliente do user_metadata
      const userMetadata = user.user_metadata || {};
      const id_cliente = userMetadata.id_cliente || userMetadata?.raw_user_meta_data?.id_cliente;
      
      if (!id_cliente) {
        throw new Error('ID do cliente não encontrado');
      }

      if (funilData.etapas.length < 2) {
        throw new Error('O funil deve ter pelo menos duas etapas');
      }

      // Atualizar o funil
      const { data: funil, error: funilError } = await supabase
        .from('funis')
        .update({ nome: funilData.nome })
        .eq('id', id)
        .eq('id_cliente', id_cliente)
        .select()
        .single();

      if (funilError) throw funilError;
      if (!funil) throw new Error('Funil não encontrado');

      // Buscar etapas existentes
      const { data: etapasExistentes, error: etapasExistentesError } = await supabase
        .from('funis_etapas')
        .select('*')
        .eq('id_funil', id)
        .eq('id_cliente', id_cliente)
        .order('id');

      if (etapasExistentesError) throw etapasExistentesError;

      const etapasExistentesMap = new Map(etapasExistentes?.map(etapa => [etapa.id, etapa]) || []);
      const etapasAtualizadas = [];

      // Garantir que apenas uma etapa tenha etapa_de_ganho = true
      let jaTemEtapaDeGanho = false;

      // Processar cada etapa do funil
      for (let i = 0; i < funilData.etapas.length; i++) {
        const etapaData = funilData.etapas[i];
        const isEtapaDeGanho = etapaData.etapa_de_ganho && !jaTemEtapaDeGanho;
        if (isEtapaDeGanho) jaTemEtapaDeGanho = true;
        
        if (i < etapasExistentes?.length) {
          // Atualizar etapa existente
          const etapaExistente = etapasExistentes[i];
          const { data: etapaAtualizada, error: updateError } = await supabase
            .from('funis_etapas')
            .update({
              nome: etapaData.nome,
              palavras_chave: etapaData.palavras_chave || null,
              etapa_de_ganho: isEtapaDeGanho,
              ordem: i + 1, // Ordem começa em 1
              update_at: new Date().toISOString()
            })
            .eq('id', etapaExistente.id)
            .select()
            .single();

          if (updateError) throw updateError;
          etapasAtualizadas.push(etapaAtualizada);
        } else {
          // Inserir nova etapa
          const { data: novaEtapa, error: insertError } = await supabase
            .from('funis_etapas')
            .insert({
              id_funil: id,
              id_cliente: id_cliente,
              nome: etapaData.nome,
              palavras_chave: etapaData.palavras_chave || null,
              etapa_de_ganho: isEtapaDeGanho,
              ordem: i + 1 // Ordem começa em 1
            })
            .select()
            .single();

          if (insertError) throw insertError;
          etapasAtualizadas.push(novaEtapa);
        }
      }

      // Remover etapas extras se houver menos etapas que antes
      if (funilData.etapas.length < etapasExistentes?.length) {
        const etapasParaRemover = etapasExistentes.slice(funilData.etapas.length);
        for (const etapa of etapasParaRemover) {
          await supabase
            .from('funis_etapas')
            .delete()
            .eq('id', etapa.id);
        }
      }

      const etapas = etapasAtualizadas;

      return {
        ...funil,
        etapas: etapas || []
      };
    } catch (error) {
      console.error('Erro ao atualizar funil:', error);
      throw error;
    }
  }

  // Deletar funil
  static async deletarFunil(id: number): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Obter o id_cliente do user_metadata
      const userMetadata = user.user_metadata || {};
      const id_cliente = userMetadata.id_cliente || userMetadata?.raw_user_meta_data?.id_cliente;
      
      if (!id_cliente) {
        throw new Error('ID do cliente não encontrado');
      }

      // Deletar etapas primeiro (devido à foreign key)
      const { error: etapasError } = await supabase
        .from('funis_etapas')
        .delete()
        .eq('id_funil', id)
        .eq('id_cliente', id_cliente);

      if (etapasError) throw etapasError;

      // Deletar o funil
      const { error: funilError } = await supabase
        .from('funis')
        .delete()
        .eq('id', id)
        .eq('id_cliente', id_cliente);

      if (funilError) throw funilError;
    } catch (error) {
      console.error('Erro ao deletar funil:', error);
      throw error;
    }
  }

  // Buscar estatísticas dos funis
  static async getEstatisticasFunis(): Promise<{
    total: number;
    totalEtapas: number;
    funilMaisEtapas: { nome: string; etapas: number } | null;
  }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Obter o id_cliente do user_metadata
      const userMetadata = user.user_metadata || {};
      const id_cliente = userMetadata.id_cliente || userMetadata?.raw_user_meta_data?.id_cliente;
      
      if (!id_cliente) {
        throw new Error('ID do cliente não encontrado');
      }

      // Buscar todos os funis do cliente
      const { data: funis, error: funisError } = await supabase
        .from('funis')
        .select('id, nome')
        .eq('id_cliente', id_cliente);

      if (funisError) throw funisError;

      if (!funis || funis.length === 0) {
        return {
          total: 0,
          totalEtapas: 0,
          funilMaisEtapas: null
        };
      }

              // Buscar contagem de etapas para cada funil
        const estatisticas: Array<{ nome: string; etapas: number }> = await Promise.all(
          funis.map(async (funil) => {
            const { count, error } = await supabase
              .from('funis_etapas')
              .select('*', { count: 'exact', head: true })
              .eq('id_funil', funil.id)
              .eq('id_cliente', id_cliente);

          if (error) throw error;
          return {
            nome: funil.nome,
            etapas: count || 0
          };
        })
      );

      const total = funis.length;
      const totalEtapas = estatisticas.reduce((sum, stat) => sum + stat.etapas, 0);
      const funilMaisEtapas = estatisticas.reduce((max, stat) => 
        stat.etapas > (max?.etapas || 0) ? stat : max, null as { nome: string; etapas: number } | null
      );

      return {
        total,
        totalEtapas,
        funilMaisEtapas
      };
    } catch (error) {
      console.error('Erro ao buscar estatísticas dos funis:', error);
      throw error;
    }
  }

  // Marcar funil como padrão
  static async marcarFunilComoPadrao(id: number): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Obter o id_cliente do user_metadata
      const userMetadata = user.user_metadata || {};
      const id_cliente = userMetadata.id_cliente || userMetadata?.raw_user_meta_data?.id_cliente;
      
      if (!id_cliente) {
        throw new Error('ID do cliente não encontrado');
      }

      // Verificar se o funil existe e pertence ao cliente
      const { data: funil, error: funilError } = await supabase
        .from('funis')
        .select('id, nome')
        .eq('id', id)
        .eq('id_cliente', id_cliente)
        .single();

      if (funilError) throw funilError;
      if (!funil) throw new Error('Funil não encontrado');

      // Primeiro, desmarcar todos os outros funis como padrão
      await supabase
        .from('funis')
        .update({ funil_padrao: false })
        .eq('id_cliente', id_cliente);

      // Marcar o funil selecionado como padrão
      const { error: updateError } = await supabase
        .from('funis')
        .update({ funil_padrao: true })
        .eq('id', id)
        .eq('id_cliente', id_cliente);

      if (updateError) throw updateError;

      // Atualizar o id_funil_padrao na tabela clientes_info
      const { error: clienteError } = await supabase
        .from('clientes_info')
        .update({ id_funil_padrao: id })
        .eq('id', id_cliente);

      if (clienteError) {
        console.error('Erro ao atualizar id_funil_padrao em clientes_info:', clienteError);
        // Não falhar a operação se houver erro na atualização do cliente
      }

    } catch (error) {
      console.error('Erro ao marcar funil como padrão:', error);
      throw error;
    }
  }

  // Desmarcar funil como padrão
  static async desmarcarFunilComoPadrao(id: number): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Obter o id_cliente do user_metadata
      const userMetadata = user.user_metadata || {};
      const id_cliente = userMetadata.id_cliente || userMetadata?.raw_user_meta_data?.id_cliente;
      
      if (!id_cliente) {
        throw new Error('ID do cliente não encontrado');
      }

      // Desmarcar o funil como padrão
      const { error } = await supabase
        .from('funis')
        .update({ funil_padrao: false })
        .eq('id', id)
        .eq('id_cliente', id_cliente);

      if (error) throw error;

      // Remover o id_funil_padrao da tabela clientes_info
      const { error: clienteError } = await supabase
        .from('clientes_info')
        .update({ id_funil_padrao: null })
        .eq('id', id_cliente);

      if (clienteError) {
        console.error('Erro ao remover id_funil_padrao de clientes_info:', clienteError);
        // Não falhar a operação se houver erro na atualização do cliente
      }

    } catch (error) {
      console.error('Erro ao desmarcar funil como padrão:', error);
      throw error;
    }
  }

  // Buscar funil padrão do cliente
  static async getFunilPadrao(): Promise<FunilComEtapas | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Obter o id_cliente do user_metadata
      const userMetadata = user.user_metadata || {};
      const id_cliente = userMetadata.id_cliente || userMetadata?.raw_user_meta_data?.id_cliente;
      
      if (!id_cliente) {
        throw new Error('ID do cliente não encontrado');
      }

      // Buscar o funil padrão
      const { data: funil, error: funilError } = await supabase
        .from('funis')
        .select('*')
        .eq('id_cliente', id_cliente)
        .eq('funil_padrao', true)
        .single();

      if (funilError) {
        if (funilError.code === 'PGRST116') {
          // Nenhum funil padrão encontrado
          return null;
        }
        throw funilError;
      }

      if (!funil) return null;

      // Buscar as etapas do funil ordenadas pela coluna ordem
      const { data: etapas, error: etapasError } = await supabase
        .from('funis_etapas')
        .select('*')
        .eq('id_funil', funil.id)
        .eq('id_cliente', id_cliente)
        .order('ordem', { ascending: true });

      if (etapasError) throw etapasError;

      return {
        ...funil,
        etapas: etapas || [],
        id_funil_padrao: true
      };
    } catch (error) {
      console.error('Erro ao buscar funil padrão:', error);
      throw error;
    }
  }

  // Verificar se um funil é padrão
  static async isFunilPadrao(id: number): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Obter o id_cliente do user_metadata
      const userMetadata = user.user_metadata || {};
      const id_cliente = userMetadata.id_cliente || userMetadata?.raw_user_meta_data?.id_cliente;
      
      if (!id_cliente) {
        throw new Error('ID do cliente não encontrado');
      }

      const { data: funil, error } = await supabase
        .from('funis')
        .select('funil_padrao')
        .eq('id', id)
        .eq('id_cliente', id_cliente)
        .single();

      if (error) throw error;
      return funil?.funil_padrao === true;
    } catch (error) {
      console.error('Erro ao verificar se funil é padrão:', error);
      throw error;
    }
  }

  // Reordenar etapas de um funil
  static async reordenarEtapas(idFunil: number, etapasReordenadas: { id: number; ordem: number }[]): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Obter o id_cliente do user_metadata
      const userMetadata = user.user_metadata || {};
      const id_cliente = userMetadata.id_cliente || userMetadata?.raw_user_meta_data?.id_cliente;
      
      if (!id_cliente) {
        throw new Error('ID do cliente não encontrado');
      }

      // Atualizar a ordem de cada etapa
      for (const etapa of etapasReordenadas) {
        const { error } = await supabase
          .from('funis_etapas')
          .update({ ordem: etapa.ordem })
          .eq('id', etapa.id)
          .eq('id_funil', idFunil)
          .eq('id_cliente', id_cliente);

        if (error) throw error;
      }
    } catch (error) {
      console.error('Erro ao reordenar etapas:', error);
      throw error;
    }
  }

  // Buscar a etapa de ganho de um funil
  static async getEtapaDeGanho(idFunil: number): Promise<FunilEtapa | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Obter o id_cliente do user_metadata
      const userMetadata = user.user_metadata || {};
      const id_cliente = userMetadata.id_cliente || userMetadata?.raw_user_meta_data?.id_cliente;
      
      if (!id_cliente) {
        throw new Error('ID do cliente não encontrado');
      }

      // Buscar a etapa marcada como etapa de ganho
      const { data: etapa, error } = await supabase
        .from('funis_etapas')
        .select('*')
        .eq('id_funil', idFunil)
        .eq('id_cliente', id_cliente)
        .eq('etapa_de_ganho', true)
        .maybeSingle();

      if (error) throw error;
      return etapa;
    } catch (error) {
      console.error('Erro ao buscar etapa de ganho:', error);
      throw error;
    }
  }
}
