import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageSquare, Trophy, XCircle, DollarSign, RotateCcw, Phone, FileText, CheckCircle2, Star, Wallet, UserCheck, Target, Clock, X } from "lucide-react";
import { LeadWithStage, Stage } from "./types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";
import { LeadsService } from "@/services/leadsService";
import { useAuth } from "@/contexts/auth";

interface LeadDetailModalProps {
  lead: LeadWithStage | undefined;
  stages: Stage[];
  onClose: () => void;
  onMarkAsWon: (id: number) => void;
  onMarkAsLost: (id: number) => void;
  onMarkAsInProgress: (id: number, stage: string) => void;
  onMoveToStage: (leadId: number, stageId: string) => void;
  onDesfazerVenda?: (id: number) => Promise<void>;
}

// Função para determinar a cor do estágio
const getStatusColor = (status: string, stage: string, stages: Stage[]) => {
  if (status.toLowerCase() === "ganho") {
    return "bg-success/20 text-success";
  } else if (status.toLowerCase() === "perdido") {
    return "bg-danger/20 text-danger";
  }
  
  const stageObj = stages.find(s => s.id === stage);
  if (stageObj) {
    return `text-[${stageObj.color}] bg-[${stageObj.color}20]`;
  }
  
  return "bg-muted/30 text-foreground";
};

