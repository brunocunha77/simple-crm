import { Play, MessageSquare, Flag, Sparkles, Shuffle, ListTodo, GitBranch, Clock, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface NodeSidebarProps {
  onAddNode: (type: string) => void;
}

const nodeTypes = [
  {
    type: 'inicio',
    label: 'Início',
    icon: Play,
    color: 'text-green-500',
  },
  {
    type: 'message',
    label: 'Mensagem',
    icon: MessageSquare,
    color: 'text-blue-500',
  },
  {
    type: 'menu',
    label: 'Menu Interativo',
    icon: ListTodo,
    color: 'text-purple-500',
  },
  {
    type: 'condition',
    label: 'Condição',
    icon: GitBranch,
    color: 'text-orange-500',
  },
  {
    type: 'delay',
    label: 'Aguardar',
    icon: Clock,
    color: 'text-yellow-500',
  },
  {
    type: 'transfer_department',
    label: 'Transferir departamento',
    icon: Users,
    color: 'text-teal-500',
  },
  {
    type: 'ia',
    label: 'IA',
    icon: Sparkles,
    color: 'text-purple-500',
  },
  {
    type: 'randomizador',
    label: 'Randomizador',
    icon: Shuffle,
    color: 'text-orange-500',
  },
  {
    type: 'end',
    label: 'Fim',
    icon: Flag,
    color: 'text-red-500',
  },
];

export function NodeSidebar({ onAddNode }: NodeSidebarProps) {
  return (
    <div className="w-[60px] bg-sidebar border-r border-sidebar-border flex flex-col items-center py-4 gap-2">
      {nodeTypes.map((node) => (
        <Tooltip key={node.type}>
          <TooltipTrigger asChild>
            <button
              onClick={() => onAddNode(node.type)}
              className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200",
                "bg-card hover:bg-accent border border-border hover:border-primary/50",
                "hover:scale-110 active:scale-95"
              )}
            >
              <node.icon className={cn("w-5 h-5", node.color)} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-popover text-popover-foreground">
            <p>{node.label}</p>
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
