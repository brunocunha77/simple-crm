import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    void 0;

    // 1. Contar total de registros
    const { count: totalRegistros, error: countError } = await supabase
      .from('funis_rd')
      .select('*', { count: 'exact', head: true });

    void 0;
    void 0;

    // 2. Buscar todos os registros
    const { data: todosRegistros, error: todosError } = await supabase
      .from('funis_rd')
      .select('*')
      .order('created_at', { ascending: false });

    void 0;
    void 0;

    // 3. Buscar especificamente por id_cliente = 114
    const { data: registros114, error: error114 } = await supabase
      .from('funis_rd')
      .select('*')
      .eq('id_cliente', 114);

    void 0;
    void 0;

    // 4. Buscar por id_cliente = 114 como string
    const { data: registros114Str, error: error114Str } = await supabase
      .from('funis_rd')
      .select('*')
      .eq('id_cliente', '114');

    void 0;
    void 0;

    // 5. Verificar se há outros id_cliente
    const { data: outrosIds, error: outrosError } = await supabase
      .from('funis_rd')
      .select('id_cliente')
      .order('id_cliente');

    const idsUnicos = outrosIds ? [...new Set(outrosIds.map(r => r.id_cliente))] : [];

    void 0;

    return res.status(200).json({
      success: true,
      teste: {
        total_registros: totalRegistros,
        todos_registros: todosRegistros || [],
        registros_114_integer: registros114 || [],
        registros_114_string: registros114Str || [],
        ids_unicos: idsUnicos
      },
      erros: {
        count_error: countError,
        todos_error: todosError,
        error_114: error114,
        error_114_str: error114Str,
        outros_error: outrosError
      },
      logs: {
        message: 'Verifique o console do servidor para logs detalhados'
      }
    });

  } catch (error) {
    console.error('❌ Erro no teste simples:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor', 
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}
