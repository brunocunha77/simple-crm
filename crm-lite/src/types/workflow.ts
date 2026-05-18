// src/types/workflow.ts

export type NodeType = 'inicio' | 'message' | 'end' | 'ia' | 'randomizador' | 'menu' | 'condition' | 'delay' | 'transfer_department' | 'webhook';

export interface Position {
  x: number;
  y: number;
}

export interface WorkflowNode {
  id: string;
  type: NodeType;
  position: Position;
  data: InicioNodeData | MessageNodeData | EndNodeData | IaNodeData | RandomizadorNodeData | MenuNodeData | IfNodeData | DelayNodeData | TransferDepartmentNodeData | WebhookNodeData;
}

// Nó Início (substitui Trigger) - Simplificado
export interface InicioNodeData {
  label: string;
  triggerType?: 'message_received' | 'webhook_external'; // Apenas 2 tipos
  webhookPath?: string; // Path do webhook (quando triggerType = 'webhook_external')
  keyword?: string; // Palavra-chave para iniciar workflow (quando triggerType = 'message_received')
  config?: Record<string, any>;
}

// Mantido para compatibilidade (deprecated)
export interface TriggerNodeData {
  label: string;
  triggerType: 'new_lead' | 'message_received' | 'status_changed';
  config?: Record<string, any>;
}

export interface MessageNodeData {
  label: string;
  messageType: 'text' | 'audio' | 'video' | 'image' | 'document';
  message?: string; // Texto da mensagem ou legenda
  variables?: string[];
  // Campos específicos por tipo
  audioUrl?: string; // audio: URL do arquivo
  audioFile?: string; // audio: arquivo uploadado (path no storage)
  videoUrl?: string; // video: URL do arquivo
  videoFile?: string; // video: arquivo uploadado
  imageUrl?: string; // image: URL do arquivo
  imageFile?: string; // image: arquivo uploadado
  documentUrl?: string; // document: URL do arquivo
  documentFile?: string; // document: arquivo uploadado
  fileName?: string; // document: nome do arquivo
  filePath?: string; // path no storage para deletar depois
}

export interface EndNodeData {
  label: string;
}

// Nó IA
export interface IaNodeData {
  label: string;
  systemPrompt: string; // Prompt do sistema
  modoContinuo?: boolean;        // padrão: true — IA continua respondendo após primeira mensagem
  palavraEncerramento?: string;  // ex: "humano", "sair" — transfere para humano quando detectada
}

// Nó Randomizador
export interface RandomizadorNodeData {
  label: string;
  splits: Array<{
    id: string;
    label: string;
    percentage: number;
  }>;
}

// Nó Condicional (IF) - Simplificado para comparar mensagem do usuário
export interface IfNodeData {
  type?: 'condition';
  operator: 'contains' | 'equals' | 'starts_with' | 'ends_with';
  value: string; // Valor para comparar
}

// Nó Menu Interativo - Simplificado (sem timeout)
export interface MenuNodeData {
  label: string;
  message: string;
  options: Array<{
    id: string; // Número da opção (1, 2, 3...)
    label: string; // Texto da opção
    nextNodeId?: string; // ID do nó de destino (quando definido na configuração)
  }>;
  variables?: string[];
}

// Nó Delay (Timeout/Aguardar)
export interface DelayNodeData {
  label: string;
  duration: number; // Duração numérica
  unit: 'seconds' | 'minutes' | 'hours'; // Unidade de tempo
}

// Nó Transferir Departamento
export interface TransferDepartmentNodeData {
  label: string;
  id_departamento: number | null; // ID do departamento de destino
}

// Tipo genérico para dados de nó
export type NodeData =
  | InicioNodeData
  | MessageNodeData
  | EndNodeData
  | IaNodeData
  | RandomizadorNodeData
  | MenuNodeData
  | IfNodeData
  | DelayNodeData
  | TransferDepartmentNodeData;

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

export interface Workflow {
  id?: string;
  id_cliente: number;
  nome: string;
  descricao?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  is_active: boolean;
  trigger_config?: any;
  created_at?: string;
  updated_at?: string;
}

// Payload para execução via n8n
export interface WorkflowExecutionPayload {
  workflowId: string;
  triggerData: {
    phone: string;
    nome?: string;
    leadId?: number;
    id_cliente: number;
    [key: string]: any;
  };
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

// Status de execução de workflow
export type WorkflowExecutionStatus = 'running' | 'waiting_input' | 'completed' | 'timeout' | 'waiting_timeout';

// Execução de workflow (tabela workflow_executions)
export interface WorkflowExecution {
  id: string;
  workflow_id: string;
  lead_id: number;
  status: WorkflowExecutionStatus;
  current_node_id: string | null;
  context: Record<string, any>; // Inclui lastOutput para IF node
  waiting_since: string | null;
  expected_options: string[] | null;
  waiting_until: string | null; // Para delay node
  created_at: string;
  updated_at: string;
}

// Log de menu interativo (tabela workflow_menu_logs)
export interface WorkflowMenuLog {
  id: string;
  execution_id: string;
  lead_id: number;
  menu_sent_at: string;
  user_response: string | null;
  option_chosen: string | null;
  is_valid_response: boolean;
  created_at: string;
}
