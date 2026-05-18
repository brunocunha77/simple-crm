import { supabase } from '@/lib/supabase';
import { Lead, LeadComFunil, FunilComEtapas } from '@/types/global';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { parseLeadValor } from '@/utils/currency';

const adminEmailCache = new Map<string, number>();

async function resolveRegistroUsuarioId(user: SupabaseUser | null, idCliente?: number | null) {
  if (!user || !user.email) {
    return null;
  }

  // Verificar cache primeiro
  const cacheKey = `atendente_${user.email}_${idCliente}`;
  if (adminEmailCache.has(cacheKey)) {
    const cached = adminEmailCache.get(cacheKey);
    return cached === -1 ? null : cached; // -1 significa que é Admin (null)
  }

  try {
    // 1. Primeiro verificar se é Admin (está na tabela clientes_info)
    const { data: adminData, error: adminError } = await supabase
      .from('clientes_info')
      .select('id')
      .eq('email', user.email)
      .maybeSingle();

    if (adminData && !adminError) {
      // É Admin, retornar null
      adminEmailCache.set(cacheKey, -1); // -1 indica Admin (null)
      return null;
    }

    // 2. Se não é Admin, verificar se é Atendente ou Gestor (tabela atendentes)
    if (idCliente) {
      const { data: atendenteData, error: atendenteError } = await supabase
        .from('atendentes')
        .select('id')
        .eq('email', user.email)
        .eq('id_cliente', idCliente)
        .maybeSingle();

      if (atendenteData && !atendenteError && atendenteData.id) {
        // É Atendente ou Gestor, retornar o ID da tabela atendentes
        adminEmailCache.set(cacheKey, atendenteData.id);
        return atendenteData.id;
      }
    }

    // 3. Se não encontrou em nenhuma tabela, retornar null
    adminEmailCache.set(cacheKey, -1); // Cache como Admin (null)
    return null;
  } catch (error) {
    void 0;
    return null;
  }
}

// Função auxiliar para buscar o nome do vendedor
async function getNomeVendedor(responsavelId: number | null): Promise<string | null> {
  if (!responsavelId || typeof responsavelId !== 'number') {
    return null; // Admin ou null
  }

  try {
    const { data, error } = await supabase
      .from('atendentes')
      .select('nome')
      .eq('id', responsavelId)
      .maybeSingle();

    if (error || !data) {
      void 0;
      return null;
    }

    return data.nome;
  } catch (error) {
    console.error('Erro ao buscar nome do vendedor:', error);
    return null;
  }
}

