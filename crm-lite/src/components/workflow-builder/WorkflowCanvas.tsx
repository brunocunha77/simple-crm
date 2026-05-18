import { useCallback, useState, useRef, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  Node,
  NodeTypes,
  ReactFlowProvider,
  XYPosition,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { InicioNode, MessageNode, EndNode, IaNode, RandomizadorNode, MenuNode, IfNode, DelayNode, TransferDepartmentNode } from './nodes';
import { NodeSidebar } from './NodeSidebar';
import { NodeConfigDrawer } from './NodeConfigDrawer';
import { WorkflowDebugger } from './WorkflowDebugger';
import { WorkflowNode, WorkflowEdge, NodeData } from '@/types/workflow';
import { toast } from 'sonner';
import { 
  Save, 
  Power, 
  Edit2, 
  Download, 
  Copy, 
  Trash2,
  LayoutGrid,
  ScrollText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const nodeTypes: NodeTypes = {
  inicio: InicioNode,
  message: MessageNode,
  end: EndNode,
  ia: IaNode,
  randomizador: RandomizadorNode,
  menu: MenuNode,
  condition: IfNode,
  delay: DelayNode,
  transfer_department: TransferDepartmentNode,
  // Mantido para compatibilidade
  trigger: InicioNode,
};

interface WorkflowCanvasProps {
  initialNodes?: WorkflowNode[];
  initialEdges?: WorkflowEdge[];
  workflowName?: string;
  workflowId?: string;
  onSave?: (nodes: WorkflowNode[], edges: WorkflowEdge[], name: string) => void;
  onExecute?: (nodes: WorkflowNode[], edges: WorkflowEdge[]) => void;
  isSaving?: boolean;
}

function WorkflowCanvasInner({
  initialNodes = [],
  initialEdges = [],
  workflowName = 'Novo Workflow',
  workflowId,
  onSave,
  onExecute,
  isSaving = false,
}: WorkflowCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges as Edge[]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [debuggerOpen, setDebuggerOpen] = useState(false);
  const [name, setName] = useState(workflowName);
  const [isEditingName, setIsEditingName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const [isActive, setIsActive] = useState(false);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // Focar input quando entrar em modo de edição do nome
  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  const onConnect = useCallback(
    (connection: Connection) => {
      // Permite múltiplas conexões de saída (sucesso e erro)
      const edge = {
        ...connection,
        animated: true,
        style: { 
          stroke: connection.sourceHandle === 'error' ? '#ef4444' : '#3b82f6',
          strokeWidth: 2,
        },
        label: connection.sourceHandle === 'error' ? 'Erro' : 'Sucesso',
      };
      setEdges((eds) => addEdge(edge, eds));

      // Edge-based snap: Alinhar node target se estiver próximo (tolerância 30px)
      if (connection.target) {
        const sourceNode = nodes.find(n => n.id === connection.source);
        const targetNode = nodes.find(n => n.id === connection.target);
        
        if (sourceNode && targetNode) {
          const SNAP_TOLERANCE = 30;
          const GRID_SIZE = 20;
          const VERTICAL_SPACING = 150;
          
          // Verificar alinhamento horizontal
          const horizontalDiff = Math.abs(targetNode.position.x - sourceNode.position.x);
          if (horizontalDiff < SNAP_TOLERANCE) {
            const snappedX = Math.round(sourceNode.position.x / GRID_SIZE) * GRID_SIZE;
            setNodes((nds) =>
              nds.map((n) =>
                n.id === connection.target
                  ? { ...n, position: { ...n.position, x: snappedX } }
                  : n
              )
            );
          }
          
          // Verificar alinhamento vertical (apenas se não houver offset horizontal significativo)
          if (horizontalDiff < 10) {
            const verticalDiff = Math.abs(targetNode.position.y - sourceNode.position.y);
            if (verticalDiff > VERTICAL_SPACING && verticalDiff < VERTICAL_SPACING + SNAP_TOLERANCE) {
              // Manter espaçamento vertical padrão
              const snappedY = sourceNode.position.y + VERTICAL_SPACING;
              const finalY = Math.round(snappedY / GRID_SIZE) * GRID_SIZE;
              setNodes((nds) =>
                nds.map((n) =>
                  n.id === connection.target
                    ? { ...n, position: { ...n.position, y: finalY } }
                    : n
                )
              );
            }
          }
        }
      }
    },
    [setEdges, setNodes, nodes]
  );

  const handleNodeConfigure = useCallback((node: Node) => {
    setSelectedEdge(null);
    setSelectedNode(node);
    setDrawerOpen(true);
    
    // Marca o nó como selecionado no React Flow
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        selected: n.id === node.id,
      }))
    );
  }, [setNodes]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    // Sempre resetar e abrir o drawer quando clicar no node
    handleNodeConfigure(node);
  }, [handleNodeConfigure]);

  const onEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    setSelectedEdge(edge);
    setSelectedNode(null);
    setDrawerOpen(false);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdge(null);
    setDrawerOpen(false);
    // Desmarca todos os nós
    setNodes((nds) => nds.map((n) => ({ ...n, selected: false })));
  }, [setNodes]);

  // Deletar aresta selecionada com Delete/Backspace (apenas arestas, não nós)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Verifica se o foco está em um input, textarea ou elemento contenteditable
      const activeElement = document.activeElement;
      const isInputFocused = 
        activeElement?.tagName === 'INPUT' ||
        activeElement?.tagName === 'TEXTAREA' ||
        activeElement?.getAttribute('contenteditable') === 'true' ||
        activeElement?.closest('[contenteditable="true"]') !== null;

      // Se estiver digitando em um formulário, não deleta
      if (isInputFocused) {
        return;
      }

      // Deletar apenas aresta selecionada (não nós)
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedEdge) {
        event.preventDefault();
        setEdges((eds) => eds.filter(e => e.id !== selectedEdge.id));
        setSelectedEdge(null);
        toast.success('Conexão removida');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedEdge, setEdges]);

  /**
   * Calcula a próxima posição inteligente para um novo node
   */
  const getNextPosition = useCallback((nodes: Node[]): XYPosition => {
    const GRID_SIZE = 20;
    const VERTICAL_SPACING = 150;
    const HORIZONTAL_SPACING = 250;
    const MAX_X = 1200;
    const DEFAULT_X = 100;
    const DEFAULT_Y = 100;

    // Se não há nodes, usar posição padrão
    if (nodes.length === 0) {
      return { x: DEFAULT_X, y: DEFAULT_Y };
    }

    // Encontrar o node mais à direita (maior X)
    const lastNode = nodes.reduce((prev, current) => 
      (prev.position.x > current.position.x) ? prev : current
    );

    // Calcular nova posição à direita do último node
    let newX = lastNode.position.x + HORIZONTAL_SPACING;
    let newY = lastNode.position.y;

    // Se ultrapassar limite horizontal, criar nova linha
    if (newX > MAX_X) {
      newX = DEFAULT_X;
      newY = lastNode.position.y + VERTICAL_SPACING;
    }

    // Snap to grid
    newX = Math.round(newX / GRID_SIZE) * GRID_SIZE;
    newY = Math.round(newY / GRID_SIZE) * GRID_SIZE;

    return { x: newX, y: newY };
  }, []);

  const onAddNode = useCallback((type: string) => {
    // Verifica se já existe nó início
    if (type === 'inicio' || type === 'trigger') {
      const existingInicio = nodes.find(n => n.type === 'inicio' || n.type === 'trigger');
      if (existingInicio) {
        toast.error('Só pode haver um nó de início por workflow');
        return;
      }
    }

    // Calcular posição inteligente
    const position = getNextPosition(nodes);

    const newNode: Node = {
      id: `${type}-${Date.now()}`,
      type: type === 'trigger' ? 'inicio' : type,
      position,
      data: getDefaultData(type),
    };
    setNodes((nds) => [...nds, newNode]);
    
    const nodeLabels: Record<string, string> = {
      inicio: 'Início',
      trigger: 'Início',
      message: 'Mensagem',
      menu: 'Menu Interativo',
      condition: 'Condição',
      end: 'Fim',
      ia: 'IA',
      randomizador: 'Randomizador',
    };
    toast.success(`${nodeLabels[type] || type} adicionado`);
  }, [nodes, setNodes, getNextPosition]);

  const onUpdateNode = useCallback((nodeId: string, newData: Partial<NodeData>) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, ...newData } } : node
      )
    );
    if (selectedNode?.id === nodeId) {
      setSelectedNode((prev) => 
        prev ? { ...prev, data: { ...prev.data, ...newData } } : null
      );
    }
  }, [setNodes, selectedNode]);

  const onDeleteNode = useCallback(async () => {
    const nodeToDelete = selectedNode || nodes.find(n => n.selected);
    
    if (!nodeToDelete) {
      // Tenta pegar o nó selecionado do estado do React Flow
      const selectedNodes = nodes.filter(n => n.selected);
      if (selectedNodes.length > 0) {
        const node = selectedNodes[0];
        
        // Limpar arquivo do storage se existir
        if (node.data?.filePath) {
          const { storageService } = await import('@/services/storageService');
          await storageService.deleteFile(node.data.filePath);
        }
        
        setNodes((nds) => nds.filter(n => n.id !== node.id));
        setEdges((eds) => eds.filter(e => e.source !== node.id && e.target !== node.id));
        setSelectedNode(null);
        setSelectedEdge(null);
        setDrawerOpen(false);
        toast.success('Nó removido');
      }
      return;
    }
    
    // Limpar arquivo do storage se existir
    if (nodeToDelete.data?.filePath) {
      try {
        const { storageService } = await import('@/services/storageService');
        await storageService.deleteFile(nodeToDelete.data.filePath);
      } catch (error) {
        console.error('Erro ao deletar arquivo do storage:', error);
        // Continuar mesmo se falhar - não bloquear deleção do node
      }
    }
    
    setNodes((nds) => nds.filter(n => n.id !== nodeToDelete.id));
    setEdges((eds) => eds.filter(e => e.source !== nodeToDelete.id && e.target !== nodeToDelete.id));
    setSelectedNode(null);
    setSelectedEdge(null);
    setDrawerOpen(false);
    toast.success('Nó removido');
  }, [selectedNode, nodes, setNodes, setEdges]);

  const onDeleteEdge = useCallback(() => {
    if (!selectedEdge) return;
    
    setEdges((eds) => eds.filter(e => e.id !== selectedEdge.id));
    setSelectedEdge(null);
    toast.success('Conexão removida');
  }, [selectedEdge, setEdges]);

  const handleSave = useCallback(() => {
    // Validações
    const hasInicio = nodes.some(n => n.type === 'inicio' || n.type === 'trigger');
    const hasEnd = nodes.some(n => n.type === 'end');
    
    if (!hasInicio) {
      toast.error('O workflow precisa de um nó de início');
      return;
    }
    if (!hasEnd) {
      toast.error('O workflow precisa de um nó de fim');
      return;
    }

    onSave?.(nodes as WorkflowNode[], edges as WorkflowEdge[], name);
  }, [nodes, edges, name, onSave]);

  const handleExecute = useCallback(() => {
    onExecute?.(nodes as WorkflowNode[], edges as WorkflowEdge[]);
  }, [nodes, edges, onExecute]);

  const handleDuplicate = useCallback(() => {
    if (!selectedNode) return;
    
    // Usar posicionamento inteligente para duplicata
    const position = getNextPosition(nodes);
    
    const newNode: Node = {
      ...selectedNode,
      id: `${selectedNode.type}-${Date.now()}`,
      position,
    };
    setNodes((nds) => [...nds, newNode]);
    toast.success('Nó duplicado');
  }, [selectedNode, setNodes, nodes, getNextPosition]);

  /**
   * Auto-layout: Organiza nodes em hierarquia vertical (top-down)
   */
  const handleAutoLayout = useCallback(() => {
    if (nodes.length === 0) {
      toast.info('Adicione nodes para organizar');
      return;
    }

    const HORIZONTAL_SPACING = 200;
    const VERTICAL_SPACING = 150;
    const START_X = 100;
    const START_Y = 100;
    const GRID_SIZE = 20;

    // Encontrar node inicial (inicio ou trigger)
    const startNode = nodes.find(n => n.type === 'inicio' || n.type === 'trigger');
    
    if (!startNode) {
      toast.error('Workflow precisa de um nó de início para auto-layout');
      return;
    }

    // Criar mapa de posições organizadas
    const nodePositions = new Map<string, XYPosition>();
    const visited = new Set<string>();
    
    // Função recursiva para organizar nodes em hierarquia
    const organizeNode = (nodeId: string, x: number, y: number) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      // Snap to grid
      const snappedX = Math.round(x / GRID_SIZE) * GRID_SIZE;
      const snappedY = Math.round(y / GRID_SIZE) * GRID_SIZE;
      
      nodePositions.set(nodeId, { x: snappedX, y: snappedY });

      // Encontrar nodes conectados (filhos)
      const connectedEdges = edges.filter(e => e.source === nodeId);
      
      // Organizar filhos horizontalmente se houver múltiplos
      if (connectedEdges.length > 0) {
        const childX = snappedX;
        let childY = snappedY + VERTICAL_SPACING;
        
        connectedEdges.forEach((edge, index) => {
          const childNode = nodes.find(n => n.id === edge.target);
          if (childNode && !visited.has(childNode.id)) {
            // Se houver múltiplos filhos, distribuir horizontalmente
            const offsetX = connectedEdges.length > 1 
              ? (index - (connectedEdges.length - 1) / 2) * HORIZONTAL_SPACING
              : 0;
            
            organizeNode(childNode.id, childX + offsetX, childY);
          }
        });
      }
    };

    // Começar do node inicial
    organizeNode(startNode.id, START_X, START_Y);

    // Para nodes não conectados, posicionar em nova coluna
    const unvisitedNodes = nodes.filter(n => !visited.has(n.id));
    let orphanX = START_X + HORIZONTAL_SPACING * 2;
    let orphanY = START_Y;

    unvisitedNodes.forEach((node) => {
      const snappedX = Math.round(orphanX / GRID_SIZE) * GRID_SIZE;
      const snappedY = Math.round(orphanY / GRID_SIZE) * GRID_SIZE;
      
      nodePositions.set(node.id, { x: snappedX, y: snappedY });
      orphanY += VERTICAL_SPACING;
    });

    // Aplicar novas posições
    setNodes((nds) =>
      nds.map((node) => {
        const newPos = nodePositions.get(node.id);
        return newPos ? { ...node, position: newPos } : node;
      })
    );

    toast.success('Layout organizado automaticamente');
  }, [nodes, edges, setNodes]);

  const handleDownload = useCallback(() => {
    const workflowData = {
      name,
      nodes,
      edges,
    };
    const blob = new Blob([JSON.stringify(workflowData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name || 'workflow'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Workflow exportado');
  }, [name, nodes, edges]);

  return (
    <div className="flex h-full w-full bg-background" ref={reactFlowWrapper}>
      <NodeSidebar onAddNode={onAddNode} />
      
      <div className="flex-1 relative flex flex-col">
        {/* Toolbar Superior */}
        <div className="h-16 border-b border-border bg-card/95 backdrop-blur flex items-center justify-between px-4 z-10">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsActive(!isActive)}
              className={cn(
                "h-9 w-9",
                isActive && "bg-primary/10 text-primary"
              )}
            >
              <Power className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSave}
              disabled={isSaving}
              className="h-9 w-9"
            >
              <Save className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsEditingName(true)}
              className="h-9 w-9"
              title="Editar nome do workflow"
            >
              <Edit2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDownload}
              className="h-9 w-9"
            >
              <Download className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDuplicate}
              disabled={!selectedNode}
              className="h-9 w-9"
              title="Duplicar nó"
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleAutoLayout}
              className="h-9 w-9"
              title="Organizar layout automaticamente"
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            {workflowId && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDebuggerOpen(true)}
                className="h-9 w-9"
                title="Logs e Debug"
              >
                <ScrollText className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (selectedEdge) {
                  onDeleteEdge();
                } else {
                  onDeleteNode();
                }
              }}
              disabled={!selectedNode && !selectedEdge && !nodes.some(n => n.selected)}
              className="h-9 w-9 text-destructive hover:text-destructive"
              title={selectedEdge ? 'Remover conexão' : (selectedNode || nodes.some(n => n.selected)) ? 'Remover nó' : ''}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center">
            {isEditingName ? (
              <input
                ref={nameInputRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => {
                  const trimmed = name.trim();
                  if (!trimmed) {
                    // Reverte para o nome anterior se ficar vazio
                    setName(workflowName);
                    setIsEditingName(false);
                    return;
                  }
                  // Se mudou, salva usando a mesma lógica do botão Salvar
                  if (trimmed !== workflowName) {
                    handleSave();
                  }
                  setIsEditingName(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const trimmed = name.trim();
                    if (!trimmed) {
                      setName(workflowName);
                      setIsEditingName(false);
                      return;
                    }
                    // Dispara salvamento via handleSave (botão salvar usa a mesma função)
                    if (trimmed !== workflowName) {
                      handleSave();
                    }
                    setIsEditingName(false);
                  }
                  if (e.key === 'Escape') {
                    setName(workflowName);
                    setIsEditingName(false);
                  }
                }}
                className="bg-transparent border-b-2 border-[#9b87f5] text-lg font-semibold text-foreground outline-none w-full max-w-md text-center"
              />
            ) : (
              <h2
                className="text-lg font-semibold text-foreground cursor-pointer hover:text-[#9b87f5] transition-colors"
                onClick={() => setIsEditingName(true)}
                title="Clique para editar o nome do workflow"
              >
                {name}
              </h2>
            )}
            <p className="text-xs text-muted-foreground">Workflow Builder</p>
          </div>

          <div className="w-[120px]" /> {/* Spacer para centralizar título */}
        </div>

        {/* Canvas */}
        <div className="flex-1 relative">
          <style>{`
            .workflow-canvas-background {
              background-color: #f8fafc !important;
              background-image: radial-gradient(circle, #cbd5e1 1px, transparent 1px) !important;
              background-size: 20px 20px !important;
            }
            /* Esconder watermark do React Flow */
            .react-flow__attribution {
              display: none !important;
            }
            /* Cursor roxo customizado - Crosshair */
            .react-flow__pane {
              cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cline x1='12' y1='2' x2='12' y2='8' stroke='%239b87f5' stroke-width='2'/%3E%3Cline x1='12' y1='16' x2='12' y2='22' stroke='%239b87f5' stroke-width='2'/%3E%3Cline x1='2' y1='12' x2='8' y2='12' stroke='%239b87f5' stroke-width='2'/%3E%3Cline x1='16' y1='12' x2='22' y2='12' stroke='%239b87f5' stroke-width='2'/%3E%3Ccircle cx='12' cy='12' r='2' fill='%239b87f5'/%3E%3C/svg%3E") 12 12, crosshair !important;
            }
            .react-flow__renderer {
              cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cline x1='12' y1='2' x2='12' y2='8' stroke='%239b87f5' stroke-width='2'/%3E%3Cline x1='12' y1='16' x2='12' y2='22' stroke='%239b87f5' stroke-width='2'/%3E%3Cline x1='2' y1='12' x2='8' y2='12' stroke='%239b87f5' stroke-width='2'/%3E%3Cline x1='16' y1='12' x2='22' y2='12' stroke='%239b87f5' stroke-width='2'/%3E%3Ccircle cx='12' cy='12' r='2' fill='%239b87f5'/%3E%3C/svg%3E") 12 12, crosshair !important;
            }
            /* Cursor roxo customizado - Grab */
            .react-flow__node {
              cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath d='M9 5h2v2H9zm0 4h2v2H9zm0 4h2v2H9zm4-8h2v2h-2zm0 4h2v2h-2zm0 4h2v2h-2z' fill='%239b87f5'/%3E%3C/svg%3E") 12 12, grab !important;
            }
            .react-flow__node:hover {
              cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath d='M9 5h2v2H9zm0 4h2v2H9zm0 4h2v2H9zm4-8h2v2h-2zm0 4h2v2h-2zm0 4h2v2h-2z' fill='%239b87f5'/%3E%3C/svg%3E") 12 12, grab !important;
            }
            /* Cursor roxo customizado - Grabbing */
            .react-flow__node:active {
              cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath d='M9 5h2v2H9zm0 4h2v2H9zm0 4h2v2H9zm4-8h2v2h-2zm0 4h2v2h-2zm0 4h2v2h-2z' fill='%237a6ae0'/%3E%3C/svg%3E") 12 12, grabbing !important;
            }
            /* Cursor roxo customizado - Handle (conectar) */
            .react-flow__handle {
              cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='8' stroke='%239b87f5' stroke-width='2' fill='none'/%3E%3Ccircle cx='12' cy='12' r='3' fill='%239b87f5'/%3E%3C/svg%3E") 12 12, crosshair !important;
            }
            .react-flow__handle:hover {
              cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='8' stroke='%239b87f5' stroke-width='2' fill='none'/%3E%3Ccircle cx='12' cy='12' r='3' fill='%239b87f5'/%3E%3C/svg%3E") 12 12, crosshair !important;
            }
          `}</style>
          <ReactFlow
            nodes={nodes.map(node => ({
              ...node,
              selected: selectedNode?.id === node.id || node.selected,
            }))}
            edges={edges.map(edge => ({
              ...edge,
              selected: selectedEdge?.id === edge.id,
              style: {
                ...edge.style,
                strokeWidth: selectedEdge?.id === edge.id ? 4 : 2,
                stroke: selectedEdge?.id === edge.id 
                  ? '#9b87f5' 
                  : (edge.sourceHandle === 'error' ? '#ef4444' : '#3b82f6'),
              },
            }))}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            snapToGrid={true}
            snapGrid={[20, 20]}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            defaultEdgeOptions={{ type: 'smoothstep', animated: true }}
            className="workflow-canvas-background"
            deleteKeyCode={null}
            proOptions={{ hideAttribution: true }}
          >
            <Background 
              variant="dots" 
              gap={20} 
              size={1} 
              color="#cbd5e1"
              style={{ opacity: 0.4 }}
            />
            <Controls className="bg-card text-foreground border-border shadow-lg" />
          </ReactFlow>
        </div>
      </div>
      
      <NodeConfigDrawer
        selectedNode={selectedNode}
        open={drawerOpen}
        onUpdate={onUpdateNode}
        onClose={() => {
          setSelectedNode(null);
          setDrawerOpen(false);
        }}
        workflowId={workflowId}
      />

      {workflowId && (
        <WorkflowDebugger
          workflowId={workflowId}
          open={debuggerOpen}
          onClose={() => setDebuggerOpen(false)}
        />
      )}
    </div>
  );
}

