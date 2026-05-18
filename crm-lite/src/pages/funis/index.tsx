import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  BarChart3, 
  Hash, 
  Calendar,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { FunisService } from '@/services/funisService';
import { FunilComEtapas, CriarFunilData, EditarFunilData } from '@/types/global';
import { FunilForm } from '@/components/funis/FunilForm';
import { FunilCard } from '@/components/funis/FunilCard';
import { FunilViewModal } from '@/components/funis/FunilViewModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function FunisPage() {
  const { toast } = useToast();
  const location = useLocation();
  const [funis, setFunis] = useState<FunilComEtapas[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingFunil, setEditingFunil] = useState<FunilComEtapas | null>(null);
  const [viewingFunil, setViewingFunil] = useState<FunilComEtapas | null>(null);
  const [deletingFunil, setDeletingFunil] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [estatisticas, setEstatisticas] = useState({
    total: 0,
    totalEtapas: 0,
    funilMaisEtapas: null as { nome: string; etapas: number } | null
  });

  useEffect(() => {
    loadFunis();
  }, []);

  // Verificar se há estado de navegação para abrir modais automaticamente
  useEffect(() => {
    if (location.state) {
      const { editFunil, viewFunil } = location.state as any;
      
      if (editFunil) {
        setEditingFunil(editFunil);
        // Limpar o estado da navegação
        window.history.replaceState({}, document.title);
      } else if (viewFunil) {
        setViewingFunil(viewFunil);
        // Limpar o estado da navegação
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state]);

  const loadFunis = async () => {
    try {
      setLoading(true);
      const [funisData, statsData] = await Promise.all([
        FunisService.getFunis(),
        FunisService.getEstatisticasFunis()
      ]);

      // Buscar etapas para cada funil
      const funisComEtapas = await Promise.all(
        funisData.map(async (funil) => {
          const funilCompleto = await FunisService.getFunilComEtapas(funil.id);
          return funilCompleto || { ...funil, etapas: [] };
        })
      );

      setFunis(funisComEtapas);
      setEstatisticas(statsData);
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

  const handleCreateFunil = async (data: CriarFunilData) => {
    try {
      setIsSubmitting(true);
      const novoFunil = await FunisService.criarFunil(data);
      
      setFunis([novoFunil, ...funis]);
      setShowForm(false);
      
      toast({
        title: "Sucesso",
        description: "Funil criado com sucesso!",
      });

      // Recarregar estatísticas
      const stats = await FunisService.getEstatisticasFunis();
      setEstatisticas(stats);
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
      
      toast({
        title: "Sucesso",
        description: "Funil atualizado com sucesso!",
      });

      // Recarregar estatísticas
      const stats = await FunisService.getEstatisticasFunis();
      setEstatisticas(stats);
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

  const handleDeleteFunil = async (id: number) => {
    try {
      await FunisService.deletarFunil(id);
      
      setFunis(funis.filter(f => f.id !== id));
      setDeletingFunil(null);
      
      toast({
        title: "Sucesso",
        description: "Funil excluído com sucesso!",
      });

      // Recarregar estatísticas
      const stats = await FunisService.getEstatisticasFunis();
      setEstatisticas(stats);
    } catch (error: any) {
      console.error('Erro ao deletar funil:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível excluir o funil",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (funil: FunilComEtapas) => {
    setEditingFunil(funil);
  };

  const handleView = (funil: FunilComEtapas) => {
    setViewingFunil(funil);
  };

  const handleDelete = (id: number) => {
    setDeletingFunil(id);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando funis...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestão de Funis</h1>
          <p className="text-gray-600 mt-2">
            Crie e gerencie seus funis de vendas com etapas personalizadas
          </p>
        </div>
        
        <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Novo Funil
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Funis</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{estatisticas.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Etapas</CardTitle>
            <Hash className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{estatisticas.totalEtapas}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Funil com Mais Etapas</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {estatisticas.funilMaisEtapas ? (
              <div className="space-y-1">
                <div className="text-2xl font-bold">{estatisticas.funilMaisEtapas.etapas}</div>
                <p className="text-xs text-muted-foreground">{estatisticas.funilMaisEtapas.nome}</p>
              </div>
            ) : (
              <div className="text-2xl font-bold">-</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Lista de Funis */}
      {funis.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                <BarChart3 className="h-8 w-8 text-gray-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Nenhum funil criado ainda
                </h3>
                <p className="text-gray-600 mb-4">
                  Comece criando seu primeiro funil de vendas para organizar suas etapas de conversão.
                </p>
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeiro Funil
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {funis.map((funil) => (
            <FunilCard
              key={funil.id}
              funil={funil}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onView={handleView}
            />
          ))}
        </div>
      )}

      {/* Formulário de Criação/Edição */}
      {(showForm || editingFunil) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <FunilForm
              funil={editingFunil || undefined}
              onSubmit={editingFunil ? handleUpdateFunil : handleCreateFunil}
              onCancel={() => {
                setShowForm(false);
                setEditingFunil(null);
              }}
              isLoading={isSubmitting}
            />
          </div>
        </div>
      )}

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
    </div>
  );
}
