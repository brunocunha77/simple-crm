import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Plus, 
  TrendingUp, 
  Hash,
  Calendar,
  Eye,
  Edit
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { FunisService } from '@/services/funisService';
import { FunilComEtapas } from '@/types/global';

interface FunisOverviewProps {
  onFunilSelect?: (funil: FunilComEtapas) => void;
  selectedFunilId?: number;
  showActions?: boolean;
}

export function FunisOverview({ 
  onFunilSelect, 
  selectedFunilId,
  showActions = true 
}: FunisOverviewProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [funis, setFunis] = useState<FunilComEtapas[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredFunilId, setHoveredFunilId] = useState<number | null>(null);

  useEffect(() => {
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

  const handleFunilClick = (funil: FunilComEtapas) => {
    if (onFunilSelect) {
      onFunilSelect(funil);
    }
  };

  const handleAddEtapa = (funil: FunilComEtapas) => {
    // Navegar para a página de funis com o funil selecionado para edição
    navigate('/funis', { state: { editFunil: funil } });
  };

  const handleViewFunil = (funil: FunilComEtapas) => {
    navigate('/funis', { state: { viewFunil: funil } });
  };

  const handleEditFunil = (funil: FunilComEtapas) => {
    navigate('/funis', { state: { editFunil: funil } });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-gray-600 text-sm">Carregando funis...</p>
        </div>
      </div>
    );
  }

  if (funis.length === 0) {
    return (
      <Card className="text-center py-8">
        <CardContent>
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-gray-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-1">
                Nenhum funil criado ainda
              </h3>
              <p className="text-gray-600 text-sm mb-3">
                Comece criando seu primeiro funil de vendas.
              </p>
              <Button 
                size="sm" 
                onClick={() => navigate('/funis')}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Criar Primeiro Funil
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Funis Disponíveis</h3>
        <Button 
          size="sm" 
          onClick={() => navigate('/funis')}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Gerenciar Funis
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {funis.map((funil) => (
          <Card 
            key={funil.id}
            className={`relative cursor-pointer transition-all duration-200 hover:shadow-md ${
              selectedFunilId === funil.id ? 'ring-2 ring-primary-500 bg-primary-50' : ''
            }`}
            onClick={() => handleFunilClick(funil)}
            onMouseEnter={() => setHoveredFunilId(funil.id)}
            onMouseLeave={() => setHoveredFunilId(null)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <CardTitle className="text-base font-semibold text-gray-900 line-clamp-2">
                  {funil.nome}
                </CardTitle>
                <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                  <Hash className="h-3 w-3" />
                  {funil.etapas.length}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Calendar className="h-3 w-3" />
                Criado em {formatDate(funil.created_at)}
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              {/* Etapas preview */}
              <div className="space-y-1 mb-3">
                {funil.etapas.slice(0, 3).map((etapa, index) => (
                  <div key={etapa.id} className="flex items-center gap-2 text-sm">
                    <Badge variant="outline" className="text-xs">
                      {index + 1}
                    </Badge>
                    <span className="text-gray-600 truncate">{etapa.nome}</span>
                  </div>
                ))}
                {funil.etapas.length > 3 && (
                  <div className="text-xs text-gray-500">
                    +{funil.etapas.length - 3} etapas mais
                  </div>
                )}
              </div>

              {/* Ações que aparecem ao passar o cursor */}
              {hoveredFunilId === funil.id && showActions && (
                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                  <div className="flex items-center gap-2">
                    {/* Botão para adicionar etapa */}
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddEtapa(funil);
                      }}
                      className="flex items-center gap-1 bg-white hover:bg-gray-100"
                    >
                      <Plus className="h-4 w-4" />
                      <span className="text-xs">Etapa</span>
                    </Button>

                    {/* Botão para visualizar */}
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewFunil(funil);
                      }}
                      className="flex items-center gap-1 bg-white hover:bg-gray-100"
                    >
                      <Eye className="h-4 w-4" />
                      <span className="text-xs">Ver</span>
                    </Button>

                    {/* Botão para editar */}
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditFunil(funil);
                      }}
                      className="flex items-center gap-1 bg-white hover:bg-gray-100"
                    >
                      <Edit className="h-4 w-4" />
                      <span className="text-xs">Editar</span>
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
