import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Departamento } from "@/services/departamentosService";

interface DepartamentoModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Omit<Departamento, "id">) => void;
  initialData?: Partial<Departamento>;
  loading?: boolean;
  idCliente?: string | number;
}

export function DepartamentoModal({ open, onClose, onSave, initialData = {}, loading, idCliente }: DepartamentoModalProps) {
  const [nome, setNome] = React.useState(initialData.nome || "");
  const [descricao, setDescricao] = React.useState(initialData.descricao || "");

  React.useEffect(() => {
    setNome(initialData.nome || "");
    setDescricao(initialData.descricao || "");
  }, [initialData]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({ 
      nome, 
      descricao, 
      id_cliente: initialData.id_cliente || ""
    });
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialData.id ? "Editar departamento" : "Novo departamento"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nome</label>
            <Input
              placeholder="Nome do departamento"
              value={nome}
              onChange={e => setNome(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Descrição</label>
            <Input
              placeholder="Descrição (opcional)"
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
            />
          </div>
          
          {/* Campo de seleção de chip removido - agora está na tabela principal */}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" variant="default" disabled={loading}>
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 