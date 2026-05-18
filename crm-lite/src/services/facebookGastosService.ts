import { supabase } from '@/lib/supabase';

export interface FacebookGasto {
  id: number;
  id_cliente: number;
  valor_dia: string;
  created_at?: string;
}

export class FacebookGastosService {
  // Buscar total de gastos do Facebook para um cliente
  static async getTotalGastosPorCliente(idCliente: number): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('facebook_gastos')
        .select('valor_dia')
        .eq('id_cliente', idCliente);

      if (error) {
        console.error('Erro ao buscar gastos do Facebook:', error);
        return 0;
      }

      if (!data || data.length === 0) {
        return 0;
      }

      // Somar todos os valores (convertendo string para número)
      const total = data.reduce((sum, item) => {
        const valor = parseFloat(item.valor_dia) || 0;
        return sum + valor;
      }, 0);

      return total;
    } catch (error) {
      console.error('Erro ao calcular total de gastos:', error);
      return 0;
    }
  }

  // Buscar gastos do Facebook para um cliente
  static async getGastosPorCliente(idCliente: number): Promise<FacebookGasto[]> {
    try {
      const { data, error } = await supabase
        .from('facebook_gastos')
        .select('*')
        .eq('id_cliente', idCliente)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar gastos do Facebook:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Erro ao buscar gastos:', error);
      return [];
    }
  }
}








