import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { leadsService } from '@/services/leadsService';
import { useAuth } from './auth';
import { clientesService } from '@/services/clientesService';

// Definir tipos para o contexto
interface UpdateInfo {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  leadId: number;
  status?: string;
  oldStatus?: string;
  timestamp: Date;
}

interface RealtimeContextType {
  clientId: number | null;
  subscribedComponents: string[];
  subscribeComponent: (componentName: string) => void;
  unsubscribeComponent: (componentName: string) => void;
  lastUpdate: UpdateInfo | null;
  triggerUpdate: () => void;
}

// Criar o contexto
const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

// Provedor do contexto
export const RealtimeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [clientId, setClientId] = useState<number | null>(null);
  const [lastUpdate, setLastUpdate] = useState<UpdateInfo | null>(null);
  const [subscribedComponents, setSubscribedComponents] = useState<string[]>([]);
  const subscriptionActiveRef = useRef(false);
  const currentUserRef = useRef<string | null>(null);

  // IMPERSONAÇÃO DESABILITADA - EXCLUSIVA PARA SUPER ADMIN
  // Função para escopar a chave de impersonação por usuário
  // const getImpersonationKey = (userId: string) => `impersonatedCliente_${userId}`;
  
  // Função para validar se a impersonação ainda é válida para o usuário atual
  // const validateImpersonation = (userId: string): { isValid: boolean; clientId?: number } => {
  //   try {
  //     const impersonationKey = getImpersonationKey(userId);
  //     const impersonatedClienteStr = sessionStorage.getItem(impersonationKey);
  //     const isImpersonating = sessionStorage.getItem(`isImpersonating_${userId}`) === 'true';
  //     
  //     if (!isImpersonating || !impersonatedClienteStr) {
  //       return { isValid: false };
  //     }
  //     
  //     const impersonatedCliente = JSON.parse(impersonatedClienteStr);
  //     
  //     // Validar se os dados são válidos
  //     if (!impersonatedCliente || !impersonatedCliente.id || typeof impersonatedCliente.id !== 'number') {
  //       console.warn('RealtimeContext: Dados de impersonação inválidos, limpando...');
  //       clearImpersonation(userId);
  //       return { isValid: false };
  //     }
  //     
  //     return { isValid: true, clientId: impersonatedCliente.id };
  //   } catch (error) {
  //     console.error('RealtimeContext: Erro ao validar impersonação:', error);
  //     clearImpersonation(userId);
  //     return { isValid: false };
  //   }
  // };
  
  // Função para limpar dados de impersonação
  // const clearImpersonation = (userId: string) => {
  //   const impersonationKey = getImpersonationKey(userId);
  //   sessionStorage.removeItem(impersonationKey);
  //   sessionStorage.removeItem(`isImpersonating_${userId}`);
  //   console.log('RealtimeContext: Impersonação limpa para usuário:', userId);
  // };

  // Efeito para buscar o ID do cliente quando o usuário é carregado
  useEffect(() => {
    const fetchClientId = async () => {
      if (!user) {
        // Limpar estado quando não há usuário
        setClientId(null);
        currentUserRef.current = null;
        return;
      }
      
      // Verificar se o usuário mudou
      if (currentUserRef.current !== user.id) {
        void 0;
        setClientId(null);
        currentUserRef.current = user.id;
      }
      
             try {
         let clientInfo: { id: number } | null = null;
         
         // IMPERSONAÇÃO COMPLETAMENTE DESABILITADA
         // Verificar se está em modo de impersonação válido
         // const impersonationValidation = validateImpersonation(user.id);
         // if (impersonationValidation.isValid && impersonationValidation.clientId) {
         //   clientInfo = { id: impersonationValidation.clientId };
         //   console.log('RealtimeContext: Modo impersonação válido - usando cliente ID:', impersonationValidation.clientId);
         // } else {
           
           // SEMPRE consultar primeiro por email na tabela clientes_info
           void 0;
           const clientePorEmail = await clientesService.getClienteByEmail(user.email);
           
           if (clientePorEmail) {
             void 0;
             clientInfo = clientePorEmail;
             
             // Se o id_cliente do usuário está diferente do encontrado na tabela, atualizar o user_metadata
             if (user.id_cliente !== clientePorEmail.id) {
               void 0;
               try {
                 const { supabase } = await import('@/lib/supabase');
                 await supabase.auth.updateUser({
                   data: { id_cliente: clientePorEmail.id }
                 });
                 void 0;
               } catch (error) {
                 console.error('RealtimeContext: Erro ao atualizar id_cliente:', error);
               }
             }
           } else {
             // Fallback: tentar buscar por id_cliente se não encontrar por email
             void 0;
             clientInfo = await clientesService.getClienteByIdCliente(user.id_cliente);
             
             if (!clientInfo) {
               console.error('RealtimeContext: Cliente não encontrado nem por email nem por id_cliente para usuário:', user.email);
               return;
             }
             
             void 0;
           }
         // }
        
        setClientId(clientInfo.id);
        void 0;
      } catch (error) {
        console.error('Erro ao buscar ID do cliente:', error);
      }
    };
    
    fetchClientId();
  }, [user]);

  // Efeito para configurar a inscrição em tempo real quando temos o ID do cliente
  // DESABILITADO: Causava recursão infinita
  // useEffect(() => {
  //   if (!clientId) return;
  //   
  //   const setupSubscription = () => {
  //     // Cancelar inscrição anterior, se existir
  //     if (subscriptionActiveRef.current) {
  //       leadsService.unsubscribeFromLeadsUpdates(clientId);
  //       subscriptionActiveRef.current = false;
  //     }
  //     
  //     console.log('RealtimeContext: Configurando inscrição para cliente ID:', clientId);
  //     
  //     // Configurar nova inscrição
  //     leadsService.subscribeToLeadsUpdates(clientId, (update) => {
  //       console.log('RealtimeContext: Atualização recebida:', update);
  //       
  //       // Criar objeto de atualização com informações específicas
  //       const updateInfo: UpdateInfo = {
  //         type: update.type,
  //         leadId: update.type === 'DELETE' ? update.leadId : update.lead.id,
  //         timestamp: new Date()
  //       };
  //       
  //       // Para atualizações, registrar o status antigo e novo
  //       if (update.type === 'UPDATE') {
  //         updateInfo.status = update.lead.status;
  //         updateInfo.oldStatus = update.oldLead?.status;
  //         
  //         console.log(`RealtimeContext: Status do lead ${updateInfo.leadId} alterado de "${updateInfo.oldStatus}" para "${updateInfo.status}"`);
  //       } else if (update.type === 'INSERT') {
  //         updateInfo.status = update.lead.status;
  //         console.log(`RealtimeContext: Novo lead ${updateInfo.leadId} criado com status "${updateInfo.status}"`);
  //       } else if (update.type === 'DELETE') {
  //         console.log(`RealtimeContext: Lead ${updateInfo.leadId} excluído`);
  //       }
  //       
  //       // Atualizar timestamp para notificar os componentes
  //       setLastUpdate(updateInfo);
  //     });
  //     
  //     subscriptionActiveRef.current = true;
  //   };
  //   
  //   setupSubscription();
  //   
  //   // Cleanup ao desmontar
  //   return () => {
  //     if (subscriptionActiveRef.current && clientId) {
  //       console.log('RealtimeContext: Limpando inscrição para cliente ID:', clientId);
  //       leadsService.unsubscribeFromLeadsUpdates(clientId);
  //       subscriptionActiveRef.current = false;
  //     }
  //   };
  // }, [clientId]);
  
  // Monitorar a visibilidade da página para restaurar a inscrição quando necessário
  // DESABILITADO: Causava recursão infinita
  // useEffect(() => {
  //   const handleVisibilityChange = () => {
  //     if (document.visibilityState === 'visible' && clientId) {
  //       console.log('RealtimeContext: Página tornou-se visível, verificando inscrição');
  //       
  //       if (!subscriptionActiveRef.current) {
  //         console.log('RealtimeContext: Restaurando inscrição perdida para cliente ID:', clientId);
  //         
  //         // Reconfigurar inscrição
  //         leadsService.subscribeToLeadsUpdates(clientId, (update) => {
  //           console.log('RealtimeContext: Atualização recebida após restauração:', update);
  //           
  //           // Criar objeto de atualização com informações específicas
  //           const updateInfo: UpdateInfo = {
  //             type: update.type,
  //             leadId: update.type === 'DELETE' ? update.leadId : update.lead.id,
  //             timestamp: new Date()
  //           };
  //           
  //           // Para atualizações, registrar o status antigo e novo
  //           if (update.type === 'UPDATE') {
  //             updateInfo.status = update.lead.status;
  //             updateInfo.oldStatus = update.oldLead?.status;
  //           } else if (update.type === 'INSERT') {
  //             updateInfo.status = update.lead.status;
  //           }
  //           
  //           setLastUpdate(updateInfo);
  //         });
  //         
  //         subscriptionActiveRef.current = true;
  //       }
  //     }
  //   };
  //   
  //   document.addEventListener('visibilitychange', handleVisibilityChange);
  //   
  //   return () => {
  //     document.removeEventListener('visibilitychange', handleVisibilityChange);
  //   };
  // }, [clientId]);

  // Inscrever um componente para receber atualizações
  const subscribeComponent = (componentName: string) => {
    if (!subscribedComponents.includes(componentName)) {
      void 0;
      setSubscribedComponents(prev => [...prev, componentName]);
    }
  };

  // Cancelar inscrição de um componente
  const unsubscribeComponent = (componentName: string) => {
    void 0;
    setSubscribedComponents(prev => prev.filter(name => name !== componentName));
  };

  // Forçar uma atualização (útil para debugging ou atualizações manuais)
  const triggerUpdate = () => {
    void 0;
    setLastUpdate({
      type: 'UPDATE',
      leadId: -1, // Valor especial para atualização manual
      timestamp: new Date()
    });
  };

  // Valor fornecido pelo contexto
  const value: RealtimeContextType = {
    clientId,
    subscribedComponents,
    subscribeComponent,
    unsubscribeComponent,
    lastUpdate,
    triggerUpdate
  };

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
};

// Hook para usar o contexto
export const useRealtime = () => {
  const context = useContext(RealtimeContext);
  if (context === undefined) {
    throw new Error('useRealtime deve ser usado dentro de um RealtimeProvider');
  }
  return context;
}; 