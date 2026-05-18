import React, { useState, useEffect, useRef, useCallback } from "react";
import { LeadsService } from "@/services/leadsService";
import { Lead } from "@/types/global";
import { clientesService } from "@/services/clientesService";
import { useAuth } from "@/contexts/auth";
import { usePermissions } from "@/hooks/usePermissions";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Loader2,
  MoreHorizontal,
  MessageSquare,
  Trophy,
  XCircle,
  Archive,
  Clock,
  Info,
  TrendingUp,
  TrendingDown,
  Target,
  User,
  Star,
  Plus,
  Download,
  Mail,
  Phone,
  Calendar,
  Pencil,
  Save,
  BellRing,
  DollarSign,
  Paperclip,
  Tag,
  CheckSquare,
  Square
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { departamentosService, Departamento } from '@/services/departamentosService';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from '@/lib/supabase';
import EtiquetasDisplay from "@/components/EtiquetasDisplay";
import * as XLSX from "xlsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ReminderScheduleDialog } from "@/components/ReminderScheduleDialog";
import { formatLeadValor } from "@/utils/currency";
import { etiquetasService, Etiqueta } from "@/services/etiquetasService";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Modal para adicionar novo contato
function AddContactModal({ isOpen, onClose, onAdd, clientId }: { 
  isOpen: boolean, 
  onClose: () => void, 
  onAdd: (lead: Partial<Lead>) => Promise<void>,
  clientId: number | null
}) {
  const [newLead, setNewLead] = useState({ nome: "", telefone: "55" });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLead.nome || !newLead.telefone) {
      toast.error("Preencha nome e telefone");
      return;
    }
    if (!clientId) {
      toast.error("Cliente não identificado");
      return;
    }

    setSaving(true);
    try {
      // Verificar se o contato já existe
      const existingLead = await LeadsService.checkLeadExists(clientId, newLead.telefone);
      if (existingLead) {
        toast.error(`Contato já existe! Nome: ${existingLead.nome}, Telefone: ${existingLead.telefone}`);
        setSaving(false);
        return;
      }

      // Buscar dados do cliente (departamento padrão e instância WhatsApp)
      let idDepartamentoPadrao: number | null = null;
      let instanceId: string | undefined = undefined;
      let nomeInstancia: string = "";
      try {
        const clienteInfo = await clientesService.getClienteById(clientId);
        idDepartamentoPadrao = clienteInfo?.id_departamento_padrao ?? null;
        instanceId = clienteInfo?.instance_id;
        nomeInstancia = clienteInfo?.instance_name ?? "";
      } catch {}

      const leadToCreate = {
        ...newLead,
        id_cliente: clientId,
        status: "Novo",
        canal: "whatsapp",
        data_criacao: new Date().toISOString(),
        data_ultimo_status: new Date().toISOString(),
        nome_instancia: nomeInstancia,
        instance_id: instanceId,
        score_qualificacao: null,
        probabilidade_final_fechamento: null,
        tempo_resposta: "",
        id_departamento: idDepartamentoPadrao,
      };

      await onAdd(leadToCreate);
      setNewLead({ nome: "", telefone: "55" });
      onClose();
    } catch (error) {
      toast.error("Erro ao criar contato");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-md relative">
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-primary-600 text-xl font-bold">×</button>
        <h2 className="text-2xl font-bold mb-4 text-primary-900">Novo Contato</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="font-semibold text-primary-700 block mb-2">Nome:</label>
            <Input
              value={newLead.nome}
              onChange={(e) => setNewLead({...newLead, nome: e.target.value})}
              className="w-full"
              placeholder="Nome do contato"
              required
            />
          </div>

          <div>
            <label className="font-semibold text-primary-700 block mb-2">Telefone:</label>
            <Input
              value={newLead.telefone}
              onChange={(e) => setNewLead({...newLead, telefone: e.target.value.replace(/\D/g, "")})}
              className="w-full"
              placeholder="55DDXXXXXXXXX"
              maxLength={13}
              required
            />
          </div>

          <div className="flex gap-3 mt-6 justify-end">
            <Button 
              type="submit" 
              disabled={saving}
              className="bg-primary-500 hover:bg-primary-600 text-white"
            >
              {saving ? "Salvando..." : "Salvar"}
            </Button>
            <Button 
              type="button" 
              onClick={onClose} 
              variant="secondary"
              disabled={saving}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Modal para importar contatos
function ImportModal({ isOpen, onClose, onImport, clientId }: { 
  isOpen: boolean, 
  onClose: () => void, 
  onImport: (file: File) => Promise<void>,
  clientId: number | null
}) {
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const [importSuccess, setImportSuccess] = useState("");

  const handleImport = async () => {
    if (!importFile) {
      setImportError("Selecione um arquivo XLSX ou CSV.");
      return;
    }
    if (!clientId) {
      setImportError("Cliente não identificado.");
      return;
    }

    setImporting(true);
    setImportError("");
    setImportSuccess("");

    try {
      await onImport(importFile);
      setImportSuccess("Importação concluída com sucesso!");
      setImportFile(null);
      setTimeout(() => {
        onClose();
        setImportSuccess("");
      }, 2000);
    } catch (error: any) {
      setImportError("Erro ao processar o arquivo: " + (error.message || ""));
    } finally {
      setImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-md relative">
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-primary-600 text-xl font-bold">×</button>
        <h2 className="text-2xl font-bold mb-4 text-primary-900">Importar Contatos</h2>
        
        <div className="space-y-4">
          <div>
            <label className="font-semibold text-primary-700 block mb-2">Arquivo:</label>
            <input
              type="file"
              accept=".xlsx,.csv"
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              onChange={e => setImportFile(e.target.files?.[0] || null)}
              disabled={importing}
            />
            <p className="text-sm text-gray-500 mt-1">
              Formato: Primeira coluna = Nome, Segunda coluna = Telefone
            </p>
          </div>

          {importError && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">{importError}</div>
          )}
          
          {importSuccess && (
            <div className="text-green-600 text-sm bg-green-50 p-3 rounded-md">{importSuccess}</div>
          )}
        </div>

        <div className="flex gap-2 mt-6 justify-end">
          <Button 
            onClick={handleImport} 
            disabled={importing || !importFile}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {importing ? "Importando..." : "Importar"}
          </Button>
          <Button 
            variant="secondary" 
            onClick={onClose} 
            disabled={importing}
          >
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}

// Modal de detalhes do contato
function ContactDetailModal({ 
  lead, 
  onClose, 
  onMarkAsWon, 
  onMarkAsLost,
  departamentos,
  showCsScore,
  onLeadUpdated
}: { 
  lead: Lead | null;
  onClose: () => void;
  onMarkAsWon: (lead: Lead) => void;
  onMarkAsLost: (lead: Lead) => void;
  departamentos: Departamento[];
  showCsScore: boolean;
  onLeadUpdated: () => void;
}) {
  const navigate = useNavigate();
  const { canAccessLead, permissions, loading: permissionsLoading } = usePermissions();
  const [isEditingNome, setIsEditingNome] = useState(false);
  const [isEditingTelefone, setIsEditingTelefone] = useState(false);
  const [editedNome, setEditedNome] = useState(lead?.nome || "");
  const [editedTelefone, setEditedTelefone] = useState(lead?.telefone || "");
  const [isSaving, setIsSaving] = useState(false);

  // Atualizar os valores editados quando o lead mudar
  useEffect(() => {
    if (lead) {
      setEditedNome(lead.nome || "");
      setEditedTelefone(lead.telefone || "");
    }
  }, [lead?.id]);

  if (!lead) return null;

  const hasChanges = editedNome !== lead.nome || editedTelefone !== lead.telefone;

  const handleSave = async () => {
    if (!lead.id_cliente || !hasChanges) return;

    setIsSaving(true);
    try {
      await LeadsService.updateLead(lead.id, lead.id_cliente, {
        nome: editedNome.trim(),
        telefone: editedTelefone.trim()
      });

      toast.success("Contato atualizado com sucesso!");
      setIsEditingNome(false);
      setIsEditingTelefone(false);
      onLeadUpdated();
    } catch (error) {
      console.error("Erro ao atualizar contato:", error);
      toast.error("Erro ao atualizar contato");
    } finally {
      setIsSaving(false);
    }
  };

  // Verificar se o atendente tem permissão para acessar este lead
  // Gestores têm acesso completo, atendentes precisam verificar o departamento
  // Se permissions ainda não carregou, assumir que tem acesso (evitar bloqueio durante carregamento)
  const hasPermission = permissionsLoading 
    ? true 
    : (permissions?.canViewAllDepartments === true || !lead.id_departamento || canAccessLead(lead.id_departamento));

  const handleViewConversation = () => {
    // Verificar se o atendente tem permissão
    if (!hasPermission) {
      toast.error("Você não tem permissão para acessar este lead");
      return;
    }

    if (!lead.telefone) {
      toast.error("Este lead não possui número de telefone associado");
      return;
    }
    onClose();
    navigate(`/conversations?phone=${encodeURIComponent(lead.telefone)}`);
  };

  const getDepartamentoNome = (idDepartamento?: number | null) => {
    if (!idDepartamento) return null;
    const departamento = departamentos.find(d => d.id === idDepartamento);
    return departamento?.nome || null;
  };

  const formatCsScore = (value: Lead["cs_nota"]) => {
    if (value === null || value === undefined || value === "") return "-";
    const numericValue = typeof value === "number" ? value : Number(value);
    return Number.isFinite(numericValue) ? numericValue.toFixed(1) : String(value);
  };

  return (
    <Dialog open={!!lead} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback>
                {editedNome?.substring(0, 2).toUpperCase() || "LD"}
              </AvatarFallback>
            </Avatar>
            {isEditingNome ? (
              <Input
                value={editedNome}
                onChange={(e) => setEditedNome(e.target.value)}
                className="flex-1"
                autoFocus
              />
            ) : (
              <span className="flex-1">{editedNome}</span>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsEditingNome(!isEditingNome)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </DialogTitle>
          <DialogDescription>
            Lead criado em {format(new Date(lead.data_criacao || new Date()), "PPp", { locale: ptBR })}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Status e Score */}
          <div className="flex items-center justify-between">
            <Badge variant="secondary">
              {lead.status || "Sem status"}
            </Badge>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-green-700 bg-green-50">
                Score: {typeof lead.score_final_qualificacao === 'number' ? lead.score_final_qualificacao.toFixed(1) : '0.0'}/10
              </Badge>
              {showCsScore && (
                <Badge variant="outline" className="text-blue-700 bg-blue-50">
                  Score CS: {formatCsScore(lead.cs_nota)}
                </Badge>
              )}
            </div>
          </div>

          {/* Informações de Contato */}
          <div className="grid gap-3">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">Telefone</p>
                {isEditingTelefone ? (
                  <Input
                    value={editedTelefone}
                    onChange={(e) => setEditedTelefone(e.target.value.replace(/\D/g, ""))}
                    className="mt-1"
                    placeholder="55DDXXXXXXXXX"
                    maxLength={13}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">{editedTelefone || "Não informado"}</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsEditingTelefone(!isEditingTelefone)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </div>

            {lead.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">{lead.email}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Valor</p>
                <p className="text-sm text-muted-foreground font-semibold">{formatLeadValor(lead.valor)}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Departamento</p>
                <p className="text-sm text-muted-foreground">
                  {getDepartamentoNome(lead.id_departamento) || "Sem departamento"}
                </p>
              </div>
            </div>

            {lead.anexo && (
              <div className="flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Anexo</p>
                  <a
                    href={lead.anexo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                  >
                    <Paperclip className="h-3 w-3" />
                    Visualizar arquivo
                  </a>
                </div>
              </div>
            )}

            {lead.data_ultimo_status && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Última atualização</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(lead.data_ultimo_status), "PPp", { locale: ptBR })}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Informações de Tráfego */}
          {(lead.t_campanha_nome || lead.t_anuncio_nome || lead.t_conjunto_de_anuncio || lead.t_origem) && (
            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="text-sm font-medium mb-3">Informações de Tráfego</p>
              <div className="space-y-2">
                {lead.t_campanha_nome && (
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <p className="text-xs font-medium text-muted-foreground">Campanha</p>
                      <p className="text-sm font-medium">{lead.t_campanha_nome}</p>
                    </div>
                  </div>
                )}
                {lead.t_anuncio_nome && (
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <p className="text-xs font-medium text-muted-foreground">Anúncio</p>
                      <p className="text-sm font-medium">{lead.t_anuncio_nome}</p>
                    </div>
                  </div>
                )}
                {lead.t_conjunto_de_anuncio && (
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <p className="text-xs font-medium text-muted-foreground">Conjunto de Anúncio</p>
                      <p className="text-sm font-medium">{lead.t_conjunto_de_anuncio}</p>
                    </div>
                  </div>
                )}
                {lead.t_origem && (
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <p className="text-xs font-medium text-muted-foreground">Origem</p>
                      <p className="text-sm font-medium">{lead.t_origem}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Métricas */}
          <div className={`grid gap-3 ${showCsScore ? "sm:grid-cols-2" : ""}`}>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-xs font-medium text-muted-foreground mb-1">Score de Qualificação</p>
              <p className="text-2xl font-bold text-green-600">
                {typeof lead.score_final_qualificacao === 'number' ? lead.score_final_qualificacao.toFixed(1) : '0.0'}/10
              </p>
            </div>
            {showCsScore && (
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-xs font-medium text-muted-foreground mb-1">Score CS</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCsScore(lead.cs_nota)}
                </p>
              </div>
            )}
          </div>

          {/* Observação */}
          {lead.observacao && (
            <div>
              <p className="text-sm font-medium mb-1">Observação</p>
              <p className="text-sm text-muted-foreground p-3 bg-muted/30 rounded-md">
                {lead.observacao}
              </p>
            </div>
          )}

          {/* Botão Salvar - aparece apenas quando há mudanças */}
          {hasChanges && (
            <Button
              onClick={handleSave}
              disabled={isSaving || !editedNome.trim() || !editedTelefone.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Salvando..." : "Salvar Alterações"}
            </Button>
          )}

          {/* Ações */}
          <div className="flex flex-col gap-2 pt-4 border-t">
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
              <Button 
                variant="outline" 
                className="flex-1 text-green-600 hover:text-green-700 hover:bg-green-50"
                onClick={() => {
                  if (!hasPermission) {
                    toast.error("Você não tem permissão para alterar este lead");
                    return;
                  }
                  onMarkAsWon(lead);
                  onClose();
                }}
                disabled={!hasPermission}
              >
                <Trophy className="h-4 w-4 mr-2" />
                Marcar como Ganho
              </Button>
              <Button 
                variant="outline" 
                className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => {
                  if (!hasPermission) {
                    toast.error("Você não tem permissão para alterar este lead");
                    return;
                  }
                  onMarkAsLost(lead);
                  onClose();
                }}
                disabled={!hasPermission}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Marcar como Perdido
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Contatos() {
  const [leadsList, setLeadsList] = useState<Lead[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [clientId, setClientId] = useState<number | null>(null);
  const [showCsScore, setShowCsScore] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { canAccessLead, permissions } = usePermissions();
  const [search, setSearch] = useState("");
  const [scoreFilter, setScoreFilter] = useState<string>("all");
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [reminderLead, setReminderLead] = useState<Lead | null>(null);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  
  // Estados para seleção múltipla e etiquetas em massa
  const [selectedLeads, setSelectedLeads] = useState<Set<number>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [showBulkEtiquetasModal, setShowBulkEtiquetasModal] = useState(false);
  const [selectedBulkEtiquetas, setSelectedBulkEtiquetas] = useState<number[]>([]);
  const [etiquetas, setEtiquetas] = useState<Etiqueta[]>([]);
  const [applyingEtiquetas, setApplyingEtiquetas] = useState(false);
  
  // Refs para controlar carregamento e atualizações
  const hasLoadedInitial = useRef(false);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoadRef = useRef(true);
  
  // Buscar o ID do cliente quando o usuário for carregado
  useEffect(() => {
    const fetchClientId = async () => {
      if (!user) {
        setError("Usuário não autenticado");
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        void 0;
        
        // Se o usuário tem email, vamos tentar buscar por email primeiro
        let clienteInfo = null;
        if (user.email) {
          void 0;
          clienteInfo = await clientesService.getClienteByEmail(user.email);
        }
        
        // Se não encontrou pelo email, tenta pelo ID do usuário
        if (!clienteInfo && user.id) {
          void 0;
          clienteInfo = await clientesService.getClienteByIdCliente(user.id_cliente);
        }
        
        if (!clienteInfo) {
          console.error(`Nenhum cliente encontrado para o usuário ${user.id || 'desconhecido'}`);
          setError(`Nenhum cliente encontrado para o usuário. Verifique se o usuário está associado a um cliente na tabela clientes_info.`);
          setLoading(false);
          return;
        }
        
        void 0;
        setClientId(clienteInfo.id);
        setShowCsScore(clienteInfo.cs_on === true);
        
        // Agora que temos o ID do cliente, vamos buscar os leads apenas uma vez
        if (!hasLoadedInitial.current) {
          hasLoadedInitial.current = true;
          isInitialLoadRef.current = true;
          await fetchLeads(clienteInfo.id);
          isInitialLoadRef.current = false;
        }
      } catch (err) {
        console.error('Erro ao buscar ID do cliente:', err);
        setError('Falha ao recuperar informações do cliente');
        setLoading(false);
      }
    };
    
    fetchClientId();
  }, [user]);
  
  useEffect(() => {
    if (clientId && user?.email) {
      const fetchDepartamentos = async () => {
        try {
          // Buscar informações do usuário atual para verificar o tipo
          const { data: userInfo, error: userError } = await supabase
            .from('atendentes')
            .select('tipo_usuario, id_departamento, id_departamento_2, id_departamento_3, departamentos')
            .eq('email', user.email)
            .eq('id_cliente', clientId)
            .single();

          if (userError && userError.code !== 'PGRST116') {
            console.error('Erro ao buscar informações do usuário:', userError);
          }

          // Buscar todos os departamentos do cliente
          const allDeps = await departamentosService.listar(clientId);
          void 0;
          
          // Se for atendente, filtrar apenas os departamentos aos quais tem acesso
          if (userInfo?.tipo_usuario === 'Atendente') {
            // Coletar todos os departamentos do atendente (até 3)
            const departamentosIds: number[] = [];
            if (userInfo.id_departamento) departamentosIds.push(userInfo.id_departamento);
            if (userInfo.id_departamento_2) departamentosIds.push(userInfo.id_departamento_2);
            if (userInfo.id_departamento_3) departamentosIds.push(userInfo.id_departamento_3);
            
            // Compatibilidade: se não houver departamentos nas colunas, verificar o array departamentos
            if (departamentosIds.length === 0 && userInfo.departamentos) {
              departamentosIds.push(...userInfo.departamentos.map(id => parseInt(id)));
            }
            
            if (departamentosIds.length > 0) {
              void 0;
              const filteredDeps = allDeps.filter(dep => departamentosIds.includes(dep.id));
              setDepartamentos(filteredDeps);
              void 0;
            } else {
              setDepartamentos([]);
              void 0;
            }
          } else {
            // Se for gestor ou não tiver tipo definido, mostrar todos os departamentos
            void 0;
            setDepartamentos(allDeps);
            void 0;
          }
        } catch (error) {
          console.error('Erro ao carregar departamentos:', error);
          // Em caso de erro, carregar todos os departamentos
          const allDeps = await departamentosService.listar(clientId);
          setDepartamentos(allDeps);
        }
      };
      
      fetchDepartamentos();
    }
  }, [clientId, user?.email]);
  
  // Buscar etiquetas do cliente
  useEffect(() => {
    const fetchEtiquetas = async () => {
      if (!clientId) return;
      
      try {
        const etiquetasData = await etiquetasService.listByCliente(clientId);
        setEtiquetas(etiquetasData);
      } catch (error) {
        console.error('Erro ao buscar etiquetas:', error);
        toast.error('Erro ao carregar etiquetas');
      }
    };

    fetchEtiquetas();
  }, [clientId]);
  
  // Função para buscar leads do cliente (memoizada para evitar recriações)
  const fetchLeads = useCallback(async (clientIdValue: number | null = clientId, showLoading: boolean = true) => {
    if (!clientIdValue) {
      setError("ID do cliente não disponível");
      if (showLoading) {
        setLoading(false);
      }
      return;
    }

    if (showLoading) {
      setLoading(true);
    }
    setError(null);
    
    try {
      void 0;
      const leads = await LeadsService.getLeadsByClientId(clientIdValue);
      void 0;
      setLeadsList(leads);
    } catch (err) {
      console.error('Erro ao buscar leads:', err);
      setError("Falha ao carregar leads. Verifique o console para mais detalhes.");
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [clientId]);
  
  // Configurar atualizações esporádicas após o carregamento inicial
  useEffect(() => {
    // Limpar intervalo anterior se existir
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
    
    // Só configurar atualizações esporádicas se já tiver carregado inicialmente
    if (hasLoadedInitial.current && clientId) {
      // Atualizar a cada 30 segundos (esporádico)
      refreshIntervalRef.current = setInterval(() => {
        if (!isInitialLoadRef.current && clientId) {
          void 0;
          fetchLeads(clientId, false); // false = não mostrar loading
        }
      }, 30000); // 30 segundos
    }
    
    // Limpar intervalo ao desmontar
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [clientId, fetchLeads]);
  
  const handleRefresh = () => {
    if (clientId) {
      fetchLeads(clientId, true); // Permitir refresh manual com loading
    }
  };

  const handleAddContact = async (leadData: Partial<Lead>) => {
    try {
      if (!clientId) throw new Error('Cliente não identificado');
      
      const created = await LeadsService.createLead(leadData as any);
      if (created) {
        toast.success("Contato criado com sucesso!");
        // Atualizar apenas o novo lead no estado local em vez de recarregar tudo
        if (created.id) {
          setLeadsList(prev => [created as Lead, ...prev]);
        } else {
          // Se não retornou o lead completo, fazer uma busca silenciosa
          await fetchLeads(clientId, false);
        }
      } else {
        toast.error("Erro ao criar contato");
      }
    } catch (error) {
      console.error('Erro ao criar contato:', error);
      toast.error("Erro ao criar contato");
    }
  };

  const handleImportContacts = async (file: File) => {
    if (!clientId) throw new Error('Cliente não identificado');
    
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    
    const contatos = rows
      .slice(1)
      .map((row: any) => ({
        nome: row[0] ? String(row[0]).trim() : "",
        telefone: row[1] ? String(row[1]).replace(/\D/g, "") : ""
      }))
      .filter(c => c.nome && c.telefone);
    
    if (contatos.length === 0) {
      throw new Error("Nenhum contato válido encontrado na planilha.");
    }

    // Buscar dados de instância WhatsApp do cliente
    let instanceId: string | undefined = undefined;
    let nomeInstancia: string = "";
    try {
      const clienteInfo = await clientesService.getClienteById(clientId);
      instanceId = clienteInfo?.instance_id;
      nomeInstancia = clienteInfo?.instance_name ?? "";
    } catch {}
    
    // Buscar contatos já existentes para este cliente
    const existentes = await LeadsService.getLeadsByClientId(clientId);
    const telefonesExistentes = (existentes || []).map((c: any) => String(c.telefone).replace(/\D/g, ""));
    
    // Filtrar contatos novos (não duplicados)
    const contatosNovos = contatos.filter(c => !telefonesExistentes.includes(c.telefone));
    const contatosDuplicados = contatos.filter(c => telefonesExistentes.includes(c.telefone));
    
    // Inserir novos leads
    let contatosCriados = 0;
    if (contatosNovos.length > 0) {
      for (const c of contatosNovos) {
        const created = await LeadsService.createLead({
          id_cliente: clientId,
          nome: c.nome,
          telefone: c.telefone,
          status: 'Novo',
          canal: 'whatsapp',
          nome_instancia: nomeInstancia,
          instance_id: instanceId,
          score_qualificacao: 0,
          probabilidade_final_fechamento: 0,
          tempo_resposta: '',
          data_criacao: new Date().toISOString(),
          data_ultimo_status: new Date().toISOString(),
        });
        if (created) {
          contatosCriados++;
        }
      }
    }
    
    let mensagem = `Importação concluída! ${contatosCriados} novos contatos adicionados.`;
    if (contatosDuplicados.length > 0) {
      mensagem += ` ${contatosDuplicados.length} contatos ignorados (já existiam).`;
    }
    
    toast.success(mensagem);
    // Recarregar apenas após importação (múltiplos contatos)
    await fetchLeads(clientId, false);
  };

  const handleViewConversation = (lead: Lead) => {
    // Verificar se o atendente tem permissão
    // Gestores têm acesso completo, atendentes precisam verificar o departamento
    const hasPermission = permissions?.canViewAllDepartments || !lead.id_departamento || canAccessLead(lead.id_departamento);
    if (!hasPermission) {
      toast.error("Você não tem permissão para acessar este lead");
      return;
    }

    // Verificar se o lead tem número de telefone
    if (!lead.telefone) {
      toast.error("Este lead não possui número de telefone associado");
      return;
    }
    
    // Navegar para conversas com o telefone do lead selecionado
    navigate(`/conversations?phone=${encodeURIComponent(lead.telefone)}`);
  };

  const handleMarkAsWon = async (lead: Lead) => {
    try {
      if (!clientId) throw new Error('Cliente não identificado');
      const result = await LeadsService.marcarComoGanho(lead.id, clientId);
      
      if (!result.success) {
        toast.error(result.error || 'Erro ao marcar como ganho.');
        return;
      }
      
      toast.success(`Lead "${lead.nome}" movido para "${result.etapaNome}" e marcado como ganho!`);
      // Atualizar apenas o lead específico no estado local
      setLeadsList(prev => prev.map(l => 
        l.id === lead.id 
          ? { ...l, status: 'Ganho', venda_realizada: true, venda: true }
          : l
      ));
    } catch (e) {
      toast.error('Erro ao marcar como ganho.');
    }
  };

  const handleMarkAsLost = async (lead: Lead) => {
    try {
      if (!clientId) throw new Error('Cliente não identificado');
      await LeadsService.updateVendaStatus(lead.id, clientId, false);
      toast.error(`Lead "${lead.nome}" marcado como perdido!`);
      // Atualizar apenas o lead específico no estado local
      setLeadsList(prev => prev.map(l => 
        l.id === lead.id 
          ? { ...l, status: 'Perdido', venda_perdida: true, venda: false }
          : l
      ));
    } catch (e) {
      toast.error('Erro ao marcar como perdido.');
    }
  };

  const handleArchive = (lead: Lead) => {
    toast.info(`Lead "${lead.nome}" arquivado!`);
  };

  const handleReminderUpdated = (updatedLead: Lead) => {
    setLeadsList((prev) =>
      prev.map((leadItem) =>
        leadItem.id === updatedLead.id ? { ...leadItem, ...updatedLead } : leadItem
      )
    );
    setSelectedLead((prev) =>
      prev && prev.id === updatedLead.id ? { ...prev, ...updatedLead } : prev
    );
    setReminderLead((prev) =>
      prev && prev.id === updatedLead.id ? { ...prev, ...updatedLead } : prev
    );
  };
  
  // Função utilitária para pegar o nome do departamento
  const getDepartamentoNome = (id: string | number | null | undefined) => {
    if (!id) return null;
    const dep = departamentos.find(d => String(d.id) === String(id));
    return dep ? dep.nome : null;
  };
  
  // Função para gerar análise do score de qualificação baseada no valor real
  const getScoreQualificacaoAnalysis = (score: number) => {
    // Determinar o nível baseado no score real
    let level, color, bgColor, icon, description, factors, recommendation;
    
    if (score >= 7.0) {
      level = "Excelente";
      color = "text-green-600";
      bgColor = "bg-green-50";
      icon = <Star className="h-4 w-4 text-green-600" />;
      description = `Lead com score ${score.toFixed(1)}/10 - muito qualificado`;
      factors = [
        `Score: ${score.toFixed(1)}/10`,
        "Lead muito qualificado",
        "Alto potencial de conversão"
      ];
      recommendation = "Priorizar atendimento imediato";
    } else if (score >= 4.0) {
      level = "Bom";
      color = "text-blue-600";
      bgColor = "bg-blue-50";
      icon = <Target className="h-4 w-4 text-blue-600" />;
      description = `Lead com score ${score.toFixed(1)}/10 - qualificado`;
      factors = [
        `Score: ${score.toFixed(1)}/10`,
        "Lead qualificado",
        "Bom potencial"
      ];
      recommendation = "Manter acompanhamento ativo";
    } else {
      level = "Ruim";
      color = "text-red-600";
      bgColor = "bg-red-50";
      icon = <TrendingDown className="h-4 w-4 text-red-600" />;
      description = `Lead com score ${score.toFixed(1)}/10 - desqualificado`;
      factors = [
        `Score: ${score.toFixed(1)}/10`,
        "Lead desqualificado",
        "Baixo potencial"
      ];
      recommendation = "Considerar qualificação ou descarte";
    }
    
    return {
      level,
      color,
      bgColor,
      icon,
      description,
      factors,
      recommendation
    };
  };

  // Função para gerar análise do score do vendedor baseada no valor real
  const getScoreVendedorAnalysis = (score: number) => {
    // Determinar o nível baseado no score real
    let level, color, bgColor, icon, description, factors, recommendation, diagnostico, focoMelhoria;
    
    if (score >= 7.0) {
      level = "Desempenho Bom";
      color = "text-green-600";
      bgColor = "bg-green-50";
      icon = <Star className="h-4 w-4 text-green-600" />;
      description = `Performance ${score.toFixed(1)}/10 - conduz bem a conversa`;
      diagnostico = "O vendedor conduz bem a conversa, é claro, objetivo e sabe lidar com objeções, demonstrando domínio da jornada do cliente.";
      focoMelhoria = "Refinar ainda mais a persuasão, aumentar a conversão e desenvolver autonomia para lidar com casos complexos.";
      factors = [
        `Score: ${score.toFixed(1)}/10`,
        "Claro e objetivo",
        "Domínio da jornada do cliente"
      ];
      recommendation = "Reforçar boas práticas com o time, atuar como referência ou mentor para colegas, e explorar desafios de vendas mais complexos.";
    } else if (score >= 4.0) {
      level = "Desempenho Regular";
      color = "text-yellow-600";
      bgColor = "bg-yellow-50";
      icon = <Target className="h-4 w-4 text-yellow-600" />;
      description = `Performance ${score.toFixed(1)}/10 - boa intenção mas inconsistente`;
      diagnostico = "O vendedor demonstra boa intenção e algum domínio das técnicas, mas há inconsistência na condução e falhas pontuais na escuta, personalização ou follow-up.";
      focoMelhoria = "Aprimorar perguntas investigativas, personalização da fala e fechamento.";
      factors = [
        `Score: ${score.toFixed(1)}/10`,
        "Boa intenção",
        "Falhas pontuais na condução"
      ];
      recommendation = "Revisar as conversas recentes com um gestor e seguir um plano de melhoria contínua com feedbacks semanais.";
    } else {
      level = "Desempenho Crítico";
      color = "text-red-600";
      bgColor = "bg-red-50";
      icon = <TrendingDown className="h-4 w-4 text-red-600" />;
      description = `Performance ${score.toFixed(1)}/10 - comunicação abaixo do esperado`;
      diagnostico = "A comunicação está abaixo do esperado, com baixa empatia, pouca clareza e ausência de direcionamento na conversa.";
      focoMelhoria = "Reforçar fundamentos da abordagem comercial, escuta ativa e técnicas de rapport.";
      factors = [
        `Score: ${score.toFixed(1)}/10`,
        "Baixa empatia",
        "Ausência de direcionamento"
      ];
      recommendation = "Realizar uma reunião individual para feedback. Considerar novo treinamento intensivo e acompanhamento mais próximo. Avaliar se o perfil do vendedor está alinhado ao modelo de vendas da empresa.";
    }
    
    return {
      level,
      color,
      bgColor,
      icon,
      description,
      diagnostico,
      focoMelhoria,
      factors,
      recommendation
    };
  };

  const formatCsScore = (value: Lead["cs_nota"]) => {
    if (value === null || value === undefined || value === "") return "-";
    const numericValue = typeof value === "number" ? value : Number(value);
    return Number.isFinite(numericValue) ? numericValue.toFixed(1) : String(value);
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Carregando contatos...</span>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-4 border border-red-300 bg-red-50 text-red-800 rounded-md">
        <h3 className="text-lg font-medium mb-2">Erro</h3>
        <p>{error}</p>
        {clientId && (
          <Button 
            variant="outline" 
            className="mt-2" 
            onClick={handleRefresh}
          >
            Tentar novamente
          </Button>
        )}
      </div>
    );
  }
  
  if (leadsList.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Contatos</h1>
          <div className="flex gap-2">
            <Button onClick={() => setShowAddModal(true)} className="bg-primary-500 hover:bg-primary-600 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Novo Contato
            </Button>
            <Button onClick={() => setShowImportModal(true)} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Importar
            </Button>
          </div>
        </div>
        
        <div className="text-center p-8 border border-dashed rounded-md">
          <h3 className="text-lg font-medium mb-2">Nenhum contato encontrado</h3>
          <p className="text-muted-foreground mb-4">
            Comece adicionando seu primeiro contato ou importe uma lista
          </p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => setShowAddModal(true)}>Adicionar Contato</Button>
            <Button onClick={() => setShowImportModal(true)} variant="outline">Importar Contatos</Button>
          </div>
        </div>

        <AddContactModal 
          isOpen={showAddModal} 
          onClose={() => setShowAddModal(false)} 
          onAdd={handleAddContact}
          clientId={clientId}
        />

        <ImportModal 
          isOpen={showImportModal} 
          onClose={() => setShowImportModal(false)} 
          onImport={handleImportContacts}
          clientId={clientId}
        />
      </div>
    );
  }
  
  const filteredLeads = leadsList.filter(lead => {
    // Filtrar leads baseado nas permissões do atendente
    if (permissions) {
      // Se for Admin ou Gestor, pode ver todos os leads
      if (!permissions.canViewAllDepartments) {
        // Se o lead não tem departamento, qualquer um pode ver
        if (lead.id_departamento) {
          // Verificar se o atendente tem acesso ao departamento do lead
          if (!canAccessLead(lead.id_departamento)) {
            return false;
          }
        }
      }
    }

    // Filtro por score de qualificação
    if (scoreFilter !== "all") {
      const score = typeof lead.score_final_qualificacao === 'number' ? lead.score_final_qualificacao : 0;
      
      switch (scoreFilter) {
        case "excellent":
          if (score < 7.0) return false;
          break;
        case "good":
          if (score < 4.0 || score >= 7.0) return false;
          break;
        case "poor":
          if (score >= 4.0) return false;
          break;
        case "no-score":
          if (score > 0) return false;
          break;
        default:
          break;
      }
    }

    // Filtro de busca por texto
    const termo = search.trim().toLowerCase();
    if (!termo) return true;
    
    // Verificar se lead tem as propriedades necessárias
    if (!lead || !lead.nome) {
      void 0;
      return false;
    }
    
    try {
      return (
        lead.nome.toLowerCase().includes(termo) ||
        (lead.telefone || '').includes(termo)
      );
    } catch (error) {
      console.error('Erro ao filtrar lead:', lead, error);
      return false;
    }
  });
  
  return (
    <div className="space-y-4">
      {/* Debug info - remover após correção */}
      <div style={{display: 'none'}}>
        Debug: leads={leadsList.length}, filtered={filteredLeads.length}, search="{search}"
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button onClick={() => setShowAddModal(true)} className="bg-primary-500 hover:bg-primary-600 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Novo Contato
          </Button>
          <Button onClick={() => setShowImportModal(true)} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Importar
          </Button>
          {selectionMode && selectedLeads.size > 0 && (
            <Button 
              onClick={() => setShowBulkEtiquetasModal(true)}
              variant="outline"
              className="bg-blue-50 hover:bg-blue-100 text-white border-blue-300"
            >
              <Tag className="h-4 w-4 mr-2" />
              Atribuir Etiquetas ({selectedLeads.size})
            </Button>
          )}
        </div>
        <div className="flex gap-2 items-center">
          {selectionMode && selectedLeads.size > 0 && (
            <span className="text-sm text-gray-600">
              {selectedLeads.size} selecionado{selectedLeads.size > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Lista de Contatos</CardTitle>
            <Button
              variant={selectionMode ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setSelectionMode(!selectionMode);
                if (selectionMode) {
                  setSelectedLeads(new Set());
                }
              }}
            >
              {selectionMode ? "Cancelar Seleção" : "Selecionar Contatos"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex gap-3 items-end">
            <div className="flex-1 max-w-md">
              <input
                type="text"
                placeholder="Buscar por nome ou número..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="w-64">
              <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
                Filtrar por Score
              </label>
              <Select value={scoreFilter} onValueChange={setScoreFilter}>
                <SelectTrigger className="w-full border-gray-200 bg-white hover:bg-gray-50 focus:ring-2 focus:ring-primary-500/20 [&>svg]:hidden">
                  <SelectValue placeholder="Todos os scores" />
                  <span className="text-gray-400 text-xs ml-auto">▾</span>
                </SelectTrigger>
                <SelectContent 
                  className="bg-white border-gray-200 rounded-lg shadow-[0_8px_24px_rgba(0,0,0,0.08)] p-1 min-w-[var(--radix-select-trigger-width)]"
                  style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
                >
                  <SelectItem 
                    value="all" 
                    className="cursor-pointer rounded-md px-3 py-2 text-sm focus:bg-slate-100 data-[highlighted]:bg-slate-100 data-[state=checked]:bg-slate-100 [&>span:first-child]:hidden"
                  >
                    <div className="flex items-center justify-between gap-2.5 w-full">
                      <div className="flex items-center gap-2.5">
                        <div className="h-2 w-2 rounded-full bg-gray-400 flex-shrink-0" />
                        <span>Todos os scores</span>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem 
                    value="excellent"
                    className="cursor-pointer rounded-md px-3 py-2 text-sm focus:bg-slate-100 data-[highlighted]:bg-slate-100 data-[state=checked]:bg-slate-100 [&>span:first-child]:hidden"
                  >
                    <div className="flex items-center justify-between gap-2.5 w-full">
                      <div className="flex items-center gap-2.5">
                        <div className="h-2 w-2 rounded-full bg-green-500 flex-shrink-0" />
                        <span>Excelente</span>
                      </div>
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>7.0 – 10.0</span>
                    </div>
                  </SelectItem>
                  <SelectItem 
                    value="good"
                    className="cursor-pointer rounded-md px-3 py-2 text-sm focus:bg-slate-100 data-[highlighted]:bg-slate-100 data-[state=checked]:bg-slate-100 [&>span:first-child]:hidden"
                  >
                    <div className="flex items-center justify-between gap-2.5 w-full">
                      <div className="flex items-center gap-2.5">
                        <div className="h-2 w-2 rounded-full bg-yellow-500 flex-shrink-0" />
                        <span>Bom</span>
                      </div>
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>4.0 – 6.9</span>
                    </div>
                  </SelectItem>
                  <SelectItem 
                    value="poor"
                    className="cursor-pointer rounded-md px-3 py-2 text-sm focus:bg-slate-100 data-[highlighted]:bg-slate-100 data-[state=checked]:bg-slate-100 [&>span:first-child]:hidden"
                  >
                    <div className="flex items-center justify-between gap-2.5 w-full">
                      <div className="flex items-center gap-2.5">
                        <div className="h-2 w-2 rounded-full bg-red-500 flex-shrink-0" />
                        <span>Ruim</span>
                      </div>
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>0.1 – 3.9</span>
                    </div>
                  </SelectItem>
                  <SelectItem 
                    value="no-score"
                    className="cursor-pointer rounded-md px-3 py-2 text-sm focus:bg-slate-100 data-[highlighted]:bg-slate-100 data-[state=checked]:bg-slate-100 [&>span:first-child]:hidden"
                  >
                    <div className="flex items-center justify-between gap-2.5 w-full">
                      <div className="flex items-center gap-2.5">
                        <div className="h-2 w-2 rounded-full bg-gray-400 flex-shrink-0" />
                        <span>Sem score</span>
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            <Table>
              <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                <TableRow>
                  {selectionMode && (
                    <TableHead className="bg-white w-12">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (selectedLeads.size === filteredLeads.length) {
                            setSelectedLeads(new Set());
                          } else {
                            setSelectedLeads(new Set(filteredLeads.map(l => l.id)));
                          }
                        }}
                        className="flex items-center justify-center bg-white border border-gray-300 rounded p-1 hover:bg-gray-50"
                      >
                        {selectedLeads.size === filteredLeads.length && filteredLeads.length > 0 ? (
                          <CheckSquare className="h-5 w-5 text-blue-600" />
                        ) : (
                          <Square className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </TableHead>
                  )}
                  <TableHead className="bg-white">Nome</TableHead>
                  <TableHead className="bg-white">Data de Criação</TableHead>
                  <TableHead className="bg-white">Score de Qualificação</TableHead>
                  {showCsScore && <TableHead className="bg-white">Score CS</TableHead>}
                  <TableHead className="bg-white">Conversa</TableHead>
                  <TableHead className="text-right bg-white">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads && filteredLeads.length > 0 ? filteredLeads.map(lead => (
                  <TableRow 
                    key={lead.id}
                    className={`hover:bg-muted/50 ${selectionMode ? '' : 'cursor-pointer'}`}
                    onClick={() => {
                      if (!selectionMode) {
                        setSelectedLead(lead);
                      }
                    }}
                  >
                    {selectionMode && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const newSelected = new Set(selectedLeads);
                            if (newSelected.has(lead.id)) {
                              newSelected.delete(lead.id);
                            } else {
                              newSelected.add(lead.id);
                            }
                            setSelectedLeads(newSelected);
                          }}
                          className="flex items-center justify-center bg-white border border-gray-300 rounded p-1 hover:bg-gray-50"
                        >
                          {selectedLeads.has(lead.id) ? (
                            <CheckSquare className="h-5 w-5 text-blue-600" />
                          ) : (
                            <Square className="h-5 w-5 text-gray-400" />
                          )}
                        </button>
                      </TableCell>
                    )}
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span>{lead.nome}</span>
                        {lead.lembrete_ativo && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setReminderLead(lead);
                              setReminderDialogOpen(true);
                            }}
                            className="inline-flex items-center justify-center rounded-full p-1 text-amber-600 transition hover:bg-amber-100 hover:text-amber-700"
                            title="Ver agendamento deste lead"
                          >
                            <BellRing className="h-4 w-4" />
                          </button>
                        )}
                        {lead.followup_programado && (
                          <span title="Follow-up automático ativado" className="text-yellow-600">
                            <Clock className="inline-block h-4 w-4" />
                          </span>
                        )}
                        {getDepartamentoNome(lead.id_departamento) ? (
                          <span className="ml-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-semibold">
                            {getDepartamentoNome(lead.id_departamento)}
                          </span>
                        ) : (
                          <span className="ml-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs font-normal">
                            Sem departamento
                          </span>
                        )}
                        {clientId && (
                          <EtiquetasDisplay 
                            idEtiquetas={lead.id_etiquetas} 
                            idCliente={clientId}
                            maxEtiquetas={3}
                            showTooltip={true}
                          />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(lead.data_criacao), "PPp", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-green-100 text-green-800 cursor-help">
                              {typeof lead.score_final_qualificacao === 'number' ? lead.score_final_qualificacao.toFixed(1) : '0.0'}/10
                              <Info className="h-3 w-3 ml-1" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="w-80 p-0">
                            {(() => {
                               const analysis = getScoreQualificacaoAnalysis(typeof lead.score_final_qualificacao === 'number' ? lead.score_final_qualificacao : 0);
                              return (
                                <div className={`p-4 ${analysis.bgColor} rounded-lg border`}>
                                  <div className="flex items-center gap-2 mb-3">
                                    {analysis.icon}
                                    <h4 className={`font-semibold ${analysis.color}`}>
                                      Score de Qualificação: {analysis.level}
                                    </h4>
                                  </div>
                                  <p className="text-sm text-gray-700 mb-3">
                                    {analysis.description}
                                  </p>
                                  <div className="mb-3">
                                    <h5 className="text-xs font-semibold text-gray-600 mb-1">Fatores Analisados:</h5>
                                    <ul className="text-xs text-gray-600 space-y-1">
                                      {analysis.factors.map((factor, index) => (
                                        <li key={index} className="flex items-center gap-1">
                                          <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                                          {factor}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                  <div className="pt-2 border-t border-gray-200">
                                    <p className="text-xs font-semibold text-gray-700">
                                      💡 Recomendação: {analysis.recommendation}
                                    </p>
                                  </div>
                                </div>
                              );
                            })()}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    {showCsScore && (
                      <TableCell>
                        <div className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-blue-100 text-blue-800">
                          {formatCsScore(lead.cs_nota)}
                        </div>
                      </TableCell>
                    )}
                     <TableCell onClick={(e) => e.stopPropagation()}>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleViewConversation(lead)}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Ver conversa
                      </Button>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Ações</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleMarkAsWon(lead)}>
                            <Trophy className="h-4 w-4 mr-2 text-green-600" />
                            <span>Marcar como ganho</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleMarkAsLost(lead)}>
                            <XCircle className="h-4 w-4 mr-2 text-red-600" />
                            <span>Marcar como perdido</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleArchive(lead)}>
                            <Archive className="h-4 w-4 mr-2" />
                            <span>Arquivar</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <div className="text-gray-500">
                        {search ? `Nenhum contato encontrado para "${search}"` : "Nenhum contato encontrado"}
                        <br />
                        <span className="text-sm text-gray-400">
                          {search ? "Tente outro termo de busca." : "Adicione seu primeiro contato."}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AddContactModal 
        isOpen={showAddModal} 
        onClose={() => setShowAddModal(false)} 
        onAdd={handleAddContact}
        clientId={clientId}
      />

      <ImportModal 
        isOpen={showImportModal} 
        onClose={() => setShowImportModal(false)} 
        onImport={handleImportContacts}
        clientId={clientId}
      />

      <ReminderScheduleDialog
        lead={reminderLead}
        open={reminderDialogOpen}
        onOpenChange={(open) => {
          setReminderDialogOpen(open);
          if (!open) {
            setReminderLead(null);
          }
        }}
        onUpdated={(updatedLead) => {
          handleReminderUpdated(updatedLead);
          setReminderLead(updatedLead);
        }}
      />

      <ContactDetailModal
        lead={selectedLead}
        onClose={() => setSelectedLead(null)}
        onMarkAsWon={handleMarkAsWon}
        onMarkAsLost={handleMarkAsLost}
        departamentos={departamentos}
        showCsScore={showCsScore}
        onLeadUpdated={async () => {
          // Atualizar apenas o lead específico se estiver selecionado
          if (selectedLead && clientId) {
            // Buscar o lead atualizado do banco silenciosamente
            await fetchLeads(clientId, false);
            // Atualizar o lead selecionado após a busca
            setLeadsList(prev => {
              const updatedLead = prev.find(l => l.id === selectedLead.id);
              if (updatedLead) {
                setSelectedLead(updatedLead);
              }
              return prev;
            });
          }
        }}
      />

      {/* Modal de Etiquetas em Massa */}
      <Dialog open={showBulkEtiquetasModal} onOpenChange={setShowBulkEtiquetasModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atribuir Etiquetas</DialogTitle>
            <DialogDescription>
              Selecione as etiquetas para adicionar aos {selectedLeads.size} contato{selectedLeads.size > 1 ? 's' : ''} selecionado{selectedLeads.size > 1 ? 's' : ''}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">
              {etiquetas.map((etiqueta) => (
                <div
                  key={etiqueta.id}
                  className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors ${
                    selectedBulkEtiquetas.includes(etiqueta.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => {
                    const newSelected = selectedBulkEtiquetas.includes(etiqueta.id)
                      ? selectedBulkEtiquetas.filter(id => id !== etiqueta.id)
                      : [...selectedBulkEtiquetas, etiqueta.id];
                    setSelectedBulkEtiquetas(newSelected);
                  }}
                >
                  <div
                    className="w-4 h-4 rounded-full border border-gray-300"
                    style={{ backgroundColor: etiqueta.cor }}
                  />
                  <span className="text-sm">{etiqueta.nome}</span>
                </div>
              ))}
              {etiquetas.length === 0 && (
                <p className="text-sm text-gray-500 col-span-2 text-center py-4">
                  Nenhuma etiqueta disponível. Crie etiquetas na página de Etiquetas.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowBulkEtiquetasModal(false);
              setSelectedBulkEtiquetas([]);
            }} disabled={applyingEtiquetas}>
              Cancelar
            </Button>
            <Button 
              onClick={async () => {
                if (selectedBulkEtiquetas.length === 0) {
                  toast.error('Selecione pelo menos uma etiqueta');
                  return;
                }

                setApplyingEtiquetas(true);
                try {
                  let successCount = 0;
                  let errorCount = 0;

                  for (const leadId of selectedLeads) {
                    try {
                      const lead = leadsList.find(l => l.id === leadId);
                      if (!lead || !clientId) continue;

                      // Obter etiquetas atuais do lead
                      const etiquetasAtuais = lead.id_etiquetas 
                        ? lead.id_etiquetas.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
                        : [];

                      // Adicionar novas etiquetas (sem duplicatas)
                      const novasEtiquetas = [...new Set([...etiquetasAtuais, ...selectedBulkEtiquetas])];

                      // Verificar limite de 3 etiquetas
                      if (novasEtiquetas.length > 3) {
                        errorCount++;
                        continue;
                      }

                      const novasEtiquetasString = novasEtiquetas.join(',');

                      // Atualizar o lead no banco
                      const { error } = await supabase
                        .from('leads')
                        .update({ id_etiquetas: novasEtiquetasString })
                        .eq('id', leadId)
                        .eq('id_cliente', clientId);

                      if (error) {
                        console.error(`Erro ao atualizar lead ${leadId}:`, error);
                        errorCount++;
                      } else {
                        successCount++;
                      }
                    } catch (error) {
                      console.error(`Erro ao processar lead ${leadId}:`, error);
                      errorCount++;
                    }
                  }

                  if (successCount > 0) {
                    toast.success(`Etiquetas adicionadas a ${successCount} contato${successCount > 1 ? 's' : ''} com sucesso!`);
                  }
                  if (errorCount > 0) {
                    toast.error(`${errorCount} contato${errorCount > 1 ? 's' : ''} não puderam ser atualizado${errorCount > 1 ? 's' : ''} (limite de 3 etiquetas ou erro)`);
                  }

                  // Atualizar apenas os leads modificados no estado local
                  // Buscar os leads atualizados silenciosamente
                  await fetchLeads(clientId, false);
                  
                  // Limpar seleção
                  setShowBulkEtiquetasModal(false);
                  setSelectedBulkEtiquetas([]);
                  setSelectedLeads(new Set());
                  setSelectionMode(false);
                } catch (error) {
                  console.error('Erro ao aplicar etiquetas em massa:', error);
                  toast.error('Erro ao aplicar etiquetas');
                } finally {
                  setApplyingEtiquetas(false);
                }
              }}
              disabled={selectedBulkEtiquetas.length === 0 || applyingEtiquetas}
            >
              {applyingEtiquetas ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Aplicando...
                </>
              ) : (
                'Aplicar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 
