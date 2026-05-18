import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, User, Phone, Mail, DollarSign, Calendar, X } from "lucide-react";
import { FunilComEtapas, LeadComFunil, EditarFunilData } from "@/types/global";
import { LeadsService } from "@/services/leadsService";
import { FunisService } from "@/services/funisService";
import { useToast } from "@/hooks/use-toast";
import { FunilForm } from "@/components/funis/FunilForm";
import LeadDetailModal from "../LeadDetailModal";
import { LeadWithStage } from "../types";
import { usePermissions } from "@/hooks/usePermissions";
import { useBoardContext } from "../context/BoardContext";
import { useUserType } from "@/hooks/useUserType";

interface BoardViewProps {
  funil: FunilComEtapas;
  onFunilChange: (funil: FunilComEtapas | null) => void;
}

export function BoardView({ funil, onFunilChange }: BoardViewProps) {
  const { toast } = useToast();
  const { permissions } = usePermissions();
  const { markAsWon, markAsLost, markAsInProgress, moveLead, desfazerVenda } = useBoardContext();
  const { userType } = useUserType();
  const isAtendente = userType === "Atendente";
  const [leads, setLeads] = useState<LeadComFunil[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedLead, setDraggedLead] = useState<LeadComFunil | null>(null);
  const [showEditFunilModal, setShowEditFunilModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLeadDetailModal, setShowLeadDetailModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<LeadComFunil | null>(null);

  // Recarrega os leads quando o funil muda OU quando as permissões carregam.
  // Isso garante que o filtro por departamento seja aplicado assim que as
  // permissões do usuário estiverem disponíveis.
  useEffect(() => {
    loadLeads();
  }, [funil.id, permissions]);

  const loadLeads = async () => {
    // Aguardar as permissões carregarem antes de filtrar e exibir leads
    if (permissions === null) return;

    try {
      setLoading(true);
      const leadsData = await LeadsService.getLeadsPorFunil(funil.id);

      const filteredLeads = leadsData.filter(lead => {
        // Admin/Gestor: vê todos os leads do funil
        if (permissions.canViewAllDepartments) return true;
        // Lead sem departamento: visível para todos
        if (!lead.id_departamento) return true;
        // Atendente: apenas leads cujo departamento está na lista permitida
        // Converte para número pois o campo pode vir como string do banco
        return permissions.allowedDepartments.includes(Number(lead.id_departamento));
      });

      setLeads(filteredLeads);
    } catch (error) {
      console.error('Erro ao carregar leads:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os leads",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };



  const handleEditFunil = async (funilData: EditarFunilData) => {
    try {
      setIsSubmitting(true);
      
      // Atualizar o funil usando o FunisService
      const funilAtualizado = await FunisService.atualizarFunil(funil.id, funilData);
      
      toast({
        title: "Sucesso",
        description: "Funil atualizado com sucesso!",
      });
      
      // Fechar o modal
      setShowEditFunilModal(false);
      
      // Atualizar o funil selecionado
      if (onFunilChange) {
        onFunilChange(funilAtualizado);
      }
    } catch (error) {
      console.error('Erro ao atualizar funil:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o funil",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, lead: LeadComFunil) => {
    setDraggedLead(lead);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, etapaId: number) => {
    e.preventDefault();
    
    if (!draggedLead) return;

    try {
      // Mover o lead para a nova etapa
      await LeadsService.moverLeadParaEtapa(draggedLead.id, etapaId);
      
      // Atualizar o estado local
      setLeads(prev => prev.map(lead => 
        lead.id === draggedLead.id 
          ? { ...lead, id_funil_etapa: etapaId }
          : lead
      ));

      toast({
        title: "Sucesso",
        description: "Lead movido com sucesso!",
      });
    } catch (error) {
      console.error('Erro ao mover lead:', error);
      toast({
        title: "Erro",
        description: "Não foi possível mover o lead",
        variant: "destructive"
      });
    } finally {
      setDraggedLead(null);
    }
  };

  const getLeadsByEtapa = (etapaId: number) => {
    return leads.filter(lead => lead.id_funil_etapa === etapaId);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando leads...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-x-auto p-6 bg-gray-50 relative">
      {/* Botão de Editar Funil e Adicionar Etapa no Topo - Fixo no lado direito — oculto para Atendente */}
      {!isAtendente && (
        <div className="fixed right-6 z-10" style={{ top: '120px' }}>
          <Button
            onClick={() => setShowEditFunilModal(true)}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-md text-sm"
            disabled={isSubmitting}
          >
            <Plus className="h-3.5 w-3.5 mr-0.0" />
            {isSubmitting ? 'Editando...' : 'Editar Funil e Adicionar Etapa'}
          </Button>
        </div>
      )}

      <div className="flex gap-6 min-w-max h-full">
        {funil.etapas.map((etapa, index) => {
          const leadsNaEtapa = getLeadsByEtapa(etapa.id);
          const numeroNegocios = leadsNaEtapa.length;
          
          return (
            <React.Fragment key={etapa.id}>
              {/* Coluna da etapa */}
              <div
                className="w-80 flex-shrink-0"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, etapa.id)}
              >
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-[600px] flex flex-col">
                  {/* Header da coluna */}
                  <div className="p-4 border-b border-gray-200 flex-shrink-0">
                    <h3 className="font-semibold text-gray-900 text-lg mb-2">
                      {etapa.nome}
                    </h3>
                    <div className="text-sm text-gray-600">
                      {numeroNegocios} negócio{numeroNegocios !== 1 ? 's' : ''}
                    </div>
                  </div>
                  
                  {/* Conteúdo da coluna */}
                  <div className="p-4 space-y-3 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                    {leadsNaEtapa.map((lead) => (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, lead)}
                        onClick={() => {
                          setSelectedLead(lead);
                          setShowLeadDetailModal(true);
                        }}
                        className="p-4 bg-white border border-gray-200 rounded-lg cursor-pointer hover:shadow-md transition-all duration-200 hover:border-gray-300"
                      >
                        <div className="space-y-3">
                          {/* Nome principal */}
                          <div className="font-semibold text-gray-900 text-sm leading-tight flex items-center gap-2">
                            <span>{lead.nome}</span>
                            {(lead.venda_realizada || lead.status === 'Ganho') && (
                              <span 
                                title="Venda realizada" 
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold"
                              >
                                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                Venda Realizada
                              </span>
                            )}
                          </div>
                          
                          {/* Informações secundárias */}
                          {lead.email && (
                            <div className="text-sm text-gray-600 leading-tight">
                              {lead.email}
                            </div>
                          )}
                          
                          {/* Valor */}
                          <div className="flex items-center gap-2 text-sm text-gray-700 font-semibold">
                            <DollarSign className="h-3 w-3 text-gray-400" />
                            {lead.valor || "Não informado"}
                          </div>
                          
                          {/* Status visual */}
                          <div className="flex justify-end">
                            <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {/* Estado vazio */}
                    {leadsNaEtapa.length === 0 && (
                      <div className="text-center py-16 text-gray-400">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                          <User className="h-6 w-6 text-gray-300" />
                        </div>
                        <p className="text-sm">Nenhum lead nesta etapa</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </React.Fragment>
          );
        })}
      </div>

      {/* Modal de Editar Funil e Adicionar Etapa */}
      {showEditFunilModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto relative bg-white rounded-lg">
            <div className="sticky top-0 bg-white border-b px-6 py-4 rounded-t-lg">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Editar Funil e Adicionar Etapa</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowEditFunilModal(false)}
                  className="hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
            <div className="p-6">
              <FunilForm
                funil={funil}
                onSubmit={handleEditFunil}
                onCancel={() => setShowEditFunilModal(false)}
                isLoading={isSubmitting}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalhes do Lead */}
      {showLeadDetailModal && selectedLead && (
        <LeadDetailModal
          lead={{
            ...selectedLead,
            stage: selectedLead.id_funil_etapa?.toString() || ''
          }}
          stages={funil.etapas.map(etapa => ({
            id: etapa.id.toString(),
            name: etapa.nome,
            color: '#4F46E5' // Cor padrão para as etapas
          }))}
          onClose={() => setShowLeadDetailModal(false)}
          onMarkAsWon={async (id) => {
            try {
              // Chamar a função do contexto
              await markAsWon(id);
              setShowLeadDetailModal(false);
              
              // Atualizar estado local imediatamente
              const leadToUpdate = leads.find(l => l.id === id);
              if (leadToUpdate && funil.etapas) {
                // Encontrar a etapa de ganho
                const etapaGanho = funil.etapas.find(e => e.etapa_de_ganho === true);
                if (etapaGanho) {
                  setLeads(prev => 
                    prev.map(lead => 
                      lead.id === id 
                        ? { ...lead, id_funil_etapa: etapaGanho.id, status: 'Ganho', venda: true }
                        : lead
                    )
                  );
                }
              }
            } catch (error) {
              console.error('Erro ao marcar como ganho:', error);
            }
          }}
          onMarkAsLost={(id) => {
            markAsLost(id);
            setShowLeadDetailModal(false);
          }}
          onMarkAsInProgress={(id, stage) => {
            markAsInProgress(id, stage);
            setShowLeadDetailModal(false);
            loadLeads(); // Recarregar leads após marcar como em progresso
          }}
          onMoveToStage={(leadId, stageId) => {
            moveLead(leadId, stageId);
            setShowLeadDetailModal(false);
            loadLeads(); // Recarregar leads após mover
          }}
          onDesfazerVenda={async (id) => {
            if (desfazerVenda) {
              await desfazerVenda(id);
              setShowLeadDetailModal(false);
              loadLeads(); // Recarregar leads após desfazer venda
            }
          }}
        />
      )}
    </div>
  );
}
