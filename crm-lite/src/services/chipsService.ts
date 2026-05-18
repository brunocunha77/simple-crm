import { supabase } from '@/lib/supabase';

export interface ChipInfo {
  chipNumber: 1 | 2;
  instanceName: string;
  isAvailable: boolean;
}

export const chipsService = {
  // Buscar chips disponíveis para um cliente
  async getChipsDisponiveis(idCliente: string | number): Promise<ChipInfo[]> {
    try {
      const { data: clienteInfo, error } = await supabase
        .from('clientes_info')
        .select('instance_name, instance_name_2')
        .eq('id', idCliente)
        .single();

      if (error) {
        console.error('Erro ao buscar informações do cliente:', error);
        return [];
      }

      const chips: ChipInfo[] = [];

      // Verificar chip 1
      if (clienteInfo?.instance_name) {
        chips.push({
          chipNumber: 1,
          instanceName: clienteInfo.instance_name,
          isAvailable: true
        });
      }

      // Verificar chip 2
      if (clienteInfo?.instance_name_2) {
        chips.push({
          chipNumber: 2,
          instanceName: clienteInfo.instance_name_2,
          isAvailable: true
        });
      }

      return chips;
    } catch (error) {
      console.error('Erro ao buscar chips disponíveis:', error);
      return [];
    }
  },

  // Verificar se um departamento já está associado a um chip específico
  async isDepartamentoAssociadoChip(idDepartamento: number, chipNumber: 1 | 2): Promise<boolean> {
    try {
      const { data: clienteInfo, error: clienteError } = await supabase
        .from('departamento')
        .select(`
          id_cliente,
          clientes_info!inner(
            id_departamento_chip_1,
            id_departamento_chip_2
          )
        `)
        .eq('id', idDepartamento)
        .single();

      if (clienteError || !clienteInfo) {
        return false;
      }

      const cliente = clienteInfo.clientes_info;
      
      if (chipNumber === 1) {
        return cliente.id_departamento_chip_1 === idDepartamento.toString();
      } else {
        return cliente.id_departamento_chip_2 === idDepartamento.toString();
      }
    } catch (error) {
      console.error('Erro ao verificar associação do departamento:', error);
      return false;
    }
  },

  // Verificar se um departamento está configurado em "meus chips" (indisponível para edição)
  async isDepartamentoConfiguradoEmChips(idDepartamento: number): Promise<boolean> {
    try {
      const { data: clienteInfo, error: clienteError } = await supabase
        .from('departamento')
        .select(`
          id_cliente,
          clientes_info!inner(
            id_departamento_chip_1,
            id_departamento_chip_2
          )
        `)
        .eq('id', idDepartamento)
        .single();

      if (clienteError || !clienteInfo) {
        return false;
      }

      const cliente = clienteInfo.clientes_info;
      
      // Verifica se o departamento está configurado como chip 1 ou chip 2
      return cliente.id_departamento_chip_1 === idDepartamento.toString() || 
             cliente.id_departamento_chip_2 === idDepartamento.toString();
    } catch (error) {
      console.error('Erro ao verificar se departamento está configurado em chips:', error);
      return false;
    }
  },

  // Buscar departamentos já associados a chips
  async getDepartamentosAssociadosChips(idCliente: string | number): Promise<{
    chip1?: number;
    chip2?: number;
  }> {
    try {
      const { data: clienteInfo, error } = await supabase
        .from('clientes_info')
        .select('id_departamento_chip_1, id_departamento_chip_2')
        .eq('id', idCliente)
        .single();

      if (error || !clienteInfo) {
        return {};
      }

      return {
        chip1: clienteInfo.id_departamento_chip_1 ? parseInt(clienteInfo.id_departamento_chip_1) : undefined,
        chip2: clienteInfo.id_departamento_chip_2 ? parseInt(clienteInfo.id_departamento_chip_2) : undefined
      };
    } catch (error) {
      console.error('Erro ao buscar departamentos associados:', error);
      return {};
    }
  }
}; 