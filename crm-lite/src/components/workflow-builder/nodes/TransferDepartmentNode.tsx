import { Handle, Position } from '@xyflow/react';
import { Users } from 'lucide-react';
import { TransferDepartmentNodeData } from '@/types/workflow';
import { cn } from '@/lib/utils';

interface TransferDepartmentNodeProps {
  data: TransferDepartmentNodeData;
  selected?: boolean;
}

export function TransferDepartmentNode({ data, selected }: TransferDepartmentNodeProps) {
  const deptId = data.id_departamento;
  const preview = deptId != null ? `Departamento #${deptId}` : 'Clique para configurar...';

  return (
    <div className={cn(
      "px-4 py-3 rounded-lg border-2 min-w-[240px] relative",
      "bg-teal-50 dark:bg-teal-950/20 border-teal-400",
      selected
        ? "border-primary shadow-lg shadow-primary/20"
        : "border-teal-400"
    )}>
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-teal-400 !w-3 !h-3 !border-2 !border-background"
      />
      
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-full bg-teal-200 dark:bg-teal-900/50 flex items-center justify-center">
          <Users className="w-5 h-5 text-teal-600 dark:text-teal-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-foreground text-sm">Transferir departamento</div>
          <div className="text-xs text-teal-700 dark:text-teal-300 line-clamp-1">{preview}</div>
        </div>
      </div>
      <div className="text-xs text-teal-900 dark:text-teal-100 bg-teal-100/80 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-800 p-2 rounded">
        O lead será transferido para o departamento selecionado e o fluxo continua.
      </div>
      <Handle
        type="source"
        position={Position.Right}
        id="default"
        className="!bg-teal-500 !w-3 !h-3 !border-2 !border-background"
      />
    </div>
  );
}
