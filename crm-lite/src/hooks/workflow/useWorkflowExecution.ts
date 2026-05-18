import { useState, useCallback } from 'react';
import { WorkflowService } from '@/services/workflowService';
import { WorkflowExecutionPayload, WorkflowNode, WorkflowEdge } from '@/types/workflow';
import { toast } from 'sonner';

interface ExecutionOptions {
  workflowId: string;
  triggerData: {
    phone: string;
    nome?: string;
    leadId?: number;
    id_cliente: number;
  };
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export function useWorkflowExecution() {
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (options: ExecutionOptions) => {
    setExecuting(true);
    setError(null);
    
    try {
      const payload: WorkflowExecutionPayload = {
        workflowId: options.workflowId,
        triggerData: options.triggerData,
        nodes: options.nodes,
        edges: options.edges,
      };

      // Tenta executar via n8n primeiro
      const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL;
      
      if (N8N_WEBHOOK_URL) {
        await WorkflowService.triggerExecution(payload);
        toast.success('Workflow executado via automação!');
      } else {
        // Fallback: execução local (apenas para testes)
        toast.info('Executando localmente (modo teste)...');
        await WorkflowService.executeLocal(
          { 
            id: options.workflowId,
            id_cliente: options.triggerData.id_cliente,
            nome: 'Teste',
            nodes: options.nodes,
            edges: options.edges,
            is_active: true 
          },
          options.triggerData
        );
      }
      
      return true;
    } catch (err: any) {
      setError(err.message);
      toast.error('Erro na execução: ' + err.message);
      throw err;
    } finally {
      setExecuting(false);
    }
  }, []);

  return {
    execute,
    executing,
    error,
  };
}