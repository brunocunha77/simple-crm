import { Handle, Position } from '@xyflow/react';
import { Flag } from 'lucide-react';
import { EndNodeData } from '@/types/workflow';
import { cn } from '@/lib/utils';

interface EndNodeProps {
  data: EndNodeData;
  selected?: boolean;
}

export function EndNode({ data, selected }: EndNodeProps) {
  return (
    <div className={cn(
      "px-4 py-3 rounded-lg border-2 min-w-[150px] relative",
      "bg-card",
      selected 
        ? "border-primary shadow-lg shadow-primary/20" 
        : "border-border"
    )}>
      <Handle 
        type="target" 
        position={Position.Left} 
        className="!bg-muted-foreground !w-3 !h-3 !border-2 !border-background" 
      />
      
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center">
          <Flag className="w-5 h-5 text-destructive" />
        </div>
        <div className="font-medium text-foreground text-sm">Fim</div>
      </div>
    </div>
  );
}