export class LeadsService {
  // Buscar todos os leads do cliente com informações de funil e etapa
  static async getLeadsComFunil(): Promise<LeadComFunil[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Obter o id_cliente do user_metadata
      const userMetadata = user.user_metadata || {};
      const id_cliente = userMetadata.id_cliente || userMetadata?.raw_user_meta_data?.id_cliente;
      
      if (!id_cliente) {
        throw new Error('ID do cliente não encontrado');
      }

      // Buscar todos os leads do cliente
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('*')
        .eq('id_cliente', id_cliente)
        .order('data_criacao', { ascending: false });

      if (leadsError) throw leadsError;

      if (!leads || leads.length === 0) {
        return [];
      }

      // Buscar todos os funis do cliente
      const { data: funis, error: funisError } = await supabase
        .from('funis')
        .select('id, nome')
        .eq('id_cliente', id_cliente);

      if (funisError) throw funisError;

      // Buscar todas as etapas dos funis do cliente
      const { data: etapas, error: etapasError } = await supabase
        .from('funis_etapas')
        .select('id, nome, id_funil')
        .eq('id_cliente', id_cliente);

      if (etapasError) throw etapasError;

      // Mapear para o formato LeadComFunil
      const leadsComFunil: LeadComFunil[] = (leads || []).map(lead => {
        const funil = lead.id_funil ? funis?.find(f => f.id === lead.id_funil) : null;
        const etapa = lead.id_funil_etapa ? etapas?.find(e => e.id === lead.id_funil_etapa) : null;
        
        return {
          ...lead,
          funil: funil,
          etapa: etapa
        };
      });

      return leadsComFunil;
    } catch (error) {
      console.error('Erro ao buscar leads com funil:', error);
      throw error;
    }
  }

  // Buscar leads por funil específico
  static async getLeadsPorFunil(idFunil: number): Promise<LeadComFunil[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Obter o id_cliente do user_metadata
      const userMetadata = user.user_metadata || {};
      const id_cliente = userMetadata.id_cliente || userMetadata?.raw_user_meta_data?.id_cliente;
      
      if (!id_cliente) {
        throw new Error('ID do cliente não encontrado');
      }

      // Buscar leads do funil específico
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('*')
        .eq('id_cliente', id_cliente)
        .eq('id_funil', idFunil)
        .order('data_criacao', { ascending: false });

      if (leadsError) throw leadsError;

      if (!leads || leads.length === 0) {
        return [];
      }

      // Buscar informações do funil
      const { data: funil, error: funilError } = await supabase
        .from('funis')
        .select('id, nome')
        .eq('id', idFunil)
        .eq('id_cliente', id_cliente)
        .single();

      if (funilError) throw funilError;

      // Buscar todas as etapas do funil
      const { data: etapas, error: etapasError } = await supabase
        .from('funis_etapas')
        .select('id, nome, id_funil')
        .eq('id_funil', idFunil)
        .eq('id_cliente', id_cliente);

      if (etapasError) throw etapasError;

      // Mapear para o formato LeadComFunil
      const leadsComFunil: LeadComFunil[] = (leads || []).map(lead => {
        const etapa = etapas?.find(e => e.id === lead.id_funil_etapa);
        return {
          ...lead,
          funil: funil,
          etapa: etapa
        };
      });

      return leadsComFunil;
    } catch (error) {
      console.error('Erro ao buscar leads por funil:', error);
      throw error;
    }
  }

  // Mover lead para uma nova etapa (drag & drop)
  static async moverLeadParaEtapa(
    leadId: number, 
    novaEtapaId: number
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Obter o id_cliente do user_metadata
      const userMetadata = user.user_metadata || {};
      const id_cliente = userMetadata.id_cliente || userMetadata?.raw_user_meta_data?.id_cliente;
      
      if (!id_cliente) {
        throw new Error('ID do cliente não encontrado');
      }

      // Verificar se a etapa pertence ao mesmo funil do lead
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('id_funil')
        .eq('id', leadId)
        .eq('id_cliente', id_cliente)
        .single();

      if (leadError) throw leadError;

      const { data: etapa, error: etapaError } = await supabase
        .from('funis_etapas')
        .select('id_funil, etapa_de_ganho')
        .eq('id', novaEtapaId)
        .eq('id_cliente', id_cliente)
        .single();

      if (etapaError) throw etapaError;

      if (lead.id_funil !== etapa.id_funil) {
        throw new Error('A etapa deve pertencer ao mesmo funil do lead');
      }

      const isEtapaDeGanho = etapa?.etapa_de_ganho === true;
      const updatePayload: Record<string, any> = {
        id_funil_etapa: novaEtapaId
      };

      if (isEtapaDeGanho) {
        const responsavelId = await resolveRegistroUsuarioId(user, id_cliente);
        const nomeVendedor = await getNomeVendedor(responsavelId);
        const now = new Date().toISOString();
        Object.assign(updatePayload, {
          status: 'Ganho',
          venda: true,
          venda_realizada: true,
          venda_perdida: false,
          data_venda: now,
          data_perda: null,
          id_usuario_venda: responsavelId,
          nome_vendedor: nomeVendedor,
          id_usuario_perda: null,
          probabilidade_final_fechamento: 100,
          data_ultimo_status: now
        });
      }

      // Atualizar a etapa do lead
      const { error: updateError } = await supabase
        .from('leads')
        .update(updatePayload)
        .eq('id', leadId)
        .eq('id_cliente', id_cliente);

      if (updateError) throw updateError;
    } catch (error) {
      console.error('Erro ao mover lead para nova etapa:', error);
      throw error;
    }
  }

  // Migrar lead para outro funil
  static async migrarLeadParaFunil(
    leadId: number, 
    novoFunilId: number,
    novaEtapaId: number
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Obter o id_cliente do user_metadata
      const userMetadata = user.user_metadata || {};
      const id_cliente = userMetadata.id_cliente || userMetadata?.raw_user_meta_data?.id_cliente;
      
      if (!id_cliente) {
        throw new Error('ID do cliente não encontrado');
      }

      // Verificar se a etapa pertence ao novo funil
      const { data: etapa, error: etapaError } = await supabase
        .from('funis_etapas')
        .select('id_funil, etapa_de_ganho')
        .eq('id', novaEtapaId)
        .eq('id_funil', novoFunilId)
        .eq('id_cliente', id_cliente)
        .single();

      if (etapaError) throw etapaError;

      const isEtapaDeGanho = etapa?.etapa_de_ganho === true;
      const updatePayload: Record<string, any> = { 
        id_funil: novoFunilId,
        id_funil_etapa: novaEtapaId
      };

      if (isEtapaDeGanho) {
        const responsavelId = await resolveRegistroUsuarioId(user, id_cliente);
        const nomeVendedor = await getNomeVendedor(responsavelId);
        const now = new Date().toISOString();
        Object.assign(updatePayload, {
          status: 'Ganho',
          venda: true,
          venda_realizada: true,
          venda_perdida: false,
          data_venda: now,
          data_perda: null,
          id_usuario_venda: responsavelId,
          nome_vendedor: nomeVendedor,
          id_usuario_perda: null,
          probabilidade_final_fechamento: 100,
          data_ultimo_status: now
        });
      }

      // Atualizar o funil e etapa do lead
      const { error: updateError } = await supabase
        .from('leads')
        .update(updatePayload)
        .eq('id', leadId)
        .eq('id_cliente', id_cliente);

      if (updateError) throw updateError;
    } catch (error) {
      console.error('Erro ao migrar lead para novo funil:', error);
      throw error;
    }
  }

  // Criar novo lead
  static async criarLead(leadData: Partial<Lead>): Promise<Lead> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Obter o id_cliente do user_metadata
      const userMetadata = user.user_metadata || {};
      const id_cliente = userMetadata.id_cliente || userMetadata?.raw_user_meta_data?.id_cliente;
      
      if (!id_cliente) {
        throw new Error('ID do cliente não encontrado');
      }

      // Se não foi especificado um funil, usar o funil padrão do cliente
      if (!leadData.id_funil) {
        const { data: clienteInfo, error: clienteError } = await supabase
          .from('clientes_info')
          .select('id_funil_padrao')
          .eq('id', id_cliente)
          .single();

        if (clienteError) throw clienteError;

        if (clienteInfo?.id_funil_padrao) {
          leadData.id_funil = clienteInfo.id_funil_padrao;
          
          // Buscar a primeira etapa do funil padrão
          const { data: primeiraEtapa, error: etapaError } = await supabase
            .from('funis_etapas')
            .select('id')
            .eq('id_funil', clienteInfo.id_funil_padrao)
            .eq('id_cliente', id_cliente)
            .order('data_criacao', { ascending: true })
            .limit(1)
            .single();

          if (!etapaError && primeiraEtapa) {
            leadData.id_funil_etapa = primeiraEtapa.id;
          }
        }
      }

      const { data: lead, error } = await supabase
        .from('leads')
        .insert({
          ...leadData,
          id_cliente
        })
        .select()
        .single();

      if (error) throw error;
      if (!lead) throw new Error('Erro ao criar lead');

      return lead;
    } catch (error) {
      console.error('Erro ao criar lead:', error);
      throw error;
    }
  }

  // Atualizar lead
  static async atualizarLead(id: number, leadData: Partial<Lead>): Promise<Lead> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Obter o id_cliente do user_metadata
      const userMetadata = user.user_metadata || {};
      const id_cliente = userMetadata.id_cliente || userMetadata?.raw_user_meta_data?.id_cliente;
      
      if (!id_cliente) {
        throw new Error('ID do cliente não encontrado');
      }

      const { data: lead, error } = await supabase
        .from('leads')
        .update({
          ...leadData
        })
        .eq('id', id)
        .eq('id_cliente', id_cliente)
        .select()
        .single();

      if (error) throw error;
      if (!lead) throw new Error('Lead não encontrado');

      return lead;
    } catch (error) {
      console.error('Erro ao atualizar lead:', error);
      throw error;
    }
  }

  // Deletar lead
  static async deletarLead(id: number): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Obter o id_cliente do user_metadata
      const userMetadata = user.user_metadata || {};
      const id_cliente = userMetadata.id_cliente || userMetadata?.raw_user_meta_data?.id_cliente;
      
      if (!id_cliente) {
        throw new Error('ID do cliente não encontrado');
      }

      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', id)
        .eq('id_cliente', id_cliente);

      if (error) throw error;
    } catch (error) {
      console.error('Erro ao deletar lead:', error);
      throw error;
    }
  }

  // Buscar leads por cliente e intervalo de datas
  static async getLeadsByClientIdAndDateRange(
    clientId: number, 
    fromDate: Date | undefined, 
    toDate: Date | undefined
  ): Promise<Lead[]> {
    try {
      let query = supabase
        .from('leads')
        .select('*')
        .eq('id_cliente', clientId);

      if (fromDate) {
        query = query.gte('data_criacao', fromDate.toISOString());
      }
      if (toDate) {
        query = query.lte('data_criacao', toDate.toISOString());
      }

      const { data, error } = await query.order('data_criacao', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar leads por cliente e data:', error);
      throw error;
    }
  }

  // Buscar todos os leads de um cliente
  static async getLeadsByClientId(clientId: number): Promise<Lead[]> {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id_cliente', clientId)
        .order('data_criacao', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar leads por cliente:', error);
      throw error;
    }
  }

  static async getVendasPorPeriodo(
    startDate: Date,
    endDate: Date,
    vendedorId?: string | number | null
  ): Promise<Lead[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const userMetadata = user.user_metadata || {};
      const id_cliente = userMetadata.id_cliente || userMetadata?.raw_user_meta_data?.id_cliente;
  
      if (!id_cliente) {
        throw new Error('ID do cliente não encontrado');
      }

      let query = supabase
        .from('leads')
        .select('*')
        .eq('id_cliente', id_cliente)
        .eq('venda_realizada', true)
        .not('data_venda', 'is', null)
        .order('data_venda', { ascending: false });

      if (startDate) {
        query = query.gte('data_venda', startDate.toISOString());
      }

      if (endDate) {
        query = query.lte('data_venda', endDate.toISOString());
      }

      if (vendedorId !== null && vendedorId !== undefined && vendedorId !== '') {
        // Se for string, filtrar por nome_vendedor; se for number, filtrar por id_usuario_venda
        if (typeof vendedorId === 'string') {
          query = query.eq('nome_vendedor', vendedorId);
        } else {
          query = query.eq('id_usuario_venda', vendedorId);
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar vendas por período:', error);
      throw error;
    }
  }

  // Buscar estatísticas de vendas
  static async getVendasStats(
    clientId: number, 
    fromDate: Date, 
    toDate: Date
  ): Promise<{
    totalVendas: number;
    valorTotal: number;
    mediaTicket: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('valor')
        .eq('id_cliente', clientId)
        .gte('data_criacao', fromDate.toISOString())
        .lte('data_criacao', toDate.toISOString())
        .not('valor', 'is', null);

      if (error) throw error;

      const leadsComValor = data || [];
      const totalVendas = leadsComValor.length;
      const valorTotal = leadsComValor.reduce((sum, lead) => sum + parseLeadValor(lead.valor), 0);
      const mediaTicket = totalVendas > 0 ? valorTotal / totalVendas : 0;

      return {
        totalVendas,
        valorTotal,
        mediaTicket
      };
    } catch (error) {
      console.error('Erro ao buscar estatísticas de vendas:', error);
      throw error;
    }
  }

  // Atualizar status de venda
  static async updateVendaStatus(
    leadId: number, 
    clientId: number, 
    isVenda: boolean
  ): Promise<Lead | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const userMetadata = user.user_metadata || {};
      const id_cliente = userMetadata.id_cliente || userMetadata?.raw_user_meta_data?.id_cliente || clientId;
      const responsavelId = await resolveRegistroUsuarioId(user, id_cliente);
      const nomeVendedor = await getNomeVendedor(responsavelId);
      const now = new Date().toISOString();

      const payload: Record<string, any> = {
        status: isVenda ? 'venda' : 'lead'
      };

      if (isVenda) {
        Object.assign(payload, {
          venda: true,
          venda_realizada: true,
          venda_perdida: false,
          data_venda: now,
          data_perda: null,
          id_usuario_venda: responsavelId,
          nome_vendedor: nomeVendedor,
          id_usuario_perda: null,
          probabilidade_final_fechamento: 100,
          data_ultimo_status: now
        });
      } else {
        Object.assign(payload, {
          venda: false,
          venda_realizada: false,
          venda_perdida: true,
          data_venda: null,
          data_perda: now,
          id_usuario_perda: responsavelId,
          id_usuario_venda: null,
          nome_vendedor: null,
          probabilidade_final_fechamento: 0,
          data_ultimo_status: now
        });
      }

      const { data, error } = await supabase
        .from('leads')
        .update(payload)
        .eq('id', leadId)
        .eq('id_cliente', clientId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erro ao atualizar status de venda:', error);
      throw error;
    }
  }

  // Marcar lead como ganho movendo para etapa de ganho
  static async marcarComoGanho(leadId: number, clientId: number): Promise<{ success: boolean; etapaNome?: string; etapaId?: number; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const userMetadata = user.user_metadata || {};
      const id_cliente = userMetadata.id_cliente || userMetadata?.raw_user_meta_data?.id_cliente || clientId;
      const responsavelId = await resolveRegistroUsuarioId(user, id_cliente);
      const nomeVendedor = await getNomeVendedor(responsavelId);
      const now = new Date().toISOString();

      // Buscar o lead para obter o id_funil
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('id_funil')
        .eq('id', leadId)
        .eq('id_cliente', clientId)
        .single();

      if (leadError) throw leadError;

      // Preparar dados de atualização base
      const updateData: Record<string, any> = {
        status: 'Ganho',
        venda: true,
        venda_realizada: true,
        venda_perdida: false,
        data_venda: now,
        data_perda: null,
        id_usuario_venda: responsavelId,
        nome_vendedor: nomeVendedor,
        id_usuario_perda: null,
        probabilidade_final_fechamento: 100,
        data_ultimo_status: now
      };

      // Se o lead tem funil, tentar buscar a etapa de ganho
      if (lead && lead.id_funil) {
        // Buscar a etapa de ganho do funil
        const { data: etapaDeGanho, error: etapaError } = await supabase
          .from('funis_etapas')
          .select('*')
          .eq('id_funil', lead.id_funil)
          .eq('id_cliente', clientId)
          .eq('etapa_de_ganho', true)
          .maybeSingle();

        if (!etapaError && etapaDeGanho) {
          // Se encontrou a etapa de ganho, atualizar também o id_funil_etapa
          updateData.id_funil_etapa = etapaDeGanho.id;
        }
        // Se não encontrou etapa de ganho, continua sem atualizar id_funil_etapa
      }
      // Se não tem funil, continua sem atualizar id_funil_etapa

      // Atualizar o lead com os dados de venda
      const { error: updateError } = await supabase
        .from('leads')
        .update(updateData)
        .eq('id', leadId)
        .eq('id_cliente', clientId);

      if (updateError) throw updateError;

      // Se conseguiu atualizar, retornar sucesso
      // Se tinha etapa de ganho, retornar o nome da etapa
      if (lead && lead.id_funil) {
        const { data: etapaDeGanho } = await supabase
          .from('funis_etapas')
          .select('*')
          .eq('id_funil', lead.id_funil)
          .eq('id_cliente', clientId)
          .eq('etapa_de_ganho', true)
          .maybeSingle();

        if (etapaDeGanho) {
          return { success: true, etapaNome: etapaDeGanho.nome, etapaId: etapaDeGanho.id };
        }
      }

      return { success: true, etapaNome: 'Venda realizada' };
    } catch (error) {
      console.error('Erro ao marcar lead como ganho:', error);
      throw error;
    }
  }

  // Atualizar histórico de departamento do lead
  static async updateLeadDepartamentoHistory(
    leadId: number, 
    clientId: number, 
    departamentoId: number
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ 
          id_departamento: departamentoId
        })
        .eq('id', leadId)
        .eq('id_cliente', clientId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Erro ao atualizar departamento do lead:', error);
      throw error;
    }
  }

  // Buscar leads por cliente e departamento
  static async getLeadsByClientIdAndDepartamento(
    clientId: number, 
    departamentoId: number | number[] | string | null
  ): Promise<Lead[]> {
    try {
      let query = supabase
        .from('leads')
        .select('*')
        .eq('id_cliente', clientId);

      // Tratar diferentes tipos de filtro de departamento
      if (departamentoId === null || departamentoId === 'null') {
        // Buscar leads sem departamento
        query = query.is('id_departamento', null);
      } else if (Array.isArray(departamentoId)) {
        // Buscar leads de múltiplos departamentos
        query = query.in('id_departamento', departamentoId);
      } else if (departamentoId !== null) {
        // Buscar leads de um departamento específico
        query = query.eq('id_departamento', departamentoId);
      }

      const { data, error } = await query.order('data_criacao', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar leads por cliente e departamento:', error);
      throw error;
    }
  }

  // Verificar se lead existe
  static async checkLeadExists(clientId: number, telefone: string): Promise<Lead | null> {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id_cliente', clientId)
        .eq('telefone', telefone)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('Erro ao verificar se lead existe:', error);
      throw error;
    }
  }
  
  // Criar lead (método alternativo)
  static async createLead(leadData: any): Promise<Lead | null> {
    try {
      const { data, error } = await supabase
        .from('leads')
        .insert({
          ...leadData
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erro ao criar lead:', error);
      throw error;
    }
  }

  // Atualizar lead (método alternativo)
  static async updateLead(leadId: number, clientId: number, leadData: Partial<Lead>): Promise<Lead | null> {
    try {
      const { data, error } = await supabase
        .from('leads')
        .update({
          ...leadData
        })
        .eq('id', leadId)
        .eq('id_cliente', clientId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erro ao atualizar lead:', error);
        throw error;
    }
  }
}
