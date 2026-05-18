import { supabase } from '@/lib/supabase';

export interface Etiqueta {
  id: number;
  id_cliente: number;
  nome: string;
  cor: string;
  created_at: string;
}

const TABLE = 'etiquetas';

export const etiquetasService = {
  // Lista todas as etiquetas de um cliente + etiquetas padrão do sistema
  async listByCliente(id_cliente: number): Promise<Etiqueta[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .or(`id_cliente.eq.${id_cliente},id_cliente.is.null`)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  // Cria uma nova etiqueta
  async createEtiqueta({ nome, cor, id_cliente }: { nome: string; cor: string; id_cliente: number; }): Promise<Etiqueta> {
    // Validar dados de entrada
    if (!nome || !cor || !id_cliente) {
      throw new Error('Todos os campos são obrigatórios');
    }

    // Verificar se já existe uma etiqueta com o mesmo nome para este cliente
    const { data: existingEtiqueta, error: checkError } = await supabase
      .from(TABLE)
      .select('id')
      .eq('id_cliente', id_cliente)
      .eq('nome', nome.trim())
      .single();

    if (existingEtiqueta) {
      throw new Error('Já existe uma etiqueta com este nome');
    }

    const { data, error } = await supabase
      .from(TABLE)
      .insert({
        id_cliente,
        nome: nome.trim(),
        cor
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Atualiza uma etiqueta
  async updateEtiqueta({ id, nome, cor }: { id: number; nome: string; cor: string; }): Promise<Etiqueta> {
    if (!nome || !cor) {
      throw new Error('Nome e cor são obrigatórios');
    }

    const { data, error } = await supabase
      .from(TABLE)
      .update({
        nome: nome.trim(),
        cor
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Remove uma etiqueta
  async removeEtiqueta(id: number): Promise<boolean> {
    const { error } = await supabase
      .from(TABLE)
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  },

  // Busca uma etiqueta por ID
  async getEtiquetaById(id: number): Promise<Etiqueta | null> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Não encontrado
      throw error;
    }
    return data;
  }
}; 