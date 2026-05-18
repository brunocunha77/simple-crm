import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lead } from "@/types/global";
import { LeadsService } from "@/services/leadsService";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { CalendarClock, Loader2 } from "lucide-react";

interface ReminderScheduleDialogProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: (lead: Lead) => void;
}

const formatDateTime = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return format(date, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR });
};

export function ReminderScheduleDialog({
  lead,
  open,
  onOpenChange,
  onUpdated,
}: ReminderScheduleDialogProps) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [loading, setLoading] = useState(false);

  const horarioAgendadoFormatado = useMemo(() => formatDateTime(lead?.horario_agendado), [lead?.horario_agendado]);
  const primeiroLembreteFormatado = useMemo(() => formatDateTime(lead?.primeiro_lembrete), [lead?.primeiro_lembrete]);
  const segundoLembreteFormatado = useMemo(() => formatDateTime(lead?.segundo_lembrete), [lead?.segundo_lembrete]);
  const terceiroLembreteFormatado = useMemo(() => formatDateTime(lead?.terceiro_lembrete), [lead?.terceiro_lembrete]);

  useEffect(() => {
    if (open) {
      if (lead?.horario_agendado) {
        const agendado = new Date(lead.horario_agendado);
        if (!Number.isNaN(agendado.getTime())) {
          setDate(format(agendado, "yyyy-MM-dd"));
          setTime(format(agendado, "HH:mm"));
          return;
        }
      }
      setDate("");
      setTime("");
    } else {
      setDate("");
      setTime("");
    }
  }, [open, lead?.horario_agendado]);

  const handleClose = (nextState: boolean) => {
    if (!loading) {
      onOpenChange(nextState);
    }
  };

  const handleSave = async () => {
    if (!lead) {
      toast.error("Lead não encontrado para remarcar.");
      return;
    }
    if (!date || !time) {
      toast.error("Informe o novo dia e horário para remarcar.");
      return;
    }

    const dateTimeIso = new Date(`${date}T${time}`);
    if (Number.isNaN(dateTimeIso.getTime())) {
      toast.error("Data ou horário inválidos.");
      return;
    }

    setLoading(true);
    try {
      const updated = await LeadsService.updateLead(lead.id, lead.id_cliente, {
        horario_agendado: dateTimeIso.toISOString(),
      });

      if (updated) {
        toast.success("Agendamento atualizado com sucesso!");
        onUpdated?.(updated);
        onOpenChange(false);
      } else {
        toast.error("Não foi possível atualizar o agendamento.");
      }
    } catch (error) {
      console.error("Erro ao atualizar agendamento:", error);
      toast.error("Erro ao atualizar agendamento. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-amber-600" />
            Agendamento do Lead
          </DialogTitle>
          <DialogDescription>
            Consulte ou ajuste o horário da consulta/agendamento deste lead.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Lead</p>
            <p className="font-semibold">{lead?.nome ?? "Contato sem nome"}</p>
            {lead?.telefone && <p className="text-sm text-muted-foreground">{lead.telefone}</p>}
          </div>

          <div className="grid gap-3">
            <div>
              <p className="text-sm font-medium">Consulta agendada</p>
              <p className="text-sm text-muted-foreground">
                {horarioAgendadoFormatado ?? "Sem horário agendado."}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium">Primeiro lembrete</p>
              <p className="text-sm text-muted-foreground">
                {primeiroLembreteFormatado ?? "Nenhum lembrete configurado."}
              </p>
            </div>
            {segundoLembreteFormatado && (
              <div>
                <p className="text-sm font-medium">Segundo lembrete</p>
                <p className="text-sm text-muted-foreground">{segundoLembreteFormatado}</p>
              </div>
            )}
            {terceiroLembreteFormatado && (
              <div>
                <p className="text-sm font-medium">Terceiro lembrete</p>
                <p className="text-sm text-muted-foreground">{terceiroLembreteFormatado}</p>
              </div>
            )}
            {lead?.nome_medico && lead.nome_medico !== "NaN" && (
              <div>
                <p className="text-sm font-medium">Profissional responsável</p>
                <p className="text-sm text-muted-foreground">{lead.nome_medico}</p>
              </div>
            )}
          </div>

          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label htmlFor="reminder-date">Novo dia</Label>
              <Input
                id="reminder-date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                disabled={loading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reminder-time">Novo horário</Label>
              <Input
                id="reminder-time"
                type="time"
                value={time}
                onChange={(event) => setTime(event.target.value)}
                disabled={loading}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              "Remarcar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

