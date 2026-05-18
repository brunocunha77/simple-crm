import { supabase } from '@/lib/supabase';

export type Departamento = {
  id: number;
  nome: string;
  descricao: string;
  id_cliente: string | number;
  is_padrao?: boolean;
  instance_name_chip_associado?: string | null;
};

export const departamentosService = {
  async listar(id_cliente: string | number) {
    const { data, error } = await supabase
      .from('departamento')
      .select('*')
      .eq('id_cliente', id_cliente)
      .order('nome', { ascending: true });
    
    if (error) throw error;
    return data as Departamento[];
  },

  async criar(departamento: Omit<Departamento, 'id'>) {
    const { data, error } = await supabase
      .from('departamento')
      .insert([departamento])
      .select();
    if (error) throw error;
    return data?.[0] as Departamento;
  },

  async editar(id: number, departamento: Partial<Departamento>) {
    const { data, error } = await supabase
      .from('departamento')
      .update(departamento)
      .eq('id', id)
      .select();
    if (error) throw error;
    return data?.[0] as Departamento;
  },

  async excluir(id: number) {
    // Ao excluir, leads devem ficar com id_departamento = null (tratar na lógica da página)
    const { error } = await supabase
      .from('departamento')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  },
}; 