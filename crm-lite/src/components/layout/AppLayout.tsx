import * as React from "react";
import { useEffect } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/auth";
import { Loader2 } from "lucide-react";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { useUserType } from "@/hooks/useUserType";
import SuperAdminBanner from "@/components/SuperAdminBanner";
// import TutorialModal from "@/components/TutorialModal"; // Tutorial desativado
import { PlanGuard } from "@/components/PlanGuard";
import { TemaProvider } from "@/components/TemaProvider";
import { usePlanStatus } from "@/hooks/usePlanStatus";
import GlobalMessageBeep from "@/components/GlobalMessageBeep";


const pageTitles: Record<string, string> = {
  "/plans": "Planos",
  "/": "Dashboard",
  "/conversations": "Atendimentos",
  "/conversations-instagram": "Conversas Instagram",
  "/crm": "CRM",
  "/contatos": "Contatos",
  "/etiquetas": "Etiquetas",
  "/departamentos": "Departamentos",
  "/chatbots": "Chatbots",
  "/settings": "Configurações",
  "/settings/users": "Usuários",
  "/users-data": "Dados de Usuários",
  "/grupos-disparo": "Grupos de Disparo",
  "/disparo-massa": "Disparo em Massa",
  "/followup": "Followup Automático",
  "/conexoes": "Conexões",
  "/meus-chips": "Meus Chips",
  "/relatorios": "CRM",
  "/relatorios-gerenciais": "Relatórios Gerenciais"
};

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { loading } = useAuth();
  const { isImpersonating, impersonatedCliente, exitImpersonation } = useSuperAdmin();
  const { plano_agentes } = useUserType();
  const { clientInfo } = usePlanStatus();
  const title = pageTitles[location.pathname] || "";
  
  // Verificar se estamos na página de planos (apenas para usuários Trial)
  const isPlansPage = location.pathname === '/plans' && clientInfo?.trial === true;
  
  // ✅ NOVA LÓGICA: Trial tem acesso completo - não redirecionar automaticamente
  // Se trial/plano_agentes e estiver na rota raiz, permitir ficar no Dashboard
  // useEffect(() => {
  //   if (plano_agentes && location.pathname === '/') {
  //     navigate('/conversations');
  //   }
  // }, [plano_agentes, location.pathname, navigate]);
  
  // Se estiver carregando, mostra um indicador
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p>Carregando...</p>
        </div>
      </div>
    );
  }
  
  // For protected pages, render with the full layout
  return (
    <PlanGuard>
      <TemaProvider />
      <GlobalMessageBeep />
      <div className="flex flex-col md:flex-row h-screen bg-white">
        <div className="hidden md:block">
          <Sidebar isPlansPage={isPlansPage} />
        </div>
        <main className="flex-1 md:ml-64 flex flex-col h-full min-h-0 overflow-hidden">
          {false && <Header title={title} />}
          <div className="flex-1 flex flex-col h-full min-h-0 overflow-y-auto">
            <SuperAdminBanner />
            <Outlet />
          </div>
        </main>
      </div>
      {/* <TutorialModal /> Tutorial desativado */}
    </PlanGuard>
  );
}
