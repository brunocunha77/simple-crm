import { Handle, Position } from '@xyflow/react';
import { ListTodo } from 'lucide-react';
import { MenuNodeData } from '@/types/workflow';
import { cn } from '@/lib/utils';

interface MenuNodeProps {
  data: MenuNodeData;
  selected?: boolean;
}

export function MenuNode({ data, selected }: MenuNodeProps) {
  const options = data.options || [];
  const messagePreview = data.message 
    ? (data.message.length > 50 ? data.message.substring(0, 50) + '...' : data.message)
    : 'Clique para configurar...';

  return (
    <div className={cn(
      "px-4 py-3 rounded-lg border-2 min-w-[280px] relative",
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
      
      {/* Handles de saída para cada opção */}
      {options.map((option, index) => (
        <Handle
          key={option.id}
          type="source"
          position={Position.Right}
          id={`option-${option.id}`}
          className="!bg-green-500 !w-3 !h-3 !border-2 !border-background"
          style={{
            top: `${20 + (index * (60 / Math.max(1, options.length - 1)))}%`,
          }}
        />
      ))}
      
      
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
          <ListTodo className="w-5 h-5 text-purple-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-foreground text-sm">Menu Interativo</div>
          <div className="text-xs text-primary">{options.length} opção{options.length !== 1 ? 'ões' : ''}</div>
        </div>
      </div>
      
      <div className="text-xs text-muted-foreground line-clamp-2 bg-muted/50 p-2 rounded mb-2">
        {messagePreview}
      </div>

      {options.length > 0 && (
        <div className="space-y-1">
          {options.slice(0, 3).map((option) => (
            <div 
              key={option.id} 
              className="text-xs bg-muted/30 px-2 py-1 rounded flex items-center gap-2"
            >
              <span className="font-medium text-primary">{option.id}.</span>
              <span className="text-muted-foreground truncate">{option.label}</span>
            </div>
          ))}
          {options.length > 3 && (
            <div className="text-xs text-muted-foreground text-center">
              +{options.length - 3} mais...
            </div>
          )}
        </div>
      )}

    </div>
  );
}