function getDefaultData(type: string): NodeData {
  switch (type) {
    case 'inicio':
    case 'trigger':
      return { 
        label: 'Início', 
        triggerType: 'new_lead',
        stats: { sucessos: 0, alertas: 0, erros: 0 }
      };
    case 'message':
      return { 
        label: 'Mensagem', 
        messageType: 'text',
        message: '', 
        useTemplate: false, 
        variables: [] 
      };
    case 'condition':
      return {
        operator: 'contains',
        value: '',
      };
    case 'menu':
      return {
        label: 'Menu Interativo',
        message: 'Olá! Escolha uma opção:\n1 - Suporte\n2 - Vendas\n3 - Outros',
        options: [
          { id: '1', label: 'Suporte', nextNodeId: undefined },
          { id: '2', label: 'Vendas', nextNodeId: undefined },
          { id: '3', label: 'Outros', nextNodeId: undefined },
        ],
        timeout_minutes: 30,
        timeout_action: 'encerrar',
        timeout_message: '',
        variables: [],
      };
    case 'end':
      return { label: 'Fim' };
    case 'ia':
      return { label: 'IA', systemPrompt: '' };
    case 'randomizador':
      return { 
        label: 'Randomizador', 
        splits: [
          { id: '1', label: 'Caminho A', percentage: 50 },
          { id: '2', label: 'Caminho B', percentage: 50 },
        ]
      };
    case 'delay':
      return { label: 'Aguardar', duration: 0, unit: 'seconds' };
    case 'transfer_department':
      return { label: 'Transferir departamento', id_departamento: null };
    default:
      return { label: '' };
  }
}

export function WorkflowCanvas(props: WorkflowCanvasProps) {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
