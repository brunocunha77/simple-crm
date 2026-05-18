import { Handle, Position } from '@xyflow/react';
import { Clock } from 'lucide-react';
import { DelayNodeData } from '@/types/workflow';
import { cn } from '@/lib/utils';

interface DelayNodeProps {
  data: DelayNodeData;
  selected?: boolean;
}

export function DelayNode({ data, selected }: DelayNodeProps) {
  const duration = data.duration || 0;
  const unit = data.unit || 'minutes';
  const unitLabel = unit === 'hours' ? 'h' : unit === 'minutes' ? 'min' : 's';
  
  const preview = `${duration} ${unitLabel}`;

  return (
    <div className={cn(
      "px-4 py-3 rounded-lg border-2 min-w-[240px] relative",
      "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-400",
      selected 
        ? "border-primary shadow-lg shadow-primary/20" 
        : "border-yellow-400"
    )}>
      <Handle 
        type="target" 
        position={Position.Left} 
        className="!bg-yellow-400 !w-3 !h-3 !border-2 !border-background" 
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        id="continue"
        className="!bg-blue-500 !w-3 !h-3 !border-2 !border-background" 
      />
      
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-full bg-yellow-200 dark:bg-yellow-900/50 flex items-center justify-center">
          <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-foreground text-sm">Aguardar (Delay)</div>
          <div className="text-xs text-yellow-700 dark:text-yellow-300">{preview}</div>
        </div>
      </div>
      
      <div className="text-xs text-yellow-900 dark:text-yellow-100 bg-yellow-100/80 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 p-2 rounded">
        Aguardará {preview}. Se o usuário responder antes, cancela o timer.
      </div>
    </div>
  );
}
