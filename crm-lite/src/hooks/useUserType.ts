import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/lib/supabase';

export type UserType = 'Admin' | 'Gestor' | 'Atendente';

interface UserInfo {
  tipo_usuario?: string;
  id_departamento?: number;
  id_departamento_2?: number;
  id_departamento_3?: number;
  plano_agentes?: boolean;
  plano_agentes_low?: boolean;
  plano_crm?: boolean; // Adicionado para verificar acesso ao plano CRM
  plano_starter?: boolean;
  plano_plus?: boolean;
  plano_pro?: boolean;
  trial?: boolean;
  user_ok?: boolean;
}

export const useUserType = () => {
  const { user } = useAuth();
  const [userType, setUserType] = useState<UserType | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const detectUserType = async () => {
      if (!user?.email || !user?.id_cliente) {
        setLoading(false);
        return;
      }

      try {
        // Primeiro, verificar se é Admin (está na tabela clientes_info)
        const { data: adminData, error: adminError } = await supabase
          .from('clientes_info')
          .select('*')
          .eq('email', user.email)
          .maybeSingle();

        if (adminData && !adminError) {
          setUserType('Admin');
          // ✅ NOVA LÓGICA: Starter tem tudo do pro, exceto CRM e Dashboard
          // Se tem starter, não deve ter acesso ao CRM
          const hasStarter = adminData.plano_starter || false;
          const hasPro = adminData.plano_pro || false;
          const hasCrm = adminData.plano_crm || false;
          
          setUserInfo({
            tipo_usuario: 'Admin',
            // ✅ NOVA LÓGICA: Trial tem acesso completo a todas as funcionalidades
            plano_agentes: adminData.plano_agentes || adminData.trial || false,
            plano_agentes_low: adminData.plano_agentes_low || adminData.trial || false,
            // Trial NÃO tem acesso ao CRM
            plano_crm: ((hasCrm || hasPro) && !hasStarter) || false,
            plano_starter: hasStarter || adminData.trial || false,
            plano_plus: adminData.plano_plus || adminData.trial || false,
            plano_pro: hasPro || adminData.trial || false,
            trial: adminData.trial === true
          });
          setLoading(false);
          return;
        }

        // ✅ NOVA LÓGICA: Verificar se é Gestor inscrito (id_gestor no cliente)
        const { data: gestorData, error: gestorError } = await supabase
          .from('clientes_info')
          .select('*')
          .contains('id_gestor', [user.id])
          .eq('id', user.id_cliente)
          .maybeSingle();

        if (gestorData && !gestorError) {
          void 0;
          setUserType('Gestor');
          // ✅ NOVA LÓGICA: Starter tem tudo do pro, exceto CRM e Dashboard
          const hasStarter = gestorData.plano_starter || false;
          const hasPro = gestorData.plano_pro || false;
          const hasCrm = gestorData.plano_crm || false;
          
          setUserInfo({
            tipo_usuario: 'Gestor',
            // Gestores inscritos herdam os planos do cliente
            plano_agentes: gestorData.plano_agentes || gestorData.trial || false,
            plano_agentes_low: gestorData.plano_agentes_low || false,
            // Trial NÃO tem acesso ao CRM
            plano_crm: ((hasCrm || hasPro) && !hasStarter) || false,
            plano_starter: hasStarter || gestorData.trial || false,
            plano_plus: gestorData.plano_plus || gestorData.trial || false,
            plano_pro: hasPro || gestorData.trial || false,
            trial: gestorData.trial === true
          });
          setLoading(false);
          return;
        }

        // Se não é Admin nem Gestor inscrito, verificar se é Gestor ou Atendente (tabela atendentes)
        const { data: atendenteData, error: atendenteError } = await supabase
          .from('atendentes')
          .select('tipo_usuario, id_departamento, id_departamento_2, id_departamento_3, user_ok')
          .eq('email', user.email)
          .eq('id_cliente', user.id_cliente)
          .maybeSingle();

        if (atendenteData && !atendenteError) {
          const tipo = atendenteData.tipo_usuario === 'Atendente' ? 'Atendente' : 'Gestor';
          setUserType(tipo);
          setUserInfo({
            tipo_usuario: atendenteData.tipo_usuario,
            id_departamento: atendenteData.id_departamento,
            id_departamento_2: atendenteData.id_departamento_2,
            id_departamento_3: atendenteData.id_departamento_3,
            plano_agentes: false, // Atendentes não têm plano_agentes
            plano_agentes_low: false, // Atendentes não têm plano_agentes_low
            plano_crm: true, // ✅ NOVA LÓGICA: Atendentes têm acesso ao CRM
            plano_starter: false,
            plano_plus: false,
            plano_pro: false,
            trial: false,
            user_ok: atendenteData.user_ok !== false, // true por padrão; false somente se explicitamente false
          });
        } else {
          // Se não encontrou em nenhuma tabela, considerar como Gestor por padrão
          setUserType('Gestor');
          setUserInfo({ 
            tipo_usuario: 'Gestor',
            plano_agentes: false,
            plano_agentes_low: false,
            plano_crm: false, // Por padrão, Gestores não têm acesso ao plano CRM
            plano_starter: false,
            plano_plus: false,
            plano_pro: false,
            trial: false
          });
        }
      } catch (error) {
        console.error('Erro ao detectar tipo de usuário:', error);
        // Em caso de erro, considerar como Gestor por padrão
        setUserType('Gestor');
        setUserInfo({ 
          tipo_usuario: 'Gestor',
          plano_agentes: false,
          plano_agentes_low: false,
          plano_crm: false, // Em caso de erro, não dar acesso ao plano CRM
          plano_starter: false,
          plano_plus: false,
          plano_pro: false,
          trial: false
        });
      } finally {
        setLoading(false);
      }
    };

    detectUserType();
  }, [user]);

  return {
    userType,
    userInfo,
    loading,
    isAdmin: userType === 'Admin',
    isGestor: userType === 'Gestor',
    isAtendente: userType === 'Atendente',
    canAccessSettings: userType === 'Admin' || userType === 'Gestor',
    canAccessMeusChips: userType === 'Admin' || userType === 'Gestor',
    canAccessAllDepartments: userType === 'Admin' || userType === 'Gestor',
    plano_agentes: userInfo?.plano_agentes || false,
    plano_agentes_low: userInfo?.plano_agentes_low || false,
    plano_crm: userInfo?.plano_crm || false, // Adicionado retorno do plano_crm
    plano_starter: userInfo?.plano_starter || false,
    plano_plus: userInfo?.plano_plus || false,
    plano_pro: userInfo?.plano_pro || false,
    trial: userInfo?.trial || false,
    user_ok: userInfo?.user_ok !== false, // true por padrão; false somente para atendentes bloqueados
  };
}; 