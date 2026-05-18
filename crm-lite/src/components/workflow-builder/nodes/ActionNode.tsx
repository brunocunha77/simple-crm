import { Handle, Position } from '@xyflow/react';
import { Zap } from 'lucide-react';
import { ActionNodeData } from '@/types/workflow';
import { cn } from '@/lib/utils';

interface ActionNodeProps {
  data: ActionNodeData;
  selected?: boolean;
}

const actionTypeLabels: Record<string, string> = {
  transfer_to_department: 'Transferir para departamento',
};

export function ActionNode({ data, selected }: ActionNodeProps) {
  const actionLabel = data.actionType ? actionTypeLabels[data.actionType] || data.actionType : 'Ação';
  const mappings = data.transferMappings || [];
  const summary = mappings.length > 0
    ? `${mappings.length} opção(ões) → departamento(s)`
    : 'Clique para configurar...';

  return (
    <div className={cn(
      "px-4 py-3 rounded-lg border-2 min-w-[240px] relative",
      "bg-card",
      selected
        ? "border-primary shadow-lg shadow-primary/20"
        : "border-border"
    )}>
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-muted-foreground !w-3 !h-3 !border-2 !border-background"
      />

      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
          <Zap className="w-5 h-5 text-amber-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-foreground text-sm">Ação</div>
          <div className="text-xs text-primary">{actionLabel}</div>
        </div>
      </div>

      <div className="text-xs text-muted-foreground line-clamp-2 bg-muted/50 p-2 rounded">
        {summary}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        id="default"
        className="!bg-amber-500 !w-3 !h-3 !border-2 !border-background"
      />
    </div>
  );
}
