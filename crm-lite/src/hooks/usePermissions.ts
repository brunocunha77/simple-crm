import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/lib/supabase';

interface UserPermissions {
  tipo_usuario: 'Gestor' | 'Atendente';
  id_departamento?: number;
  id_departamento_2?: number;
  id_departamento_3?: number;
  departamentos?: string[];
  canViewAllDepartments: boolean;
  canEditLeads: boolean;
  canDeleteMessages: boolean;
  canTransferLeads: boolean;
  canManageUsers: boolean;
  canViewReports: boolean;
  allowedDepartments: number[];
}

export const usePermissions = () => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPermissions = async () => {
      if (!user?.email || !user?.id_cliente) {
        setLoading(false);
        return;
      }

      // Verificar se está em modo de impersonação
      const isImpersonating = sessionStorage.getItem('isImpersonating') === 'true';
      
      try {
        // Se está em modo de impersonação, dar permissões de gestor
        if (isImpersonating) {
          void 0;
          const superAdminPerms: UserPermissions = {
            tipo_usuario: 'Gestor',
            canViewAllDepartments: true,
            canEditLeads: true,
            canDeleteMessages: true,
            canTransferLeads: true,
            canManageUsers: true,
            canViewReports: true,
            allowedDepartments: [] // Pode ver todos os departamentos
          };
          setPermissions(superAdminPerms);
          setLoading(false);
          return;
        }

        // ✅ NOVA LÓGICA: Primeiro verificar se é Admin (clientes_info)
        const { data: adminData, error: adminError } = await supabase
          .from('clientes_info')
          .select('*')
          .eq('email', user.email)
          .maybeSingle();

        if (adminData && !adminError) {
          // ✅ NOVA LÓGICA: Trial tem acesso completo a todas as funcionalidades
          const isTrial = adminData.trial === true;
          void 0;
          const adminPerms: UserPermissions = {
            tipo_usuario: 'Gestor', // Admin tem permissões de Gestor
            canViewAllDepartments: true,
            canEditLeads: true,
            canDeleteMessages: true,
            canTransferLeads: true,
            canManageUsers: true,
            canViewReports: true,
            allowedDepartments: [] // Pode ver todos os departamentos
          };
          setPermissions(adminPerms);
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
          const gestorPerms: UserPermissions = {
            tipo_usuario: 'Gestor',
            canViewAllDepartments: true,
            canEditLeads: true,
            canDeleteMessages: true,
            canTransferLeads: true,
            canManageUsers: true,
            canViewReports: true,
            allowedDepartments: [] // Pode ver todos os departamentos
          };
          setPermissions(gestorPerms);
          setLoading(false);
          return;
        }

        // Se não é Admin nem Gestor inscrito, verificar se é Gestor ou Atendente (tabela atendentes)
        const { data: userInfo, error } = await supabase
          .from('atendentes')
          .select('tipo_usuario, id_departamento, id_departamento_2, id_departamento_3')
          .eq('email', user.email)
          .eq('id_cliente', user.id_cliente)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Erro ao buscar permissões:', error);
          setLoading(false);
          return;
        }

        // Coletar todos os departamentos permitidos (até 3)
        const allowedDepts: number[] = [];
        if (userInfo?.id_departamento) allowedDepts.push(userInfo.id_departamento);
        if (userInfo?.id_departamento_2) allowedDepts.push(userInfo.id_departamento_2);
        if (userInfo?.id_departamento_3) allowedDepts.push(userInfo.id_departamento_3);

        const userPerms: UserPermissions = {
          tipo_usuario: userInfo?.tipo_usuario || 'Atendente',
          id_departamento: userInfo?.id_departamento,
          id_departamento_2: userInfo?.id_departamento_2,
          id_departamento_3: userInfo?.id_departamento_3,
          departamentos: undefined,
          canViewAllDepartments: userInfo?.tipo_usuario === 'Gestor',
          canEditLeads: true, // Atendentes podem editar leads dos seus departamentos
          canDeleteMessages: userInfo?.tipo_usuario === 'Gestor',
          canTransferLeads: userInfo?.tipo_usuario === 'Gestor',
          canManageUsers: userInfo?.tipo_usuario === 'Gestor',
          canViewReports: true, // Ambos podem ver relatórios dos seus departamentos
          allowedDepartments: userInfo?.tipo_usuario === 'Gestor' 
            ? [] // Gestores podem ver todos os departamentos
            : allowedDepts
        };

        setPermissions(userPerms);
        void 0;
      } catch (error) {
        console.error('Erro ao carregar permissões:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [user]);

  const canAccessDepartment = (departmentId: number | null | undefined): boolean => {
    if (!permissions) return false;
    // Gestores têm acesso completo a todos os departamentos
    if (permissions.canViewAllDepartments) return true;
    // Se não tem departamento, atendentes podem acessar
    if (!departmentId) return true;
    // Verificar se o departamento está na lista permitida
    return permissions.allowedDepartments.includes(departmentId);
  };

  const canAccessLead = (leadDepartmentId: number | null | undefined): boolean => {
    if (!permissions) return false;
    // Gestores têm acesso completo a todos os leads
    if (permissions.canViewAllDepartments) return true;
    // Se o lead não tem departamento, permitir acesso
    if (!leadDepartmentId) return true;
    // Verificar se o departamento do lead está na lista permitida
    return permissions.allowedDepartments.includes(leadDepartmentId);
  };

  const canAccessConversation = (phoneNumber: string): Promise<boolean> => {
    return new Promise(async (resolve) => {
      if (!permissions || !user?.id_cliente) {
        resolve(false);
        return;
      }

      if (permissions.canViewAllDepartments) {
        resolve(true);
        return;
      }

      try {
        const { data: lead } = await supabase
          .from('leads')
          .select('id_departamento')
          .eq('telefone', phoneNumber)
          .eq('id_cliente', user.id_cliente)
          .single();

        if (!lead) {
          resolve(false);
          return;
        }

        resolve(canAccessDepartment(lead.id_departamento));
      } catch (error) {
        console.error('Erro ao verificar acesso à conversa:', error);
        resolve(false);
      }
    });
  };

  const canPerformAction = (action: keyof UserPermissions): boolean => {
    return permissions ? permissions[action] : false;
  };

  const getFilteredDepartments = (allDepartments: any[]): any[] => {
    if (!permissions) return [];
    if (permissions.canViewAllDepartments) return allDepartments;
    return allDepartments.filter(dept => permissions.allowedDepartments.includes(dept.id));
  };

  const isGestor = (): boolean => {
    return permissions?.tipo_usuario === 'Gestor';
  };

  const isAtendente = (): boolean => {
    return permissions?.tipo_usuario === 'Atendente';
  };

  return {
    permissions,
    loading,
    canAccessDepartment,
    canAccessLead,
    canAccessConversation,
    canPerformAction,
    getFilteredDepartments,
    isGestor,
    isAtendente
  };
}; 