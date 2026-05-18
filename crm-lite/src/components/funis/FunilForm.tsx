import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  GripVertical, 
  Settings, 
  X, 
  Plus,
  AlertCircle,
  Trash2,
  Star,
  StarOff,
  Trophy
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CriarFunilData, EditarFunilData, FunilComEtapas } from '@/types/global';
import { useAuth } from '@/contexts/auth';
import { FunisService } from '@/services/funisService';

interface FunilFormProps {
  funil?: FunilComEtapas;
  onSubmit: (data: CriarFunilData | EditarFunilData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

interface EtapaForm {
  id?: number;
  nome: string;
  palavras_chave: string;
  etapa_de_ganho?: boolean;
}

export function FunilForm({ funil, onSubmit, onCancel, isLoading = false }: FunilFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [nome, setNome] = useState(funil?.nome || '');
  const [etapas, setEtapas] = useState<EtapaForm[]>(
    funil?.etapas.map(e => ({
      id: e.id,
      nome: e.nome,
      palavras_chave: e.palavras_chave || '',
      etapa_de_ganho: e.etapa_de_ganho || false
    })) || [
      { nome: '', palavras_chave: '', etapa_de_ganho: false },
      { nome: '', palavras_chave: '', etapa_de_ganho: false }
    ]
  );
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isFunilPadrao, setIsFunilPadrao] = useState(false);
  const [isUpdatingPadrao, setIsUpdatingPadrao] = useState(false);

  useEffect(() => {
    // Garantir que sempre tenha pelo menos 2 etapas
    if (etapas.length < 2) {
      setEtapas([
        { nome: '', palavras_chave: '', etapa_de_ganho: false },
        { nome: '', palavras_chave: '', etapa_de_ganho: false }
      ]);
    }
  }, []);

  // Verificar se o funil atual é padrão
  useEffect(() => {
    const checkFunilPadrao = async () => {
      if (funil?.id) {
        try {
          const isPadrao = await FunisService.isFunilPadrao(funil.id);
          setIsFunilPadrao(isPadrao);
        } catch (error) {
          console.error('Erro ao verificar se funil é padrão:', error);
        }
      }
    };

    checkFunilPadrao();
  }, [funil?.id]);

  const toggleFunilPadrao = async () => {
    if (!funil?.id) {
      toast({
        title: "Erro",
        description: "Funil não encontrado",
        variant: "destructive"
      });
      return;
    }

    setIsUpdatingPadrao(true);
    try {
      if (isFunilPadrao) {
        // Remover funil padrão
        await FunisService.desmarcarFunilComoPadrao(funil.id);
        setIsFunilPadrao(false);
        toast({
          title: "Sucesso",
          description: "Funil removido como padrão",
        });
      } else {
        // Definir funil padrão
        await FunisService.marcarFunilComoPadrao(funil.id);
        setIsFunilPadrao(true);
        toast({
          title: "Sucesso",
          description: "Funil definido como padrão! Novos leads serão direcionados para a primeira etapa.",
        });
      }
    } catch (error) {
      console.error('Erro ao alterar funil padrão:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao alterar funil padrão",
        variant: "destructive"
      });
    } finally {
      setIsUpdatingPadrao(false);
    }
  };

  const addEtapa = () => {
    setEtapas([...etapas, { nome: '', palavras_chave: '', etapa_de_ganho: false }]);
  };

