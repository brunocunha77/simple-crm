import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Obter informações do usuário autenticado
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return res.status(401).json({ 
        error: 'Usuário não autenticado', 
        details: userError?.message 
      });
    }

    const userMetadata = user.user_metadata || {};
    const id_cliente = userMetadata.id_cliente || userMetadata?.raw_user_meta_data?.id_cliente;

    // Buscar informações do cliente na tabela clientes_info
    const { data: clienteInfo, error: clienteError } = await supabase
      .from('clientes_info')
      .select('*')
      .eq('user_id_auth', user.id)
      .single();

    // Buscar funis RD para o id_cliente
    let funisRd = [];
    let etapasRd = [];
    
    if (id_cliente) {
      const { data: funis, error: funisError } = await supabase
        .from('funis_rd')
        .select('*')
        .eq('id_cliente', id_cliente);

      const { data: etapas, error: etapasError } = await supabase
        .from('etapas_funis_rd')
        .select('*')
        .eq('id_cliente', id_cliente);

      if (!funisError) funisRd = funis || [];
      if (!etapasError) etapasRd = etapas || [];
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        user_metadata: userMetadata,
        id_cliente_from_metadata: id_cliente
      },
      cliente_info: clienteInfo,
      funis_rd: funisRd,
      etapas_rd: etapasRd,
      counts: {
        funis_rd: funisRd.length,
        etapas_rd: etapasRd.length
      }
    });

  } catch (error) {
    console.error('Erro no endpoint debug-user-info:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor', 
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

