/**
 * Serviço para processar mensagens recebidas e integrar com workflows
 * Este serviço deve ser chamado quando uma mensagem é recebida via webhook
 */

import { supabase } from '@/lib/supabase';
import { WorkflowService } from './workflowService';
import { Lead } from '@/types/global';
import { IfNodeData, WorkflowEdge } from '@/types/workflow';

interface MessageReceivedData {
  phone: string;
  /** Pode vir como string ou objeto JSON (ex: { text, conversation }) do webhook */
  message: string | { text?: string; conversation?: string };
  idCliente: number;
  instanceId?: string;
  timestamp?: string;
  fromMe?: boolean; // Indica se a mensagem foi enviada pelo próprio sistema
}

/**
 * Processa mensagem recebida e verifica se deve iniciar/retomar workflow
 * Esta função deve ser chamada quando uma mensagem é recebida via webhook
 */
export async function processReceivedMessage(data: MessageReceivedData): Promise<void> {
  try {
    const { phone, message, idCliente, fromMe } = data;

    // Ignorar mensagens enviadas pelo próprio sistema para evitar loop infinito
    if (fromMe === true) {
      void 0;
      return;
    }

    // Normalizar message: pode vir como objeto JSON {"text":"...","contextInfo":{}} ou string
    const messageText = typeof message === 'string'
      ? message
      : (message as { text?: string; conversation?: string })?.text
        || (message as { text?: string; conversation?: string })?.conversation
        || String(message ?? '');

    // Normalizar telefone
    const normalizedPhone = phone.replace(/\D/g, '');

    // Buscar lead por telefone
    const lead = await WorkflowService.getLeadByPhone(normalizedPhone, idCliente);

    // Buscar workflow ativo para este cliente
    const { data: workflows } = await supabase
      .from('workflows')
      .select('*')
      .eq('id_cliente', idCliente)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1);

    const activeWorkflow = workflows?.[0];

    // Verificar se a mensagem corresponde a um gatilho do workflow ativo
    let isTriggerMatch = false;
    if (activeWorkflow && messageText) {
      const startNode = activeWorkflow.nodes.find(
        (n: any) => n.type === 'inicio' || n.type === 'trigger'
      );
      const triggerConfig = activeWorkflow.trigger_config || startNode?.data || {};

      if (triggerConfig.keyword) {
        const keyword = String(triggerConfig.keyword).toLowerCase();
        if (messageText.toLowerCase().includes(keyword)) {
          isTriggerMatch = true;
          void 0;
        }
      }
    }

    // Verificar se existe execução waiting_input para este lead
    const waitingExecution = await WorkflowService.getWaitingExecution(
      lead?.id || 0,
      undefined
    );

    if (waitingExecution) {
      // Verificar se a execução waiting expirou (mais de 1 hora parada)
      const isExpired = waitingExecution.updated_at &&
        (Date.now() - new Date(waitingExecution.updated_at).getTime() > 60 * 60 * 1000);

      if (isExpired || isTriggerMatch) {
        void 0;
        // Finalizar a execução antiga
        await supabase
          .from('workflow_executions')
          .update({
            status: 'completed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', waitingExecution.id);
        // Continuar para iniciar nova execução
      } else {
        // Retomar workflow existente
        void 0;
        await handleWorkflowResume(waitingExecution.id, messageText, idCliente);
        return;
      }
    }

    // [TESTE] Regra "Ativo" comentada - religar depois dos testes
    // Verificar workflow_ativo do lead
    // if (lead && lead.workflow_ativo === false) {
    //   console.log('[Workflow] Workflow pausado para este lead - ignorando');
    //   return;
    // }

    if (!activeWorkflow) {
      void 0;
      return;
    }

    const workflow = activeWorkflow;

    // Validar tipo de gatilho: Webhook Externo só dispara via webhook, nunca por mensagem do usuário
    const startNode = workflow.nodes?.find(
      (n: any) => n.type === 'inicio' || n.type === 'trigger'
    );
    const triggerConfigForValidation = workflow.trigger_config || startNode?.data || {};
    const triggerType = startNode?.data?.triggerType ?? workflow.trigger_config?.triggerType ?? 'message_received';

    if (triggerType === 'webhook_external') {
      void 0;
      return;
    }

    // Gatilho "Receber Mensagem": só inicia se lead atende requisitos (chatbot === true)
    const canTrigger = await WorkflowService.canTriggerWorkflow(lead, idCliente);
    if (!canTrigger) {
      void 0;
      return;
    }

    // Se há palavra-chave configurada, a mensagem deve conter a palavra-chave
    if (triggerConfigForValidation.keyword && !isTriggerMatch) {
      void 0;
      return;
    }

    // Criar lead se não existir
    let finalLead: Lead;
    if (!lead) {
      void 0;
      const { data: newLead, error: createError } = await supabase
        .from('leads')
        .insert({
          telefone: normalizedPhone,
          nome: `Contato ${normalizedPhone.slice(-4)}`,
          id_cliente: idCliente,
          status_conversa: 'em_atendimento',
          status: 'Leads',
          origem: 'WhatsApp',
          closer_momento_da_ultima_msg: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError || !newLead) {
        console.error('[Workflow] Erro ao criar lead:', createError);
        return;
      }

      finalLead = newLead;
    } else {
      // Atualizar lead existente
      const agora = new Date().toISOString();
      const { data: updatedLead, error: updateError } = await supabase
        .from('leads')
        .update({
          status_conversa: 'em_atendimento',
          closer_momento_da_ultima_msg: agora,
        })
        .eq('id', lead.id)
        .select()
        .single();

      if (updateError || !updatedLead) {
        console.error('[Workflow] Erro ao atualizar lead:', updateError);
        return;
      }

      finalLead = updatedLead;
    }

    // Se o workflow tem node IA, reativa atendimento_ia no lead
    const hasIaNode = workflow.nodes?.some((n: any) => n.type === 'ia');
    if (hasIaNode && finalLead) {
      await supabase
        .from('leads')
        .update({ atendimento_ia: true, atendimento_humano: false })
        .eq('id', finalLead.id);
    }

    // Iniciar workflow
    void 0;
    await startWorkflow(workflow, finalLead, normalizedPhone);
  } catch (error) {
    console.error('[Workflow] Erro ao processar mensagem recebida:', error);
  }
}

/**
 * Inicia execução de workflow
 */
async function startWorkflow(workflow: any, lead: Lead, phone: string): Promise<void> {
  try {
    // Encontrar nó inicial
    const startNode = workflow.nodes.find(
      (n: any) => n.type === 'inicio' || n.type === 'trigger'
    );

    if (!startNode) {
      console.error('[Workflow] Workflow sem nó inicial');
      return;
    }

    // Criar execução inicial
    const execution = await WorkflowService.createOrUpdateExecution(
      workflow.id,
      lead.id,
      'running',
      startNode.id,
      { leadId: lead.id, phone, leadData: lead },
      null,
      null
    );

    // Log: início do workflow
    await WorkflowService.logWorkflowStart(workflow.id, lead.id, execution.id);

    // Executar workflow a partir do nó inicial
    await executeWorkflowFromNode(
      workflow,
      execution,
      startNode.id,
      { leadId: lead.id, phone, leadData: lead }
    );
  } catch (error: any) {
    console.error('[Workflow] Erro ao iniciar workflow:', error);
    // Log de erro
    const execution = await supabase
      .from('workflow_executions')
      .select('id')
      .eq('workflow_id', workflow.id)
      .eq('lead_id', lead.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (execution.data?.id) {
      await WorkflowService.logError(
        execution.data.id,
        'workflow_start',
        error.message || 'Erro ao iniciar workflow',
        { error: String(error), stack: error.stack }
      );
    }
  }
}

/**
 * Executa workflow a partir de um nó específico
 */
export async function executeWorkflowFromNode(
  workflow: any,
  execution: any,
  nodeId: string,
  context: { leadId: number; phone: string; leadData: Lead }
): Promise<void> {
  try {
    let currentNodeId: string | null = nodeId;
    const executedNodes = new Set<string>();

    while (currentNodeId) {
      // Prevenir loops
      if (executedNodes.has(currentNodeId)) {
        console.error('[Workflow] Loop detectado no workflow');
        break;
      }
      executedNodes.add(currentNodeId);

      const node = workflow.nodes.find((n: any) => n.id === currentNodeId);
      if (!node) break;

      const startTime = Date.now();

      // Log: entrada no node
      await WorkflowService.logNodeExecution(
        execution.id,
        node.id,
        node.type,
        {
          leadId: context.leadId,
          phone: context.phone,
          context: execution.context || {},
        }
      );

      try {
        // Executar nó baseado no tipo
        if (node.type === 'menu') {
          // Executar menu e pausar
          await WorkflowService.executeNodeMenu(node, {
            workflowId: workflow.id,
            leadId: context.leadId,
            phone: context.phone,
            leadData: context.leadData,
          });

          // Log: menu aguardando input
          await WorkflowService.logNodeWaiting(
            execution.id,
            node.id,
            'Aguardando resposta do usuário',
            { leadId: context.leadId }
          );

          // Salvar opção escolhida no contexto quando menu for respondido
          // (isso será feito no resumeWorkflow)

          // Menu pausa execução - sair do loop
          return;
        } else if (node.type === 'message') {
          // Executar mensagem
          const messageData = node.data as {
            message: string;
            messageType?: string;
            variables?: string[];
            fileUrl?: string;
            audioUrl?: string;
            fileName?: string;
            fileType?: string;
          };

          const { sendMessage, sendAudioMessage, sendImageMessage, sendDocumentMessage } = await import('./messageService');

          // Verificar se é mensagem com arquivo
          if (messageData.messageType === 'audio' && (messageData.audioUrl || messageData.fileUrl)) {
            const audioUrl = messageData.audioUrl || messageData.fileUrl || '';
            const caption = messageData.message
              ? WorkflowService.replaceVariables(messageData.message, {
                nome: context.leadData.nome || 'Cliente',
                telefone: context.phone,
                etapa: context.leadData.id_funil_etapa?.toString() || '',
                vendedor: context.leadData.nome_vendedor || '',
              })
              : '';
            await sendAudioMessage(context.phone, audioUrl, caption);
          } else if (
            (messageData.messageType === 'image' || messageData.fileType === 'image') &&
            messageData.fileUrl
          ) {
            const caption = messageData.message
              ? WorkflowService.replaceVariables(messageData.message, {
                nome: context.leadData.nome || 'Cliente',
                telefone: context.phone,
                etapa: context.leadData.id_funil_etapa?.toString() || '',
                vendedor: context.leadData.nome_vendedor || '',
              })
              : undefined;
            await sendImageMessage(context.phone, messageData.fileUrl, caption);
          } else if (messageData.messageType === 'file' && messageData.fileUrl) {
            const caption = messageData.message
              ? WorkflowService.replaceVariables(messageData.message, {
                nome: context.leadData.nome || 'Cliente',
                telefone: context.phone,
                etapa: context.leadData.id_funil_etapa?.toString() || '',
                vendedor: context.leadData.nome_vendedor || '',
              })
              : '';
            const fileName = messageData.fileName || 'arquivo.pdf';
            await sendDocumentMessage(context.phone, messageData.fileUrl, fileName, caption);
          } else {
            // Mensagem de texto normal
            const formattedMessage = WorkflowService.replaceVariables(messageData.message || '', {
              nome: context.leadData.nome || 'Cliente',
              telefone: context.phone,
              etapa: context.leadData.id_funil_etapa?.toString() || '',
              vendedor: context.leadData.nome_vendedor || '',
            });
            await sendMessage(context.phone, formattedMessage, context.leadData.id_cliente);
          }

          // Salvar mensagem enviada no contexto como lastOutput
          let messageOutput = `Mensagem ${messageData.messageType || 'text'} enviada`;
          if (messageData.messageType === 'text') {
            messageOutput = WorkflowService.replaceVariables(messageData.message || '', {
              nome: context.leadData.nome || 'Cliente',
              telefone: context.phone,
              etapa: context.leadData.id_funil_etapa?.toString() || '',
              vendedor: context.leadData.nome_vendedor || '',
            });
          }

          const updatedContext = {
            ...execution.context,
            lastOutput: messageOutput,
          };

          // Log: mensagem enviada com sucesso
          const executionTime = Date.now() - startTime;
          await WorkflowService.logNodeCompletion(
            execution.id,
            node.id,
            {
              message_sent: true,
              message_type: messageData.messageType || 'text',
              has_file: !!(messageData.fileUrl || messageData.audioUrl),
            },
            executionTime
          );

          // Atualizar contexto com lastOutput
          await supabase
            .from('workflow_executions')
            .update({
              context: updatedContext,
              updated_at: new Date().toISOString(),
            })
            .eq('id', execution.id);
        } else if (node.type === 'condition') {
          // IF Node simplificado - compara mensagem do usuário
          const ifData = node.data as IfNodeData;
          const mensagemUsuario =
            execution.context?.lastMessage ||
            execution.context?.mensagem_usuario ||
            '';

          // Comparar mensagem do usuário com valor configurado
          let result = false;
          const compareValue = String(ifData.value || '').toLowerCase();
          const mensagemUsuarioStr = String(mensagemUsuario || '').toLowerCase();

          switch (ifData.operator) {
            case 'equals':
              result = mensagemUsuarioStr === compareValue;
              break;
            case 'contains':
              result = mensagemUsuarioStr.includes(compareValue);
              break;
            case 'starts_with':
              result = mensagemUsuarioStr.startsWith(compareValue);
              break;
            case 'ends_with':
              result = mensagemUsuarioStr.endsWith(compareValue);
              break;
          }

          // Salvar resultado no contexto
          const updatedContext = {
            ...execution.context,
            lastOutput: String(result), // Converter para string para uso em outros nodes se necessário
          };

          const nextId = WorkflowService.getNextNodeForCondition(
            node.id,
            result,
            (workflow.edges || []) as WorkflowEdge[]
          );

          // Log: condição avaliada
          const executionTime = Date.now() - startTime;
          await WorkflowService.logNodeCompletion(
            execution.id,
            node.id,
            { condition_result: result, mensagem_usuario: mensagemUsuario, next_node: nextId || null },
            executionTime
          );

          if (!nextId) {
            // Sem saída configurada para o resultado: considerar como fim silencioso
            await supabase
              .from('workflow_executions')
              .update({
                status: 'completed',
                updated_at: new Date().toISOString(),
              })
              .eq('id', execution.id);
            return;
          }

          currentNodeId = nextId;

          await supabase
            .from('workflow_executions')
            .update({
              current_node_id: currentNodeId,
              context: updatedContext,
              updated_at: new Date().toISOString(),
            })
            .eq('id', execution.id);

          // Ir para o próximo loop já com o novo nó
          continue;
        } else if (node.type === 'delay') {
          // Delay Node - aguardar tempo determinado
          const delayData = node.data as { duration: number; unit: 'seconds' | 'minutes' | 'hours' };
          let durationSeconds = 0;
          switch (delayData.unit) {
            case 'seconds':
              durationSeconds = delayData.duration;
              break;
            case 'minutes':
              durationSeconds = delayData.duration * 60;
              break;
            case 'hours':
              durationSeconds = delayData.duration * 3600;
              break;
          }

          const waitingUntil = new Date(Date.now() + durationSeconds * 1000).toISOString();

          // Atualizar execução para waiting_timeout
          await supabase
            .from('workflow_executions')
            .update({
              status: 'waiting_timeout',
              waiting_until: waitingUntil,
              updated_at: new Date().toISOString(),
            })
            .eq('id', execution.id);

          // Log: delay iniciado
          const unitLabel = delayData.unit === 'hours' ? 'horas' : delayData.unit === 'minutes' ? 'minutos' : 'segundos';
          await WorkflowService.logNodeWaiting(
            execution.id,
            node.id,
            `Aguardando ${delayData.duration} ${unitLabel}`,
            { waiting_until: waitingUntil, duration: delayData.duration, unit: delayData.unit }
          );

          // Delay pausa execução - sair do loop
          // O sistema deve verificar waiting_until periodicamente e retomar quando chegar o tempo
          return;
        } else if (node.type === 'ia') {
          // IA Node - chamar n8n que processa a IA e retorna a resposta
          const iaData = node.data as { systemPrompt: string };

          try {
            // Buscar instance_id do cliente na tabela clientes_info
            const { data: clienteInfo } = await supabase
              .from('clientes_info')
              .select('instance_id, instance_name')
              .eq('id', context.leadData.id_cliente)
              .single();

            const instanceId = clienteInfo?.instance_id || clienteInfo?.instance_name || '';

            // Buscar histórico de mensagens (últimas 50, ordem crescente)
            const telefoneLimpo = context.phone.replace(/\D/g, '');
            const telefoneComSufixo = `${telefoneLimpo}@s.whatsapp.net`;

            const { data: historicoRaw } = await supabase
              .from('agente_conversacional_whatsapp')
              .select('mensagem, tipo, timestamp')
              .eq('id_cliente', context.leadData.id_cliente)
              .or(`telefone_id.eq.${telefoneLimpo},telefone_id.eq.${telefoneComSufixo}`)
              .order('timestamp', { ascending: true })
              .limit(50);

            const historico = (historicoRaw || []).map((msg: any) => ({
              role: msg.tipo ? 'assistant' : 'user',
              content: msg.mensagem,
            }));

            // Verifica palavra de encerramento antes de chamar a IA
            const palavraEncerramento = (iaData as any).palavraEncerramento?.trim().toLowerCase();
            const mensagemUsuario = (execution.context?.mensagem_usuario || execution.context?.lastMessage || '').trim().toLowerCase();

            if (palavraEncerramento && mensagemUsuario.includes(palavraEncerramento)) {
              await supabase
                .from('leads')
                .update({ atendimento_humano: true, atendimento_ia: false })
                .eq('id', context.leadId);
              await supabase
                .from('workflow_executions')
                .update({
                  status: 'completed',
                  updated_at: new Date().toISOString(),
                })
                .eq('id', execution.id);
              return; // para o fluxo, não chama a IA
            }

            // Montar payload conforme contrato com n8n
            const payload = {
              execution_id: execution.id,
              workflow_id: execution.workflow_id || workflow.id,
              node_id: node.id,
              lead_id: context.leadId,
              telefone: context.phone,
              id_cliente: context.leadData.id_cliente,
              instance_id: instanceId,
              config: {
                system_prompt: iaData.systemPrompt || '',
                modo_continuo: (iaData as any).modoContinuo !== false,
                palavra_encerramento: (iaData as any).palavraEncerramento || '',
              },
              context: {
                nome: context.leadData.nome || 'Cliente',
                mensagem_usuario: execution.context?.mensagem_usuario || execution.context?.lastMessage || '',
                dados_lead: context.leadData,
                historico,
              },
            };

            // Chamar n8n com timeout de 30 segundos
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);

            let aiResponse: string;

            try {
              const httpResponse = await fetch(
                'https://webhook.dev.usesmartcrm.com/webhook/workflow-ai',
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload),
                  signal: controller.signal,
                }
              );

              clearTimeout(timeoutId);

              const result = await httpResponse.json();

              if (!result.success) {
                throw new Error(result.error || 'n8n retornou success: false');
              }

              aiResponse = result.response;
            } catch (fetchError: any) {
              clearTimeout(timeoutId);
              if (fetchError.name === 'AbortError') {
                throw new Error('Timeout: IA não respondeu em 30 segundos');
              }
              throw fetchError;
            }

            // Enviar resposta para o lead via WhatsApp
            const { sendMessage } = await import('./messageService');
            await sendMessage(context.phone, aiResponse, context.leadData.id_cliente);

            // Modo não-contínuo: encerra após uma resposta
            if ((iaData as any).modoContinuo === false) {
              await supabase
                .from('leads')
                .update({ atendimento_ia: false })
                .eq('id', context.leadId);
            }

            // Atualizar contexto com a resposta da IA
            const updatedContext = {
              ...execution.context,
              lastOutput: aiResponse,
            };

            // Encontrar próximo nó (primeiro tenta handle 'response', depois qualquer edge)
            const nextEdge =
              workflow.edges.find((e: any) => e.source === node.id && e.sourceHandle === 'response') ||
              workflow.edges.find((e: any) => e.source === node.id);
            const nextNodeId = nextEdge?.target || null;

            // Log: IA executada com sucesso
            const executionTime = Date.now() - startTime;
            await WorkflowService.logNodeCompletion(
              execution.id,
              node.id,
              {
                ai_response_sent: true,
                response_length: aiResponse.length,
                next_node: nextNodeId,
              },
              executionTime
            );

            if (!nextNodeId) {
              await supabase
                .from('workflow_executions')
                .update({
                  status: 'completed',
                  context: updatedContext,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', execution.id);
              return;
            }

            currentNodeId = nextNodeId;
            await supabase
              .from('workflow_executions')
              .update({
                current_node_id: currentNodeId,
                context: updatedContext,
                updated_at: new Date().toISOString(),
              })
              .eq('id', execution.id);

            continue;
          } catch (error: any) {
            await WorkflowService.logError(
              execution.id,
              node.id,
              `Erro na IA: ${error.message}`,
              { error: String(error) }
            );
            break;
          }

        } else if (node.type === 'end') {
          // Log: fim do workflow
          const executionTime = Date.now() - startTime;
          await WorkflowService.logNodeCompletion(
            execution.id,
            node.id,
            { workflow_completed: true },
            executionTime
          );

          // Finalizar workflow
          await supabase
            .from('workflow_executions')
            .update({
              status: 'completed',
              updated_at: new Date().toISOString(),
            })
            .eq('id', execution.id);

          // Atualizar status do lead: fechar conversa e desativar chatbot
          await supabase
            .from('leads')
            .update({
              status_conversa: 'fechada',
              closer_momento_da_ultima_msg: new Date().toISOString(),
              chatbot: false,
            })
            .eq('id', context.leadId);

          return;
        }

        if (node.type === 'transfer_department') {
          const transferData = node.data as { id_departamento?: number | string | null };
          const raw = transferData.id_departamento;
          const idDepartamento =
            raw != null && raw !== ''
              ? (() => {
                  const n = Number(raw);
                  return Number.isNaN(n) ? null : n;
                })()
              : null;

          if (idDepartamento != null) {
            const numero = context.phone.replace(/\D/g, '');
            const targetId = context.leadData?.id || context.leadId || null;

            let query = supabase
              .from('leads')
              .update({ id_departamento: idDepartamento, updated_at: new Date().toISOString() })
              .eq('id_cliente', context.leadData.id_cliente);

            if (targetId != null) {
              query = query.eq('id', targetId);
            } else {
              query = query.or(`telefone.eq.${numero},telefone.eq.+${numero}`);
            }

            await query;
          }
          const executionTime = Date.now() - startTime;
          await WorkflowService.logNodeCompletion(
            execution.id,
            node.id,
            { transfer_department: idDepartamento },
            executionTime
          );
          const nextEdge = workflow.edges.find((e: any) => e.source === currentNodeId);
          currentNodeId = nextEdge?.target || null;
          if (currentNodeId) {
            await supabase
              .from('workflow_executions')
              .update({
                current_node_id: currentNodeId,
                status: 'running',
                updated_at: new Date().toISOString(),
              })
              .eq('id', execution.id);
          }
          continue;
        }

        // Log: node genérico completado (para nodes não tratados acima)
        const executionTime = Date.now() - startTime;
        await WorkflowService.logNodeCompletion(
          execution.id,
          node.id,
          { node_type: node.type, completed: true },
          executionTime
        );

        // Encontrar próximo nó
        const nextEdge = workflow.edges.find((e: any) => e.source === currentNodeId);
        currentNodeId = nextEdge?.target || null;

        // Atualizar execução com próximo nó
        if (currentNodeId) {
          await supabase
            .from('workflow_executions')
            .update({
              current_node_id: currentNodeId,
              updated_at: new Date().toISOString(),
            })
            .eq('id', execution.id);
        }
      } catch (nodeError: any) {
        // Log: erro no node
        const executionTime = Date.now() - startTime;
        await WorkflowService.logError(
          execution.id,
          node?.id || 'unknown',
          nodeError.message || 'Erro ao executar node',
          {
            error: String(nodeError),
            stack: nodeError.stack,
            node_type: node?.type,
            context: execution.context || {},
          }
        );
        // Não re-throw para não interromper o workflow - apenas logar e continuar
        console.error(`[Workflow] Erro no node ${node?.id}:`, nodeError);
        break; // Sair do loop em caso de erro crítico
      }
    }
  } catch (error: any) {
    console.error('[Workflow] Erro ao executar workflow:', error);
    // Log: erro geral
    if (execution?.id) {
      await WorkflowService.logError(
        execution.id,
        'workflow_execution',
        error.message || 'Erro ao executar workflow',
        { error: String(error), stack: error.stack }
      );
    }
  }
}

/**
 * Retoma workflow após resposta do usuário
 */
async function handleWorkflowResume(
  executionId: string,
  userInput: string,
  idCliente: number
): Promise<void> {
  try {
    // Retomar workflow
    const { execution, nextNodeId } = await WorkflowService.resumeWorkflow(
      executionId,
      userInput
    );

    if (!nextNodeId) {
      // Resposta inválida ou workflow finalizado
      return;
    }

    // Buscar workflow
    const { data: workflow } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', execution.workflow_id)
      .single();

    if (!workflow) {
      console.error('[Workflow] Workflow não encontrado');
      return;
    }

    // Buscar lead
    const { data: lead } = await supabase
      .from('leads')
      .select('*')
      .eq('id', execution.lead_id)
      .single();

    if (!lead) {
      console.error('[Workflow] Lead não encontrado');
      return;
    }

    // Continuar execução a partir do próximo nó
    await executeWorkflowFromNode(
      workflow,
      execution,
      nextNodeId,
      {
        leadId: lead.id,
        phone: lead.telefone || '',
        leadData: lead,
      }
    );
  } catch (error) {
    console.error('[Workflow] Erro ao retomar workflow:', error);
  }
}
