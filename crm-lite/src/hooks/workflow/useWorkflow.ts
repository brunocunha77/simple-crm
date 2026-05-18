import { useState, useEffect, useCallback } from 'react';
import { WorkflowService } from '@/services/workflowService';
import { Workflow } from '@/types/workflow';
import { toast } from 'sonner';

export function useWorkflow(workflowId?: string) {
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadWorkflow = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await WorkflowService.getById(id);
      setWorkflow(data);
    } catch (err: any) {
      setError(err.message);
      toast.error('Erro ao carregar workflow: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveWorkflow = useCallback(async (data: Partial<Workflow>) => {
    setSaving(true);
    setError(null);
    try {
      let result: Workflow;
      if (workflowId) {
        result = await WorkflowService.update(workflowId, data);
        toast.success('Workflow atualizado com sucesso!');
      } else {
        result = await WorkflowService.create(data as any);
        toast.success('Workflow criado com sucesso!');
      }
      setWorkflow(result);
      return result;
    } catch (err: any) {
      setError(err.message);
      toast.error('Erro ao salvar: ' + err.message);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [workflowId]);

  useEffect(() => {
    if (workflowId) {
      loadWorkflow(workflowId);
    }
  }, [workflowId, loadWorkflow]);

  return {
    workflow,
    loading,
    saving,
    error,
    loadWorkflow,
    saveWorkflow,
    setWorkflow,
  };
}