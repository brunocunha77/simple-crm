import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Trash2 } from "lucide-react";
import { ColorOption } from "./types";

interface StageFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  stageName: string;
  stageColor: string;
  onStageSave: () => void;
  onStageDelete?: () => void;
  onStageNameChange: (name: string) => void;
  onStageColorChange: (color: string) => void;
  isEditing: boolean;
  availableColors: ColorOption[];
  canDelete?: boolean;
}

export default function StageFormModal({
  isOpen,
  onClose,
  stageName,
  stageColor,
  onStageSave,
  onStageDelete,
  onStageNameChange,
  onStageColorChange,
  isEditing,
  availableColors,
  canDelete = false
}: StageFormModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Etapa' : 'Criar Nova Etapa'}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Atualize as informações da etapa existente.' 
              : 'Adicione uma nova etapa para organizar seus leads.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Nome
            </Label>
            <Input
              id="name"
              value={stageName}
              onChange={(e) => onStageNameChange(e.target.value)}
              className="col-span-3"
              placeholder="Nome da etapa"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="color" className="text-right">
              Cor
            </Label>
            <div className="col-span-3 flex flex-wrap gap-2">
              {availableColors.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  className={`h-8 w-8 rounded-full cursor-pointer transition-all ${
                    stageColor === color.value ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''
                  }`}
                  style={{ backgroundColor: color.value }}
                  onClick={() => onStageColorChange(color.value)}
                  title={color.name}
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter className="flex justify-between items-center">
          <div>
            {isEditing && onStageDelete && (
              <Button 
                variant="destructive" 
                size="sm"
                onClick={onStageDelete}
                disabled={!canDelete}
                title={!canDelete ? "Não é possível excluir uma etapa que contém leads" : "Excluir etapa"}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={onStageSave} disabled={!stageName}>
              {isEditing ? 'Salvar Alterações' : 'Criar Etapa'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
