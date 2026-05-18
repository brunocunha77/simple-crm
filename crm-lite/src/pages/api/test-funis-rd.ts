import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Buscar todos os funis RD
    const { data: funisRd, error: funisError } = await supabase
      .from('funis_rd')
      .select('*')
      .order('created_at', { ascending: false });

    if (funisError) {
      console.error('Erro ao buscar funis RD:', funisError);
      return res.status(500).json({ 
        error: 'Erro ao buscar funis RD', 
        details: funisError.message 
      });
    }

    // Buscar todas as etapas RD
    const { data: etapasRd, error: etapasError } = await supabase
      .from('etapas_funis_rd')
      .select('*')
      .order('created_at', { ascending: true });

    if (etapasError) {
      console.error('Erro ao buscar etapas RD:', etapasError);
      return res.status(500).json({ 
        error: 'Erro ao buscar etapas RD', 
        details: etapasError.message 
      });
    }

    return res.status(200).json({
      success: true,
      funis: funisRd || [],
      etapas: etapasRd || [],
      totalFunis: funisRd?.length || 0,
      totalEtapas: etapasRd?.length || 0
    });

  } catch (error) {
    console.error('Erro no endpoint test-funis-rd:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor', 
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

