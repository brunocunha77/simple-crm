import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollText, X, CheckCircle2, AlertTriangle, Clock, Play, Loader2, Search, Download } from 'lucide-react';
import { WorkflowService } from '@/services/workflowService';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface WorkflowLog {
  id: string;
  workflow_id: string;
  execution_id: string;
  lead_id: number | null;
  node_id: string;
  node_type: string;
  status: 'started' | 'completed' | 'error' | 'waiting' | 'timeout' | 'skipped';
  input_data?: any;
  output_data?: any;
  error_message?: string;
  execution_time_ms?: number;
  created_at: string;
}

interface WorkflowDebuggerProps {
  workflowId: string;
  open: boolean;
  onClose: () => void;
}

const getStatusIcon = (status: WorkflowLog['status']) => {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    case 'error':
    case 'timeout':
      return <AlertTriangle className="w-4 h-4 text-red-600" />;
    case 'waiting':
      return <Clock className="w-4 h-4 text-yellow-600" />;
    case 'started':
      return <Play className="w-4 h-4 text-blue-600" />;
    case 'skipped':
      return <X className="w-4 h-4 text-gray-400" />;
    default:
      return <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />;
  }
};

const getStatusColor = (status: WorkflowLog['status']) => {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'error':
    case 'timeout':
      return 'bg-red-100 text-red-800 border-red-300';
    case 'waiting':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'started':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'skipped':
      return 'bg-gray-100 text-gray-600 border-gray-300';
    default:
      return 'bg-gray-100 text-gray-600 border-gray-300';
  }
};

const getNodeTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    inicio: 'Início',
    trigger: 'Gatilho',
    message: 'Mensagem',
    menu: 'Menu Interativo',
    condition: 'Condição (IF)',
    ia: 'IA',
    randomizador: 'Randomizador',
    end: 'Fim',
    workflow: 'Workflow',
  };
  return labels[type] || type;
};

export function WorkflowDebugger({ workflowId, open, onClose }: WorkflowDebuggerProps) {
  const [logs, setLogs] = useState<WorkflowLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    timeRange: 'all' as 'all' | '1h' | '24h' | '7d',
    status: 'all' as 'all' | 'error' | 'waiting' | 'completed',
    search: '',
  });

  const loadLogs = async () => {
    if (!workflowId) return;

    setLoading(true);
    try {
      const now = new Date();
      let startDate: Date | undefined;

      switch (filters.timeRange) {
        case '1h':
          startDate = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case '24h':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
      }

      const fetchedLogs = await WorkflowService.getWorkflowLogs(workflowId, {
        startDate,
        status: filters.status !== 'all' ? filters.status : undefined,
      });

      // Filtrar por busca (nome do lead, telefone, node_id)
      let filtered = fetchedLogs;
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filtered = fetchedLogs.filter((log: WorkflowLog) => {
          return (
            log.node_id?.toLowerCase().includes(searchLower) ||
            log.node_type?.toLowerCase().includes(searchLower) ||
            JSON.stringify(log.input_data || {}).toLowerCase().includes(searchLower) ||
            JSON.stringify(log.output_data || {}).toLowerCase().includes(searchLower)
          );
        });
      }

      setLogs(filtered);
    } catch (error) {
      console.error('Erro ao carregar logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && workflowId) {
      loadLogs();
      // Auto-refresh a cada 5 segundos quando aberto
      const interval = setInterval(loadLogs, 5000);
      return () => clearInterval(interval);
    }
  }, [open, workflowId, filters.timeRange, filters.status, filters.search]);

  const errorCount = logs.filter((l) => l.status === 'error' || l.status === 'timeout').length;
  const waitingCount = logs.filter((l) => l.status === 'waiting').length;

  const exportLogs = () => {
    const csv = [
      ['Timestamp', 'Node ID', 'Node Type', 'Status', 'Execution Time (ms)', 'Error Message', 'Input Data', 'Output Data'].join(','),
      ...logs.map((log) =>
        [
          log.created_at,
          log.node_id,
          log.node_type,
          log.status,
          log.execution_time_ms || '',
          log.error_message || '',
          JSON.stringify(log.input_data || {}),
          JSON.stringify(log.output_data || {}),
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workflow-logs-${workflowId}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ScrollText className="w-5 h-5 text-primary" />
              <SheetTitle>Logs de Execução</SheetTitle>
            </div>
            <div className="flex items-center gap-2">
              {errorCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {errorCount} erro{errorCount > 1 ? 's' : ''}
                </Badge>
              )}
              {waitingCount > 0 && (
                <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-800 border-yellow-300">
                  {waitingCount} aguardando
                </Badge>
              )}
              <Button variant="ghost" size="icon" onClick={exportLogs} title="Exportar logs">
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <SheetDescription>
            Histórico de execuções e debug do workflow
          </SheetDescription>
        </SheetHeader>

        {/* Filtros */}
        <div className="mt-4 space-y-3 pb-4 border-b">
          <div className="flex gap-2">
            <Select
              value={filters.timeRange}
              onValueChange={(value: any) => setFilters({ ...filters, timeRange: value })}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="1h">Última hora</SelectItem>
                <SelectItem value="24h">Últimas 24h</SelectItem>
                <SelectItem value="7d">Últimos 7 dias</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.status}
              onValueChange={(value: any) => setFilters({ ...filters, status: value })}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                <SelectItem value="error">Erros apenas</SelectItem>
                <SelectItem value="waiting">Aguardando</SelectItem>
                <SelectItem value="completed">Concluídos</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por node, tipo, dados..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-8"
              />
            </div>
          </div>
        </div>

        {/* Timeline de Logs */}
        <div className="mt-4 space-y-3">
          {loading && logs.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ScrollText className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum log encontrado</p>
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className={cn(
                  'border rounded-lg p-3 cursor-pointer transition-all hover:shadow-md',
                  expandedLogId === log.id && 'ring-2 ring-primary'
                )}
                onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{getStatusIcon(log.status)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">
                        {getNodeTypeLabel(log.node_type)}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn('text-xs', getStatusColor(log.status))}
                      >
                        {log.status}
                      </Badge>
                      {log.execution_time_ms && (
                        <span className="text-xs text-muted-foreground">
                          {log.execution_time_ms}ms
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mb-2">
                      {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Node: <code className="bg-muted px-1 rounded">{log.node_id}</code>
                      {log.lead_id && (
                        <>
                          {' • '}Lead ID: <code className="bg-muted px-1 rounded">{log.lead_id}</code>
                        </>
                      )}
                    </div>

                    {log.error_message && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
                        <strong>Erro:</strong> {log.error_message}
                      </div>
                    )}

                    {expandedLogId === log.id && (
                      <div className="mt-3 space-y-2 pt-3 border-t">
                        {log.input_data && (
                          <div>
                            <div className="text-xs font-medium mb-1 text-muted-foreground">Input:</div>
                            <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-40">
                              {JSON.stringify(log.input_data, null, 2)}
                            </pre>
                          </div>
                        )}
                        {log.output_data && (
                          <div>
                            <div className="text-xs font-medium mb-1 text-muted-foreground">Output:</div>
                            <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-40">
                              {JSON.stringify(log.output_data, null, 2)}
                            </pre>
                          </div>
                        )}
                        {log.lead_id && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full mt-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(`/leads/${log.lead_id}`, '_blank');
                            }}
                          >
                            Ver Lead #{log.lead_id}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
