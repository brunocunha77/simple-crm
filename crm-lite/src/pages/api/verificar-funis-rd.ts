import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Buscar TODOS os registros da tabela funis_rd (sem filtro)
    const { data: todosFunis, error: todosError } = await supabase
      .from('funis_rd')
      .select('*')
      .order('created_at', { ascending: false });

    if (todosError) {
      console.error('Erro ao buscar todos os funis:', todosError);
      return res.status(500).json({ 
        error: 'Erro ao buscar funis', 
        details: todosError.message 
      });
    }

    // Buscar TODOS os registros da tabela etapas_funis_rd (sem filtro)
    const { data: todasEtapas, error: etapasError } = await supabase
      .from('etapas_funis_rd')
      .select('*')
      .order('created_at', { ascending: false });

    if (etapasError) {
      console.error('Erro ao buscar todas as etapas:', etapasError);
      return res.status(500).json({ 
        error: 'Erro ao buscar etapas', 
        details: etapasError.message 
      });
    }

    // Agrupar por id_cliente
    const funisPorCliente = todosFunis?.reduce((acc: any, funil: any) => {
      const id = funil.id_cliente;
      if (!acc[id]) {
        acc[id] = [];
      }
      acc[id].push(funil);
      return acc;
    }, {}) || {};

    const etapasPorCliente = todasEtapas?.reduce((acc: any, etapa: any) => {
      const id = etapa.id_cliente;
      if (!acc[id]) {
        acc[id] = [];
      }
      acc[id].push(etapa);
      return acc;
    }, {}) || {};

    return res.status(200).json({
      success: true,
      total_funis: todosFunis?.length || 0,
      total_etapas: todasEtapas?.length || 0,
      todos_funis: todosFunis || [],
      todas_etapas: todasEtapas || [],
      funis_por_cliente: funisPorCliente,
      etapas_por_cliente: etapasPorCliente,
      clientes_com_funis: Object.keys(funisPorCliente),
      clientes_com_etapas: Object.keys(etapasPorCliente)
    });

  } catch (error) {
    console.error('Erro no endpoint verificar-funis-rd:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor', 
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}
