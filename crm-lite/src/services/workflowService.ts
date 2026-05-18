import { supabase } from '@/lib/supabase';
import { Workflow, WorkflowExecutionPayload, WorkflowExecution, WorkflowExecutionStatus, MenuNodeData, IfNodeData, WorkflowEdge } from '@/types/workflow';
import { sendMessage } from './messageService';
import { Lead } from '@/types/global';

export class WorkflowService {
  // CRUD Operations
  static async getById(id: string): Promise<Workflow | null> {
    const { data, error } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  static async getByClient(idCliente: number): Promise<Workflow[]> {
    const { data, error } = await supabase
      .from('workflows')
      .select('*')
      .eq('id_cliente', idCliente)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async create(workflow: Omit<Workflow, 'id' | 'created_at' | 'updated_at'>): Promise<Workflow> {
    const { data, error } = await supabase
      .from('workflows')
      .insert(workflow)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async update(id: string, workflow: Partial<Workflow>): Promise<Workflow> {
    const { data, error } = await supabase
      .from('workflows')
      .update({ ...workflow, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('workflows')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Execução local (para testes rápidos)
  static async executeLocal(
    workflow: Workflow,
    triggerData: { phone: string; nome?: string; leadId?: number }
  ): Promise<void> {
    const { nodes, edges } = workflow;

    // Encontra nó inicial (inicio ou trigger legado)
    const startNode = nodes.find(n => n.type === 'inicio' || (n as { type: string }).type === 'trigger');
    if (!startNode) throw new Error('Workflow sem gatilho');

    // Executa sequencialmente
    let currentNodeId: string | undefined = startNode.id;
    const executedNodes = new Set<string>();

    while (currentNodeId) {
      if (executedNodes.has(currentNodeId)) {
        throw new Error('Loop detectado no workflow');
      }
      executedNodes.add(currentNodeId);

      const node = nodes.find(n => n.id === currentNodeId);
      if (!node) break;

      // Executa ação do nó
      if (node.type === 'message') {
        const messageData = node.data as { message: string; useTemplate?: boolean };
        const formattedMessage = this.replaceVariables(messageData.message, {
          nome: triggerData.nome || 'Cliente',
          telefone: triggerData.phone,
        });

        await sendMessage(triggerData.phone, formattedMessage);
      }

      // Próximo nó
      const nextEdge = edges.find(e => e.source === currentNodeId);
      currentNodeId = nextEdge?.target;
    }
  }

  // Execução via n8n (produção)
  static async triggerExecution(payload: WorkflowExecutionPayload): Promise<any> {
    const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL;

    if (!N8N_WEBHOOK_URL) {
      throw new Error('VITE_N8N_WEBHOOK_URL não configurado');
    }

    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Falha ao executar workflow: ${error}`);
    }

    return response.json();
  }

  // Utilitários
  static replaceVariables(template: string, variables: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => variables[key] || match);
  }

  static extractVariables(text: string): string[] {
    const matches = text.match(/\{\{(\w+)\}\}/g);
    return matches ? [...new Set(matches)] : [];
  }

  // ========== FUNÇÕES PARA MENU INTERATIVO ==========

  /**
   * Verifica se um lead pode iniciar/retomar um workflow
   * Regra: só inicia se lead.chatbot === true. Se chatbot === false ou lead não existe, não inicia.
   */
  static async canTriggerWorkflow(lead: Lead | null, idCliente: number): Promise<boolean> {
    if (!lead) {
      return false;
    }
    return lead.chatbot === true;
  }

  /**
   * Busca lead por telefone e id_cliente
   */
  static async getLeadByPhone(phone: string, idCliente: number): Promise<Lead | null> {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('telefone', phone.replace(/\D/g, ''))
        .eq('id_cliente', idCliente)
        .maybeSingle();

      if (error) {
        console.error('Erro ao buscar lead:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Erro ao buscar lead:', error);
      return null;
    }
  }

  /**
   * Atualiza status do lead quando menu é enviado
   */
  static async updateLeadStatusForMenu(leadId: number): Promise<void> {
    try {
      const agora = new Date().toISOString();
      const { error } = await supabase
        .from('leads')
        .update({
          status_conversa: 'em_atendimento',
          closer_momento_da_ultima_msg: agora,
        })
        .eq('id', leadId);

      if (error) {
        console.error('Erro ao atualizar status do lead:', error);
        throw error;
      }
    } catch (error) {
      console.error('Erro ao atualizar status do lead:', error);
      throw error;
    }
  }

  /**
   * Cria ou atualiza execução de workflow
   */
  static async createOrUpdateExecution(
    workflowId: string,
    leadId: number,
    status: WorkflowExecutionStatus,
    currentNodeId: string | null = null,
    context: Record<string, any> = {},
    waitingSince: string | null = null,
    expectedOptions: string[] | null = null
  ): Promise<WorkflowExecution> {
    try {
      // Verificar se já existe execução waiting_input para este lead+workflow
      const { data: existing } = await supabase
        .from('workflow_executions')
        .select('*')
        .eq('workflow_id', workflowId)
        .eq('lead_id', leadId)
        .eq('status', 'waiting_input')
        .maybeSingle();

      if (existing) {
        // Atualizar execução existente
        const { data, error } = await supabase
          .from('workflow_executions')
          .update({
            status,
            current_node_id: currentNodeId,
            context,
            waiting_since: waitingSince,
            expected_options: expectedOptions,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Criar nova execução
        const { data, error } = await supabase
          .from('workflow_executions')
          .insert({
            workflow_id: workflowId,
            lead_id: leadId,
            status,
            current_node_id: currentNodeId,
            context,
            waiting_since: waitingSince,
            expected_options: expectedOptions,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    } catch (error) {
      console.error('Erro ao criar/atualizar execução:', error);
      throw error;
    }
  }

  /**
   * Executa nó de menu interativo
   * Envia mensagem e pausa execução aguardando resposta
   */
  static async executeNodeMenu(
    node: { id: string; data: MenuNodeData },
    executionContext: {
      workflowId: string;
      leadId: number;
      phone: string;
      leadData: Lead;
    }
  ): Promise<WorkflowExecution> {
    try {
      const menuData = node.data;
      const { workflowId, leadId, phone, leadData } = executionContext;

      // Formatar mensagem com variáveis
      const formattedMessage = this.replaceVariables(menuData.message, {
        nome: leadData.nome || 'Cliente',
        telefone: phone,
        etapa: leadData.id_funil_etapa?.toString() || '',
        vendedor: leadData.nome_vendedor || '',
      });

      // Enviar mensagem via WhatsApp
      await sendMessage(phone, formattedMessage, leadData.id_cliente);

      // Extrair opções válidas (IDs numéricos)
      const expectedOptions = menuData.options.map(opt => opt.id);

      // Criar/atualizar execução com status waiting_input
      const execution = await this.createOrUpdateExecution(
        workflowId,
        leadId,
        'waiting_input',
        node.id,
        { ...executionContext, menuNodeId: node.id },
        new Date().toISOString(),
        expectedOptions
      );

      // Atualizar status do lead
      await this.updateLeadStatusForMenu(leadId);

      // Registrar log do menu
      await supabase
        .from('workflow_menu_logs')
        .insert({
          execution_id: execution.id,
          lead_id: leadId,
          menu_sent_at: new Date().toISOString(),
          is_valid_response: false,
        });

      return execution;
    } catch (error) {
      console.error('Erro ao executar menu:', error);
      throw error;
    }
  }

  /**
   * Retoma workflow após resposta do usuário
   */
  static async resumeWorkflow(
    executionId: string,
    userInput: string
  ): Promise<{ execution: WorkflowExecution; nextNodeId: string | null }> {
    try {
      // Buscar execução
      const { data: execution, error: execError } = await supabase
        .from('workflow_executions')
        .select('*')
        .eq('id', executionId)
        .single();

      if (execError || !execution) {
        throw new Error('Execução não encontrada');
      }

      if (execution.status !== 'waiting_input') {
        throw new Error('Execução não está aguardando input');
      }

      // Normalizar input para comparação (remove espaços, caracteres especiais, lowercase)
      const normalizeInput = (input: string): string => {
        if (!input) return '';
        return input
          .trim()
          .toLowerCase()
          .replace(/\s+/g, '') // Remove todos os espaços
          .replace(/\n/g, '') // Remove quebras de linha
          .replace(/\r/g, '') // Remove carriage return
          .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove caracteres invisíveis
          .normalize('NFD') // Normaliza para remover acentos
          .replace(/[\u0300-\u036f]/g, ''); // Remove diacríticos
      };

      const normalizedInput = normalizeInput(userInput);
      const trimmedInput = userInput.trim();
      const asNumber = parseInt(trimmedInput, 10);

      // Verificar se input está nas opções esperadas (comparação normalizada)
      const expectedOptions = execution.expected_options || [];
      const normalizedExpectedOptions = expectedOptions.map(opt => normalizeInput(String(opt)));
      const isValidResponse = normalizedExpectedOptions.includes(normalizedInput) ||
        (!isNaN(asNumber) && asNumber >= 1 && asNumber <= expectedOptions.length);

      // Atualizar log do menu
      await supabase
        .from('workflow_menu_logs')
        .update({
          user_response: normalizedInput,
          option_chosen: isValidResponse ? normalizedInput : null,
          is_valid_response: isValidResponse,
        })
        .eq('execution_id', executionId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!isValidResponse) {
        // Resposta inválida - finalizar para evitar loop infinito de opções inválidas
        const { data: lead } = await supabase
          .from('leads')
          .select('telefone, id_cliente')
          .eq('id', execution.lead_id)
          .single();

        if (lead) {
          const errorMessage = `Opção inválida. Digite: ${expectedOptions.join(', ')}`;
          await sendMessage(lead.telefone || '', errorMessage, lead.id_cliente);
        }

        // Atualizar status para completed
        await supabase
          .from('workflow_executions')
          .update({
            status: 'completed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', executionId);

        // Retornar finalizado
        return { execution, nextNodeId: null };
      }

      // Resposta válida - continuar workflow
      // Buscar workflow e node para identificar próximo nó
      const { data: workflow } = await supabase
        .from('workflows')
        .select('*')
        .eq('id', execution.workflow_id)
        .single();

      if (!workflow) {
        throw new Error('Workflow não encontrado');
      }

      // Buscar node atual (menu)
      const currentNode = workflow.nodes.find(n => n.id === execution.current_node_id);
      if (!currentNode || currentNode.type !== 'menu') {
        throw new Error('Node de menu não encontrado');
      }

      const menuData = currentNode.data as MenuNodeData;
      
      // Buscar opção por ID normalizado ou número sequencial
      let selectedOption = menuData.options.find(opt => {
        const optionId = normalizeInput(String(opt.id || ''));
        return optionId === normalizedInput;
      });
      
      // Fallback: buscar por número sequencial
      if (!selectedOption && !isNaN(asNumber) && asNumber >= 1 && asNumber <= menuData.options.length) {
        selectedOption = menuData.options[asNumber - 1];
      }

      // Encontrar próximo node baseado na opção escolhida
      let nextNodeId: string | null = null;
      if (selectedOption?.nextNodeId) {
        nextNodeId = selectedOption.nextNodeId;
      } else {
        // Buscar edge conectado ao handle da opção
        const edge = workflow.edges.find(
          e => e.source === currentNode.id && e.sourceHandle === `option-${normalizedInput}`
        );
        nextNodeId = edge?.target || null;
      }

      // Atualizar execução para running
      const { data: updatedExecution, error: updateError } = await supabase
        .from('workflow_executions')
        .update({
          status: 'running',
          current_node_id: nextNodeId,
          context: {
            ...execution.context,
            selectedOption: normalizedInput,
            optionLabel: selectedOption?.label,
            resposta_menu: normalizedInput,
            mensagem_usuario: normalizedInput, // Salvar mensagem do usuário para nó de condição
            lastOutput: normalizedInput, // Manter para compatibilidade
          },
          waiting_since: null,
          expected_options: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', executionId)
        .select()
        .single();

      if (updateError) throw updateError;

      return { execution: updatedExecution, nextNodeId };
    } catch (error) {
      console.error('Erro ao retomar workflow:', error);
      throw error;
    }
  }

  /**
   * Busca execução waiting_input para um lead
   */
  static async getWaitingExecution(leadId: number, workflowId?: string): Promise<WorkflowExecution | null> {
    try {
      let query = supabase
        .from('workflow_executions')
        .select('*')
        .eq('lead_id', leadId)
        .eq('status', 'waiting_input');

      if (workflowId) {
        query = query.eq('workflow_id', workflowId);
      }

      const { data, error } = await query.maybeSingle();

      if (error) {
        console.error('Erro ao buscar execução:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Erro ao buscar execução:', error);
      return null;
    }
  }

  // ========== FUNÇÕES PARA NÓ CONDICIONAL (IF) ==========

  /** Tipo da condição avaliada (estrutura completa com fieldType/fieldKey; IfNodeData é simplificado) */
  static evaluateCondition(
    condition: {
      fieldType?: 'lead_field' | string;
      fieldKey?: string;
      operator: string;
      value: any;
      valueType?: 'string' | 'number' | 'boolean';
    },
    lead: Lead | null,
    executionContext: Record<string, any>
  ): boolean {
    const { fieldType, fieldKey, operator, value, valueType } = condition;

    let actualValue: any;

    if (fieldType === 'lead_field') {
      actualValue = lead ? (lead as any)[fieldKey] : undefined;
    } else {
      actualValue = executionContext ? executionContext[fieldKey] : undefined;
    }

    const castValue = (val: any) => {
      if (val === null || val === undefined) return val;
      switch (valueType) {
        case 'number':
          return Number(val);
        case 'boolean':
          if (typeof val === 'boolean') return val;
          if (typeof val === 'string') {
            return val.toLowerCase() === 'true';
          }
          return Boolean(val);
        case 'string':
        default:
          return String(val);
      }
    };

    const left = castValue(actualValue);
    const right = castValue(value);

    switch (operator) {
      case 'equals':
        return left === right;
      case 'not_equals':
        return left !== right;
      case 'greater_than':
        return Number(left) > Number(right);
      case 'less_than':
        return Number(left) < Number(right);
      case 'contains':
        if (left === null || left === undefined) return false;
        return String(left).toLowerCase().includes(String(right).toLowerCase());
      case 'exists':
        return actualValue !== null && actualValue !== undefined && actualValue !== '';
      case 'is_empty':
        return actualValue === null || actualValue === undefined || actualValue === '';
      default:
        return false;
    }
  }

  static getNextNodeForCondition(
    nodeId: string,
    conditionResult: boolean,
    edges: WorkflowEdge[]
  ): string | null {
    const handleId = conditionResult ? 'true' : 'false';

    const edge = edges.find(
      (e) => e.source === nodeId && e.sourceHandle === handleId
    );

    return edge?.target || null;
  }

  // ========== FUNÇÕES DE LOGGING E DEBUG ==========

  /**
   * Obtém o id_cliente do usuário logado
   */
  private static async getCurrentClientId(): Promise<number | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const idCliente = user.user_metadata?.id_cliente ||
        user.user_metadata?.raw_user_meta_data?.id_cliente;
      return idCliente ? Number(idCliente) : null;
    } catch (error) {
      console.error('Erro ao obter id_cliente:', error);
      return null;
    }
  }

  /**
   * Sanitiza dados sensíveis antes de logar (mascara telefones, etc)
   */
  private static sanitizeData(data: any): any {
    if (!data || typeof data !== 'object') return data;

    const sanitized = { ...data };

    // Mascarar telefones
    if (sanitized.phone || sanitized.telefone) {
      const phone = sanitized.phone || sanitized.telefone;
      if (typeof phone === 'string' && phone.length > 4) {
        const masked = phone.slice(0, 2) + '****' + phone.slice(-2);
        if (sanitized.phone) sanitized.phone = masked;
        if (sanitized.telefone) sanitized.telefone = masked;
      }
    }

    // Mascarar telefones em objetos aninhados
    if (sanitized.leadData?.telefone) {
      const phone = sanitized.leadData.telefone;
      if (typeof phone === 'string' && phone.length > 4) {
        sanitized.leadData.telefone = phone.slice(0, 2) + '****' + phone.slice(-2);
      }
    }

    return sanitized;
  }

  /**
   * Registra o início de uma execução de workflow
   */
  static async logWorkflowStart(
    workflowId: string,
    leadId: number | null,
    executionId: string
  ): Promise<void> {
    try {
      const idCliente = await this.getCurrentClientId();
      if (!idCliente) {
        void 0;
        return;
      }

      await supabase.from('workflow_logs').insert({
        workflow_id: workflowId,
        execution_id: executionId,
        lead_id: leadId,
        node_id: 'workflow_start',
        node_type: 'workflow',
        status: 'started',
        input_data: { workflow_id: workflowId, lead_id: leadId },
        id_cliente: idCliente,
      });
    } catch (error) {
      // Log não deve bloquear execução - apenas logar erro
      console.error('Erro ao logar início do workflow:', error);
    }
  }

  /**
   * Registra a entrada em um node (antes de executar)
   */
  static async logNodeExecution(
    executionId: string,
    nodeId: string,
    nodeType: string,
    inputData: any
  ): Promise<void> {
    try {
      const idCliente = await this.getCurrentClientId();
      if (!idCliente) return;

      const sanitized = this.sanitizeData(inputData);

      await supabase.from('workflow_logs').insert({
        execution_id: executionId,
        node_id: nodeId,
        node_type: nodeType,
        status: 'started',
        input_data: sanitized,
        id_cliente: idCliente,
      });
    } catch (error) {
      console.error('Erro ao logar execução do node:', error);
    }
  }

  /**
   * Registra a conclusão de um node (após executar com sucesso)
   */
  static async logNodeCompletion(
    executionId: string,
    nodeId: string,
    outputData: any,
    executionTimeMs: number
  ): Promise<void> {
    try {
      const idCliente = await this.getCurrentClientId();
      if (!idCliente) return;

      const sanitized = this.sanitizeData(outputData);

      await supabase.from('workflow_logs').insert({
        execution_id: executionId,
        node_id: nodeId,
        status: 'completed',
        output_data: sanitized,
        execution_time_ms: executionTimeMs,
        id_cliente: idCliente,
      });
    } catch (error) {
      console.error('Erro ao logar conclusão do node:', error);
    }
  }

  /**
   * Registra um erro durante a execução
   */
  static async logError(
    executionId: string,
    nodeId: string,
    errorMessage: string,
    context?: any
  ): Promise<void> {
    try {
      const idCliente = await this.getCurrentClientId();
      if (!idCliente) return;

      const sanitized = this.sanitizeData(context || {});

      await supabase.from('workflow_logs').insert({
        execution_id: executionId,
        node_id: nodeId,
        status: 'error',
        error_message: errorMessage,
        output_data: sanitized,
        id_cliente: idCliente,
      });
    } catch (error) {
      console.error('Erro ao logar erro do workflow:', error);
    }
  }

  /**
   * Registra que um node está aguardando input (ex: menu interativo)
   */
  static async logNodeWaiting(
    executionId: string,
    nodeId: string,
    waitReason: string,
    context?: any
  ): Promise<void> {
    try {
      const idCliente = await this.getCurrentClientId();
      if (!idCliente) return;

      const sanitized = this.sanitizeData(context || {});

      await supabase.from('workflow_logs').insert({
        execution_id: executionId,
        node_id: nodeId,
        status: 'waiting',
        input_data: { wait_reason: waitReason, ...sanitized },
        id_cliente: idCliente,
      });
    } catch (error) {
      console.error('Erro ao logar espera do node:', error);
    }
  }

  /**
   * Busca logs de um workflow com filtros opcionais
   */
  static async getWorkflowLogs(
    workflowId: string,
    filters?: {
      startDate?: Date;
      endDate?: Date;
      status?: string;
      leadId?: number;
      executionId?: string;
    }
  ): Promise<any[]> {
    try {
      const idCliente = await this.getCurrentClientId();
      if (!idCliente) return [];

      let query = supabase
        .from('workflow_logs')
        .select('*')
        .eq('workflow_id', workflowId)
        .eq('id_cliente', idCliente)
        .order('created_at', { ascending: false });

      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate.toISOString());
      }
      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate.toISOString());
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.leadId) {
        query = query.eq('lead_id', filters.leadId);
      }
      if (filters?.executionId) {
        query = query.eq('execution_id', filters.executionId);
      }

      const { data, error } = await query.limit(1000);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar logs do workflow:', error);
      return [];
    }
  }

  /**
   * Recupera o trace completo de uma execução específica
   */
  static async getExecutionTrace(executionId: string): Promise<any[]> {
    try {
      const idCliente = await this.getCurrentClientId();
      if (!idCliente) return [];

      const { data, error } = await supabase
        .from('workflow_logs')
        .select('*')
        .eq('execution_id', executionId)
        .eq('id_cliente', idCliente)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar trace da execução:', error);
      return [];
    }
  }
}