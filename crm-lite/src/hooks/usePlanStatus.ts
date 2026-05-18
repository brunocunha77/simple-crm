import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth';
import { clientesService } from '@/services/clientesService';

export const usePlanStatus = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [hasActivePlan, setHasActivePlan] = useState(false);
  const [clientInfo, setClientInfo] = useState<any>(null);

  useEffect(() => {
    const fetchClientInfo = async () => {
      if (!user?.id_cliente) {
        setLoading(false);
        return;
      }

      try {
        const info = await clientesService.getClienteByIdCliente(user.id_cliente);
        setClientInfo(info);
        
        // ✅ NOVA LÓGICA: Trial tem acesso completo a todas as funcionalidades
        // Verificar se o usuário tem algum plano ativo
        const hasPlan = info?.trial === true || 
                       info?.plano_starter === true || 
                       info?.plano_pro === true || 
                       info?.plano_plus === true ||
                       info?.plano_crm === true ||
                       info?.plano_agentes === true; // Adicionado plano_agentes na verificação
        
        // Trial tem acesso completo - não deve redirecionar para plans
        if (info?.trial === true) {
          setHasActivePlan(true);
          return;
        }
        
        // Se plano_agentes for TRUE OU plano_crm for TRUE, não deve mostrar página de planos
        if (info?.plano_agentes === true || info?.plano_crm === true) {
          setHasActivePlan(true);
          return;
        }
        
        void 0;
        
        setHasActivePlan(hasPlan);
      } catch (error) {
        console.error('Erro ao buscar informações do cliente:', error);
        setHasActivePlan(false);
      } finally {
        setLoading(false);
      }
    };

    fetchClientInfo();
  }, [user?.id_cliente]);

  return {
    loading,
    hasActivePlan,
    clientInfo,
    shouldRedirectToPlans: !loading && !hasActivePlan,
    // CRM disponível se plano_crm for true OU plano_pro for true
    hasCrmPlan: clientInfo?.plano_crm === true || clientInfo?.plano_pro === true
  };
}; 