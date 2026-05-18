import { useState, useEffect } from 'react';

export interface SuperAdminData {
  id: string;
  nome: string;
  email: string;
  criado_em: string;
}

export interface Cliente {
  id: number;
  created_at: string;
  name: string;
  email: string;
  user_id_auth: string;
  instance_id: string;
  sender_number: string;
  instance_name: string;
  apikey: string;
  atendimento_humano: boolean | null;
  atendimento_ia: boolean | null;
  prompt_type: string | null;
  id_chatbot: string | null;
  phone: string | null;
  atualizando_relatorio: boolean | null;
  id_departamento_padrao: string | null;
  instance_id_2: string | null;
  instance_name_2: string | null;
  sender_number_2: string | null;
  atendimento_humano_2: boolean | null;
  atendimento_ia_2: boolean | null;
  data_hora_atualizacao_relatorio: string | null;
  id_departamento_chip_1: string | null;
  id_departamento_chip_2: string | null;
}

export function useSuperAdmin() {
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [superAdminData, setSuperAdminData] = useState<SuperAdminData | null>(null);
  const [impersonatedCliente, setImpersonatedCliente] = useState<Cliente | null>(null);

  useEffect(() => {
    // Verificar estado do super admin
    const superAdminStr = sessionStorage.getItem('isSuperAdmin');
    const superAdminDataStr = sessionStorage.getItem('superAdminData');
    const impersonatingStr = sessionStorage.getItem('isImpersonating');
    const impersonatedClienteStr = sessionStorage.getItem('impersonatedCliente');

    setIsSuperAdmin(superAdminStr === 'true');
    setIsImpersonating(impersonatingStr === 'true');

    if (superAdminDataStr) {
      try {
        setSuperAdminData(JSON.parse(superAdminDataStr));
      } catch (error) {
        console.error('Erro ao parsear dados do super admin:', error);
      }
    }

    if (impersonatedClienteStr) {
      try {
        setImpersonatedCliente(JSON.parse(impersonatedClienteStr));
      } catch (error) {
        console.error('Erro ao parsear dados do cliente:', error);
      }
    }
  }, []);

  const exitImpersonation = () => {
    sessionStorage.removeItem('impersonatedCliente');
    sessionStorage.removeItem('isImpersonating');
    setIsImpersonating(false);
    setImpersonatedCliente(null);
  };

  const clearSuperAdminSession = () => {
    sessionStorage.removeItem('isSuperAdmin');
    sessionStorage.removeItem('superAdminData');
    sessionStorage.removeItem('impersonatedCliente');
    sessionStorage.removeItem('isImpersonating');
    setIsSuperAdmin(false);
    setIsImpersonating(false);
    setSuperAdminData(null);
    setImpersonatedCliente(null);
  };

  return {
    isSuperAdmin,
    isImpersonating,
    superAdminData,
    impersonatedCliente,
    exitImpersonation,
    clearSuperAdminSession
  };
} 