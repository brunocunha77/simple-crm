import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';
import { processReceivedMessage } from '@/services/workflowMessageHandler';
import { WorkflowService } from '@/services/workflowService';

interface TriggerPayload {
  phone: string;
  data?: Record<string, any>; // Dados adicionais (nome, origem, etc)
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Responder a requisições OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Permitir apenas requisições POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const workflowId = req.query.id as string;
    const payload = req.body as TriggerPayload;

    // Validar workflow ID
    if (!workflowId) {
      return res.status(400).json({ 
        success: false,
        error: 'Workflow ID é obrigatório' 
      });
    }

    // Validar payload
    if (!payload || !payload.phone) {
      return res.status(400).json({ 
        success: false,
        error: 'Campo "phone" é obrigatório no payload' 
      });
    }

    // Buscar workflow
    const workflow = await WorkflowService.getById(workflowId);
    if (!workflow) {
      return res.status(404).json({ 
        success: false,
        error: 'Workflow não encontrado' 
      });
    }

    if (!workflow.is_active) {
      return res.status(400).json({ 
        success: false,
        error: 'Workflow está inativo' 
      });
    }

    // Normalizar telefone
    const normalizedPhone = payload.phone.replace(/\D/g, '');

    // Buscar ou criar lead
    let lead = await WorkflowService.getLeadByPhone(normalizedPhone, workflow.id_cliente);

    // Verificar workflow_ativo
    if (lead && lead.workflow_ativo === false) {
      return res.status(200).json({ 
        success: false,
        message: 'Workflow pausado para este lead',
        execution_id: null
      });
    }

    // Criar lead se não existir
    if (!lead) {
      const { data: newLead, error: createError } = await supabase
        .from('leads')
        .insert({
          telefone: normalizedPhone,
          nome: payload.data?.nome || `Contato ${normalizedPhone.slice(-4)}`,
          id_cliente: workflow.id_cliente,
          status_conversa: 'em_atendimento',
          status: 'Leads',
          origem: payload.data?.origem || 'Webhook Externo',
          workflow_ativo: true,
          closer_momento_da_ultima_msg: new Date().toISOString(),
          ...payload.data, // Incluir outros dados do payload
        })
        .select()
        .single();

      if (createError || !newLead) {
        console.error('[Webhook] Erro ao criar lead:', createError);
        return res.status(500).json({ 
          success: false,
          error: 'Erro ao criar lead',
          details: createError?.message 
        });
      }

      lead = newLead;
    }

    // Encontrar nó inicial
    const startNode = workflow.nodes.find(
      (n: any) => n.type === 'inicio' || n.type === 'trigger'
    );

    if (!startNode) {
      return res.status(400).json({ 
        success: false,
        error: 'Workflow sem nó inicial' 
      });
    }

    // Criar execução inicial
    const execution = await WorkflowService.createOrUpdateExecution(
      workflow.id,
      lead.id,
      'running',
      startNode.id,
      { 
        leadId: lead.id, 
        phone: normalizedPhone, 
        leadData: lead,
        webhookData: payload.data || {},
        lastOutput: null
      },
      null,
      null
    );

    // Log: início do workflow
    await WorkflowService.logWorkflowStart(workflow.id, lead.id, execution.id);

    // Executar workflow em background (não bloquear resposta)
    // Importar função de execução
    const workflowHandler = await import('@/services/workflowMessageHandler');
    
    // Executar em background sem bloquear resposta (usar Promise sem await)
    Promise.resolve().then(() => {
      return workflowHandler.executeWorkflowFromNode(
        workflow,
        execution,
        startNode.id,
        { 
          leadId: lead.id, 
          phone: normalizedPhone, 
          leadData: lead 
        }
      );
    }).catch((error) => {
      console.error('[Webhook] Erro ao executar workflow:', error);
      WorkflowService.logError(
        execution.id,
        'workflow_start',
        error.message || 'Erro ao executar workflow',
        { error: String(error) }
      );
    });

    return res.status(200).json({ 
      success: true,
      execution_id: execution.id,
      lead_id: lead.id
    });

  } catch (error: any) {
    console.error('[Webhook] Erro no endpoint:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
}
