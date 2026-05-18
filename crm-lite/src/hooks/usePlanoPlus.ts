import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth';
import { clientesService } from '@/services/clientesService';
import { supabase } from '@/lib/supabase';

export const usePlanoPlus = () => {
  const [isPlanoPlus, setIsPlanoPlus] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const verificarPlanoPlus = async () => {
      if (!user?.email && !user?.id && !user?.id_cliente) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        let clienteData = null;
        
        // Primeiro, tentar buscar por email (Admin)
        if (user?.email) {
          clienteData = await clientesService.getClienteByEmail(user.email);
        }
        
        // Se não encontrou por email e temos user.id e user.id_cliente, verificar se é gestor inscrito
        if (!clienteData && user?.id && user?.id_cliente) {
          const { data: gestorData, error: gestorError } = await supabase
            .from('clientes_info')
            .select('plano_pro, plano_plus')
            .contains('id_gestor', [user.id])
            .eq('id', user.id_cliente)
            .maybeSingle();
          
          if (gestorData && !gestorError) {
            clienteData = gestorData;
          }
        }
        
        // Verifica se tem plano_plus OU plano_pro OU trial OU plano_crm
        // Trial e plano CRM têm acesso às métricas do Dashboard
        if (
          clienteData &&
          (
            clienteData.plano_plus === true ||
            clienteData.plano_pro === true ||
            clienteData.trial === true ||
            clienteData.plano_crm === true
          )
        ) {
          setIsPlanoPlus(true);
        } else {
          setIsPlanoPlus(false);
        }
      } catch (err) {
        console.error('Erro ao verificar plano plus:', err);
        setError('Erro ao verificar plano do cliente');
        setIsPlanoPlus(false);
      } finally {
        setLoading(false);
      }
    };

    verificarPlanoPlus();
  }, [user?.email, user?.id, user?.id_cliente]);

  return {
    isPlanoPlus,
    loading,
    error
  };
};
