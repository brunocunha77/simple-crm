
import { useRef } from "react";
import { useBoardState } from "./useBoardState";
import { toast } from "sonner";

export function useDragAndDrop() {
  const { 
    setDraggingLeadId, 
    setDraggingStageId,
    moveLead,
    setStages
  } = useBoardState();
  
  const stageRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  // Functions for drag and drop of leads
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, leadId: number) => {
    setDraggingLeadId(leadId);
    e.dataTransfer.setData("lead", leadId.toString());
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, stageId: number) => {
    e.preventDefault();
    
    // Check if it's a lead being dropped
    const leadId = e.dataTransfer.getData("lead");
    if (leadId) {
      moveLead(Number(leadId), stageId);
      setDraggingLeadId(null);
      return;
    }
    
    // Check if it's a stage being dropped for reordering
    const sourceStageId = e.dataTransfer.getData("stage");
    if (sourceStageId) {
      reorderStages(Number(sourceStageId), stageId);
      setDraggingStageId(null);
    }
  };

  // Functions for stage dragging and reordering
  const handleStageDragStart = (e: React.DragEvent<HTMLDivElement>, stageId: number) => {
    setDraggingStageId(stageId);
    e.dataTransfer.setData("stage", stageId.toString());
    e.dataTransfer.effectAllowed = "move";
  };
  
  const reorderStages = (sourceId: number, targetId: number) => {
    if (sourceId === targetId) return;
    
    setStages(prevStages => {
      const newStages = [...prevStages];
      const sourceIndex = newStages.findIndex(s => s.id === sourceId);
      const targetIndex = newStages.findIndex(s => s.id === targetId);
      
      if (sourceIndex === -1 || targetIndex === -1) return prevStages;
      
      const [movedStage] = newStages.splice(sourceIndex, 1);
      newStages.splice(targetIndex, 0, movedStage);
      
      return newStages;
    });
    
    toast.success("Etapa reordenada com sucesso!");
  };

  return {
    stageRefs,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleStageDragStart
  };
}