  const removeEtapa = (index: number) => {
    if (etapas.length <= 2) {
      toast({
        title: "Erro",
        description: "O funil deve ter pelo menos duas etapas",
        variant: "destructive"
      });
      return;
    }
    setEtapas(etapas.filter((_, i) => i !== index));
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', index.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }

    const newEtapas = [...etapas];
    const draggedEtapa = newEtapas[draggedIndex];
    
    // Remover a etapa arrastada da posição original
    newEtapas.splice(draggedIndex, 1);
    
    // Inserir a etapa na nova posição
    newEtapas.splice(dropIndex, 0, draggedEtapa);
    
    setEtapas(newEtapas);
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const updateEtapa = (index: number, field: keyof EtapaForm, value: string | boolean) => {
    const newEtapas = [...etapas];
    newEtapas[index] = { ...newEtapas[index], [field]: value };
    setEtapas(newEtapas);
  };

  const toggleEtapaDeGanho = (index: number) => {
    const newEtapas = etapas.map((etapa, i) => ({
      ...etapa,
      etapa_de_ganho: i === index ? !etapa.etapa_de_ganho : false
    }));
    setEtapas(newEtapas);
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!nome.trim()) {
      newErrors.nome = 'Nome do funil é obrigatório';
    }

    if (etapas.length < 2) {
      newErrors.etapas = 'O funil deve ter pelo menos duas etapas';
    }

    etapas.forEach((etapa, index) => {
      if (!etapa.nome.trim()) {
        newErrors[`etapa_${index}`] = `Nome da etapa ${index + 1} é obrigatório`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      const formData = {
        nome: nome.trim(),
        etapas: etapas.map(etapa => ({
          id: etapa.id,
          nome: etapa.nome.trim(),
          palavras_chave: etapa.palavras_chave.trim() || undefined,
          etapa_de_ganho: etapa.etapa_de_ganho || false
        }))
      };

      await onSubmit(formData);
    } catch (error) {
      console.error('Erro ao salvar funil:', error);
    }
  };

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {funil ? 'Editar Funil' : 'Criar Novo Funil'}
          {hasErrors && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Erros no formulário
            </Badge>
          )}
        </CardTitle>
        
        {/* Botão de Funil Padrão - apenas para funis existentes */}
        {funil?.id && (
          <div className="mt-2">
            <Button
              type="button"
              variant={isFunilPadrao ? "default" : "outline"}
              size="sm"
              onClick={toggleFunilPadrao}
              disabled={isUpdatingPadrao || isLoading}
              className={`flex items-center gap-2 ${
                isFunilPadrao 
                  ? 'bg-yellow-500 hover:bg-yellow-600 text-white' 
                  : 'hover:bg-yellow-50 hover:text-yellow-700'
              }`}
            >
              {isUpdatingPadrao ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
              ) : isFunilPadrao ? (
                <>
                  <Star className="h-4 w-4 fill-current" />
                  Funil Padrão
                </>
              ) : (
                <>
                  <StarOff className="h-4 w-4" />
                  Definir como Padrão
                </>
              )}
            </Button>
            {isFunilPadrao && (
              <p className="text-xs text-yellow-600 mt-1">
                ⭐ Novos leads serão direcionados para a primeira etapa deste funil
              </p>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nome do Funil */}
          <div className="space-y-2">
            <Label htmlFor="nome">Nome do Funil</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Digite o nome do funil"
              className={errors.nome ? 'border-red-500' : ''}
            />
            {errors.nome && (
              <p className="text-sm text-red-500">{errors.nome}</p>
            )}
          </div>

          {/* Etapas */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Etapas do Funil</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addEtapa}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Adicionar Etapa
              </Button>
            </div>
            
            <p className="text-sm text-gray-600">
              💡 Arraste as etapas para reordená-las conforme o fluxo do seu funil de vendas
            </p>

            {errors.etapas && (
              <p className="text-sm text-red-500">{errors.etapas}</p>
            )}

            <div className="space-y-3">
              {etapas.map((etapa, index) => (
                <div
                  key={index}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`p-4 border rounded-lg cursor-move transition-all duration-200 ${
                    errors[`etapa_${index}`] ? 'border-red-500 bg-red-50' : 'border-gray-200'
                  } ${
                    draggedIndex === index ? 'opacity-50 scale-95' : 'hover:shadow-md'
                  } ${
                    draggedIndex !== null && draggedIndex !== index ? 'border-dashed border-blue-300 bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Drag Handle */}
                    <div className="flex-shrink-0 mt-2">
                      <GripVertical className="h-5 w-5 text-gray-400" />
                    </div>

                    {/* Nome da Etapa */}
                    <div className="flex-1 space-y-2">
                      <Label htmlFor={`etapa_${index}`}>
                        Nome da Etapa {index + 1}
                      </Label>
                      <Input
                        id={`etapa_${index}`}
                        value={etapa.nome}
                        onChange={(e) => updateEtapa(index, 'nome', e.target.value)}
                        placeholder="Digite o nome da etapa"
                        className={errors[`etapa_${index}`] ? 'border-red-500' : ''}
                      />
                      {errors[`etapa_${index}`] && (
                        <p className="text-sm text-red-500">{errors[`etapa_${index}`]}</p>
                      )}
                    </div>

                    {/* Palavras-chave */}
                    <div className="flex-1 space-y-2">
                      <Label htmlFor={`palavras_${index}`}>
                        Palavras-chave (opcional)
                      </Label>
                      <Textarea
                        id={`palavras_${index}`}
                        value={etapa.palavras_chave}
                        onChange={(e) => updateEtapa(index, 'palavras_chave', e.target.value)}
                        placeholder="Palavras ou frases relacionadas à etapa"
                        rows={2}
                      />
                      
                      {/* Checkbox Etapa de Ganho */}
                      <div className="flex items-center space-x-2 pt-2">
                        <Checkbox
                          id={`etapa_ganho_${index}`}
                          checked={etapa.etapa_de_ganho || false}
                          onCheckedChange={() => toggleEtapaDeGanho(index)}
                        />
                        <label
                          htmlFor={`etapa_ganho_${index}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-1"
                        >
                          <Trophy className="h-4 w-4 text-green-600" />
                          Etapa de negócio ganho
                        </label>
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant="secondary" className="flex items-center gap-1">
                        {index + 1}
                        <Settings className="h-3 w-3" />
                      </Badge>
                      
                      {etapas.length > 2 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeEtapa(index)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading || hasErrors}
              className="min-w-[120px]"
            >
              {isLoading ? 'Salvando...' : funil ? 'Atualizar' : 'Criar Funil'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
