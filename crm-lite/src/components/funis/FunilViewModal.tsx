import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar, 
  Hash, 
  Tag, 
  X,
  Edit,
  Trash2
} from 'lucide-react';
import { FunilComEtapas } from '@/types/global';

interface FunilViewModalProps {
  funil: FunilComEtapas | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (funil: FunilComEtapas) => void;
  onDelete: (id: number) => void;
}

export function FunilViewModal({ 
  funil, 
  isOpen, 
  onClose, 
  onEdit, 
  onDelete 
}: FunilViewModalProps) {
  if (!funil) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleEdit = () => {
    onEdit(funil);
    onClose();
  };

  const handleDelete = () => {
    onDelete(funil.id);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Detalhes do Funil</span>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Hash className="h-3 w-3" />
              {funil.etapas.length} etapas
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações do Funil */}
          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-gray-900">
              {funil.nome}
            </h3>
            
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Calendar className="h-4 w-4" />
              <span>Criado em {formatDate(funil.created_at)}</span>
            </div>
          </div>

          <Separator />

          {/* Etapas */}
          <div className="space-y-4">
            <h4 className="text-lg font-medium text-gray-900">
              Etapas do Funil
            </h4>
            
            <div className="space-y-3">
              {funil.etapas.map((etapa, index) => (
                <div
                  key={etapa.id}
                  className="p-4 border border-gray-200 rounded-lg bg-gray-50"
                >
                  <div className="flex items-start gap-3">
                    <Badge variant="default" className="flex-shrink-0 mt-1">
                      {index + 1}
                    </Badge>
                    
                    <div className="flex-1 space-y-2">
                      <h5 className="font-medium text-gray-900">
                        {etapa.nome}
                      </h5>
                      
                      {etapa.palavras_chave && (
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-600">
                            {etapa.palavras_chave}
                          </span>
                        </div>
                      )}
                      
                      <div className="text-xs text-gray-500">
                        Criada em {formatDate(etapa.created_at)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ações */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={onClose}
            >
              <X className="h-4 w-4 mr-2" />
              Fechar
            </Button>
            
            <Button
              variant="outline"
              onClick={handleEdit}
            >
              <Edit className="h-4 w-4 mr-2" />
              Editar Funil
            </Button>
            
            <Button
              variant="destructive"
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
