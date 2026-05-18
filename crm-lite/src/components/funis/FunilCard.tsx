import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Edit, 
  Trash2, 
  Eye, 
  Calendar,
  Hash,
  Tag
} from 'lucide-react';
import { FunilComEtapas } from '@/types/global';

interface FunilCardProps {
  funil: FunilComEtapas;
  onEdit: (funil: FunilComEtapas) => void;
  onDelete: (id: number) => void;
  onView: (funil: FunilComEtapas) => void;
}

export function FunilCard({ funil, onEdit, onDelete, onView }: FunilCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900">
            {funil.nome}
          </CardTitle>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Hash className="h-3 w-3" />
            {funil.etapas.length} etapas
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Calendar className="h-4 w-4" />
          Criado em {formatDate(funil.created_at)}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Etapas */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Etapas do Funil:</h4>
          <div className="space-y-1">
            {funil.etapas.map((etapa, index) => (
              <div key={etapa.id} className="flex items-center gap-2 text-sm">
                <Badge variant="outline" className="text-xs">
                  {index + 1}
                </Badge>
                <span className="text-gray-600">{etapa.nome}</span>
                {etapa.palavras_chave && (
                  <div className="flex items-center gap-1 text-gray-500">
                    <Tag className="h-3 w-3" />
                    <span className="text-xs">{etapa.palavras_chave}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Ações */}
        <div className="flex items-center gap-2 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onView(funil)}
            className="flex-1"
          >
            <Eye className="h-4 w-4 mr-2" />
            Visualizar
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(funil)}
            className="flex-1"
          >
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(funil.id)}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
