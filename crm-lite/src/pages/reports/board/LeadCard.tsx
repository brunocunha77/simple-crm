import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MessageSquare, MoreVertical, Trophy, XCircle, Clock, DollarSign, RotateCcw, CheckCircle2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { LeadWithStage } from "./types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { departamentosService, Departamento } from '@/services/departamentosService';

interface LeadCardProps {
  lead: LeadWithStage;
  stageId: string;
  onSelect: (id: number) => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, id: number) => void;
  onDragEnd: (e: React.DragEvent<HTMLDivElement>) => void;
  isDragging: boolean;
  markAsWon: (id: number, e?: React.MouseEvent) => void;
  markAsLost: (id: number, e?: React.MouseEvent) => void;
  desfazerVenda?: (id: number, e?: React.MouseEvent) => Promise<void>;
  onShowDetails: (lead: LeadWithStage) => void;
}

export default function LeadCard({
  lead,
  stageId,
  onSelect,
  onDragStart,
  onDragEnd,
  isDragging,
  markAsWon,
  markAsLost,
  desfazerVenda,
  onShowDetails
}: LeadCardProps) {
  const navigate = useNavigate();
  const [departamentoNome, setDepartamentoNome] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDepartamento() {
      if (lead.id_departamento) {
        // Buscar todos os departamentos do cliente (pode ser otimizado para cache global)
        const deps = await departamentosService.listar(lead.id_cliente);
        const dep = deps.find((d: Departamento) => String(d.id) === String(lead.id_departamento));
        setDepartamentoNome(dep ? dep.nome : null);
      } else {
        setDepartamentoNome(null);
      }
    }
    fetchDepartamento();
  }, [lead.id_departamento, lead.id_cliente]);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.stopPropagation();
    onDragStart(e, lead.id);
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    e.stopPropagation();
    onDragEnd(e);
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Só executar o click se não estiver sendo arrastado
    if (!isDragging) {
      onShowDetails(lead);
    }
  };

  const handleViewConversation = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Verificar se o lead tem número de telefone
    if (!lead.telefone) {
      toast.error("Este lead não possui número de telefone associado");
      return;
    }
    
    // Navegar para conversas com o telefone do lead selecionado
    // Passamos o telefone como parâmetro de busca para pré-selecionar a conversa
    navigate(`/conversations?phone=${encodeURIComponent(lead.telefone)}`);
  };

  return (
    <Card
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      className="cursor-pointer hover:shadow-md transition-shadow border border-gray-200"
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Avatar className="h-9 w-9 flex-shrink-0">
              <AvatarFallback className="text-sm font-medium">
                {lead.nome?.substring(0, 2).toUpperCase() || "LD"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium leading-tight flex items-center gap-2 mb-1">
                <span className="truncate">{lead.nome}</span>
                {lead.followup_programado && (
                  <span title="Follow-up automático ativado" className="text-yellow-600 flex-shrink-0">
                    <Clock className="inline-block h-4 w-4" />
                  </span>
                )}
                {(lead.venda_realizada || lead.status === 'Ganho') && (
                  <span 
                    title="Venda realizada" 
                    className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold"
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    Venda Realizada
                  </span>
                )}
              </h4>
              <div className="flex flex-wrap gap-1 mb-2">
                {departamentoNome ? (
                  <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-semibold">
                    {departamentoNome}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs font-normal">
                    Sem departamento
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {format(new Date(lead.data_criacao), "PPp", { locale: ptBR })}
              </p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleViewConversation}>
                <MessageSquare className="h-4 w-4 mr-2" />
                <span>Ver conversa</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                markAsWon(lead.id, e);
              }}>
                <Trophy className="h-4 w-4 mr-2 text-green-600" />
                <span>Marcar como ganho</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                markAsLost(lead.id, e);
              }}>
                <XCircle className="h-4 w-4 mr-2 text-red-600" />
                <span>Marcar como perdido</span>
              </DropdownMenuItem>
              {(lead.venda_realizada || lead.status === 'Ganho') && desfazerVenda && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    desfazerVenda(lead.id, e);
                  }}>
                    <RotateCcw className="h-4 w-4 mr-2 text-orange-600" />
                    <span>Desmarcar como ganho</span>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex items-center justify-between">
          <div className="space-y-2 w-full">
          <div className="inline-flex items-center rounded-full px-3 py-1.5 font-medium bg-green-100 text-green-800 text-sm">
            Score: {lead.score_final_qualificacao ? lead.score_final_qualificacao.toFixed(1) : '0.0'}/10
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground font-semibold">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              {lead.valor || "Não informado"}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
