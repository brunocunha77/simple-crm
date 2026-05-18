import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Lead } from "./types";

interface LostLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (leadId: number, observation: string) => void;
  lead?: Lead;
}

export default function LostLeadModal({
  isOpen,
  onClose,
  onConfirm,
  lead
}: LostLeadModalProps) {
  const [observation, setObservation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!observation.trim()) {
      toast.error("Por favor, informe o motivo da perda");
      return;
    }

    if (!lead) {
      toast.error("Lead não encontrado");
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(lead.id, observation);
      setObservation("");
      onClose();
      // Mensagem de sucesso será mostrada pelo BoardContext
    } catch (error) {
      console.error("Erro ao marcar lead como perdido:", error);
      // Mostrar mensagem de erro específica
      if (error instanceof Error) {
        toast.error(`Erro ao salvar: ${error.message}`);
      } else {
        toast.error("Erro ao marcar lead como perdido. Tente novamente.");
      }
      // NÃO fechar o modal em caso de erro
      // O usuário pode tentar novamente
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setObservation("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Marcar Lead como Perdido</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <div className="space-y-4">
            <div>
              <p className="mb-2">
                Lead: <strong>{lead?.nome || "Lead não selecionado"}</strong>
              </p>
              <Label htmlFor="reason" className="font-medium">
                Motivo da Perda <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="reason"
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                placeholder="Informe o motivo pelo qual o lead foi perdido..."
                className="mt-2 resize-none h-32"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Esta informação é importante para análises futuras e melhoria do processo de vendas.
              </p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleSubmit} 
            disabled={isSubmitting || !observation.trim()}
          >
            {isSubmitting ? "Salvando..." : "Confirmar Perda"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 