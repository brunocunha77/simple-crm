import React, { useState } from 'react';
import { useAuth } from '@/contexts/auth';
import { clientesService } from '@/services/clientesService';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface DebugInfo {
  currentUser: any;
  clientesWithEmail: any[];
  correctCliente: any | null;
  hasMismatch: boolean;
  duplicateEmails: any[];
}

export const ClientIdDebugger: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);

  const runDiagnostic = async () => {
    setLoading(true);
    setMessage(null);
    
    try {
      // 1. Verificar usuário autenticado atual
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setMessage({ type: 'error', text: 'Nenhum usuário autenticado' });
        return;
      }
      
      const currentUser = session.user;
      
      // 2. Buscar todos os registros na tabela clientes_info
      const { data: allClientes, error: clientesError } = await supabase
        .from('clientes_info')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (clientesError) {
        setMessage({ type: 'error', text: `Erro ao buscar clientes: ${clientesError.message}` });
        return;
      }
      
      // 3. Buscar registros com o email do usuário atual
      const userClientes = allClientes.filter(cliente => cliente.email === currentUser.email);
      
      // 4. Verificar se o user_id_auth está correto
      const correctCliente = userClientes.find(cliente => 
        cliente.user_id_auth === currentUser.id
      ) || userClientes[0];
      
      // 5. Verificar se o id_cliente atual está correto
      const currentIdCliente = currentUser.user_metadata?.id_cliente;
      const hasMismatch = correctCliente && currentIdCliente !== correctCliente.id;
      
      // 6. Verificar registros duplicados
      const emailGroups: { [key: string]: any[] } = {};
      allClientes.forEach(cliente => {
        if (!emailGroups[cliente.email]) {
          emailGroups[cliente.email] = [];
        }
        emailGroups[cliente.email].push(cliente);
      });
      
      const duplicateEmails = Object.entries(emailGroups)
        .filter(([email, clientes]) => clientes.length > 1)
        .map(([email, clientes]) => ({ email, count: clientes.length, clientes }));
      
      setDebugInfo({
        currentUser,
        clientesWithEmail: userClientes,
        correctCliente,
        hasMismatch,
        duplicateEmails
      });
      
    } catch (error) {
      setMessage({ type: 'error', text: `Erro durante diagnóstico: ${error}` });
    } finally {
      setLoading(false);
    }
  };

  const fixClientId = async () => {
    if (!debugInfo?.correctCliente) return;
    
    setLoading(true);
    setMessage(null);
    
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        data: { id_cliente: debugInfo.correctCliente.id }
      });
      
      if (updateError) {
        setMessage({ type: 'error', text: `Erro ao corrigir id_cliente: ${updateError.message}` });
      } else {
        setMessage({ type: 'success', text: 'id_cliente corrigido com sucesso!' });
        
        // Atualizar user_id_auth se necessário
        if (debugInfo.correctCliente.user_id_auth !== debugInfo.currentUser.id) {
          const { error: updateClienteError } = await supabase
            .from('clientes_info')
            .update({ user_id_auth: debugInfo.currentUser.id })
            .eq('id', debugInfo.correctCliente.id);
          
          if (updateClienteError) {
            setMessage({ type: 'error', text: `Erro ao atualizar user_id_auth: ${updateClienteError.message}` });
          } else {
            setMessage({ type: 'success', text: 'user_id_auth atualizado com sucesso!' });
          }
        }
        
        // Executar diagnóstico novamente
        setTimeout(runDiagnostic, 1000);
      }
    } catch (error) {
      setMessage({ type: 'error', text: `Erro ao corrigir: ${error}` });
    } finally {
      setLoading(false);
    }
  };

  const cleanupDuplicates = async () => {
    if (!debugInfo?.duplicateEmails.length) return;
    
    setLoading(true);
    setMessage(null);
    
    try {
      for (const { email, clientes } of debugInfo.duplicateEmails) {
        // Manter o registro mais antigo (primeiro na lista)
        const keepCliente = clientes[0];
        const deleteClientes = clientes.slice(1);
        
        // Deletar registros duplicados
        for (const cliente of deleteClientes) {
          const { error: deleteError } = await supabase
            .from('clientes_info')
            .delete()
            .eq('id', cliente.id);
          
          if (deleteError) {
            setMessage({ type: 'error', text: `Erro ao deletar ID ${cliente.id}: ${deleteError.message}` });
            return;
          }
        }
      }
      
      setMessage({ type: 'success', text: 'Limpeza de duplicatas concluída!' });
      
      // Executar diagnóstico novamente
      setTimeout(runDiagnostic, 1000);
    } catch (error) {
      setMessage({ type: 'error', text: `Erro durante limpeza: ${error}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Debug de ID de Cliente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Este componente ajuda a diagnosticar e corrigir problemas com IDs de cliente incorretos.
          </p>
          
          <div className="flex gap-2">
            <Button 
              onClick={runDiagnostic} 
              disabled={loading}
              className="flex items-center gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
              Executar Diagnóstico
            </Button>
            
            {debugInfo?.hasMismatch && (
              <Button 
                onClick={fixClientId} 
                disabled={loading}
                variant="destructive"
                className="flex items-center gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                Corrigir ID
              </Button>
            )}
            
            {debugInfo?.duplicateEmails.length > 0 && (
              <Button 
                onClick={cleanupDuplicates} 
                disabled={loading}
                variant="outline"
                className="flex items-center gap-2"
              >
                <XCircle className="h-4 w-4" />
                Limpar Duplicatas
              </Button>
            )}
          </div>
          
          {message && (
            <Alert className={message.type === 'error' ? 'border-red-500' : 'border-green-500'}>
              <AlertDescription className={message.type === 'error' ? 'text-red-700' : 'text-green-700'}>
                {message.text}
              </AlertDescription>
            </Alert>
          )}
          
          {debugInfo && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Usuário Atual</h4>
                <div className="text-sm space-y-1">
                  <p><strong>ID:</strong> {debugInfo.currentUser.id}</p>
                  <p><strong>Email:</strong> {debugInfo.currentUser.email}</p>
                  <p><strong>ID Cliente:</strong> {debugInfo.currentUser.user_metadata?.id_cliente || 'N/A'}</p>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Registros Encontrados</h4>
                <div className="text-sm space-y-1">
                  <p><strong>Total:</strong> {debugInfo.clientesWithEmail.length}</p>
                  {debugInfo.clientesWithEmail.map((cliente, index) => (
                    <div key={cliente.id} className="flex items-center gap-2">
                      <Badge variant={cliente.user_id_auth === debugInfo.currentUser.id ? 'default' : 'secondary'}>
                        {index + 1}
                      </Badge>
                      <span>ID: {cliente.id}</span>
                      <span>user_id_auth: {cliente.user_id_auth || 'N/A'}</span>
                      <span>created_at: {new Date(cliente.created_at).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {debugInfo.correctCliente && (
                <div>
                  <h4 className="font-semibold mb-2">Cliente Correto</h4>
                  <div className="text-sm space-y-1">
                    <p><strong>ID:</strong> {debugInfo.correctCliente.id}</p>
                    <p><strong>user_id_auth:</strong> {debugInfo.correctCliente.user_id_auth || 'N/A'}</p>
                    <p><strong>Email:</strong> {debugInfo.correctCliente.email}</p>
                    <p><strong>Status:</strong> 
                      <Badge variant={debugInfo.hasMismatch ? 'destructive' : 'default'} className="ml-2">
                        {debugInfo.hasMismatch ? 'Incorreto' : 'Correto'}
                      </Badge>
                    </p>
                  </div>
                </div>
              )}
              
              {debugInfo.duplicateEmails.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Emails Duplicados</h4>
                  <div className="text-sm space-y-2">
                    {debugInfo.duplicateEmails.map(({ email, count, clientes }) => (
                      <div key={email} className="border p-2 rounded">
                        <p><strong>{email}:</strong> {count} registros</p>
                        {clientes.map(cliente => (
                          <div key={cliente.id} className="ml-4 text-xs">
                            - ID: {cliente.id}, user_id_auth: {cliente.user_id_auth || 'N/A'}, 
                            created_at: {new Date(cliente.created_at).toLocaleDateString()}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}; 