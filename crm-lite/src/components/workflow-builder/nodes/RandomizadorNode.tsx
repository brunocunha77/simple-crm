import { Handle, Position } from '@xyflow/react';
import { Shuffle } from 'lucide-react';
import { RandomizadorNodeData } from '@/types/workflow';
import { cn } from '@/lib/utils';

interface RandomizadorNodeProps {
  data: RandomizadorNodeData;
  selected?: boolean;
}

export function RandomizadorNode({ data, selected }: RandomizadorNodeProps) {
  const splits = data.splits || [
    { id: '1', label: 'Caminho A', percentage: 50 },
    { id: '2', label: 'Caminho B', percentage: 50 },
  ];

  return (
    <div className={cn(
      "px-4 py-3 rounded-lg border-2 min-w-[220px] relative",
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
      
      {/* Handles de saída dinâmicos baseados nos splits */}
      {splits.map((split, index) => (
        <Handle
          key={split.id}
          type="source"
          position={Position.Right}
          id={`split-${split.id}`}
          className="!bg-blue-500 !w-3 !h-3 !border-2 !border-background"
          style={{
            top: `${(index + 1) * (100 / (splits.length + 1))}%`,
          }}
        />
      ))}
      
      <Handle 
        type="source" 
        position={Position.Right} 
        id="error"
        className="!bg-red-500 !w-3 !h-3 !border-2 !border-background !top-auto !bottom-4" 
      />
      
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
          <Shuffle className="w-5 h-5 text-orange-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-foreground text-sm">Randomizador</div>
          <div className="text-xs text-muted-foreground">
            {splits.map(s => `${s.label}: ${s.percentage}%`).join(' | ')}
          </div>
        </div>
      </div>
    </div>
  );
}
