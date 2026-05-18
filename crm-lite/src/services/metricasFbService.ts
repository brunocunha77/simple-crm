import { supabase } from '@/lib/supabase';

export interface MetricaFb {
  id: number;
  id_cliente: number;
  nome_campanha: string;
  nome_anuncio: string;
  impressoes: number | null;
  cliques: number | null;
  Investimento: number | null;
  ROI: number | null;
  created_at: string;
}

export interface MetricasFbAgregadas {
  totalImpressoes: number;
  totalCliques: number;
  totalInvestimento: number;
  totalROI: number | null;
  metricasPorAnuncio: Array<{
    nome_campanha: string;
    nome_anuncio: string;
    impressoes: number;
    cliques: number;
    Investimento: number;
    ROI: number | null;
  }>;
}

export class MetricasFbService {
  /**
   * Busca métricas do Facebook para um cliente, filtrando por período
   * Retorna apenas os valores mais recentes para cada anúncio e soma os valores
   */
  static async getMetricasPorCliente(
    idCliente: number,
    dataInicio?: Date,
    dataFim?: Date
  ): Promise<MetricasFbAgregadas> {
    try {
      let query = supabase
        .from('metricas_fb')
        .select('*')
        .eq('id_cliente', idCliente)
        .order('created_at', { ascending: false });

      // Aplicar filtro de data se fornecido
      if (dataInicio) {
        query = query.gte('created_at', dataInicio.toISOString());
      }
      if (dataFim) {
        // Adicionar 1 dia e subtrair 1 milissegundo para incluir todo o dia final
        const dataFimCompleta = new Date(dataFim);
        dataFimCompleta.setHours(23, 59, 59, 999);
        query = query.lte('created_at', dataFimCompleta.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar métricas do Facebook:', error);
        return {
          totalImpressoes: 0,
          totalCliques: 0,
          totalInvestimento: 0,
          totalROI: null,
          metricasPorAnuncio: []
        };
      }

      if (!data || data.length === 0) {
        return {
          totalImpressoes: 0,
          totalCliques: 0,
          totalInvestimento: 0,
          totalROI: null,
          metricasPorAnuncio: []
        };
      }

      // Agrupar por (nome_campanha, nome_anuncio) e SOMAR todos os valores
      // Os mesmos anúncios em dias diferentes devem ser somados
      const metricasPorAnuncio = new Map<string, {
        nome_campanha: string;
        nome_anuncio: string;
        impressoes: number;
        cliques: number;
        Investimento: number;
        ROI: number | null;
        totalInvestimentoParaROI: number; // Para calcular ROI médio ponderado
      }>();

      data.forEach((metrica: MetricaFb) => {
        const key = `${metrica.nome_campanha}|||${metrica.nome_anuncio}`;
        const existing = metricasPorAnuncio.get(key);

        if (!existing) {
          metricasPorAnuncio.set(key, {
            nome_campanha: metrica.nome_campanha,
            nome_anuncio: metrica.nome_anuncio,
            impressoes: metrica.impressoes || 0,
            cliques: metrica.cliques || 0,
            Investimento: metrica.Investimento || 0,
            ROI: metrica.ROI,
            totalInvestimentoParaROI: metrica.Investimento || 0
          });
        } else {
          // Somar todos os valores (mesmos anúncios em dias diferentes)
          existing.impressoes += metrica.impressoes || 0;
          existing.cliques += metrica.cliques || 0;
          existing.Investimento += metrica.Investimento || 0;
          
          // Para ROI, manter o mais recente se houver
          if (metrica.ROI !== null) {
            existing.ROI = metrica.ROI;
            existing.totalInvestimentoParaROI += metrica.Investimento || 0;
          }
        }
      });

      // Converter para array
      const metricasArray = Array.from(metricasPorAnuncio.values()).map(metrica => ({
        nome_campanha: metrica.nome_campanha,
        nome_anuncio: metrica.nome_anuncio,
        impressoes: metrica.impressoes,
        cliques: metrica.cliques,
        Investimento: metrica.Investimento,
        ROI: metrica.ROI
      }));

      // Somar todos os valores
      const totalImpressoes = metricasArray.reduce((sum, m) => sum + m.impressoes, 0);
      const totalCliques = metricasArray.reduce((sum, m) => sum + m.cliques, 0);
      const totalInvestimento = metricasArray.reduce((sum, m) => sum + m.Investimento, 0);
      
      // Calcular ROI médio ponderado por investimento (se houver ROI)
      let totalROI: number | null = null;
      const metricasComROI = metricasArray.filter(m => m.ROI !== null && m.Investimento > 0);
      if (metricasComROI.length > 0 && totalInvestimento > 0) {
        const roiPonderado = metricasComROI.reduce((sum, m) => {
          const peso = m.Investimento / totalInvestimento;
          return sum + (m.ROI! * peso);
        }, 0);
        totalROI = roiPonderado;
      }

      return {
        totalImpressoes,
        totalCliques,
        totalInvestimento,
        totalROI,
        metricasPorAnuncio: metricasArray
      };
    } catch (error) {
      console.error('Erro ao buscar métricas do Facebook:', error);
      return {
        totalImpressoes: 0,
        totalCliques: 0,
        totalInvestimento: 0,
        totalROI: null,
        metricasPorAnuncio: []
      };
    }
  }

  /**
   * Busca apenas o total de investimento (para compatibilidade com código existente)
   */
  static async getTotalInvestimentoPorCliente(
    idCliente: number,
    dataInicio?: Date,
    dataFim?: Date
  ): Promise<number> {
    const metricas = await this.getMetricasPorCliente(idCliente, dataInicio, dataFim);
    return metricas.totalInvestimento;
  }

  /**
   * Busca métricas detalhadas por anúncio
   */
  static async getMetricasDetalhadasPorCliente(
    idCliente: number,
    dataInicio?: Date,
    dataFim?: Date
  ): Promise<MetricasFbAgregadas['metricasPorAnuncio']> {
    const metricas = await this.getMetricasPorCliente(idCliente, dataInicio, dataFim);
    return metricas.metricasPorAnuncio;
  }

  /**
   * Busca total de leads do Facebook Ads (t_origem = "FB_Ads")
   */
  static async getTotalLeadsFacebookAds(
    idCliente: number,
    dataInicio?: Date,
    dataFim?: Date
  ): Promise<number> {
    try {
      void 0;
      
      // Garantir que id_cliente seja número
      const idClienteNum = typeof idCliente === 'string' ? parseInt(idCliente) : idCliente;
      
      let query = supabase
        .from('leads')
        .select('id')
        .eq('id_cliente', idClienteNum)
        .eq('t_origem', 'FB_Ads');

      // Aplicar filtro de data se fornecido (usando data_criacao)
      if (dataInicio) {
        const dataInicioStr = dataInicio.toISOString();
        void 0;
        query = query.gte('data_criacao', dataInicioStr);
      }
      if (dataFim) {
        // Adicionar 1 dia e subtrair 1 milissegundo para incluir todo o dia final
        const dataFimCompleta = new Date(dataFim);
        dataFimCompleta.setHours(23, 59, 59, 999);
        const dataFimStr = dataFimCompleta.toISOString();
        void 0;
        query = query.lte('data_criacao', dataFimStr);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar leads do Facebook Ads:', error);
        console.error('Detalhes do erro:', JSON.stringify(error, null, 2));
        return 0;
      }

      const count = data?.length || 0;
      void 0;
      if (data && data.length > 0) {
        void 0;
      }
      
      return count;
    } catch (error) {
      console.error('Erro ao buscar leads do Facebook Ads:', error);
      return 0;
    }
  }
}

