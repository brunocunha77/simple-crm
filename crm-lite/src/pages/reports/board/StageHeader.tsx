import React from "react";
import { Button } from "@/components/ui/button";
import { Edit, GripHorizontal } from "lucide-react";
import { Stage } from "./types";

interface StageHeaderProps {
  stage: Stage;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, stageId: string) => void;
  isDragging: boolean;
  onEdit: (stage: Stage) => void;
  leadCount: number;
}

export default function StageHeader({ 
  stage, 
  onDragStart, 
  isDragging,
  onEdit,
  leadCount
}: StageHeaderProps) {
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    // Configurar a imagem de drag se necessário
    if (e.dataTransfer.setDragImage) {
      const elem = e.currentTarget.cloneNode(true) as HTMLDivElement;
      elem.style.position = 'absolute';
      elem.style.top = '-1000px';
      elem.style.opacity = '0.8';
      document.body.appendChild(elem);
      e.dataTransfer.setDragImage(elem, 20, 20);
      setTimeout(() => {
        document.body.removeChild(elem);
      }, 0);
    }
    
    // Chamar o handler para iniciar o drag
    onDragStart(e, stage.id);
  };

  return (
    <div 
      className={`w-[280px] flex-shrink-0 px-2 ${isDragging ? 'opacity-40 cursor-grabbing' : 'cursor-grab'}`}
      draggable={true}
      onDragStart={handleDragStart}
    >
      <div 
        className="text-sm font-medium px-4 py-3 flex justify-between items-center rounded-t-md"
        style={{ 
          backgroundColor: `${stage.color}20`, 
          color: stage.color,
          boxShadow: isDragging ? 'none' : '0 1px 2px rgba(0,0,0,0.1)'
        }}
      >
        <div className="flex items-center gap-2">
          <GripHorizontal className="h-4 w-4 text-muted-foreground" />
          <span>{stage.name}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs font-normal">{leadCount}</span>
          {/* Botão de edição removido temporariamente */}
        </div>
      </div>
    </div>
  );
}
