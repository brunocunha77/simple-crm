import { Handle, Position } from '@xyflow/react';
import { Play, Plus } from 'lucide-react';
import { InicioNodeData } from '@/types/workflow';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface InicioNodeProps {
  data: InicioNodeData;
  selected?: boolean;
}

export function InicioNode({ data, selected }: InicioNodeProps) {
  const getTriggerLabel = (type?: string) => {
    switch (type) {
      case 'message_received': return 'Receber Mensagem';
      case 'webhook_external': return 'Webhook Externo';
      default: return 'Sem gatilho';
    }
  };

  const triggerLabel = getTriggerLabel(data.triggerType);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "relative px-3 py-2.5 rounded-lg border-2 min-w-[200px] cursor-pointer group",
            "bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/20 dark:to-green-900/10",
            selected
              ? "border-primary shadow-lg shadow-primary/20"
              : "border-green-200 dark:border-green-800 hover:border-primary/60 hover:shadow-md transition-all"
          )}
        >
          <Handle
            type="source"
            position={Position.Right}
            id="success"
            className="!bg-blue-500 !w-3 !h-3 !border-2 !border-background"
          />

          <div className="flex flex-col gap-2">
            {/* Header */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <Play className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-foreground text-xs">Início do Fluxo</div>
                <div className="text-[10px] text-muted-foreground truncate">
                  Gatilho: {triggerLabel}
                </div>
              </div>
            </div>

            {/* Botão Adicionar Gatilho / Preview simples */}
            {!data.triggerType ? (
              <div className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md border border-dashed border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-950/30 text-xs text-green-700 dark:text-green-400">
                <Plus className="w-3.5 h-3.5" />
                Adicionar gatilho
              </div>
            ) : (
              <div className="text-[10px] text-green-700 dark:text-green-300 bg-white/40 dark:bg-green-950/30 border border-green-200/60 dark:border-green-800/60 rounded-md px-2 py-1">
                {data.triggerType === 'message_received' 
                  ? (data.keyword 
                      ? `Inicia quando mensagem contém: "${data.keyword}"`
                      : 'Inicia quando lead envia mensagem no WhatsApp/Instagram')
                  : 'Inicia quando webhook externo é chamado'}
              </div>
            )}
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top">
        <p>Clique para configurar como este workflow é iniciado (gatilho).</p>
      </TooltipContent>
    </Tooltip>
  );
}
