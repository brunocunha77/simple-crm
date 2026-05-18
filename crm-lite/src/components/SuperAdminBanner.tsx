import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

// IMPERSONAÇÃO COMPLETAMENTE DESABILITADA
export default function SuperAdminBanner() {
  // IMPERSONAÇÃO COMPLETAMENTE DESABILITADA
  // const navigate = useNavigate();
  // const [impersonationData, setImpersonationData] = useState<{ isImpersonating: boolean; impersonatedCliente: any } | null>(null);
  
  // IMPERSONAÇÃO COMPLETAMENTE DESABILITADA
  // useEffect(() => {
  //   const checkImpersonation = async () => {
  //     try {
  //       const { data: { user } } = await supabase.auth.getUser();
  //       if (!user?.id) return;

  //       // Verificar status de impersonação para este usuário
  //       const impersonationKey = `impersonatedCliente_${user.id}`;
  //       const impersonatingKey = `isImpersonating_${user.id}`;
        
  //       const isImpersonating = sessionStorage.getItem(impersonatingKey) === 'true';
  //       const impersonatedClienteStr = sessionStorage.getItem(impersonationKey);
        
  //       if (isImpersonating && impersonatedClienteStr) {
  //         try {
  //           const impersonatedCliente = JSON.parse(impersonatedClienteStr);
  //           setImpersonationData({ isImpersonating, impersonatedCliente });
  //         } catch (error) {
  //           console.error('Erro ao parsear dados do cliente:', error);
  //           // Limpar dados inválidos
  //           sessionStorage.removeItem(impersonationKey);
  //           sessionStorage.removeItem(impersonatingKey);
  //         }
  //       } else {
  //         setImpersonationData(null);
  //       }
  //     } catch (error) {
  //       console.error('Erro ao verificar impersonação:', error);
  //     }
  //   };

  //   checkImpersonation();
    
  //   // Verificar mudanças no sessionStorage
  //   const handleStorageChange = () => {
  //     checkImpersonation();
  //   };
    
  //   window.addEventListener('storage', handleStorageChange);
  //   return () => window.removeEventListener('storage', handleStorageChange);
  // }, []);

  // IMPERSONAÇÃO COMPLETAMENTE DESABILITADA
  // if (!impersonationData?.isImpersonating || !impersonationData?.impersonatedCliente) {
  //   return null;
  // }

  // const { impersonatedCliente } = impersonationData;

  // IMPERSONAÇÃO COMPLETAMENTE DESABILITADA
  // const handleExitImpersonation = async () => {
  //   try {
  //     const { data: { user } } = await supabase.auth.getUser();
  //     if (user?.id) {
  //       // Limpar dados de impersonação escopados por usuário
  //       const impersonationKey = `impersonatedCliente_${user.id}`;
  //       const impersonatingKey = `isImpersonating_${user.id}`;
  //       sessionStorage.removeItem(impersonationKey);
  //       sessionStorage.removeItem(impersonatingKey);
  //     }
      
  //     // Limpar chaves antigas (para compatibilidade)
  //     // sessionStorage.removeItem('impersonatedCliente');
  //     // sessionStorage.removeItem('isImpersonating');
      
  //     // Redirecionar de volta para o dashboard do super admin
  //     navigate('/super-admin');
  //   } catch (error) {
  //     console.error('Erro ao sair da impersonação:', error);
  //     // Continuar mesmo com erro
  //     navigate('/super-admin');
  //   }
  // };

  // IMPERSONAÇÃO COMPLETAMENTE DESABILITADA
  return null;

  // return (
  //   <Alert className="border-orange-200 bg-orange-50" data-testid="super-admin-banner">
  //     <Shield className="h-4 w-4 text-orange-600" />
  //     <AlertDescription className="flex items-center justify-between">
  //       <div className="flex items-center space-x-2">
  //         <span className="font-medium text-orange-800">
  //           Modo Super Admin Ativo
  //         </span>
  //         <span className="text-orange-700">
  //           Visualizando conta de: <strong>{impersonatedCliente.name}</strong>
  //         </span>
  //       </div>
  //       <Button
  //         size="sm"
  //         variant="outline"
  //         onClick={handleExitImpersonation}
  //         className="border-orange-300 text-orange-700 hover:bg-orange-100"
  //       >
  //         <LogOut className="w-4 h-4 mr-2" />
  //         Sair do Modo Super Admin
  //       </Button>
  //     </AlertDescription>
  //   </Alert>
  // );
} 