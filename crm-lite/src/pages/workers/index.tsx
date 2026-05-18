import React, { useEffect, useState, useCallback } from 'react';
import {
  Bot, Plus, Play, Pause, Trash2, ChevronDown, ChevronUp,
  Loader2, CheckCircle2, XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/lib/supabase';
import ReactMarkdown from 'react-markdown';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Worker {
  id: number;
  cliente_id: number;
  nome: string;
  prompt: string;
  cron_expr: string;
  cron_job_name: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

interface Execucao {
  id: number;
  worker_id: number;
  cliente_id: number;
  status: string;
  output: string | null;
  started_at: string | null;
  finished_at: string | null;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const FREQUENCIAS = [
  { label: 'Hoje',                 value: 'hoje'         },
  { label: 'Todo dia às 8h',       value: '0 11 * * *'   },
  { label: 'Todo dia às 9h',       value: '0 12 * * *'   },
  { label: 'Dias úteis às 8h',     value: '0 11 * * 1-5' },
  { label: 'Toda segunda às 8h',   value: '0 11 * * 1'   },
  { label: 'A cada hora',          value: '0 * * * *'    },
  { label: 'Personalizado',        value: 'custom'       },
];

const CRON_LABEL: Record<string, string> = {
  '0 11 * * *':   'Todo dia às 8h',
  '0 12 * * *':   'Todo dia às 9h',
  '0 11 * * 1-5': 'Dias úteis às 8h',
  '0 11 * * 1':   'Toda segunda às 8h',
  '0 * * * *':    'A cada hora',
};

function cronLabel(expr: string): string {
  return CRON_LABEL[expr] ?? expr;
}

function formatBrasilia(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ── HistoricoRow ──────────────────────────────────────────────────────────────

function HistoricoRow({ exec, onClick }: { exec: Execucao; onClick: () => void }) {
  const ok = exec.status === 'ok';
  return (
    <div
      className="flex items-start gap-2.5 py-2 border-b border-gray-100 last:border-0 cursor-pointer hover:bg-white/70 rounded-sm -mx-1 px-1 transition-colors"
      onClick={onClick}
    >
      {ok
        ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
        : <XCircle className="h-3.5 w-3.5 text-red-400 flex-shrink-0 mt-0.5" />
      }
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400">{formatBrasilia(exec.started_at)}</p>
        {exec.output && (
          <p className="text-xs text-gray-600 mt-0.5 line-clamp-2 leading-relaxed">
            {exec.output}
          </p>
        )}
      </div>
    </div>
  );
}

// ── ExecucaoModal ─────────────────────────────────────────────────────────────

interface ExecucaoModalProps {
  open: boolean;
  onClose: () => void;
  exec: Execucao | null;
  workerNome: string;
  workerPrompt: string;
}

function ExecucaoModal({ open, onClose, exec, workerNome, workerPrompt }: ExecucaoModalProps) {
  if (!exec) return null;
  const ok = exec.status === 'ok';
  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base leading-snug">
            {workerNome} · {formatBrasilia(exec.started_at)}
          </DialogTitle>
        </DialogHeader>

        <Badge
          variant="outline"
          className={`self-start ${ok
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : 'bg-red-50 text-red-600 border-red-200'
          }`}
        >
          {ok ? '✅ Sucesso' : '❌ Erro'}
        </Badge>

        <div className="flex-1 overflow-y-auto space-y-4 mt-1">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
              Prompt utilizado
            </p>
            <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2.5 leading-relaxed whitespace-pre-wrap">
              {workerPrompt}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
              Resultado
            </p>
            <div className="text-sm text-gray-800 bg-gray-50 rounded-lg px-3 py-2.5 leading-relaxed">
              {exec.output ? (
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                    ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
                    li: ({ children }) => <li className="mb-0.5">{children}</li>,
                    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                    code: ({ children }) => <code className="bg-gray-200 rounded px-1 text-xs font-mono">{children}</code>,
                  }}
                >
                  {exec.output}
                </ReactMarkdown>
              ) : (
                <p className="text-gray-400 italic text-sm">Sem resultado registrado.</p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="mt-2 pt-2 border-t border-gray-100">
          <Button variant="outline" size="sm" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── WorkerCard ────────────────────────────────────────────────────────────────

interface WorkerCardProps {
  worker: Worker;
  ultimaExec: Execucao | null;
  execucoes: Execucao[] | null;
  expanded: boolean;
  loadingExecucoes: boolean;
  running: boolean;
  toggling: boolean;
  deleting: boolean;
  onToggleHistorico: () => void;
  onExecutar: () => void;
  onToggle: () => void;
  onDeletar: () => void;
}

function WorkerCard({
  worker, ultimaExec, execucoes, expanded, loadingExecucoes,
  running, toggling, deleting,
  onToggleHistorico, onExecutar, onToggle, onDeletar,
}: WorkerCardProps) {
  const busy = running || toggling || deleting;
  const [selectedExec, setSelectedExec] = useState<Execucao | null>(null);
  const [promptModalOpen, setPromptModalOpen] = useState(false);

  return (
    <>
    <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
      <div className="p-4">
        {/* Title + badge */}
        <div className="flex items-start justify-between gap-3 mb-1">
          <h3 className="font-semibold text-gray-900 leading-snug">{worker.nome}</h3>
          <Badge
            variant="outline"
            className={
              worker.ativo
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 flex-shrink-0'
                : 'bg-gray-50 text-gray-400 border-gray-200 flex-shrink-0'
            }
          >
            {worker.ativo ? 'Ativo' : 'Pausado'}
          </Badge>
        </div>

        {/* Frequency */}
        <p className="text-xs text-gray-400 mb-1">{cronLabel(worker.cron_expr)}</p>

        {/* Prompt preview */}
        <p
          className="text-xs text-gray-300 mb-3 line-clamp-2 leading-relaxed cursor-pointer hover:text-gray-400 transition-colors"
          onClick={() => setPromptModalOpen(true)}
        >{worker.prompt}</p>

        {/* Última execução */}
        {ultimaExec ? (
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
            {ultimaExec.status === 'ok'
              ? <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              : <XCircle className="h-3 w-3 text-red-400" />
            }
            <span>Última execução: {formatBrasilia(ultimaExec.started_at)}</span>
          </div>
        ) : (
          <p className="text-xs text-gray-300 mb-3">Nenhuma execução registrada</p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={onExecutar}
            disabled={busy}
            className="text-xs h-7 px-2.5"
          >
            {running
              ? <Loader2 className="h-3 w-3 animate-spin mr-1" />
              : <Play className="h-3 w-3 mr-1" />
            }
            Executar agora
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={onToggle}
            disabled={busy}
            className="text-xs h-7 px-2.5"
          >
            {toggling
              ? <Loader2 className="h-3 w-3 animate-spin mr-1" />
              : worker.ativo
                ? <Pause className="h-3 w-3 mr-1" />
                : <Play className="h-3 w-3 mr-1" />
            }
            {worker.ativo ? 'Pausar' : 'Ativar'}
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={onToggleHistorico}
            className="text-xs h-7 px-2.5 text-gray-500 hover:text-gray-700"
          >
            {expanded
              ? <ChevronUp className="h-3 w-3 mr-1" />
              : <ChevronDown className="h-3 w-3 mr-1" />
            }
            Histórico
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={onDeletar}
            disabled={busy}
            className="text-xs h-7 px-2 text-red-400 hover:text-red-600 hover:bg-red-50 ml-auto"
          >
            {deleting
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Trash2 className="h-3.5 w-3.5" />
            }
          </Button>
        </div>
      </div>

      {/* Histórico expandido */}
      {expanded && (
        <div className="border-t border-gray-50 bg-gray-50/60 px-4 py-3">
          <p className="text-xs font-medium text-gray-500 mb-2">Últimas execuções</p>
          {loadingExecucoes ? (
            <div className="flex items-center gap-2 py-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-300" />
              <span className="text-xs text-gray-400">Carregando...</span>
            </div>
          ) : execucoes && execucoes.length > 0 ? (
            execucoes.map(exec => <HistoricoRow key={exec.id} exec={exec} onClick={() => setSelectedExec(exec)} />)
          ) : (
            <p className="text-xs text-gray-400 py-2">Nenhuma execução registrada ainda.</p>
          )}
        </div>
      )}
    </div>
    <ExecucaoModal
      open={selectedExec !== null}
      onClose={() => setSelectedExec(null)}
      exec={selectedExec}
      workerNome={worker.nome}
      workerPrompt={worker.prompt}
    />
    <Dialog open={promptModalOpen} onOpenChange={v => { if (!v) setPromptModalOpen(false); }}>
      <DialogContent className="sm:max-w-[560px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base leading-snug">{worker.nome}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto mt-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
            Prompt completo
          </p>
          <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2.5 leading-relaxed whitespace-pre-wrap">
            {worker.prompt}
          </p>
        </div>
        <DialogFooter className="mt-2 pt-2 border-t border-gray-100">
          <Button variant="outline" size="sm" onClick={() => setPromptModalOpen(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

// ── NovoWorkerModal ───────────────────────────────────────────────────────────

interface NovoWorkerModalProps {
  open: boolean;
  onClose: () => void;
  nome: string;
  onNomeChange: (v: string) => void;
  promptText: string;
  onPromptChange: (v: string) => void;
  frequencia: string;
  onFrequenciaChange: (v: string) => void;
  customCron: string;
  onCustomCronChange: (v: string) => void;
  creating: boolean;
  onCriar: () => void;
}

function NovoWorkerModal({
  open, onClose,
  nome, onNomeChange,
  promptText, onPromptChange,
  frequencia, onFrequenciaChange,
  customCron, onCustomCronChange,
  creating, onCriar,
}: NovoWorkerModalProps) {
  const [naturalText, setNaturalText] = useState('');
  const [cronPreview, setCronPreview] = useState('');
  const [convertendo, setConvertendo] = useState(false);
  const [horaHoje, setHoraHoje] = useState('08:00');

  useEffect(() => {
    if (!open) {
      setNaturalText('');
      setCronPreview('');
      setConvertendo(false);
      setHoraHoje('08:00');
    }
  }, [open]);

  useEffect(() => {
    if (frequencia !== 'hoje' || !horaHoje) return;
    const now = new Date();
    const [hours, minutes] = horaHoje.split(':').map(Number);
    const utcHours = hours + 3;
    const expr = `${minutes} ${utcHours} ${now.getDate()} ${now.getMonth() + 1} *`;
    setCronPreview(expr);
    onCustomCronChange(expr);
  }, [frequencia, horaHoje]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!naturalText.trim()) {
      setCronPreview('');
      onCustomCronChange('');
      return;
    }
    const timer = setTimeout(async () => {
      setConvertendo(true);
      try {
        const { data, error } = await supabase.functions.invoke('chat-assistente-inteligente', {
          body: {
            message: `Converta para expressão cron UTC (Brasil = UTC-3): "${naturalText}". Responda APENAS com a expressão cron, sem texto adicional.`,
            history: [],
          },
        });
        if (error) throw error;
        const cron = ((data?.response as string) ?? '').trim().split('\n')[0].trim();
        const valido = cron.split(/\s+/).length === 5;
        setCronPreview(valido ? cron : '');
        onCustomCronChange(valido ? cron : '');
      } catch {
        setCronPreview('');
      } finally {
        setConvertendo(false);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [naturalText]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Dialog open={open} onOpenChange={v => { if (!creating && !v) onClose(); }}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Novo Worker</DialogTitle>
          <DialogDescription>
            Configure um agente autônomo que executa tarefas no horário definido, sem precisar de interação.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="w-nome">Nome</Label>
            <Input
              id="w-nome"
              value={nome}
              onChange={e => onNomeChange(e.target.value)}
              placeholder="Ex: Análise diária de bugs"
              disabled={creating}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="w-prompt">O que o worker deve fazer</Label>
            <Textarea
              id="w-prompt"
              value={promptText}
              onChange={e => onPromptChange(e.target.value)}
              placeholder="Ex: Analisa as mensagens dos leads das últimas 24h, identifica bugs ou reclamações e cria uma tarefa no ClickUp para cada problema encontrado, classificando por severidade."
              className="min-h-[110px] resize-none text-sm"
              disabled={creating}
            />
          </div>

          <div className="grid gap-2">
            <Label>Frequência</Label>
            <Select value={frequencia} onValueChange={onFrequenciaChange} disabled={creating}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FREQUENCIAS.map(f => (
                  <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {frequencia === 'hoje' && (
              <div className="space-y-1.5">
                <Input
                  type="time"
                  value={horaHoje}
                  onChange={e => setHoraHoje(e.target.value)}
                  disabled={creating}
                  className="w-32"
                />
                {cronPreview && (
                  <p className="text-xs text-emerald-600">
                    Expressão gerada:{' '}
                    <code className="font-mono bg-emerald-50 px-1.5 py-0.5 rounded">{cronPreview}</code>
                    {' '}— executa hoje às {horaHoje}
                  </p>
                )}
              </div>
            )}

            {frequencia === 'custom' && (
              <div className="space-y-1.5">
                <div className="relative">
                  <Input
                    value={naturalText}
                    onChange={e => setNaturalText(e.target.value)}
                    placeholder="Ex: todo dia às 10h, toda sexta às 17h..."
                    disabled={creating}
                  />
                  {convertendo && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-gray-400" />
                  )}
                </div>
                {cronPreview && !convertendo && (
                  <p className="text-xs text-emerald-600">
                    Expressão gerada:{' '}
                    <code className="font-mono bg-emerald-50 px-1.5 py-0.5 rounded">{cronPreview}</code>
                  </p>
                )}
                {naturalText.trim() && !convertendo && !cronPreview && (
                  <p className="text-xs text-red-400">
                    Não foi possível converter. Tente ser mais específico.
                  </p>
                )}
              </div>
            )}

            {frequencia !== 'custom' && frequencia !== 'hoje' && (
              <p className="text-xs text-gray-400">
                Horários em UTC (Brasília = UTC−3).{' '}
                "8h Brasília" = <code className="bg-gray-100 px-1 rounded text-xs">0 11 * * *</code>
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={creating}>
            Cancelar
          </Button>
          <Button
            onClick={onCriar}
            disabled={creating || !nome.trim() || !promptText.trim()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {creating ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" />Criando...</>
            ) : (
              'Criar Worker'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── WorkersPage ───────────────────────────────────────────────────────────────

export default function WorkersPage() {
  const { user } = useAuth();
  const clienteId = user?.id_cliente ?? null;

  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loadingWorkers, setLoadingWorkers] = useState(true);

  // execucoes[workerId] = array completo (até 5) carregado ao expandir
  const [execucoes, setExecucoes] = useState<Record<number, Execucao[]>>({});
  // ultimaExec[workerId] = última execução carregada junto com a lista de workers
  const [ultimaExec, setUltimaExec] = useState<Record<number, Execucao>>({});

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [fullHistoricoLoaded, setFullHistoricoLoaded] = useState<Set<number>>(new Set());
  const [loadingExecucoes, setLoadingExecucoes] = useState<number | null>(null);
  const [runningId, setRunningId] = useState<number | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [nome, setNome] = useState('');
  const [promptText, setPromptText] = useState('');
  const [frequencia, setFrequencia] = useState('0 11 * * *');
  const [customCron, setCustomCron] = useState('');

  const resetForm = () => {
    setNome('');
    setPromptText('');
    setFrequencia('0 11 * * *');
    setCustomCron('');
  };

  // ── Data fetching ─────────────────────────────────────────────────────────

  const carregarWorkers = useCallback(async () => {
    if (!clienteId) return;
    setLoadingWorkers(true);
    try {
      const { data: workersData, error } = await supabase
        .from('workers_agendados')
        .select('*')
        .eq('cliente_id', clienteId)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const lista = workersData ?? [];
      setWorkers(lista);

      // Carrega última execução de cada worker para exibir no card sem expandir
      if (lista.length > 0) {
        const ids = lista.map(w => w.id);
        const { data: execData } = await supabase
          .from('workers_execucoes')
          .select('*')
          .in('worker_id', ids)
          .order('started_at', { ascending: false });

        const mapaUltima: Record<number, Execucao> = {};
        for (const exec of (execData ?? []) as Execucao[]) {
          if (!mapaUltima[exec.worker_id]) {
            mapaUltima[exec.worker_id] = exec;
          }
        }
        setUltimaExec(mapaUltima);
      }
    } catch {
      toast.error('Erro ao carregar workers');
    } finally {
      setLoadingWorkers(false);
    }
  }, [clienteId]);

  useEffect(() => { carregarWorkers(); }, [carregarWorkers]);

  const carregarExecucoesCompletas = async (workerId: number) => {
    setLoadingExecucoes(workerId);
    try {
      const { data, error } = await supabase
        .from('workers_execucoes')
        .select('*')
        .eq('worker_id', workerId)
        .order('started_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      setExecucoes(prev => ({ ...prev, [workerId]: data ?? [] }));
      setFullHistoricoLoaded(prev => new Set([...prev, workerId]));
    } catch {
      toast.error('Erro ao carregar histórico');
    } finally {
      setLoadingExecucoes(null);
    }
  };

  const toggleHistorico = async (workerId: number) => {
    if (expandedId === workerId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(workerId);
    if (!fullHistoricoLoaded.has(workerId)) {
      await carregarExecucoesCompletas(workerId);
    }
  };

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleCriar = async () => {
    if (!nome.trim() || !promptText.trim() || !clienteId) {
      toast.error('Preencha nome e prompt');
      return;
    }
    const cronExpr = (frequencia === 'custom' || frequencia === 'hoje') ? customCron.trim() : frequencia;
    if (!cronExpr) { toast.error('Informe a expressão cron'); return; }

    setCreating(true);
    try {
      const { data: novoWorker, error: insertErr } = await supabase
        .from('workers_agendados')
        .insert({
          cliente_id: clienteId,
          nome: nome.trim(),
          prompt: promptText.trim(),
          cron_expr: cronExpr,
          ativo: false,
        })
        .select()
        .single();
      if (insertErr) throw insertErr;

      const { error: gerenciarErr } = await supabase.functions.invoke('gerenciar-worker', {
        body: { action: 'criar', worker_id: novoWorker.id, cron_expr: cronExpr, cliente_id: clienteId },
      });
      if (gerenciarErr) throw gerenciarErr;

      toast.success(`Worker "${nome.trim()}" criado e agendado!`);
      setModalOpen(false);
      resetForm();
      await carregarWorkers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao criar worker';
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (worker: Worker) => {
    setTogglingId(worker.id);
    try {
      const { error } = await supabase.functions.invoke('gerenciar-worker', {
        body: {
          action: worker.ativo ? 'remover' : 'criar',
          worker_id: worker.id,
          cron_expr: worker.cron_expr,
          cliente_id: worker.cliente_id,
        },
      });
      if (error) throw error;
      toast.success(worker.ativo ? `"${worker.nome}" pausado` : `"${worker.nome}" ativado`);
      await carregarWorkers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao atualizar worker';
      toast.error(msg);
    } finally {
      setTogglingId(null);
    }
  };

  const handleDeletar = async (worker: Worker) => {
    if (!window.confirm(`Deletar o worker "${worker.nome}"? Esta ação não pode ser desfeita.`)) return;
    setDeletingId(worker.id);
    try {
      if (worker.cron_job_name) {
        await supabase.functions.invoke('gerenciar-worker', {
          body: { action: 'remover', worker_id: worker.id, cliente_id: worker.cliente_id },
        });
      }
      const { error } = await supabase.from('workers_agendados').delete().eq('id', worker.id);
      if (error) throw error;
      toast.success(`"${worker.nome}" deletado`);
      setWorkers(prev => prev.filter(w => w.id !== worker.id));
      if (expandedId === worker.id) setExpandedId(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao deletar worker';
      toast.error(msg);
    } finally {
      setDeletingId(null);
    }
  };

  const handleExecutarAgora = async (worker: Worker) => {
    setRunningId(worker.id);
    try {
      const { error } = await supabase.functions.invoke('executar-worker', {
        body: { worker_id: worker.id },
      });
      if (error) throw error;
      toast.success(`"${worker.nome}" executado com sucesso!`);
      // Recarrega execuções para refletir nova entrada
      await carregarExecucoesCompletas(worker.id);
      // Atualiza última execução no mapa
      const exec = execucoes[worker.id]?.[0];
      if (exec) setUltimaExec(prev => ({ ...prev, [worker.id]: exec }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao executar worker';
      toast.error(msg);
    } finally {
      setRunningId(null);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-[#FAF9F7]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 bg-white/70 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center">
            <Bot className="h-3.5 w-3.5 text-white" />
          </div>
          <div>
            <span className="text-sm font-medium text-gray-700">Workers</span>
            <span className="ml-2 text-xs text-gray-400">Agentes autônomos programados</span>
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => setModalOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs px-3"
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Novo Worker
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {loadingWorkers ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-7 w-7 animate-spin text-gray-300" />
          </div>
        ) : workers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-center mb-4">
              <Bot className="h-8 w-8 text-gray-300" />
            </div>
            <h3 className="text-base font-medium text-gray-700 mb-1">Nenhum worker criado</h3>
            <p className="text-sm text-gray-400 mb-6 max-w-xs leading-relaxed">
              Workers executam tarefas automaticamente no horário que você definir, sem precisar estar online.
            </p>
            <Button
              onClick={() => setModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeiro Worker
            </Button>
          </div>
        ) : (
          <div className="space-y-3 max-w-2xl">
            {workers.map(worker => (
              <WorkerCard
                key={worker.id}
                worker={worker}
                ultimaExec={ultimaExec[worker.id] ?? null}
                execucoes={execucoes[worker.id] ?? null}
                expanded={expandedId === worker.id}
                loadingExecucoes={loadingExecucoes === worker.id}
                running={runningId === worker.id}
                toggling={togglingId === worker.id}
                deleting={deletingId === worker.id}
                onToggleHistorico={() => toggleHistorico(worker.id)}
                onExecutar={() => handleExecutarAgora(worker)}
                onToggle={() => handleToggle(worker)}
                onDeletar={() => handleDeletar(worker)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      <NovoWorkerModal
        open={modalOpen}
        onClose={() => { if (!creating) { setModalOpen(false); resetForm(); } }}
        nome={nome}
        onNomeChange={setNome}
        promptText={promptText}
        onPromptChange={setPromptText}
        frequencia={frequencia}
        onFrequenciaChange={setFrequencia}
        customCron={customCron}
        onCustomCronChange={setCustomCron}
        creating={creating}
        onCriar={handleCriar}
      />
    </div>
  );
}
