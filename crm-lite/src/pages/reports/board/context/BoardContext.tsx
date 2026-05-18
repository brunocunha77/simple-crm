import React, { createContext, useContext, ReactNode, useEffect } from 'react';
import { toast } from "sonner";
import { useRef, useState } from "react";
import { Stage, LeadWithStage } from "../types";
import { Lead } from "@/types/global";
import { initialStages } from "../boardData";
import { LeadsService } from "@/services/leadsService";
import { clientesService } from "@/services/clientesService";
import { FunisService } from "@/services/funisService";
import { useAuth } from "@/contexts/auth";
import { supabase } from "@/lib/supabase";

interface BoardContextType {
  selectedLeadId: number | null;
  setSelectedLeadId: (id: number | null) => void;
  leadsList: LeadWithStage[];
  loading: boolean;
  draggingLeadId: number | null;
  setDraggingLeadId: React.Dispatch<React.SetStateAction<number | null>>;
  draggingStageId: string | null;
  setDraggingStageId: React.Dispatch<React.SetStateAction<string | null>>;
  editingStageId: string | null;
  setEditingStageId: React.Dispatch<React.SetStateAction<string | null>>;
  isAddingStage: boolean;
  setIsAddingStage: React.Dispatch<React.SetStateAction<boolean>>;
  stages: Stage[];
  setStages: React.Dispatch<React.SetStateAction<Stage[]>>;
  newStageName: string;
  setNewStageName: React.Dispatch<React.SetStateAction<string>>;
  newStageColor: string;
  setNewStageColor: React.Dispatch<React.SetStateAction<string>>;
  selectedLead: LeadWithStage | undefined;
  leadsByStage: Record<string, LeadWithStage[]>;
  stageRefs: React.MutableRefObject<{ [key: string]: HTMLDivElement | null }>;
  moveLead: (leadId: number, newStage: string) => void;
  markAsWon: (id: number, e?: React.MouseEvent) => void;
  markAsLost: (id: number, e?: React.MouseEvent) => void;
  confirmLeadLost: (id: number, observation: string) => Promise<void>;
  desfazerVenda: (id: number, e?: React.MouseEvent) => Promise<void>;
  markAsInProgress: (id: number, stage: string) => void;
  handleDragStart: (e: React.DragEvent<HTMLDivElement>, leadId: number) => void;
  handleDragEnd: (e: React.DragEvent<HTMLDivElement>) => void;
  handleDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  handleDrop: (e: React.DragEvent<HTMLDivElement>, stageId: string) => void;
  handleStageDragStart: (e: React.DragEvent<HTMLDivElement>, stageId: string) => void;
  handleSaveStage: () => void;
  handleEditStage: (stage: Stage) => void;
  handleAddStage: () => void;
  handleCancelEdit: () => void;
  handleDeleteStage: () => void;
  showLostLeadModal: boolean;
  setShowLostLeadModal: React.Dispatch<React.SetStateAction<boolean>>;
  leadToMarkAsLost: number | null;
  setLeadToMarkAsLost: React.Dispatch<React.SetStateAction<number | null>>;
  clientId: number | null;
  funilId: number | null;
}

const BoardContext = createContext<BoardContextType | undefined>(undefined);

