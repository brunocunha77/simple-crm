import { useAuth } from '@/contexts/auth';
import { clientesService } from '@/services/clientesService';
import { useState, useEffect } from 'react';

export const useCorrectClientId = () => {
  const { user } = useAuth();
  const [correctClientId, setCorrectClientId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getCorrectClientId = async () => {
      if (!user?.email) {
        setLoading(false);
        return;
      }

      try {
        // Verificar se há um ID correto armazenado no sessionStorage
        const storedCorrectId = sessionStorage.getItem('correctClientId');
        const hasMismatch = sessionStorage.getItem('clientIdMismatch') === 'true';

        if (hasMismatch && storedCorrectId) {
          void 0;
          setCorrectClientId(parseInt(storedCorrectId));
          setLoading(false);
          return;
        }

        // Buscar por email primeiro (mais seguro)
        let info = await clientesService.getClienteByEmail(user.email);
        
        // Se não encontrou por email e tem id_cliente, tentar por id_cliente
        if (!info && user?.id_cliente) {
          void 0;
          info = await clientesService.getClienteByIdCliente(user.id_cliente);
        }

        if (info) {
          // Se encontrou cliente por email mas o id_cliente está incorreto
          if (user?.id_cliente && info.id !== user.id_cliente) {
            void 0;
            void 0;
            void 0;
            
            // Armazenar o ID correto no sessionStorage
            sessionStorage.setItem('correctClientId', info.id.toString());
            sessionStorage.setItem('clientIdMismatch', 'true');
            
            setCorrectClientId(info.id);
          } else {
            // ID está correto
            setCorrectClientId(info.id);
            // Limpar sessionStorage se não há discrepância
            sessionStorage.removeItem('correctClientId');
            sessionStorage.removeItem('clientIdMismatch');
          }
        } else {
          // Não encontrou cliente
          setCorrectClientId(null);
        }
      } catch (error) {
        console.error('Erro ao buscar ID correto do cliente:', error);
        setCorrectClientId(null);
      } finally {
        setLoading(false);
      }
    };

    getCorrectClientId();
  }, [user?.email, user?.id_cliente]);

  return {
    correctClientId,
    loading,
    hasMismatch: sessionStorage.getItem('clientIdMismatch') === 'true'
  };
}; 