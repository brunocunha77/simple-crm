import { Handle, Position } from '@xyflow/react';
import { Play } from 'lucide-react';
import { TriggerNodeData } from '@/types/workflow';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface TriggerNodeProps {
  data: TriggerNodeData;
  selected?: boolean;
}

export function TriggerNode({ data, selected }: TriggerNodeProps) {
  const getTriggerLabel = (type: string) => {
    switch (type) {
      case 'new_lead': return 'Novo Lead';
      case 'message_received': return 'Mensagem Recebida';
      case 'status_changed': return 'Status Alterado';
      default: return type;
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "relative px-4 py-3 rounded-lg border-2 min-w-[200px] cursor-pointer group",
            "bg-card",
            selected
              ? "border-primary shadow-lg shadow-primary/20"
              : "border-border hover:border-primary/60 hover:shadow-md transition-all"
          )}
        >
          <Handle
            type="source"
            position={Position.Right}
            className="!bg-primary !w-3 !h-3 !border-2 !border-background"
          />

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
              <Play className="w-5 h-5 text-success" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-foreground text-sm">Gatilho</div>
              <div className="text-xs text-muted-foreground">
                Gatilho: {getTriggerLabel(data.triggerType)}
              </div>
            </div>
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top">
        <p>Clique para configurar o gatilho deste fluxo (modo compatibilidade).</p>
      </TooltipContent>
    </Tooltip>
  );
}