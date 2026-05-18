import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Obter informações do usuário
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return res.status(401).json({ 
        error: 'Usuário não autenticado', 
        details: userError?.message 
      });
    }

    const userMetadata = user.user_metadata || {};
    const id_cliente = userMetadata.id_cliente || userMetadata?.raw_user_meta_data?.id_cliente;

    // 1. Verificar TODOS os registros na tabela funis_rd
    const { data: todosFunis, error: todosError } = await supabase
      .from('funis_rd')
      .select('*')
      .order('created_at', { ascending: false });

    // 2. Verificar registros para o id_cliente específico
    let funisCliente = [];
    let funisClienteString = [];
    let funisClienteInteger = [];
    
    if (id_cliente) {
      // Como integer
      const { data: funisInt, error: errorInt } = await supabase
        .from('funis_rd')
        .select('*')
        .eq('id_cliente', parseInt(id_cliente));

      // Como string
      const { data: funisStr, error: errorStr } = await supabase
        .from('funis_rd')
        .select('*')
        .eq('id_cliente', id_cliente.toString());

      funisCliente = funisInt || [];
      funisClienteString = funisStr || [];
      funisClienteInteger = funisInt || [];
    }

    // 3. Verificar estrutura da tabela
    const { data: estrutura, error: estruturaError } = await supabase
      .rpc('get_table_structure', { table_name: 'funis_rd' })
      .catch(() => null);

    return res.status(200).json({
      success: true,
      debug_info: {
        user_id: user.id,
        id_cliente_from_metadata: id_cliente,
        id_cliente_type: typeof id_cliente
      },
      tabela_funis_rd: {
        todos_os_registros: todosFunis || [],
        total_registros: todosFunis?.length || 0,
        registros_para_id_cliente_integer: funisClienteInteger,
        registros_para_id_cliente_string: funisClienteString,
        count_integer: funisClienteInteger.length,
        count_string: funisClienteString.length
      },
      erros: {
        todos_error: todosError,
        estrutura_error: estruturaError
      }
    });

  } catch (error) {
    console.error('Erro no endpoint debug-funis-rd:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor', 
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}