export default function LeadDetailModal({
  lead,
  stages,
  onClose,
  onMarkAsWon,
  onMarkAsLost,
  onMarkAsInProgress,
  onMoveToStage,
  onDesfazerVenda
}: LeadDetailModalProps) {
  const navigate = useNavigate();
  const { canAccessLead, permissions, loading: permissionsLoading } = usePermissions();
  const { user } = useAuth();
  const [isEditingValor, setIsEditingValor] = useState(false);
  const [valorInput, setValorInput] = useState<string>("");
  const [savingValor, setSavingValor] = useState(false);
  
  // Inicializar o valor quando o lead mudar
  useEffect(() => {
    if (lead) {
      setValorInput(lead.valor ? lead.valor.toString() : "");
      setIsEditingValor(false);
    }
  }, [lead?.id]);
  
  if (!lead) return null;

  // Verificar se o atendente tem permissão para acessar este lead
  // Gestores têm acesso completo, atendentes precisam verificar o departamento
  // Se as permissões ainda estão carregando, assumir que tem permissão temporariamente
  const hasPermission = permissionsLoading 
    ? true 
    : (permissions?.canViewAllDepartments === true || !lead.id_departamento || canAccessLead(lead.id_departamento));

  const handleViewConversation = () => {
    // Verificar se o atendente tem permissão
    if (!hasPermission) {
      toast.error("Você não tem permissão para acessar este lead");
      return;
    }

    // Verificar se o lead tem número de telefone
    if (!lead.telefone) {
      toast.error("Este lead não possui número de telefone associado");
      return;
    }
    
    // Fechar o modal
    onClose();
    
    // Navegar para conversas com o telefone do lead selecionado
    navigate(`/conversations?phone=${encodeURIComponent(lead.telefone)}`);
  };

  const handleMarkAsWon = () => {
    if (!hasPermission) {
      toast.error("Você não tem permissão para alterar este lead");
      return;
    }
    onMarkAsWon(lead.id);
  };

  const handleMarkAsLost = () => {
    if (!hasPermission) {
      toast.error("Você não tem permissão para alterar este lead");
      return;
    }
    onMarkAsLost(lead.id);
  };

  const handleDesfazerVenda = async () => {
    if (!hasPermission) {
      toast.error("Você não tem permissão para alterar este lead");
      return;
    }
    if (onDesfazerVenda) {
      await onDesfazerVenda(lead.id);
      onClose();
    }
  };

  const handleMoveToStage = (stageId: string) => {
    if (!hasPermission) {
      toast.error("Você não tem permissão para alterar este lead");
      return;
    }
    onMoveToStage(lead.id, stageId);
    onMarkAsInProgress(lead.id, stageId);
  };

  const handleSaveValor = async () => {
    if (!hasPermission || !user?.id_cliente) {
      toast.error("Você não tem permissão para alterar este lead");
      return;
    }

    setSavingValor(true);
    try {
      const valorParaSalvar = valorInput && valorInput.trim() !== "" 
        ? valorInput.trim() 
        : null;

      const updatedLead = await LeadsService.updateLead(lead.id, user.id_cliente, {
        valor: valorParaSalvar
      });

      if (updatedLead) {
        toast.success("Valor atualizado com sucesso!");
        setIsEditingValor(false);
        // Atualizar o lead localmente
        setValorInput(updatedLead.valor ? updatedLead.valor.toString() : "");
        // Recarregar a lista de leads para refletir a mudança
        window.location.reload(); // Pode ser otimizado atualizando o estado do contexto
      } else {
        toast.error("Erro ao atualizar valor");
      }
    } catch (error) {
      console.error("Erro ao atualizar valor:", error);
      toast.error("Erro ao atualizar valor");
    } finally {
      setSavingValor(false);
    }
  };

  const handleCancelEditValor = () => {
    setValorInput(lead.valor ? lead.valor.toString() : "");
    setIsEditingValor(false);
  };

  // Função para parsear o JSON do score de qualificação mantendo todos os dados
  const parseScoreQualificacao = (score: unknown): Record<string, unknown> | null => {
    if (!score) {
      return null;
    }

    let parsed: Record<string, unknown> = {};

    // Se for uma string JSON, tentar fazer parse
    if (typeof score === 'string') {
      try {
        parsed = JSON.parse(score);
      } catch {
        // Se não for JSON válido, retornar como objeto simples
        return { valor: score };
      }
    } else if (typeof score === 'object' && score !== null) {
      parsed = score as Record<string, unknown>;
    } else {
      // Se for primitivo, retornar como objeto simples
      return { valor: score };
    }

    return parsed;
  };

  const scoreData = parseScoreQualificacao((lead as unknown as Record<string, unknown>).score_qualificacao);
  const hasScoreData = scoreData && Object.keys(scoreData).length > 0;
  
  // Função auxiliar para formatar valores
  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return "Não informado";
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };
  
  // Função auxiliar para formatar chaves (títulos)
  const formatKey = (key: string): string => {
    return key
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };

  // Função para verificar se é dados BANT
  const isBANTData = (value: unknown): boolean => {
    if (typeof value !== 'object' || value === null) return false;
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj);
    const bantKeys = ['Budget', 'Authority', 'Need', 'Timeline'];
    return bantKeys.every(key => keys.includes(key));
  };

  // Tradução dos critérios BANT
  const bantTranslations: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
    Budget: { label: 'Orçamento', icon: Wallet, color: 'text-green-600' },
    Authority: { label: 'Autoridade', icon: UserCheck, color: 'text-blue-600' },
    Need: { label: 'Necessidade', icon: Target, color: 'text-purple-600' },
    Timeline: { label: 'Prazo', icon: Clock, color: 'text-orange-600' }
  };

  // Função para renderizar dados BANT unificados (Notas + Justificativas) com scroll interno
  const renderUnifiedBANT = (notasData: Record<string, unknown>, justificativasData: Record<string, unknown>) => {
    const bantKeys = ['Budget', 'Authority', 'Need', 'Timeline'];
    
    return (
      <div className="space-y-0" style={{ maxHeight: '220px', overflowY: 'auto' }}>
        {bantKeys.map((key, index) => {
          const notaValue = notasData[key];
          const justificativaValue = justificativasData[key];
          const config = bantTranslations[key];
          const Icon = config.icon;
          
          // Pular se não houver dados
          if ((notaValue === undefined || notaValue === null) && 
              (justificativaValue === undefined || justificativaValue === null)) {
            return null;
          }

          const score = typeof notaValue === 'number' ? Math.min(Math.max(notaValue, 0), 10) : null;
          const justificativa = typeof justificativaValue === 'string' ? justificativaValue : null;

          return (
            <div 
              key={key} 
              className={`pb-3 ${index < bantKeys.length - 1 ? 'border-b border-gray-200 mb-3' : ''}`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${config.color} flex-shrink-0`} />
                  <span className="text-sm font-medium text-foreground">{config.label}</span>
                </div>
                {score !== null && (
                  <span className="text-sm font-semibold text-foreground">{score}/10</span>
                )}
              </div>
              {justificativa && (
                <p className="text-[13px] leading-relaxed pl-6" style={{ color: '#64748b' }}>
                  {justificativa}
                </p>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Dialog open={!!lead} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback>
                {lead.nome?.substring(0, 2).toUpperCase() || "LD"}
              </AvatarFallback>
            </Avatar>
            <span>{lead.nome}</span>
          </DialogTitle>
          <DialogDescription>
            Lead criado em {format(new Date(lead.data_criacao), "PPp", { locale: ptBR })}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-3 overflow-x-hidden w-full">
          {/* Status */}
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className={getStatusColor(lead.status, lead.stage, stages)}>
              {lead.status}
            </Badge>
          </div>

          {/* Informações do Lead */}
          <div className="grid gap-4">
            {/* Score de Qualificação - Layout Visual Organizado */}
            {hasScoreData && scoreData && (
              <div className="border rounded-lg p-3 bg-gradient-to-br from-muted/50 to-muted/30">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Star className="h-4 w-4 text-primary" />
                    Score de Qualificação
                  </h3>
                  {/* Destacar score final se existir */}
                  {(scoreData.scoreFinal || scoreData.score_final || scoreData.score || scoreData.scoreFinalQualificacao || scoreData.score_final_qualificacao) && (
                    <Badge variant="outline" className="text-sm font-bold px-2 py-0.5 bg-primary/10 text-primary border-primary/30">
                      {(() => {
                        const scoreValue = scoreData.scoreFinal || scoreData.score_final || scoreData.score || scoreData.scoreFinalQualificacao || scoreData.score_final_qualificacao;
                        return typeof scoreValue === 'number' 
                          ? `${scoreValue.toFixed(1)}/10`
                          : String(scoreValue);
                      })()}
                    </Badge>
                  )}
                </div>

                <div className="grid gap-0">
                  {/* Buscar dados de Notas e Justificativas para unificar */}
                  {(() => {
                    let notasData: Record<string, unknown> | null = null;
                    let justificativasData: Record<string, unknown> | null = null;

                    // Procurar por campos de Notas e Justificativas
                    Object.entries(scoreData).forEach(([key, value]) => {
                      const isNotas = key.toLowerCase().includes('nota') || key.toLowerCase().includes('note');
                      const isJustificativas = key.toLowerCase().includes('justificativa') || key.toLowerCase().includes('reason');
                      
                      if (isNotas && typeof value === 'object' && value !== null && isBANTData(value)) {
                        notasData = value as Record<string, unknown>;
                      }
                      if (isJustificativas && typeof value === 'object' && value !== null && isBANTData(value)) {
                        justificativasData = value as Record<string, unknown>;
                      }
                    });

                    // Se encontrou ambos, renderizar unificado
                    if (notasData && justificativasData) {
                      return (
                        <div className="mt-2 bg-background/50 rounded-md border border-border/50 p-2">
                          {renderUnifiedBANT(notasData, justificativasData)}
                        </div>
                      );
                    }

                    // Caso contrário, renderizar outros campos normalmente
                    return Object.entries(scoreData).map(([key, value]) => {
                      // Pular campos de score que já foram destacados no topo
                      if (['scoreFinal', 'score_final', 'score', 'scoreFinalQualificacao', 'score_final_qualificacao'].includes(key)) {
                        return null;
                      }

                      // Pular Notas e Justificativas se já foram renderizadas unificadas
                      const isNotas = key.toLowerCase().includes('nota') || key.toLowerCase().includes('note');
                      const isJustificativas = key.toLowerCase().includes('justificativa') || key.toLowerCase().includes('reason');
                      if ((isNotas || isJustificativas) && typeof value === 'object' && value !== null && isBANTData(value)) {
                        return null;
                      }

                      // Escolher ícone baseado na chave
                      let Icon = FileText;
                      if (key.toLowerCase().includes('telefone') || key.toLowerCase().includes('phone')) {
                        Icon = Phone;
                      } else if (isNotas) {
                        Icon = FileText;
                      } else if (isJustificativas) {
                        Icon = CheckCircle2;
                      }

                      const isLongText = typeof value === 'string' && value.length > 100;
                      const isObject = typeof value === 'object' && value !== null;

                      // Renderizar outros campos normalmente
                      return (
                        <div key={key} className="flex items-start gap-3 p-3 bg-background/50 rounded-md border border-border/50">
                          <Icon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-muted-foreground mb-1">
                              {formatKey(key)}
                            </p>
                            {isObject ? (
                              <pre className="text-xs text-foreground whitespace-pre-wrap break-words bg-muted/30 p-2 rounded mt-1 overflow-x-hidden">
                                {formatValue(value)}
                              </pre>
                            ) : (
                              <p className={`text-sm text-foreground ${isLongText ? 'whitespace-pre-wrap' : ''} break-words`}>
                                {formatValue(value)}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}

            {/* Telefone Principal (se não estiver no score) */}
            {!hasScoreData && (
              <div>
                <p className="text-sm font-medium">Telefone</p>
                <p className="text-sm text-muted-foreground">{lead.telefone || "Não informado"}</p>
              </div>
            )}

            {/* Valor do Lead */}
            <div>
                <div className="flex items-center justify-between mb-1 gap-2">
                  <p className="text-sm font-medium flex items-center gap-1 flex-shrink-0">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    Valor do Lead
                  </p>
                  {!isEditingValor && hasPermission && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditingValor(true)}
                      className="h-7 text-xs flex-shrink-0"
                    >
                      Editar
                    </Button>
                  )}
                </div>
                {isEditingValor && hasPermission ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={valorInput}
                      onChange={(e) => setValorInput(e.target.value)}
                      className="flex-1"
                      placeholder="Digite o valor"
                      type="text"
                      disabled={savingValor}
                    />
                    <Button
                      size="sm"
                      onClick={handleSaveValor}
                      disabled={savingValor}
                      className="h-9"
                    >
                      {savingValor ? "Salvando..." : "Salvar"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCancelEditValor}
                      disabled={savingValor}
                      className="h-9"
                    >
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <p className="text-base font-semibold text-foreground">{lead.valor || "Não informado"}</p>
                )}
            </div>

            {/* Último Status */}
            <div>
              <p className="text-sm font-medium">Último Status</p>
              <p className="text-sm text-muted-foreground">
                {lead.data_ultimo_status 
                  ? format(new Date(lead.data_ultimo_status), "PPp", { locale: ptBR })
                  : "Sem atualizações"}
              </p>
            </div>
            
            {/* Informações de Tráfego */}
            {(lead.t_campanha_nome || lead.t_anuncio_nome || lead.t_conjunto_de_anuncio || lead.t_origem) && (
              <div className="border-t pt-3 mt-2">
                <p className="text-sm font-medium mb-2">Informações de Tráfego</p>
                <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                  {lead.t_campanha_nome && (
                    <div className="grid grid-cols-2 gap-2">
                      <p className="text-sm text-muted-foreground">Campanha:</p>
                      <p className="text-sm font-medium">{lead.t_campanha_nome}</p>
                    </div>
                  )}
                  {lead.t_anuncio_nome && (
                    <div className="grid grid-cols-2 gap-2">
                      <p className="text-sm text-muted-foreground">Anúncio:</p>
                      <p className="text-sm font-medium">{lead.t_anuncio_nome}</p>
                    </div>
                  )}
                  {lead.t_conjunto_de_anuncio && (
                    <div className="grid grid-cols-2 gap-2">
                      <p className="text-sm text-muted-foreground">Conjunto de Anúncio:</p>
                      <p className="text-sm font-medium">{lead.t_conjunto_de_anuncio}</p>
                    </div>
                  )}
                  {lead.t_origem && (
                    <div className="grid grid-cols-2 gap-2">
                      <p className="text-sm text-muted-foreground">Origem:</p>
                      <p className="text-sm font-medium">{lead.t_origem}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Ações */}
          <div className="flex flex-col gap-2">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={handleViewConversation}
              disabled={!lead.telefone || !hasPermission}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Ver Conversa
            </Button>
            {!hasPermission && (
              <p className="text-sm text-red-600 text-center">
                Você não tem permissão para acessar este lead
              </p>
            )}
            <div className="flex gap-2">
              {!(lead.venda_realizada || lead.status === 'Ganho') ? (
                <>
                  <Button 
                    variant="outline" 
                    className="flex-1 text-green-600 hover:text-green-700"
                    onClick={handleMarkAsWon}
                    disabled={!hasPermission}
                  >
                    <Trophy className="h-4 w-4 mr-2" />
                    Marcar como Ganho
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1 text-red-600 hover:text-red-700"
                    onClick={handleMarkAsLost}
                    disabled={!hasPermission}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Marcar como Perdido
                  </Button>
                </>
              ) : (
                onDesfazerVenda && (
                  <Button 
                    variant="outline" 
                    className="w-full text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                    onClick={handleDesfazerVenda}
                    disabled={!hasPermission}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Desmarcar como ganho
                  </Button>
                )
              )}
            </div>
          </div>

          {/* Seleção de Estágio */}
          <div className="grid gap-2">
            <p className="text-sm font-medium">Mover para Estágio</p>
            <div className="grid grid-cols-2 gap-2">
              {stages.map(stage => (
                <Button
                  key={stage.id}
                  variant="outline"
                  className={`justify-start ${lead.stage === stage.id ? 'border-primary' : ''}`}
                  style={{ 
                    color: stage.color,
                    backgroundColor: `${stage.color}10`
                  }}
                  onClick={() => handleMoveToStage(stage.id)}
                  disabled={!hasPermission}
                >
                  {stage.name}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
