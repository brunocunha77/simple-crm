import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, TrendingUp, Settings, X, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FunisService } from "@/services/funisService";
import { FunilComEtapas, CriarFunilData, EditarFunilData } from "@/types/global";
import { FunilForm } from "@/components/funis/FunilForm";
import { FunilViewModal } from "@/components/funis/FunilViewModal";
import { useUserType } from "@/hooks/useUserType";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface BoardOperationsProps {
  selectedFunil?: FunilComEtapas | null;
  onFunilChange?: (funil: FunilComEtapas | null) => void;
  showCreateForm?: boolean;
  onShowCreateForm?: (show: boolean) => void;
  onFunilCreated?: () => Promise<void>;
  onFunilUpdated?: () => Promise<void>;
}

export default function BoardOperations({ 
  selectedFunil, 
  onFunilChange,
  showCreateForm,
  onShowCreateForm,
  onFunilCreated,
  onFunilUpdated
}: BoardOperationsProps) {
  const { toast } = useToast();
  const { userType } = useUserType();
  const isAtendente = userType === "Atendente";
  const [funis, setFunis] = useState<FunilComEtapas[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingFunil, setEditingFunil] = useState<FunilComEtapas | null>(null);
  const [viewingFunil, setViewingFunil] = useState<FunilComEtapas | null>(null);
  const [deletingFunil, setDeletingFunil] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFunisOverview, setShowFunisOverview] = useState(false);

  void 0;

  useEffect(() => {
    void 0;
    loadFunis();
  }, []);

  const loadFunis = async () => {
    try {
      setLoading(true);
      const funisData = await FunisService.getFunis();
      
      // Buscar etapas para cada funil
      const funisComEtapas = await Promise.all(
        funisData.map(async (funil) => {
          const funilCompleto = await FunisService.getFunilComEtapas(funil.id);
          return funilCompleto || { ...funil, etapas: [] };
        })
      );

      setFunis(funisComEtapas);
      
      // Se não há funil selecionado e existem funis, selecionar o primeiro
      if (!selectedFunil && funisComEtapas.length > 0 && onFunilChange) {
        onFunilChange(funisComEtapas[0]);
      }
    } catch (error) {
      console.error('Erro ao carregar funis:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os funis",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFunilChange = (funilId: string) => {
    if (funilId === "new") {
      if (onShowCreateForm) {
        onShowCreateForm(true);
      }
      return;
    }
    
    const funil = funis.find(f => f.id === Number(funilId));
    if (onFunilChange) {
      onFunilChange(funil || null);
    }
  };

  const handleCreateFunil = async (data: CriarFunilData) => {
    try {
      setIsSubmitting(true);
      const novoFunil = await FunisService.criarFunil(data);
      
      setFunis([novoFunil, ...funis]);
      if (onShowCreateForm) {
        onShowCreateForm(false);
      }
      
      // Selecionar o novo funil automaticamente
      if (onFunilChange) {
        onFunilChange(novoFunil);
      }
      
      // Notificar o BoardContent para recarregar a lista
      if (onFunilCreated) {
        await onFunilCreated();
      }
      
      toast({
        title: "Sucesso",
        description: "Funil criado com sucesso!",
      });
    } catch (error: any) {
      console.error('Erro ao criar funil:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível criar o funil",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateFunil = async (data: EditarFunilData) => {
    if (!editingFunil) return;

    try {
      setIsSubmitting(true);
      const funilAtualizado = await FunisService.atualizarFunil(editingFunil.id, data);
      
      setFunis(funis.map(f => f.id === editingFunil.id ? funilAtualizado : f));
      setEditingFunil(null);
      
      // Atualizar o funil selecionado se for o mesmo
      if (selectedFunil?.id === editingFunil.id && onFunilChange) {
        onFunilChange(funilAtualizado);
      }
      
      // Notificar o BoardContent para recarregar a lista
      if (onFunilUpdated) {
        await onFunilUpdated();
      }
      
      toast({
        title: "Sucesso",
        description: "Funil atualizado com sucesso!",
      });
    } catch (error: any) {
      console.error('Erro ao atualizar funil:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível atualizar o funil",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteFunil = async (funilId: number) => {
    try {
      await FunisService.deletarFunil(funilId);
      
      setFunis(funis.filter(f => f.id !== funilId));
      setDeletingFunil(null);
      
      // Se o funil deletado era o selecionado, selecionar outro
      if (selectedFunil?.id === funilId) {
        const novoFunil = funis.find(f => f.id !== funilId);
        if (onFunilChange) {
          onFunilChange(novoFunil || null);
        }
      }
      
      toast({
        title: "Sucesso",
        description: "Funil excluído com sucesso!",
      });
    } catch (error: any) {
      console.error('Erro ao excluir funil:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o funil",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (funil: FunilComEtapas) => {
    setEditingFunil(funil);
    setViewingFunil(null);
  };

  const handleView = (funil: FunilComEtapas) => {
    setViewingFunil(funil);
  };

  const handleDelete = (id: number) => {
    setDeletingFunil(id);
    setViewingFunil(null);
  };

  return (
    <>
      <div className="flex items-center justify-between p-4 border-b space-x-4">
        <div className="flex items-center space-x-4">
      <h2 className="text-lg font-semibold">Quadro de Leads</h2>
          
          {/* Seletor de Funis */}
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4 text-gray-500" />
            <Select 
              value={selectedFunil?.id?.toString() || ""} 
              onValueChange={handleFunilChange}
              disabled={loading}
            >
              <SelectTrigger className="w-64">
                <SelectValue placeholder={loading ? "Carregando funis..." : "Selecione um funil"} />
              </SelectTrigger>
              <SelectContent>
                {funis.map((funil) => (
                  <SelectItem key={funil.id} value={funil.id.toString()}>
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="truncate">{funil.nome}</span>
                        {funil.id_funil_padrao && (
                          <div className="flex items-center gap-1 flex-shrink-0" title="Funil Padrão - Novos leads serão direcionados automaticamente">
                            <Star className="h-3.5 w-3.5 text-yellow-500 fill-current" />
                            <span className="text-xs text-yellow-600 font-medium">Padrão</span>
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                        {funil.etapas.length} etapas
                      </span>
                    </div>
                  </SelectItem>
                ))}
                {!isAtendente && (
                  <SelectItem value="new">
                    <div className="flex items-center gap-2 text-primary-600">
                      <Plus className="h-4 w-4" />
                      <span>Criar novo funil</span>
                    </div>
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Espaço reservado para ações do header */}
        </div>
      </div>

      {/* Botão Gerenciar Funis fixo no topo direito — oculto para Atendente */}
      {!isAtendente && (
        <div className="fixed right-6 z-20" style={{ top: '72px' }}>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowFunisOverview(!showFunisOverview)}
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            {showFunisOverview ? 'Ocultar' : 'Gerenciar'} Funis
          </Button>
        </div>
      )}

      {/* Visão Geral dos Funis — oculta para Atendente */}
      {!isAtendente && showFunisOverview && (
        <div className="p-4 border-b bg-gray-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Gestão de Funis</h3>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                if (onShowCreateForm) {
                  onShowCreateForm(true);
                }
              }}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Novo Funil
            </Button>
          </div>
          
          {funis.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">Nenhum funil criado ainda.</p>
              <Button onClick={() => {
                if (onShowCreateForm) {
                  onShowCreateForm(true);
                }
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Funil
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {funis.map((funil) => (
                <div
                  key={funil.id}
                  className={`p-4 border rounded-lg bg-white cursor-pointer transition-all duration-200 hover:shadow-md ${
                    selectedFunil?.id === funil.id ? 'ring-2 ring-primary-500 bg-primary-50' : ''
                  }`}
                  onClick={() => onFunilChange?.(funil)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-gray-900 line-clamp-2">
                      {funil.nome}
                    </h4>
                    <div className="flex items-center gap-1">
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {funil.etapas.length} etapas
                      </span>
                      {funil.id_funil_padrao && (
                        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded flex items-center gap-1">
                          <Star className="h-3 w-3 fill-current" />
                          Padrão
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleView(funil);
                        }}
                        className="h-6 w-6 p-0"
                      >
                        <Settings className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    {funil.etapas.slice(0, 3).map((etapa, index) => (
                      <div key={etapa.id} className="flex items-center gap-2 text-sm">
                        <span className="text-xs bg-gray-200 px-1.5 py-0.5 rounded">
                          {index + 1}
                        </span>
                        <span className="text-gray-600 truncate">{etapa.nome}</span>
                      </div>
                    ))}
                    {funil.etapas.length > 3 && (
                      <div className="text-xs text-gray-500">
                        +{funil.etapas.length - 3} etapas mais
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Formulário de Criação/Edição — bloqueado para Atendente */}
      {(() => {
        void 0;
        return !isAtendente && (showCreateForm || editingFunil) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  void 0;
                  if (onShowCreateForm) {
                    onShowCreateForm(false);
                  }
                  setEditingFunil(null);
                }}
                className="absolute top-4 right-4 z-10"
              >
                <X className="h-5 w-5" />
              </Button>
              <FunilForm
                funil={editingFunil || undefined}
                onSubmit={editingFunil ? handleUpdateFunil : handleCreateFunil}
                onCancel={() => {
                  void 0;
                  if (onShowCreateForm) {
                    onShowCreateForm(false);
                  }
                  setEditingFunil(null);
                }}
                isLoading={isSubmitting}
              />
            </div>
          </div>
        );
      })()}

      {/* Modal de Visualização */}
      <FunilViewModal
        funil={viewingFunil}
        isOpen={!!viewingFunil}
        onClose={() => setViewingFunil(null)}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Confirmação de Exclusão */}
      <AlertDialog open={!!deletingFunil} onOpenChange={() => setDeletingFunil(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este funil? Esta ação não pode ser desfeita e todas as etapas associadas serão removidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingFunil && handleDeleteFunil(deletingFunil)}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
