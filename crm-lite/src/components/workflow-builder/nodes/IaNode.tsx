import { Handle, Position } from '@xyflow/react';
import { Sparkles } from 'lucide-react';
import { IaNodeData } from '@/types/workflow';
import { cn } from '@/lib/utils';

interface IaNodeProps {
  data: IaNodeData;
  selected?: boolean;
}

export function IaNode({ data, selected }: IaNodeProps) {
  const promptPreview = data.systemPrompt 
    ? (data.systemPrompt.length > 50 ? data.systemPrompt.substring(0, 47) + '...' : data.systemPrompt)
    : 'Clique para configurar...';

  return (
    <div className={cn(
      "px-4 py-3 rounded-lg border-2 min-w-[260px] relative",
      "bg-purple-50 dark:bg-purple-950/20 border-purple-400",
      selected 
        ? "border-primary shadow-lg shadow-primary/20" 
        : "border-purple-400"
    )}>
      <Handle 
        type="target" 
        position={Position.Left} 
        className="!bg-purple-400 !w-3 !h-3 !border-2 !border-background" 
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        id="response"
        className="!bg-blue-500 !w-3 !h-3 !border-2 !border-background" 
      />
      
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-full bg-purple-200 dark:bg-purple-900/50 flex items-center justify-center relative">
          <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          <span className="absolute -top-1 -right-1 bg-purple-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
            IA
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-foreground text-sm">Inteligência Artificial</div>
          <div className="text-xs text-purple-700 dark:text-purple-300">
            IA Assistente
          </div>
        </div>
      </div>
      
      <div className="text-xs text-purple-900 dark:text-purple-100 bg-purple-100/80 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 p-2 rounded">
        {promptPreview}
      </div>
    </div>
  );
}
