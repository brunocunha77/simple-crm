import React from 'react';
// import { useEffect } from 'react'; // Comentado - tela de planos removida
// import { useNavigate, useLocation } from 'react-router-dom'; // Comentado - tela de planos removida
import { usePlanStatus } from '@/hooks/usePlanStatus';
import { Loader2 } from 'lucide-react';

interface PlanGuardProps {
  children: React.ReactNode;
}

export const PlanGuard: React.FC<PlanGuardProps> = ({ children }) => {
  // const { loading, shouldRedirectToPlans } = usePlanStatus(); // Comentado - tela de planos removida
  const { loading } = usePlanStatus();
  // const navigate = useNavigate(); // Comentado - tela de planos removida
  // const location = useLocation(); // Comentado - tela de planos removida

  // useEffect(() => {
  //   console.log('PlanGuard:', {
  //     loading,
  //     shouldRedirectToPlans,
  //     currentPath: location.pathname,
  //     willRedirect: !loading && shouldRedirectToPlans && location.pathname !== '/plans'
  //   });
  //   
  //   if (!loading && shouldRedirectToPlans && location.pathname !== '/plans') {
  //     console.log('Redirecionando para /plans');
  //     navigate('/plans');
  //   }
  // }, [loading, shouldRedirectToPlans, navigate, location.pathname]); // Comentado - tela de planos removida

  // Se está carregando, mostrar loading
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p>Verificando plano...</p>
        </div>
      </div>
    );
  }

  // Se deve redirecionar para plans e não está na página plans, não renderizar nada
  // if (shouldRedirectToPlans && location.pathname !== '/plans') {
  //   return null;
  // } // Comentado - tela de planos removida

  // Se está na página plans ou tem plano ativo, renderizar normalmente
  return <>{children}</>;
}; 