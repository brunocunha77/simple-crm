import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { leadsService, Lead } from "@/services/leadsService";
import { clientesService } from "@/services/clientesService";
import { useAuth } from "@/contexts/auth";
import { toast } from "sonner";

interface NovaConversaNovoContatoFormProps {
  onCancel: () => void;
  onSubmit: (data: { nome: string; telefone: string }) => void;
}

export const NovaConversaNovoContatoForm: React.FC<NovaConversaNovoContatoFormProps> = ({ onCancel, onSubmit }) => {
  const { user } = useAuth();
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("55");
  const [saving, setSaving] = useState(false);
  const [clientId, setClientId] = useState<number | null>(null);

  React.useEffect(() => {
    const fetchClientId = async () => {
      if (!user) return;
      let clienteInfo = null;
      if (user.email) {
        clienteInfo = await clientesService.getClienteByIdCliente(user.id_cliente);
      }
      if (!clienteInfo && user.id) {
        clienteInfo = await clientesService.getClienteByIdCliente(user.id_cliente);
      }
      if (clienteInfo) setClientId(clienteInfo.id);
    };
    fetchClientId();
  }, [user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !telefone) {
      toast.error("Preencha nome e telefone");
      return;
    }
    onSubmit({ nome, telefone });
  };

  return (
    <Card className="mb-4 p-4 shadow border border-primary-100 bg-white">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          placeholder="Nome do contato"
          value={nome}
          onChange={e => setNome(e.target.value)}
          required
          className="text-lg px-4 py-3 border-primary-300 focus:border-primary-500"
        />
        <Input
          placeholder="55DDXXXXXXXXX"
          value={telefone}
          onChange={e => setTelefone(e.target.value.replace(/\D/g, ""))}
          required
          className="text-lg px-4 py-3 border-primary-300 focus:border-primary-500"
          maxLength={13}
        />
        <div className="flex gap-2 justify-end">
          <Button type="button" variant="secondary" onClick={onCancel} className="border border-gray-300">Cancelar</Button>
          <Button type="submit" className="bg-primary-500 hover:bg-primary-600 text-white font-semibold px-6 py-2 rounded-lg shadow transition-all">Salvar</Button>
        </div>
      </form>
    </Card>
  );
}; 