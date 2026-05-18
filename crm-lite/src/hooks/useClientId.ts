import { useAuth } from '@/contexts/auth';
import { useCorrectClientId } from './useCorrectClientId';

/**
 * Hook global para obter o ID correto do cliente
 * Usa o useCorrectClientId para garantir que o ID correto seja usado
 */
export const useClientId = () => {
  const { user } = useAuth();
  const { correctClientId, loading } = useCorrectClientId();
  
  // Retorna o ID correto (do sessionStorage se houver discrepância, senão do user.id_cliente)
  const clientId = correctClientId || user?.id_cliente;
  
  return {
    clientId,
    loading,
    hasMismatch: sessionStorage.getItem('clientIdMismatch') === 'true'
  };
}; 