export const BoardProvider: React.FC<{ children: ReactNode; funilId?: number }> = ({ children, funilId }) => {
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [leadsList, setLeadsList] = useState<LeadWithStage[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [draggingLeadId, setDraggingLeadId] = useState<number | null>(null);
  const [draggingStageId, setDraggingStageId] = useState<string | null>(null);
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [isAddingStage, setIsAddingStage] = useState(false);
  const [stages, setStages] = useState<Stage[]>(initialStages);
  const [newStageName, setNewStageName] = useState("");
  const [newStageColor, setNewStageColor] = useState("#4F46E5");
  const [clientId, setClientId] = useState<number | null>(null);
  const [clientLoading, setClientLoading] = useState<boolean>(true);
  const [showLostLeadModal, setShowLostLeadModal] = useState(false);
  const [leadToMarkAsLost, setLeadToMarkAsLost] = useState<number | null>(null);
  
  const stageRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const { user } = useAuth();
  
  // Função para verificar e criar a tabela de estágios se necessário
  const ensureEstagiosTable = async () => {
    if (!clientId) return;
    
    try {
      // Verificar se a tabela estagios existe
      const { error } = await supabase
        .from('estagios')
        .select('id')
        .limit(1);

      // Se houver erro, pode ser que a tabela não exista ou não temos permissão
      if (error) {
        console.error('Erro ao verificar tabela estagios:', error);
        void 0;
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Erro ao verificar tabela estagios:', error);
      return false;
    }
  };

  // Função para salvar os estágios
  const saveStages = async (updatedStages: Stage[]) => {
    if (!clientId) return;
    
    try {
      // Verificar se podemos usar a tabela estagios
      const canUseTable = await ensureEstagiosTable();
      
      if (canUseTable) {
        // Salvar no banco de dados
        const { error } = await supabase
          .from('estagios')
          .upsert(
            updatedStages.map(stage => ({
              id: stage.id,
              nome: stage.name,
              cor: stage.color,
              id_cliente: clientId
            }))
          );

        if (error) {
          console.error('Erro ao salvar estágios no banco:', error);
          throw error;
        }
      } else {
        // Se não podemos usar a tabela, apenas armazenar localmente
        // e persistir no localStorage para manter entre recarregamentos
        localStorage.setItem(`stages_${clientId}`, JSON.stringify(updatedStages));
      }
    } catch (error) {
      console.error('Erro ao salvar estágios:', error);
      // Sempre armazenar localmente como fallback
      localStorage.setItem(`stages_${clientId}`, JSON.stringify(updatedStages));
    }
  };

  // Função para carregar os estágios
  const loadStages = async () => {
    if (!clientId) {
      void 0;
      return;
    }
    
    void 0;
    
    try {
      // Sempre usar os estágios iniciais fixos
      const fixedStages = [...initialStages];
      
      // Atualizar o estado e salvar
      setStages(fixedStages);
      
      // Embora estejamos usando estágios fixos, ainda salvamos para manter
      // a compatibilidade com o resto do código
      await saveStages(fixedStages);
      
    } catch (error) {
      console.error('Erro ao carregar estágios:', error);
      
      // Usar os estágios iniciais fixos como fallback
      setStages([...initialStages]);
    }
  };
  
  // Buscar o ID do cliente quando o usuário for carregado
  useEffect(() => {
    const fetchClientId = async () => {
      if (!user) {
        setClientLoading(false);
        return;
      }
      
      setClientLoading(true);
      try {
        void 0;
        
        // Se o usuário tem email, vamos tentar buscar por email primeiro
        let clienteInfo = null;
        if (user.email) {
          void 0;
          clienteInfo = await clientesService.getClienteByEmail(user.email);
        }
        
        // Se não encontrou pelo email, tenta pelo ID do usuário
        if (!clienteInfo && user.id_cliente) {
          void 0;
          clienteInfo = await clientesService.getClienteByIdCliente(user.id_cliente);
        }
        
        if (!clienteInfo) {
          console.error(`Nenhum cliente encontrado para o usuário ${user.id_cliente || 'desconhecido'}`);
          toast.error("Nenhum cliente encontrado para o usuário.");
          setClientLoading(false);
          return;
        }
        
        void 0;
        setClientId(clienteInfo.id);
        setClientLoading(false);
        
        // Carregar estágios e leads
        await loadStages();
        await fetchLeads(clienteInfo.id);
        
        // Por enquanto, não há subscription em tempo real implementada
        // TODO: Implementar subscription quando necessário
      } catch (err) {
        console.error('Erro ao buscar ID do cliente:', err);
        toast.error('Falha ao recuperar informações do cliente');
        setClientLoading(false);
      }
    };
    
    fetchClientId();
  }, [user]);
  
  // Função auxiliar para determinar o estágio com base no status
  const determineStage = (status: string): string => {
    void 0;
    
    if (!status) {
      void 0;
      return 'leads';
    }
    
    // Normalizar o status para minúsculas e sem acentos
    const normalizedStatus = status.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
    
    void 0;
    
    // Buscar nos estágios existentes primeiro
    const exactStage = stages.find(s => {
      const normalizedStageName = s.name.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
      return normalizedStageName === normalizedStatus;
    });
    
    if (exactStage) {
      void 0;
      return exactStage.id;
    }
    
    // Se não encontrou correspondência exata, usar a lógica padrão com mais variações
    let mappedStage = 'leads'; // padrão
    
    switch (normalizedStatus) {
      case 'leads':
      case 'lead':
      case 'novo':
      case 'novos':
        mappedStage = 'leads';
        break;
        
      case 'viu e nao respondeu':
      case 'viu-nao-respondeu':
      case 'viu e não respondeu':
      case 'visualizado':
      case 'visto':
        mappedStage = 'viu-nao-respondeu';
        break;
        
      case 'conversa em andamento':
      case 'conversa-em-andamento':
      case 'em andamento':
      case 'andamento':
      case 'conversando':
      case 'ativo':
        mappedStage = 'conversa-em-andamento';
        break;
        
      case 'parou de responder':
      case 'parou-de-responder':
      case 'nao responde':
      case 'não responde':
      case 'inativo':
      case 'sem resposta':
        mappedStage = 'parou-de-responder';
        break;
        
      case 'oportunidade':
      case 'oportunidades':
      case 'qualificado':
      case 'interessado':
        mappedStage = 'oportunidade';
        break;
        
      case 'ganho':
      case 'ganhos':
      case 'fechado':
      case 'vendido':
      case 'sucesso':
      case 'convertido':
        mappedStage = 'ganho';
        break;
        
      case 'perdido':
      case 'perdidos':
      case 'cancelado':
      case 'rejeitado':
      case 'nao interessado':
      case 'não interessado':
        mappedStage = 'perdido';
        break;
        
      default:
        void 0;
        mappedStage = 'leads';
    }
    
    void 0;
    return mappedStage;
  };
  
  // Função para buscar leads
  const fetchLeads = async (clientIdValue: number | null = clientId) => {
    if (!clientIdValue || !user) return;
    
    setLoading(true);
    try {
      void 0;
      const leads = await LeadsService.getLeadsByClientId(clientIdValue);
      void 0;
      
      // Mapear os leads para o formato do quadro
      const mappedLeads: LeadWithStage[] = leads.map(lead => {
        return {
          ...lead,
          stage: determineStage(lead.status)
        };
      });
      
      setLeadsList(mappedLeads);
    } catch (error) {
      console.error('Erro ao buscar leads:', error);
      toast.error('Erro ao carregar leads');
    } finally {
      setLoading(false);
    }
  };
  
  // Get selected lead
  const selectedLead = leadsList.find(lead => lead.id === selectedLeadId);
  
  // Group leads by stage
  const leadsByStage = stages.reduce((acc, stage) => {
    acc[stage.id] = leadsList.filter(lead => lead.stage === stage.id);
    return acc;
  }, {} as Record<string, LeadWithStage[]>);

  // Function to move a lead to another stage
  const moveLead = async (leadId: number, newStage: string) => {
    void 0;
    void 0;
    
    if (!user || !clientId) {
      void 0;
      return;
    }
    
    try {
      // Encontrar o estágio de destino para obter o nome
      const targetStage = stages.find(s => s.id === newStage);
      if (!targetStage) {
        console.error('moveLead - Estágio de destino não encontrado:', newStage);
        void 0;
        return;
      }

      void 0;
      void 0;

      // Verificar se a etapa é de ganho (verificando pelo nome ou status)
      const isEtapaDeGanho = targetStage.name.toLowerCase() === 'ganho' || 
                             targetStage.name.toLowerCase() === 'ganhos' ||
                             targetStage.name.toLowerCase() === 'venda realizada';

      // Se for etapa de ganho, usar moverLeadParaEtapa que já tem a lógica de venda realizada
      if (isEtapaDeGanho) {
        // Converter o stage ID (string) para número (ID da etapa no banco)
        const etapaId = parseInt(newStage, 10);
        if (isNaN(etapaId)) {
          console.error('moveLead - Não foi possível converter stage ID para número:', newStage);
          toast.error('Erro ao mover lead: ID de etapa inválido');
          return;
        }

        // Usar moverLeadParaEtapa que já atualiza venda_realizada, data_venda, etc.
        await LeadsService.moverLeadParaEtapa(leadId, etapaId);
        
        // Atualizar o estado local
        setLeadsList(currentLeads => {
          return currentLeads.map(lead => {
            if (lead.id === leadId) {
              return {
                ...lead,
                status: 'Ganho',
                stage: newStage,
                venda: true,
                venda_realizada: true,
                venda_perdida: false,
                data_venda: new Date().toISOString(),
                data_ultimo_status: new Date().toISOString()
              };
            }
            return lead;
          });
        });

        toast.success("Lead movido para etapa de ganho e marcado como venda realizada!");
        return;
      }

      // Encontrar o lead atual para comparação
      const currentLead = leadsList.find(lead => lead.id === leadId);
      void 0;

      // Atualizar o estado localmente primeiro para feedback instantâneo
      setLeadsList(currentLeads => {
        void 0;
        return currentLeads.map(lead => {
        if (lead.id === leadId) {
          void 0;
            return {
              ...lead,
              status: targetStage.name,
              stage: newStage,
              data_ultimo_status: new Date().toISOString()
            };
        }
        return lead;
        });
      });
      
      // Converter o stage ID (string) para número (ID da etapa no banco)
      const etapaId = parseInt(newStage, 10);
      if (!isNaN(etapaId)) {
        // Usar moverLeadParaEtapa para mover para a nova etapa
        await LeadsService.moverLeadParaEtapa(leadId, etapaId);
        toast.success("Lead movido com sucesso!");
      } else {
        // Fallback: usar updateLead se não conseguir converter o ID
        void 0;
        
        const updateResult = await LeadsService.updateLead(leadId, clientId, { 
          status: targetStage.name
        });
      
        if (updateResult) {
          void 0;
          toast.success("Lead movido com sucesso!");
        } else {
          console.error('moveLead - falha na atualização do banco de dados');
          toast.error('Erro ao atualizar lead no banco de dados');
          // Reverter a mudança local
          fetchLeads(clientId);
        }
      }
    } catch (error) {
      // Em caso de erro, reverter a mudança local
      console.error('moveLead - erro:', error);
      fetchLeads(clientId);
      console.error('Erro ao mover lead:', error);
      toast.error('Erro ao mover lead');
    }
  };

  // Functions to mark lead as won or lost
  const markAsWon = async (id: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!user || !clientId) return;
    
    try {
      // Usar o método do LeadsService para marcar como ganho
      const result = await LeadsService.marcarComoGanho(id, clientId);
      
      if (!result.success) {
        toast.error(result.error || 'Erro ao marcar como ganho.');
        return;
      }
      
      // Buscar os dados atualizados do lead para atualizar o estado local
      const { data: leadAtualizado, error: fetchError } = await supabase
        .from('leads')
        .select('*')
        .eq('id', id)
        .eq('id_cliente', clientId)
        .single();

      if (fetchError) {
        console.error('Erro ao buscar lead atualizado:', fetchError);
        // Mesmo com erro ao buscar, o lead foi atualizado no banco
        toast.success(`Lead movido para "${result.etapaNome}" e marcado como ganho!`);
        return;
      }
      
      // Se a atualização no banco foi bem-sucedida, atualizar o estado local
      setLeadsList(currentLeads => {
        return currentLeads.map(lead => {
          if (lead.id === id) {
            return {
              ...lead,
              ...leadAtualizado,
              stage: 'ganho'
            };
          }
          return lead;
        });
      });

      toast.success(`Lead movido para a etapa "${result.etapaNome}" e marcado como ganho!`);
    } catch (error) {
      console.error('Erro ao atualizar status do lead:', error);
      toast.error('Erro ao atualizar lead. Tente novamente.');
    }
  };
  
  const markAsLost = (id: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    // Abrir o modal para registrar a observação
    setLeadToMarkAsLost(id);
    setShowLostLeadModal(true);
  };

  // Confirmar a marcação do lead como perdido após fornecer a observação
  const confirmLeadLost = async (id: number, observation: string): Promise<void> => {
    if (!user || !clientId) return;
    
    try {
      // Usar o novo método do LeadsService para atualizar status de venda como perdido
      const updateResult = await LeadsService.updateVendaStatus(id, clientId, false);
      
      if (!updateResult) {
        throw new Error('Falha ao atualizar lead no banco de dados');
      }
      
      // Atualizar a observação separadamente
      await LeadsService.updateLead(id, clientId, { 
        observacao: observation
      });
      
      const now = new Date().toISOString();

      // Se a atualização no banco foi bem-sucedida, atualizar o estado local
      setLeadsList(currentLeads => {
        return currentLeads.map(lead => {
          if (lead.id === id) {
            return {
              ...lead,
              status: 'Perdido',
              stage: 'perdido',
              venda: false,
              venda_realizada: false,
              venda_perdida: true,
              data_venda: null,
              data_perda: now,
              id_usuario_perda: user?.id || user?.id_cliente || null,
              id_usuario_venda: null,
              probabilidade_final_fechamento: 0,
              observacao: observation,
              data_ultimo_status: now
            };
          }
          return lead;
        });
      });
      
      toast.success("Lead marcado como perdido!");
      
      // Fechar o modal
      setShowLostLeadModal(false);
      setLeadToMarkAsLost(null);
      
    } catch (error) {
      console.error('Erro ao atualizar status do lead:', error);
      // Lançar o erro para o modal tratar
      throw error;
    }
  };

  // Função para desfazer venda e voltar ao estágio natural
  const desfazerVenda = async (id: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!user || !clientId) return;
    
    try {
      // Buscar o lead atual
      const lead = leadsList.find(l => l.id === id);
      if (!lead) {
        toast.error('Lead não encontrado');
        return;
      }

      // Verificar se realmente está como venda realizada
      if (!lead.venda_realizada && lead.status !== 'Ganho') {
        toast.error('Este lead não está marcado como venda realizada');
        return;
      }

      let primeiraEtapaId: number | null = null;
      let novaEtapaStage: string = 'leads'; // Padrão

      // Se o lead tem funil, buscar a primeira etapa do funil
      if (lead.id_funil) {
        try {
          const { data: etapas, error: etapasError } = await supabase
            .from('funis_etapas')
            .select('id, nome, ordem')
            .eq('id_funil', lead.id_funil)
            .eq('id_cliente', clientId)
            .order('ordem', { ascending: true })
            .limit(1);

          if (!etapasError && etapas && etapas.length > 0) {
            primeiraEtapaId = etapas[0].id;
            // Determinar o stage baseado no nome da etapa
            novaEtapaStage = determineStage(etapas[0].nome);
          }
        } catch (error) {
          console.error('Erro ao buscar primeira etapa do funil:', error);
        }
      }

      const now = new Date().toISOString();

      // Preparar dados de atualização para desfazer a venda
      const updateData: Record<string, any> = {
        status: primeiraEtapaId ? null : 'Leads', // Se não tem etapa, usar 'Leads'
        venda: null,
        venda_realizada: false,
        venda_perdida: false,
        data_venda: null,
        data_perda: null,
        id_usuario_venda: null,
        id_usuario_perda: null,
        probabilidade_final_fechamento: null,
        data_ultimo_status: now
      };

      // Se encontrou primeira etapa, atualizar também o id_funil_etapa
      if (primeiraEtapaId) {
        updateData.id_funil_etapa = primeiraEtapaId;
      } else {
        updateData.id_funil_etapa = null;
      }

      // Atualizar o lead no banco
      const { error: updateError } = await supabase
        .from('leads')
        .update(updateData)
        .eq('id', id)
        .eq('id_cliente', clientId);

      if (updateError) {
        throw updateError;
      }

      // Atualizar o estado local
      setLeadsList(currentLeads => {
        return currentLeads.map(l => {
          if (l.id === id) {
            return {
              ...l,
              ...updateData,
              stage: novaEtapaStage,
              id_funil_etapa: primeiraEtapaId
            };
          }
          return l;
        });
      });

      toast.success('Venda desfeita! Lead retornou ao estágio natural.');
    } catch (error) {
      console.error('Erro ao desfazer venda:', error);
      toast.error('Erro ao desfazer venda. Tente novamente.');
    }
  };

  // Mark lead as in progress
  const markAsInProgress = async (id: number, stage: string) => {
    if (!user || !clientId) return;
    
    // Determinar o status baseado no estágio
    let newStatus = '';
    switch (stage) {
      case 'leads':
        newStatus = 'Leads';
        break;
      case 'viu-nao-respondeu':
        newStatus = 'Viu e não respondeu';
        break;
      case 'conversa-em-andamento':
        newStatus = 'Conversa em andamento';
        break;
      case 'parou-de-responder':
        newStatus = 'Parou de responder';
        break;
      case 'oportunidade':
        newStatus = 'Oportunidade';
        break;
      default:
        newStatus = 'Leads';
    }
    
    try {
      // Atualizar localmente primeiro
      setLeadsList(currentLeads => {
        return currentLeads.map(lead => {
          if (lead.id === id) {
            return {
              ...lead,
              status: newStatus,
              stage: stage,
              data_ultimo_status: new Date().toISOString()
            };
          }
          return lead;
        });
      });

      await LeadsService.updateLead(id, clientId, { 
        status: newStatus
      });
      toast.success(`Lead marcado como ${newStatus}!`);
    } catch (error) {
      // Reverter em caso de erro
      fetchLeads(clientId);
      console.error('Erro ao atualizar status do lead:', error);
      toast.error('Erro ao atualizar lead');
    }
  };

  // Functions for drag and drop of leads
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, leadId: number) => {
    void 0;
    setDraggingLeadId(leadId);
    e.dataTransfer.setData("lead", leadId.toString());
    e.dataTransfer.effectAllowed = "move";
    void 0;
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    void 0;
    setDraggingLeadId(null);
    setDraggingStageId(null);
    // Limpar qualquer highlight visual
    const elements = document.querySelectorAll('[style*="background"]');
    elements.forEach(el => {
      (el as HTMLElement).style.background = '';
    });
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    void 0;
    
    // Indicação visual de que está sobre uma área onde pode soltar
    if (draggingLeadId || draggingStageId) {
      e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'; // Blue highlight
      e.dataTransfer.dropEffect = "move";
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, stageId: string) => {
    e.preventDefault();
    
    void 0;
    
    // Remover o highlight
    e.currentTarget.style.background = '';
    
    // Check if it's a lead being dropped
    const leadId = e.dataTransfer.getData("lead");
    void 0;
    
    if (leadId) {
      void 0;
      await moveLead(Number(leadId), stageId);
      setDraggingLeadId(null);
      return;
    }
    
    // Check if it's a stage being dropped for reordering
    const sourceStageId = e.dataTransfer.getData("stage");
    if (sourceStageId) {
      void 0;
      await reorderStages(sourceStageId, stageId);
      setDraggingStageId(null);
    }
  };

  // Functions for stage dragging and reordering
  const handleStageDragStart = (e: React.DragEvent<HTMLDivElement>, stageId: string) => {
    setDraggingStageId(stageId);
    e.dataTransfer.setData("stage", stageId);
    e.dataTransfer.effectAllowed = "move";
  };
  
  const reorderStages = async (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    
    try {
      // Calcular os novos estágios reordenados
      const newStages = [...stages];
      const sourceIndex = newStages.findIndex(s => s.id === sourceId);
      const targetIndex = newStages.findIndex(s => s.id === targetId);
      
      if (sourceIndex === -1 || targetIndex === -1) return;
      
      const [movedStage] = newStages.splice(sourceIndex, 1);
      newStages.splice(targetIndex, 0, movedStage);
      
      // Atualizar o estado
      setStages(newStages);
      
      // Persistir a alteração no banco de dados usando a nova função
      if (funilId) {
        const etapasReordenadas = newStages.map((stage, index) => ({
          id: parseInt(stage.id),
          ordem: index + 1
        }));
        
        await FunisService.reordenarEtapas(funilId, etapasReordenadas);
        toast.success("Etapa reordenada com sucesso!");
      } else {
        // Fallback para a função antiga se não tiver funilId
        await saveStages(newStages);
        toast.success("Etapa reordenada com sucesso!");
      }
    } catch (error) {
      console.error('Erro ao reordenar estágios:', error);
      toast.error('Erro ao reordenar estágios');
    }
  };

  // Functions to manage stages
  const handleSaveStage = async () => {
    void 0;
    
    if (editingStageId !== null) {
      // Encontrar o estágio antigo para obter o nome anterior
      const oldStage = stages.find(s => s.id === editingStageId);
      if (!oldStage) {
        console.error('Estágio não encontrado:', editingStageId);
        toast.error("Erro: estágio não encontrado");
        return;
      }

      void 0;

      try {
        // Criar nova lista de estágios com a atualização
        const updatedStages = stages.map(stage => {
          if (stage.id === editingStageId) {
            return { ...stage, name: newStageName, color: newStageColor };
          }
          return stage;
        });

        void 0;
        
        // Salvar os estágios no banco de dados
        await saveStages(updatedStages);

        // Atualizar o estado local
        setStages(updatedStages);

        // Atualizar o status dos leads que estavam no estágio antigo
        if (oldStage.name !== newStageName) {
          void 0;
          
          // Buscar todos os leads do cliente
          const leads = await LeadsService.getLeadsByClientId(clientId || 0);
          void 0;
          
          // Filtrar leads que estavam no estágio antigo
          const leadsToUpdate = leads.filter(lead => lead.status === oldStage.name);
          void 0;
          
                      // Atualizar o status de cada lead
            for (const lead of leadsToUpdate) {
              void 0;
              await LeadsService.updateLead(lead.id, clientId || 0, {
                status: newStageName,
                data_ultimo_status: new Date().toISOString()
              });
            }

          // Atualizar a lista de leads localmente
          setLeadsList(currentLeads => 
            currentLeads.map(lead => {
              if (lead.status === oldStage.name) {
                return {
                  ...lead,
                  status: newStageName,
                  data_ultimo_status: new Date().toISOString()
                };
              }
              return lead;
            })
          );

          toast.success(`Etapa atualizada e ${leadsToUpdate.length} leads atualizados com sucesso!`);
        } else {
          toast.success("Etapa atualizada com sucesso!");
        }
      } catch (error) {
        console.error('Erro ao atualizar etapa e leads:', error);
        toast.error('Erro ao atualizar etapa');
        // Reverter as alterações em caso de erro
        fetchLeads(clientId || 0);
      }
    } else {
      // Add new stage
      const newStageId = `custom-${Date.now()}`;
      const newStage = { id: newStageId, name: newStageName, color: newStageColor };
      
      try {
        void 0;
        
        // Salvar o novo estágio no banco de dados
        await saveStages([...stages, newStage]);
        
        // Atualizar o estado local
        setStages(prevStages => [...prevStages, newStage]);
        toast.success("Nova etapa criada com sucesso!");
      } catch (error) {
        console.error('Erro ao criar nova etapa:', error);
        toast.error('Erro ao criar nova etapa');
      }
    }
    
    handleCancelEdit();
  };

  const handleDeleteStage = async () => {
    if (!editingStageId) return;
    
    // Verificar se o estágio tem leads
    if (leadsByStage[editingStageId]?.length > 0) {
      toast.error("Não é possível excluir uma etapa que contém leads");
      return;
    }
    
    try {
      // Filtrar o estágio a ser excluído
      const updatedStages = stages.filter(stage => stage.id !== editingStageId);
      
      // Salvar as alterações
      await saveStages(updatedStages);
      
      // Atualizar o estado local
      setStages(updatedStages);
      
      toast.success("Etapa excluída com sucesso");
      handleCancelEdit(); // Fechar o modal
    } catch (error) {
      console.error('Erro ao excluir etapa:', error);
      toast.error('Erro ao excluir etapa');
    }
  };

  const handleEditStage = (stage: Stage) => {
    setEditingStageId(stage.id);
    setNewStageName(stage.name);
    setNewStageColor(stage.color);
  };

  const handleAddStage = () => {
    setIsAddingStage(true);
    setEditingStageId(null);
    setNewStageName("");
    setNewStageColor("#4F46E5");
  };

  const handleCancelEdit = () => {
    setEditingStageId(null);
    setIsAddingStage(false);
    setNewStageName("");
    setNewStageColor("#4F46E5");
  };

  // Combine loading states
  const isLoading = loading || clientLoading;

  const value = {
    selectedLeadId,
    setSelectedLeadId,
    leadsList,
    loading: isLoading,
    draggingLeadId,
    setDraggingLeadId,
    draggingStageId,
    setDraggingStageId,
    editingStageId,
    setEditingStageId,
    isAddingStage,
    setIsAddingStage,
    stages,
    setStages,
    newStageName,
    setNewStageName,
    newStageColor,
    setNewStageColor,
    selectedLead,
    leadsByStage,
    stageRefs,
    moveLead,
    markAsWon,
    markAsLost,
    confirmLeadLost,
    desfazerVenda,
    markAsInProgress,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDrop,
    handleStageDragStart,
    handleSaveStage,
    handleEditStage,
    handleAddStage,
    handleCancelEdit,
    handleDeleteStage,
    showLostLeadModal,
    setShowLostLeadModal,
    leadToMarkAsLost,
    setLeadToMarkAsLost,
    clientId,
    funilId: funilId || null
  };

  return <BoardContext.Provider value={value}>{children}</BoardContext.Provider>;
};

export const useBoardContext = () => {
  const context = useContext(BoardContext);
  if (context === undefined) {
    throw new Error('useBoardContext must be used within a BoardProvider');
  }
  return context;
};
