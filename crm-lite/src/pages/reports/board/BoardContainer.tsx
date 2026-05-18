import React from "react";
import { Stage, LeadWithStage } from "./types";
import StageHeader from "./StageHeader";
import StageColumn from "./StageColumn";
import { Loader2 } from "lucide-react";

interface BoardContainerProps {
  stages: Stage[];
  leadsByStage: Record<string, LeadWithStage[]>;
  draggingLeadId: number | null;
  draggingStageId: string | null;
  stageRefs: React.MutableRefObject<{ [key: string]: HTMLDivElement | null }>;
  onStageDragStart: (e: React.DragEvent<HTMLDivElement>, stageId: string) => void;
  onLeadDragStart: (e: React.DragEvent<HTMLDivElement>, leadId: number) => void;
  onLeadDragEnd: (e: React.DragEvent<HTMLDivElement>) => void;
  handleDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  handleDrop: (e: React.DragEvent<HTMLDivElement>, stageId: string) => void;
  onSelectLead: (id: number) => void;
  onEditStage: (stage: Stage) => void;
  markAsWon: (id: number, e?: React.MouseEvent) => void;
  markAsLost: (id: number, e?: React.MouseEvent) => void;
  desfazerVenda?: (id: number, e?: React.MouseEvent) => Promise<void>;
  loading: boolean;
  onShowDetails: (lead: LeadWithStage) => void;
}

export default function BoardContainer({
  stages,
  leadsByStage,
  draggingLeadId,
  draggingStageId,
  stageRefs,
  onStageDragStart,
  onLeadDragStart,
  onLeadDragEnd,
  handleDragOver,
  handleDrop,
  onSelectLead,
  onEditStage,
  markAsWon,
  markAsLost,
  desfazerVenda,
  loading,
  onShowDetails
}: BoardContainerProps) {
  if (loading) {
    return (
      <div className="flex-1 border rounded-lg overflow-hidden flex items-center justify-center bg-muted/10">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span>Carregando quadro...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 border rounded-lg overflow-hidden flex flex-col bg-muted/10 h-full">
      <div className="flex-1 overflow-x-auto pb-4 h-full">
        <div className="flex flex-col min-w-fit h-full">
          {/* Stage Headers Row */}
          <div className="flex sticky top-0 z-10 bg-background border-b px-4 py-3">
            {stages.map(stage => (
              <div 
                key={`header-${stage.id}`} 
                className="flex-shrink-0 w-[280px] mr-4"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage.id)}
                onDragLeave={(e) => {
                  e.currentTarget.style.background = '';
                }}
              >
                <StageHeader
                  stage={stage}
                  onDragStart={onStageDragStart}
                  isDragging={draggingStageId === stage.id}
                  onEdit={onEditStage}
                  leadCount={leadsByStage[stage.id]?.length || 0}
                />
              </div>
            ))}
          </div>
          
          {/* Stage Columns */}
          <div className="flex px-4 pt-3 h-full min-h-0">
            {stages.map(stage => (
              <StageColumn
                key={`column-${stage.id}`}
                stage={stage}
                leads={leadsByStage[stage.id] || []}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onSelectLead={onSelectLead}
                onLeadDragStart={onLeadDragStart}
                onLeadDragEnd={onLeadDragEnd}
                isDraggingStage={draggingStageId === stage.id}
                draggingLeadId={draggingLeadId}
                markAsWon={markAsWon}
                markAsLost={markAsLost}
                desfazerVenda={desfazerVenda}
                stageRef={(el) => (stageRefs.current[stage.id] = el)}
                onShowDetails={onShowDetails}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
