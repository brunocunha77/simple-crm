// Script de diagnóstico para problemas de ID de cliente incorreto
// Execute este script no console do navegador para diagnosticar problemas

import { supabase } from '@/lib/supabase';

export const debugUserIdMismatch = async () => {
  void 0;
  
  try {
    // 1. Verificar usuário autenticado atual
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      void 0;
      return;
    }
    
    const currentUser = session.user;
    void 0;
    
    // 2. Buscar todos os registros na tabela clientes_info
    const { data: allClientes, error: clientesError } = await supabase
      .from('clientes_info')
      .select('*')
      .order('created_at', { ascending: true });
    
    if (clientesError) {
      console.error('❌ Erro ao buscar clientes:', clientesError);
      return;
    }
    
    void 0;
    
    // 3. Buscar registros com o email do usuário atual
    const userClientes = allClientes.filter(cliente => cliente.email === currentUser.email);
    void 0;
    
    if (userClientes.length > 0) {
      userClientes.forEach((cliente, index) => {
        void 0;
      });
    }
    
    // 4. Verificar se o user_id_auth está correto
    const correctCliente = userClientes.find(cliente => 
      cliente.user_id_auth === currentUser.id
    ) || userClientes[0];
    
    if (correctCliente) {
      void 0;
      
      // 5. Verificar se o id_cliente atual está correto
      const currentIdCliente = currentUser.user_metadata?.id_cliente;
      if (currentIdCliente !== correctCliente.id) {
        void 0;
        void 0;
        void 0;
        
        // 6. Corrigir o id_cliente
        void 0;
        const { error: updateError } = await supabase.auth.updateUser({
          data: { id_cliente: correctCliente.id }
        });
        
        if (updateError) {
          console.error('❌ Erro ao corrigir id_cliente:', updateError);
        } else {
          void 0;
          
          // 7. Atualizar user_id_auth se necessário
          if (correctCliente.user_id_auth !== currentUser.id) {
            void 0;
            const { error: updateClienteError } = await supabase
              .from('clientes_info')
              .update({ user_id_auth: currentUser.id })
              .eq('id', correctCliente.id);
            
            if (updateClienteError) {
              console.error('❌ Erro ao atualizar user_id_auth:', updateClienteError);
            } else {
              void 0;
            }
          }
        }
      } else {
        void 0;
      }
    } else {
      void 0;
    }
    
    // 8. Verificar registros duplicados
    const emailGroups = {};
    allClientes.forEach(cliente => {
      if (!emailGroups[cliente.email]) {
        emailGroups[cliente.email] = [];
      }
      emailGroups[cliente.email].push(cliente);
    });
    
    const duplicateEmails = Object.entries(emailGroups)
      .filter(([email, clientes]) => clientes.length > 1)
      .map(([email, clientes]) => ({ email, count: clientes.length, clientes }));
    
    if (duplicateEmails.length > 0) {
      void 0;
      duplicateEmails.forEach(({ email, count, clientes }) => {
        void 0;
        clientes.forEach(cliente => {
          void 0;
        });
      });
    } else {
      void 0;
    }
    
  } catch (error) {
    console.error('❌ Erro durante diagnóstico:', error);
  }
};

// Função para limpar registros duplicados (use com cuidado!)
export const cleanupDuplicateRecords = async () => {
  void 0;
  
  try {
    const { data: allClientes, error: clientesError } = await supabase
      .from('clientes_info')
      .select('*')
      .order('created_at', { ascending: true });
    
    if (clientesError) {
      console.error('❌ Erro ao buscar clientes:', clientesError);
      return;
    }
    
    const emailGroups = {};
    allClientes.forEach(cliente => {
      if (!emailGroups[cliente.email]) {
        emailGroups[cliente.email] = [];
      }
      emailGroups[cliente.email].push(cliente);
    });
    
    const duplicateEmails = Object.entries(emailGroups)
      .filter(([email, clientes]) => clientes.length > 1);
    
    for (const [email, clientes] of duplicateEmails) {
      void 0;
      
      // Manter o registro mais antigo (primeiro na lista)
      const keepCliente = clientes[0];
      const deleteClientes = clientes.slice(1);
      
      void 0;
      void 0;
      
      // Deletar registros duplicados
      for (const cliente of deleteClientes) {
        const { error: deleteError } = await supabase
          .from('clientes_info')
          .delete()
          .eq('id', cliente.id);
        
        if (deleteError) {
          console.error(`   ❌ Erro ao deletar ID ${cliente.id}:`, deleteError);
        } else {
          void 0;
        }
      }
    }
    
    void 0;
    
  } catch (error) {
    console.error('❌ Erro durante limpeza:', error);
  }
};

// Exportar funções para uso no console
window.debugUserIdMismatch = debugUserIdMismatch;
window.cleanupDuplicateRecords = cleanupDuplicateRecords;

void 0;
void 0;
void 0; 