
import { useBoardState } from "./useBoardState";
import { Stage } from "../types";
import { toast } from "sonner";

export function useStageManagement() {
  const { 
    editingStageId,
    setEditingStageId,
    isAddingStage,
    setIsAddingStage,
    newStageName,
    setNewStageName,
    newStageColor,
    setNewStageColor,
    stages,
    setStages
  } = useBoardState();

  // Functions to manage stages
  const handleSaveStage = () => {
    if (editingStageId !== null) {
      // Update existing stage
      setStages(prevStages => 
        prevStages.map(stage => {
          if (stage.id === editingStageId) {
            return { ...stage, name: newStageName, color: newStageColor };
          }
          return stage;
        })
      );
      toast.success("Etapa atualizada com sucesso!");
    } else {
      // Add new stage
      const newStageId = Math.max(...stages.map(s => s.id), 0) + 1;
      setStages(prevStages => [
        ...prevStages,
        { id: newStageId, name: newStageName, color: newStageColor }
      ]);
      toast.success("Nova etapa criada com sucesso!");
    }
    
    handleCancelEdit();
  };

  const handleEditStage = (stage: Stage) => {
    setEditingStageId(stage.id);
    setNewStageName(stage.name);
    setNewStageColor(stage.color);
  };

  const handleAddStage = () => {
    setIsAddingStage(true);
    setEditingStageId(null);
    setNewStageName("");
    setNewStageColor("bg-gray-100 text-gray-800");
  };

  const handleCancelEdit = () => {
    setEditingStageId(null);
    setIsAddingStage(false);
    setNewStageName("");
    setNewStageColor("bg-gray-100 text-gray-800");
  };

  return {
    editingStageId,
    isAddingStage,
    newStageName,
    newStageColor,
    handleSaveStage,
    handleEditStage,
    handleAddStage,
    handleCancelEdit,
    setNewStageName,
    setNewStageColor
  };
}
