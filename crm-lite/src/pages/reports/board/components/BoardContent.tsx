import React, { useState, useEffect } from "react";
import BoardOperations from "./BoardOperations";
import { BoardView } from "./BoardView";
import { BoardProvider } from "../context/BoardContext";
import { FunilComEtapas } from "@/types/global";
import { FunisService } from "@/services/funisService";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, TrendingUp } from "lucide-react";
import { useUserType } from "@/hooks/useUserType";

export default function BoardContent() {
  
  const { toast } = useToast();
  const { userType } = useUserType();
  const isAtendente = userType === "Atendente";
  const [selectedFunil, setSelectedFunil] = useState<FunilComEtapas | null>(null);
  const [funis, setFunis] = useState<FunilComEtapas[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    loadFunis();
  }, []);

  const loadFunis = async () => {
    try {
      void 0;
      setLoading(true);
      const funisData = await FunisService.getFunis();
      void 0;
      
      // Buscar etapas para cada funil
      const funisComEtapas = await Promise.all(
        funisData.map(async (funil) => {
          const funilCompleto = await FunisService.getFunilComEtapas(funil.id);
          return funilCompleto || { ...funil, etapas: [] };
        })
      );

      void 0;
      setFunis(funisComEtapas);
      
      // Se não há funis e o usuário pode criar, mostrar formulário de criação
      if (funisComEtapas.length === 0 && !isAtendente) {
        void 0;
        setShowCreateForm(true);
      } else {
        // Só selecionar automaticamente se não houver funil selecionado
        if (!selectedFunil) {
          // Buscar funil padrão primeiro
          const funilPadrao = funisComEtapas.find(funil => funil.id_funil_padrao);
          
          if (funilPadrao) {
            void 0;
            setSelectedFunil(funilPadrao);
          } else {
            // Se não há funil padrão, selecionar o primeiro funil
            void 0;
            setSelectedFunil(funisComEtapas[0]);
          }
        }
      }
    } catch (error) {
      console.error('BoardContent: Erro ao carregar funis:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os funis",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFunilChange = (funil: FunilComEtapas | null) => {
    setSelectedFunil(funil);
  };

  const handleFunilCreated = async () => {
    // Recarregar a lista de funis quando um novo funil é criado
    await loadFunis();
    // O funil criado já será selecionado automaticamente pelo BoardOperations
  };

  const handleFunilUpdated = async () => {
    // Recarregar a lista de funis quando um funil é atualizado
    await loadFunis();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando funis...</p>
        </div>
      </div>
    );
  }

  // Se não há funis, exibir tela adequada conforme o tipo de usuário
  if (funis.length === 0 && !showCreateForm) {
    void 0;
    void 0;

    if (isAtendente) {
      return (
        <div className="flex flex-col items-center justify-center h-64 space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nenhum funil disponível
            </h3>
            <p className="text-gray-600">
              Ainda não há funis configurados. Entre em contato com o seu gestor.
            </p>
          </div>
        </div>
      );
    }
    
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Nenhum funil criado ainda
          </h3>
          <p className="text-gray-600 mb-4">
            Para começar a usar o CRM, você precisa criar seu primeiro funil de vendas.
          </p>
          <Button 
            onClick={() => {
              void 0;
              setShowCreateForm(true);
            }} 
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Criar Primeiro Funil
          </Button>
        </div>
      </div>
    );
  }

  // Se há funis mas nenhum selecionado, selecionar o primeiro
  if (!selectedFunil && funis.length > 0) {
    setSelectedFunil(funis[0]);
    return null;
  }

  return (
    <div className="h-full flex flex-col min-h-0">
      <BoardOperations 
        selectedFunil={selectedFunil}
        onFunilChange={handleFunilChange}
        showCreateForm={showCreateForm}
        onShowCreateForm={setShowCreateForm}
        onFunilCreated={handleFunilCreated}
        onFunilUpdated={handleFunilUpdated}
      />
      
      {/* Sempre mostrar o BoardView quando há um funil selecionado */}
      {selectedFunil && (
        <div className="flex-1 min-h-0 h-full">
          <BoardProvider funilId={selectedFunil.id}>
            <BoardView 
              funil={selectedFunil}
              onFunilChange={handleFunilChange}
            />
          </BoardProvider>
        </div>
      )}
    </div>
  );
}
