import React from 'react';
import { usePermissions } from '@/hooks/usePermissions';

interface UserPermissions {
  tipo_usuario: 'Gestor' | 'Atendente';
  id_departamento?: number;
  departamentos?: string[];
  canViewAllDepartments: boolean;
  canEditLeads: boolean;
  canDeleteMessages: boolean;
  canTransferLeads: boolean;
  canManageUsers: boolean;
  canViewReports: boolean;
  allowedDepartments: number[];
}

interface PermissionGuardProps {
  children: React.ReactNode;
  requiredPermission?: keyof UserPermissions;
  departmentId?: number;
  fallback?: React.ReactNode;
  showLoading?: boolean;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  children,
  requiredPermission,
  departmentId,
  fallback = null,
  showLoading = true
}) => {
  const { permissions, loading, canAccessDepartment } = usePermissions();

  if (loading && showLoading) {
    return (
      <div className="animate-pulse flex items-center justify-center p-4">
        <div className="w-4 h-4 bg-gray-300 rounded-full animate-spin mr-2"></div>
        <span className="text-sm text-gray-500">Verificando permissões...</span>
      </div>
    );
  }

  if (!permissions) {
    return fallback;
  }

  // Verificar permissão específica
  if (requiredPermission && !permissions[requiredPermission]) {
    return fallback;
  }

  // Verificar acesso ao departamento
  if (departmentId && !canAccessDepartment(departmentId)) {
    return fallback;
  }

  return <>{children}</>;
};

// Componente específico para botões de ação
interface ActionButtonProps {
  children: React.ReactNode;
  action: keyof UserPermissions;
  departmentId?: number;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export const ActionButton: React.FC<ActionButtonProps> = ({
  children,
  action,
  departmentId,
  onClick,
  disabled = false,
  variant = 'default',
  size = 'default',
  className = ''
}) => {
  const { canPerformAction, canAccessDepartment } = usePermissions();

  const hasPermission = departmentId 
    ? canPerformAction(action) && canAccessDepartment(departmentId)
    : canPerformAction(action);

  if (!hasPermission) {
    return null;
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`btn btn-${variant} btn-${size} ${className}`}
    >
      {children}
    </button>
  );
};

// Componente para mostrar informações de permissão
export const PermissionInfo: React.FC = () => {
  const { permissions, loading, isGestor, isAtendente } = usePermissions();

  if (loading) {
    return (
      <div className="text-sm text-gray-500">
        Carregando informações de permissão...
      </div>
    );
  }

  if (!permissions) {
    return (
      <div className="text-sm text-red-500">
        Erro ao carregar permissões
      </div>
    );
  }

  return (
    <div className="text-sm text-gray-600">
      <div className="flex items-center gap-2">
        <span className="font-medium">
          {isGestor() ? 'Gestor' : 'Atendente'}
        </span>
        {isAtendente() && permissions.id_departamento && (
          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
            Departamento: {permissions.id_departamento}
          </span>
        )}
        {isAtendente() && permissions.departamentos && permissions.departamentos.length > 0 && (
          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
            {permissions.departamentos.length} departamento(s)
          </span>
        )}
      </div>
    </div>
  );
};

// Hook para verificar permissões em tempo real
export const usePermissionCheck = () => {
  const { permissions, loading } = usePermissions();

  const checkPermission = (action: keyof UserPermissions, departmentId?: number): boolean => {
    if (loading || !permissions) return false;
    
    const hasActionPermission = permissions[action];
    if (!hasActionPermission) return false;
    
    if (departmentId) {
      return permissions.canViewAllDepartments || permissions.allowedDepartments.includes(departmentId);
    }
    
    return true;
  };

  return {
    checkPermission,
    loading,
    permissions
  };
};

// Exemplo de uso:
/*
// Proteger um botão de deletar
<PermissionGuard requiredPermission="canDeleteMessages">
  <Button onClick={handleDelete} variant="destructive">
    Deletar Mensagem
  </Button>
</PermissionGuard>

// Proteger um botão de transferir com departamento específico
<PermissionGuard requiredPermission="canTransferLeads" departmentId={1}>
  <Button onClick={handleTransfer}>
    Transferir para Departamento
  </Button>
</PermissionGuard>

// Usar ActionButton diretamente
<ActionButton 
  action="canDeleteMessages" 
  onClick={handleDelete}
  variant="destructive"
>
  Deletar
</ActionButton>

// Mostrar informações de permissão
<PermissionInfo />
*/ 