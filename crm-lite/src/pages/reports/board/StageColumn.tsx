import React from "react";
import { Button } from "@/components/ui/button";
import LeadCard from "./LeadCard";
import { LeadWithStage, Stage } from "./types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus } from "lucide-react";

interface StageColumnProps {
  stage: Stage;
  leads: LeadWithStage[];
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>, stageId: string) => void;
  onSelectLead: (id: number) => void;
  onLeadDragStart: (e: React.DragEvent<HTMLDivElement>, leadId: number) => void;
  onLeadDragEnd: (e: React.DragEvent<HTMLDivElement>) => void;
  isDraggingStage: boolean;
  draggingLeadId: number | null;
  markAsWon: (id: number, e?: React.MouseEvent) => void;
  markAsLost: (id: number, e?: React.MouseEvent) => void;
  desfazerVenda?: (id: number, e?: React.MouseEvent) => Promise<void>;
  stageRef: (element: HTMLDivElement | null) => void;
  onShowDetails: (lead: LeadWithStage) => void;
}

export default function StageColumn({
  stage,
  leads,
  onDragOver,
  onDrop,
  onSelectLead,
  onLeadDragStart,
  onLeadDragEnd,
  isDraggingStage,
  draggingLeadId,
  markAsWon,
  markAsLost,
  desfazerVenda,
  stageRef,
  onShowDetails
}: StageColumnProps) {
  return (
    <div
      ref={stageRef}
      className="w-[280px] flex-shrink-0 mr-4 h-full"
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, stage.id)}
      style={{ opacity: isDraggingStage ? 0.5 : 1 }}
    >
      <ScrollArea className="h-[calc(100vh-100px)] rounded-b-md border bg-muted/5 max-h-full">
        <div className="p-3 space-y-3">
          {leads.map(lead => (
            <LeadCard
              key={lead.id}
              lead={lead}
              stageId={stage.id}
              onSelect={onSelectLead}
              onDragStart={onLeadDragStart}
              onDragEnd={onLeadDragEnd}
              isDragging={draggingLeadId === lead.id}
              markAsWon={markAsWon}
              markAsLost={markAsLost}
              desfazerVenda={desfazerVenda}
              onShowDetails={onShowDetails}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
