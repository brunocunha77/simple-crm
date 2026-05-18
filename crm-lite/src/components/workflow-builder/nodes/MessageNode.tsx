import { Handle, Position } from '@xyflow/react';
import { MessageSquare, Variable } from 'lucide-react';
import { MessageNodeData } from '@/types/workflow';
import { cn } from '@/lib/utils';

interface MessageNodeProps {
  data: MessageNodeData;
  selected?: boolean;
}

export function MessageNode({ data, selected }: MessageNodeProps) {
  const variableCount = data.variables?.length || 0;
  const messageType = data.messageType || 'text';

  const getMessageTypeLabel = (type: string) => {
    switch (type) {
      case 'text': return 'Texto';
      case 'user_input': return 'Entrada do usuário';
      case 'delay': return 'Atraso';
      case 'audio': return 'Áudio';
      case 'file': return 'Arquivo';
      case 'url': return 'URL Dinâmica';
      default: return 'Mensagem';
    }
  };

  const getMessagePreview = () => {
    switch (messageType) {
      case 'text':
        return data.message || 'Clique para configurar...';
      case 'user_input':
        return `Aguardar resposta (${data.timeout || 60}s)`;
      case 'delay':
        const minutes = data.delayMinutes || 0;
        const seconds = data.delaySeconds || 0;
        return `Atraso: ${minutes > 0 ? `${minutes}min ` : ''}${seconds}s`;
      case 'audio':
        return data.audioUrl ? 'Áudio configurado' : 'Clique para configurar...';
      case 'file':
        return data.fileUrl ? `${data.fileType || 'Arquivo'} configurado` : 'Clique para configurar...';
      case 'url':
        return data.dynamicUrl || 'Clique para configurar...';
      default:
        return 'Clique para configurar...';
    }
  };

  return (
    <div className={cn(
      "px-4 py-3 rounded-lg border-2 min-w-[260px] relative",
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
      <Handle 
        type="source" 
        position={Position.Right} 
        id="success"
        className="!bg-blue-500 !w-3 !h-3 !border-2 !border-background" 
      />
      
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
          <MessageSquare className="w-5 h-5 text-blue-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-foreground text-sm">Enviar Mensagem</div>
          <div className="text-xs text-primary">{getMessageTypeLabel(messageType)}</div>
          {data.useTemplate && (
            <div className="text-xs text-primary">Template: {data.templateName}</div>
          )}
        </div>
      </div>
      
      <div className="text-xs text-muted-foreground line-clamp-2 bg-muted/50 p-2 rounded">
        {getMessagePreview()}
      </div>

      {variableCount > 0 && (
        <div className="mt-2 flex items-center gap-1 text-xs text-primary">
          <Variable className="w-3 h-3" />
          <span>{variableCount} variável{variableCount > 1 ? 'is' : ''}</span>
        </div>
      )}
    </div>
  );
}