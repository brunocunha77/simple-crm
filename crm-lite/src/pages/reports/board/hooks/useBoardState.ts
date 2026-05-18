import { useState } from "react";
import { toast } from "sonner";
import { Lead, Stage } from "../types";
import { initialLeads, initialStages } from "../boardData";

export function useBoardState() {
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [leadsList, setLeadsList] = useState<Lead[]>(initialLeads);
  const [draggingLeadId, setDraggingLeadId] = useState<number | null>(null);
  const [draggingStageId, setDraggingStageId] = useState<number | null>(null);
  const [editingStageId, setEditingStageId] = useState<number | null>(null);
  const [isAddingStage, setIsAddingStage] = useState(false);
  const [stages, setStages] = useState<Stage[]>(initialStages);
  const [newStageName, setNewStageName] = useState("");
  const [newStageColor, setNewStageColor] = useState("bg-gray-100 text-gray-800");
  
  // Get selected lead
  const selectedLead = leadsList.find(lead => lead.id === selectedLeadId);
  
  // Group leads by stage (only leads in progress)
  const leadsByStage = stages.reduce((acc, stage) => {
    acc[stage.id] = leadsList.filter(lead => lead.stage === stage.id && lead.status === "Em andamento");
    return acc;
  }, {} as Record<number, Lead[]>);

  // Function to move a lead to another stage
  const moveLead = (leadId: number, newStageId: string) => {
    setLeadsList(prevLeads => 
      prevLeads.map(lead => {
        if (lead.id === leadId) {
          return { ...lead, stage: newStageId };
        }
        return lead;
      })
    );
    
    toast.success("Lead movido com sucesso!");
  };

  // Functions to mark lead as won or lost
  const markAsWon = (id: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setLeadsList(prevLeads =>
      prevLeads.map(lead =>
        lead.id === id ? { ...lead, probability: 100, status: "Ganho" } : lead
      )
    );
    toast.success("Lead marcado como ganho!");
  };
  
  const markAsLost = (id: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setLeadsList(prevLeads =>
      prevLeads.map(lead =>
        lead.id === id ? { ...lead, probability: 0, status: "Perdido" } : lead
      )
    );
    toast.error("Lead marcado como perdido!");
  };

  // Mark lead as in progress
  const markAsInProgress = (id: number) => {
    setLeadsList(prevLeads =>
      prevLeads.map(lead =>
        lead.id === id ? { ...lead, status: "Em andamento" } : lead
      )
    );
    toast.success("Lead marcado como Em andamento!");
  };

  return {
    selectedLeadId,
    setSelectedLeadId,
    leadsList,
    setLeadsList,
    draggingLeadId,
    setDraggingLeadId,
    draggingStageId,
    setDraggingStageId,
    editingStageId, 
    setEditingStageId,
    isAddingStage,
    setIsAddingStage,
    stages,
    setStages,
    newStageName,
    setNewStageName,
    newStageColor,
    setNewStageColor,
    selectedLead,
    leadsByStage,
    moveLead,
    markAsWon,
    markAsLost,
    markAsInProgress
  };
}
