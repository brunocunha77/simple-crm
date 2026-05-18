import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';
import { clientesService, ClienteInfo } from '@/services/clientesService';
import { Crown } from 'lucide-react';

export default function TrialUpgradeBanner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [clientInfo, setClientInfo] = useState<ClienteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);

  const getCurrentPlan = () => {
    if (!clientInfo) return null;
    
    // Banner "Free trial" ++ Upgrade: apenas para Trial (plano CRM não exibe este card)
    if (clientInfo.trial) return 'trial';
    if (clientInfo.plano_agentes || clientInfo.plano_pro || clientInfo.plano_plus || clientInfo.plano_starter || clientInfo.plano_crm) return 'premium';
    return null;
  };

  const getPlanName = (plan: string) => {
    switch (plan) {
      case 'trial': return 'Trial';
      case 'premium': return 'Premium';
      default: return plan;
    }
  };

  useEffect(() => {
    const fetchClientInfo = async () => {
      if (!user?.id_cliente) {
        void 0;
        setLoading(false);
        return;
      }

      try {
        const info = await clientesService.getClienteByIdCliente(user.id_cliente);
        void 0;
        setClientInfo(info);
        
        // Calcular dias restantes se estiver em trial
        if (info?.trial && info?.data_limite) {
          const today = new Date();
          const limitDate = new Date(info.data_limite);
          const diffTime = limitDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          void 0;
          setDaysRemaining(diffDays);
        } else if (info?.trial) {
          // Se está em trial mas não tem data_limite, usar 30 dias como padrão
          setDaysRemaining(30);
        }
      } catch (error) {
        console.error('[TrialBanner] Erro ao buscar informações do cliente:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchClientInfo();
  }, [user?.id_cliente]);

  const handleUpgrade = () => {
    // Apenas usuários Trial podem acessar a página de planos
    if (currentPlan === 'trial') {
      navigate('/plans');
    }
  };

  const handleClose = () => {
    setIsVisible(false);
  };

  const currentPlan = getCurrentPlan();
  
  // ✅ NOVA LÓGICA: Não mostrar se não está carregando, não tem plano atual, está no plano Premium, ou foi fechado
  void 0;
  
  if (loading || !currentPlan || currentPlan === 'premium' || !isVisible) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4 relative">
      <div className="absolute inset-0 rounded-lg opacity-5">
        <div className="absolute top-0 right-0 w-20 h-20 bg-orange-400 rounded-full -translate-y-10 translate-x-10"></div>
        <div className="absolute bottom-0 left-0 w-16 h-16 bg-purple-400 rounded-full translate-y-8 -translate-x-8"></div>
      </div>
      <div className="relative">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div>
              <h3 className="font-bold text-gray-900 text-lg">
                {currentPlan === 'trial' ? 'Teste Grátis' : `Plano ${getPlanName(currentPlan)}`}
              </h3>
              {currentPlan === 'trial' && daysRemaining !== null && (
                <p className="text-orange-600 text-sm font-medium">
                  Expira em {new Date(Date.now() + daysRemaining * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </p>
              )}
            </div>
            {currentPlan === 'trial' && daysRemaining !== null && (
              <div className="flex-shrink-0">
                <div className="w-12 h-12 border-2 border-orange-400 rounded-full flex items-center justify-center bg-white">
                  <span className="text-gray-900 font-bold text-sm">
                    {daysRemaining > 0 ? `${daysRemaining}d` : 'Venc.'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
        <button
          onClick={handleUpgrade}
          className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-3 px-4 rounded-lg font-semibold hover:from-purple-700 hover:to-purple-800 transition-all duration-200 flex items-center justify-center gap-2 shadow-sm"
        >
          <Crown className="h-4 w-4" />
          Upgrade
        </button>
      </div>
    </div>
  );
}
