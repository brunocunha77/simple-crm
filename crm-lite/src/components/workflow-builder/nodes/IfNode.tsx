import { Handle, Position } from '@xyflow/react';
import { GitBranch } from 'lucide-react';
import { IfNodeData } from '@/types/workflow';
import { cn } from '@/lib/utils';

interface IfNodeProps {
  data: IfNodeData;
  selected?: boolean;
}

const getOperatorLabel = (operator: IfNodeData['operator']) => {
  switch (operator) {
    case 'equals':
      return 'Igual a';
    case 'contains':
      return 'Contém';
    case 'starts_with':
      return 'Começa com';
    case 'ends_with':
      return 'Termina com';
    default:
      return operator;
  }
};

export function IfNode({ data, selected }: IfNodeProps) {
  const operator = data.operator || 'contains';
  const value = data.value;

  const operatorLabel = getOperatorLabel(operator);
  const valueLabel = value ? String(value) : '';

  let preview = `Mensagem ${operatorLabel.toLowerCase()}`;
  if (valueLabel) {
    preview += ` "${valueLabel}"`;
  }
  if (preview.length > 40) {
    preview = preview.slice(0, 37) + '...';
  }

  const trueLabel = 'Sim';
  const falseLabel = 'Não';

  return (
    <div
      className={cn(
        'px-4 py-3 rounded-lg border-2 min-w-[260px] relative',
        'bg-orange-50 border-orange-400',
        selected ? 'shadow-lg shadow-orange-200' : ''
      )}
    >
      {/* Handle de entrada */}
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-orange-400 !w-3 !h-3 !border-2 !border-background"
      />

      {/* Saída FALSE (topo) */}
      <Handle
        type="source"
        position={Position.Right}
        id="false"
        className="!bg-red-500 !w-3 !h-3 !border-2 !border-background !top-6"
      />
      <span className="absolute right-0 top-3 mr-4 text-[10px] text-red-600 font-medium">
        {falseLabel}
      </span>

      {/* Saída TRUE (baixo) */}
      <Handle
        type="source"
        position={Position.Right}
        id="true"
        className="!bg-green-500 !w-3 !h-3 !border-2 !border-background !bottom-6"
      />
      <span className="absolute right-0 bottom-3 mr-4 text-[10px] text-green-600 font-medium">
        {trueLabel}
      </span>

      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-full bg-orange-200 flex items-center justify-center">
          <GitBranch className="w-5 h-5 text-orange-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-foreground text-sm">Condição (IF)</div>
          <div className="text-xs text-orange-700">
            {trueLabel} / {falseLabel}
          </div>
        </div>
      </div>

      <div className="text-xs text-orange-900 bg-orange-100/80 border border-orange-200 p-2 rounded">
        {preview || 'Clique para configurar a condição...'}
      </div>
    </div>
  );
}

