import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth';
import { useUserType } from '@/hooks/useUserType';
import { clientesService } from '@/services/clientesService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Calendar,
  Bell,
  RefreshCw,
  Users,
  ShoppingCart,
  Target,
  Eye,
  EyeOff,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  Clock,
  MessageSquare,
  FileText,
  CheckCircle,
  Lightbulb,
  ArrowRight,
  ChevronRight,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format, eachDayOfInterval, startOfDay, endOfDay, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Tipos para os dados do dashboard
interface DailyMetric {
  date: string;
  leads: number;
  vendas: number;
  oportunidades: number;
}

interface KPIs {
  leads30dias: number;
  vendas30dias: number;
  oportunidades30dias: number;
  totalLeads: number;
  conversoes: number;
  receita: number;
  roi: number;
}

interface Funil {
  entrouEmContato: number;
  qualificado: number;
  propostaEnviada: number;
  vendaRealizada: number;
}

interface Canal {
  nome: string;
  leads: number;
  investido: number;
  retorno: number;
  roi: number | null;
  cor: string;
}

interface Alerta {
  tipo: 'danger' | 'warning' | 'success';
  titulo: string;
  descricao: string;
  acao?: string;
  tempo: string;
  icone: React.ComponentType<{ className?: string }>;
}

interface Meta {
  faltante: number;
  diasRestantes: number;
}

interface UseDashboardDataReturn {
  loading: boolean;
  error: string | null;
  dailyMetrics: DailyMetric[];
  kpis: KPIs;
  funil: Funil;
  canais: Canal[];
  alertas: Alerta[];
  meta: Meta;
  metaValor: number | null;
  idCliente: number | null;
  dataHoraAtualizacaoRelatorio: string | null;
  reload: () => Promise<void>;
}


function useDashboardData(dateRange?: DateRange): UseDashboardDataReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dailyMetrics, setDailyMetrics] = useState<DailyMetric[]>([]);
  const [idCliente, setIdCliente] = useState<number | null>(null);
  const [dataHoraAtualizacaoRelatorio, setDataHoraAtualizacaoRelatorio] = useState<string | null>(null);

  const [kpis, setKpis] = useState<KPIs>({
    leads30dias: 0,
    vendas30dias: 0,
    oportunidades30dias: 0,
    totalLeads: 0,
    conversoes: 0,
    receita: 0,
    roi: 0,
  });


const [funil] = useState<Funil>({
  entrouEmContato: 0,
  qualificado: 0,
  propostaEnviada: 0,
  vendaRealizada: 0,
});

const [canais] = useState<Canal[]>([]);

const [alertas] = useState<Alerta[]>([]);

const [meta, setMeta] = useState<Meta>({
  faltante: 0,
  diasRestantes: 0,
});

const [metaValor, setMetaValor] = useState<number | null>(null);

const load = async () => {
  try {
    setLoading(true);
    setError(null);

    // Buscar id_cliente do usuário autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('Usuário não autenticado');

    const { data: clienteInfo, error: clienteError } = await supabase
      .from('clientes_info')
      .select('id, metas_dashboard, data_hora_atualizacao_relatorio')
      .eq('user_id_auth', user.id)
      .single();

    if (clienteError) throw clienteError;
    if (!clienteInfo?.id) throw new Error('Cliente não encontrado');

    const clienteId = clienteInfo.id;
    setIdCliente(clienteId);
    setDataHoraAtualizacaoRelatorio(clienteInfo.data_hora_atualizacao_relatorio ?? null);

    // Carregar meta do banco de dados
    const metaSalva = clienteInfo.metas_dashboard;
    if (metaSalva !== null && metaSalva !== undefined) {
      setMetaValor(Number(metaSalva));
    } else {
      setMetaValor(null);
    }

    // Verificar se idCliente está disponível antes de buscar dados
    if (!clienteId) {
      throw new Error('ID do cliente não disponível');
    }

    const from = dateRange?.from
      ? dateRange.from.toISOString().slice(0, 10)
      : null;

    const to = dateRange?.to
      ? dateRange.to.toISOString().slice(0, 10)
      : null;

    // Query A: Buscar Leads
    // SELECT * FROM leads WHERE id_cliente = clienteId AND data_criacao >= from AND data_criacao <= to
    let queryLeads = supabase
      .from('leads')
      .select('data_criacao')
      .eq('id_cliente', clienteId);

    if (from) queryLeads = queryLeads.gte('data_criacao', from);
    if (to) queryLeads = queryLeads.lte('data_criacao', to);

    const { data: leadsRows, error: leadsErr } = await queryLeads;
    if (leadsErr) throw leadsErr;

    // Query C: Buscar Oportunidades (via etiquetas)
    // SELECT * FROM leads WHERE id_cliente = clienteId AND data_criacao >= from AND data_criacao <= to AND id_etiquetas contém algum ID de etiqueta
    // Primeiro, buscar IDs das etiquetas do cliente
    const { data: etiquetasRows, error: etiquetasErr } = await supabase
      .from('etiquetas')
      .select('id')
      .or(`id_cliente.eq.${clienteId},id_cliente.is.null`);

    if (etiquetasErr) throw etiquetasErr;

    // Extrair IDs das etiquetas como strings
    const idsEtiquetas = etiquetasRows?.map(e => e.id.toString()) || [];

    // Buscar leads com etiquetas no período
    let queryOportunidades = supabase
      .from('leads')
      .select('data_criacao, id_etiquetas')
      .eq('id_cliente', clienteId)
      .not('id_etiquetas', 'is', null)
      .neq('id_etiquetas', '');

    if (from) queryOportunidades = queryOportunidades.gte('data_criacao', from);
    if (to) queryOportunidades = queryOportunidades.lte('data_criacao', to);

    const { data: oportunidadesRows, error: oportunidadesErr } = await queryOportunidades;
    if (oportunidadesErr) throw oportunidadesErr;

    // Filtrar leads que têm alguma das etiquetas do cliente
    // Como id_etiquetas é texto (ex: "8" ou "8,9,10"), verificar se contém algum ID
    const oportunidadesFiltradas = oportunidadesRows?.filter((lead) => {
      if (!lead.id_etiquetas) return false;
      // Parsear IDs da string (ex: "8,9,10" -> [8, 9, 10])
      const ids = lead.id_etiquetas
        .split(',')
        .map(id => id.trim())
        .filter(id => id !== '')
        .map(id => id.toString());
      // Verificar se algum ID de etiqueta do cliente está presente
      return ids.some(id => idsEtiquetas.includes(id));
    }) || [];

    // Converter para formato esperado
    const oportunidadesRowsFormatted: { data_criacao: string }[] = oportunidadesFiltradas.map(op => ({
      data_criacao: op.data_criacao
    }));

    // Query B: Buscar Vendas
    // SELECT * FROM leads WHERE id_cliente = clienteId AND data_venda >= from AND data_venda <= to AND venda = true
    let queryVendas = supabase
      .from('leads')
      .select('data_venda')
      .eq('id_cliente', clienteId)
      .eq('venda', true)
      .not('data_venda', 'is', null);

    if (from) queryVendas = queryVendas.gte('data_venda', from);
    if (to) queryVendas = queryVendas.lte('data_venda', to);

    const { data: vendasRows, error: vendasErr } = await queryVendas;
    if (vendasErr) throw vendasErr;

    // Agregar dados por dia
    const metricsByDate: Record<string, { leads: number; vendas: number; oportunidades: number }> = {};

    // Processar Leads por data_criacao
    if (leadsRows) {
      leadsRows.forEach((lead) => {
        const dataCriacao = lead.data_criacao ? lead.data_criacao.slice(0, 10) : null;
        if (!dataCriacao) return;

        // Inicializar métricas para o dia de criação do lead
        if (!metricsByDate[dataCriacao]) {
          metricsByDate[dataCriacao] = { leads: 0, vendas: 0, oportunidades: 0 };
        }

        // Contar lead por data_criacao
        metricsByDate[dataCriacao].leads += 1;
      });
    }

    // Processar Oportunidades por data_criacao
    if (oportunidadesRowsFormatted) {
      oportunidadesRowsFormatted.forEach((oportunidade) => {
        const dataCriacao = oportunidade.data_criacao ? oportunidade.data_criacao.slice(0, 10) : null;
        if (!dataCriacao) return;

        // Inicializar métricas para o dia de criação da oportunidade se não existir
        if (!metricsByDate[dataCriacao]) {
          metricsByDate[dataCriacao] = { leads: 0, vendas: 0, oportunidades: 0 };
        }

        // Contar oportunidade por data_criacao
        metricsByDate[dataCriacao].oportunidades += 1;
      });
    }

    // Processar Vendas por data_venda
    if (vendasRows) {
      vendasRows.forEach((venda) => {
        const dataVenda = venda.data_venda ? venda.data_venda.slice(0, 10) : null;
        if (!dataVenda) return;

        // Inicializar métricas para o dia da venda se não existir
        if (!metricsByDate[dataVenda]) {
          metricsByDate[dataVenda] = { leads: 0, vendas: 0, oportunidades: 0 };
        }

        // Contar venda por data_venda
        metricsByDate[dataVenda].vendas += 1;
      });
    }

    // Garantir que todos os dias do período sejam incluídos, mesmo sem dados
    // Isso evita que o gráfico mostre linhas variáveis quando há apenas um dia
    const allDaysMap = new Map<string, DailyMetric>();
    
    // Se temos um período definido, criar entradas para todos os dias
    if (from && to) {
      const startDate = startOfDay(new Date(from));
      const endDate = endOfDay(new Date(to));
      const allDays = eachDayOfInterval({ start: startDate, end: endDate });
      
      allDays.forEach((day) => {
        const dateKey = day.toISOString().slice(0, 10);
        allDaysMap.set(dateKey, {
          date: dateKey,
          leads: 0,
          vendas: 0,
          oportunidades: 0,
        });
      });
    }
    
    // Preencher com os dados reais
    Object.entries(metricsByDate).forEach(([date, metrics]) => {
      allDaysMap.set(date, {
        date,
        leads: metrics.leads,
        vendas: metrics.vendas,
        oportunidades: metrics.oportunidades,
      });
    });
    
    // Converter para array e ordenar por data
    const dailyMetricsArray: DailyMetric[] = Array.from(allDaysMap.values())
      .sort((a, b) => a.date.localeCompare(b.date));

    setDailyMetrics(dailyMetricsArray);

          // ✅ KPIs (últimos 30 dias - únicos por telefone)
          const { data: kpiRow, error: kpiError } = await supabase
          .from('vw_dashboard_kpis_30d')
          .select('leads_30d_unicos, vendas_30d_unicas, oportunidades_30d_unicas')
          .single();
  
        if (kpiError) throw kpiError;
  
        setKpis((prev) => ({
          ...prev,
          leads30dias: kpiRow?.leads_30d_unicos ?? 0,
          vendas30dias: kpiRow?.vendas_30d_unicas ?? 0,
          oportunidades30dias: kpiRow?.oportunidades_30d_unicas ?? 0,
  
          // por enquanto mantemos esses mapeados assim (ajustamos depois se quiser outros KPIs)
          totalLeads: kpiRow?.leads_30d_unicos ?? 0,
          conversoes: kpiRow?.vendas_30d_unicas ?? 0,
          receita: 0,
          roi: 0,
        }));  
    
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : 'Erro ao carregar métricas diárias';
    setError(errorMessage);
  } finally {
    setLoading(false);
  }
};


useEffect(() => {
  load();
}, [
  dateRange?.from?.toISOString(),
  dateRange?.to?.toISOString(),
]);


return {
  loading,
  error,
  dailyMetrics,
  kpis,
  funil,
  canais,
  alertas,
  meta,
  metaValor,
  idCliente,
  dataHoraAtualizacaoRelatorio,
  reload: load,
};
}

export default function NovoDashboard() {
  // Calcular dinamicamente os últimos 30 dias
  const getDefaultDateRange = (): DateRange => {
    const today = new Date();
    return {
      from: startOfDay(subDays(today, 29)), // Hoje - 30 dias (29 porque inclui hoje)
      to: endOfDay(today), // Hoje
    };
  };

  const [dateRange, setDateRange] = useState<DateRange | undefined>(getDefaultDateRange());

  const [visibleLines, setVisibleLines] = useState({
    leads: true,
    vendas: true,
    oportunidades: true,
  });

  const [origemFunil, setOrigemFunil] = useState<'todos' | 'facebook' | 'indeterminado'>('todos');
  const [openModalMeta, setOpenModalMeta] = useState(false);
  const [valorMeta, setValorMeta] = useState<string>('');
  const [metaCalculada, setMetaCalculada] = useState<{ meta: number; faltante: number } | null>(null);

  // Leads com insight para o card Insights (ordenados por score_final_qualificacao)
  interface LeadInsight {
    id: number;
    nome: string;
    telefone?: string | null;
    status?: string | null;
    insight: string | null;
    score_final_qualificacao?: number | null;
    data_criacao?: string | null;
  }
  const [leadsWithInsight, setLeadsWithInsight] = useState<LeadInsight[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [selectedLeadInsight, setSelectedLeadInsight] = useState<LeadInsight | null>(null);

  // Estado do botão "Atualizar": atualizando_relatorio (polling) + mensagens rotativas
  const [atualizandoRelatorio, setAtualizandoRelatorio] = useState(false);
  const updateMessages = ['Atualizando relatório', 'Calculando scores', 'Gerando insights'];
  const [updateMsgIndex, setUpdateMsgIndex] = useState(0);

  // Flag para desabilitar seções temporariamente (código preservado)
  const mostrarSecoesComentadas = false;

  const { user } = useAuth();
  const { trial, plano_plus } = useUserType();
  const hidePremiumDashboardSections = trial || plano_plus;
  const { loading, error, dailyMetrics, kpis, funil, canais, alertas, meta, metaValor, idCliente, dataHoraAtualizacaoRelatorio, reload } =
    useDashboardData(dateRange);

  // Carregar meta do banco quando metaValor mudar
  React.useEffect(() => {
    if (metaValor !== null && metaValor > 0) {
      const faltante = Math.max(0, metaValor - kpis.receita);
      setMetaCalculada({ meta: metaValor, faltante });
    } else {
      setMetaCalculada(null);
    }
  }, [metaValor, kpis.receita]);

  // Buscar leads com insight no período, ordenados por score_final_qualificacao (maior primeiro)
  React.useEffect(() => {
    const loadLeadsInsights = async () => {
      if (!idCliente) {
        setLeadsWithInsight([]);
        return;
      }
      setLoadingInsights(true);
      try {
        const from = dateRange?.from ? dateRange.from.toISOString().slice(0, 10) : null;
        const to = dateRange?.to ? dateRange.to.toISOString().slice(0, 10) : null;
        let query = supabase
          .from('leads')
          .select('id, nome, telefone, status, insight, score_final_qualificacao, data_criacao')
          .eq('id_cliente', idCliente)
          .not('insight', 'is', null)
          .neq('insight', '');
        if (from) query = query.gte('data_criacao', from);
        if (to) query = query.lte('data_criacao', to);
        const { data, error } = await query.order('score_final_qualificacao', { ascending: false, nullsFirst: false });
        if (error) throw error;
        const list = (data || []) as LeadInsight[];
        setLeadsWithInsight(list);
      } catch (e) {
        console.error('Erro ao carregar insights dos leads:', e);
        setLeadsWithInsight([]);
      } finally {
        setLoadingInsights(false);
      }
    };
    loadLeadsInsights();
  }, [idCliente, dateRange?.from?.toISOString(), dateRange?.to?.toISOString()]);

  // Polling: monitorar campo atualizando_relatorio da tabela clientes_info (inicial + quando está atualizando)
  React.useEffect(() => {
    if (!user?.id) return;
    let interval: ReturnType<typeof setInterval> | undefined;

    async function checkAtualizando() {
      try {
        clientesService.clearCache(user.id!);
        const clienteInfo = await clientesService.getClienteByUserId(user.id!);
        if (clienteInfo && typeof clienteInfo.atualizando_relatorio === 'boolean') {
          setAtualizandoRelatorio(clienteInfo.atualizando_relatorio);
          if (!clienteInfo.atualizando_relatorio && interval) {
            clearInterval(interval);
            interval = undefined;
          }
        }
      } catch (e) {
        console.error('Erro ao verificar status atualizando_relatorio:', e);
      }
    }

    async function checkInitial() {
      try {
        clientesService.clearCache(user.id!);
        const clienteInfo = await clientesService.getClienteByUserId(user.id!);
        if (clienteInfo && typeof clienteInfo.atualizando_relatorio === 'boolean') {
          setAtualizandoRelatorio(clienteInfo.atualizando_relatorio);
        }
      } catch (e) {
        console.error('Erro ao verificar status inicial:', e);
      }
    }

    checkInitial();
    return () => { if (interval) clearInterval(interval); };
  }, [user?.id]);

  // Quando estado local está "atualizando", fazer polling até o backend setar false
  React.useEffect(() => {
    if (!user?.id || !atualizandoRelatorio) return;
    const interval = setInterval(async () => {
      try {
        clientesService.clearCache(user.id!);
        const clienteInfo = await clientesService.getClienteByUserId(user.id!);
        if (clienteInfo && clienteInfo.atualizando_relatorio === false) {
          setAtualizandoRelatorio(false);
        }
      } catch {
        // ignora
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [user?.id, atualizandoRelatorio]);

  // Rotação das mensagens enquanto atualizando_relatorio for true
  React.useEffect(() => {
    if (!atualizandoRelatorio) return;
    const interval = setInterval(() => {
      setUpdateMsgIndex((prev) => (prev + 1) % updateMessages.length);
    }, 1200);
    return () => clearInterval(interval);
  }, [atualizandoRelatorio]);

  // Preencher campo do modal com meta existente quando abrir
  React.useEffect(() => {
    if (openModalMeta && metaValor !== null && metaValor > 0) {
      setValorMeta(formatCurrency(metaValor));
    } else if (openModalMeta && !metaValor) {
      setValorMeta('');
    }
  }, [openModalMeta, metaValor]);

  const kpisPeriodo = React.useMemo(() => {
    // Soma todos os valores de dailyMetrics (já filtrado pelo período do calendário)
    return {
      leads: dailyMetrics.reduce((sum, d) => sum + d.leads, 0),
      vendas: dailyMetrics.reduce((sum, d) => sum + d.vendas, 0),
      oportunidades: dailyMetrics.reduce((sum, d) => sum + d.oportunidades, 0),
    };
  }, [dailyMetrics]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // Função auxiliar para converter valor formatado (moeda) para número
  const parseCurrencyToNumber = (value: string): number => {
    if (!value || value.trim() === '') return 0;
    
    // Remove R$, espaços e caracteres não numéricos exceto vírgula e ponto
    let cleaned = value
      .replace(/R\$/g, '')
      .replace(/\s/g, '')
      .trim();
    
    // Se tem vírgula, assume formato brasileiro (1.000,50)
    if (cleaned.includes(',')) {
      // Remove pontos (milhares) e substitui vírgula por ponto
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else if (cleaned.includes('.')) {
      // Se só tem ponto, pode ser formato americano ou milhar brasileiro
      // Se tem mais de um ponto ou ponto antes de 2 dígitos finais, é milhar brasileiro
      const parts = cleaned.split('.');
      if (parts.length > 2 || (parts.length === 2 && parts[1].length > 2)) {
        // É milhar brasileiro, remove pontos
        cleaned = cleaned.replace(/\./g, '');
      }
      // Caso contrário, mantém o ponto como decimal
    }
    
    const result = parseFloat(cleaned);
    return isNaN(result) ? 0 : result;
  };

  const handleSalvarMeta = async () => {
    const metaValue = parseCurrencyToNumber(valorMeta);
    if (!isNaN(metaValue) && metaValue > 0 && idCliente) {
      try {
        // Salvar meta no banco de dados
        const { error: updateError } = await supabase
          .from('clientes_info')
          .update({ metas_dashboard: metaValue })
          .eq('id', idCliente);

        if (updateError) {
          console.error('Erro ao salvar meta:', updateError);
          alert('Erro ao salvar meta. Tente novamente.');
          return;
        }

        // Atualizar estado local
        const faltante = Math.max(0, metaValue - kpis.receita);
        setMetaCalculada({ meta: metaValue, faltante });
        setOpenModalMeta(false);
        setValorMeta('');
        
        // Recarregar dados para atualizar a meta
        await reload();
      } catch (error) {
        console.error('Erro ao salvar meta:', error);
        alert('Erro ao salvar meta. Tente novamente.');
      }
    }
  };

  const toggleLine = (line: 'leads' | 'vendas' | 'oportunidades') => {
    setVisibleLines((prev) => ({ ...prev, [line]: !prev[line] }));
  };

  const WEBHOOK_INSIGHTS = 'https://webhook.dev.usesmartcrm.com/webhook/insights';
  const WEBHOOK_ATUALIZA_DASH = 'https://webhook.dev.usesmartcrm.com/webhook/atualiza-dash';

  const handleAtualizarRelatorio = async () => {
    if (!user?.id || !idCliente) return;
    try {
      const clienteInfo = await clientesService.getClienteById(idCliente);
      const instance_name = clienteInfo?.instance_name ?? '';
      const payload = { id_cliente: idCliente, instance_name };

      await clientesService.setAtualizandoRelatorio(user.id, true);
      setAtualizandoRelatorio(true);
      clientesService.clearCache(user.id);

      await Promise.all([
        fetch(WEBHOOK_INSIGHTS, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }),
        fetch(WEBHOOK_ATUALIZA_DASH, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }),
      ]);
    } catch (e) {
      console.error('Erro ao disparar atualização do relatório:', e);
      setAtualizandoRelatorio(false);
      await clientesService.setAtualizandoRelatorio(user.id, false);
    }
  };

  const calcularPercentualFunil = (valor: number, total: number) => {
    if (!total) return 0;
    return Math.round((valor / total) * 100);
  };

  // Estado para armazenar dados do funil filtrado por origem
  const [funilData, setFunilData] = React.useState({
    entrouEmContato: 0,
    oportunidade: 0,
    vendaRealizada: 0,
    totalLeadsPeriodo: 0,
  });

  // Carregar dados do funil filtrados por origem
  React.useEffect(() => {
    const carregarFunil = async () => {
      if (!idCliente) {
        setFunilData({
          entrouEmContato: 0,
          oportunidade: 0,
          vendaRealizada: 0,
          totalLeadsPeriodo: 0,
        });
        return;
      }

      const from = dateRange?.from
        ? dateRange.from.toISOString().slice(0, 10)
        : null;
      const to = dateRange?.to
        ? dateRange.to.toISOString().slice(0, 10)
        : null;

      try {
        // 1. Buscar total de leads do período (para calcular porcentagem)
        let queryTotalLeads = supabase
          .from('leads')
          .select('id')
          .eq('id_cliente', idCliente);

        if (from) queryTotalLeads = queryTotalLeads.gte('data_criacao', from);
        if (to) queryTotalLeads = queryTotalLeads.lte('data_criacao', to);

        const { data: totalLeadsRows } = await queryTotalLeads;
        const totalLeadsPeriodo = totalLeadsRows?.length || 0;

        // 2. Buscar leads do canal selecionado
        let queryLeadsCanal = supabase
          .from('leads')
          .select('id, data_criacao, id_etiquetas, data_venda, venda')
          .eq('id_cliente', idCliente);

        // Aplicar filtro de origem
        if (origemFunil === 'facebook') {
          queryLeadsCanal = queryLeadsCanal.eq('t_origem', 'FB_Ads');
        } else if (origemFunil === 'indeterminado') {
          queryLeadsCanal = queryLeadsCanal.is('t_origem', null);
        }
        // Se for 'todos', não aplica filtro de origem

        if (from) queryLeadsCanal = queryLeadsCanal.gte('data_criacao', from);
        if (to) queryLeadsCanal = queryLeadsCanal.lte('data_criacao', to);

        const { data: leadsCanalRows } = await queryLeadsCanal;
        const leadsCanal = leadsCanalRows || [];

        // 3. Buscar IDs das etiquetas para identificar oportunidades
        const { data: etiquetasRows } = await supabase
          .from('etiquetas')
          .select('id')
          .or(`id_cliente.eq.${idCliente},id_cliente.is.null`);

        const idsEtiquetas = etiquetasRows?.map(e => e.id.toString()) || [];

        // 4. Contar leads, oportunidades e vendas do canal
        let oportunidadesCanal = 0;
        let vendasCanal = 0;

        leadsCanal.forEach((lead) => {
          // Verificar se é oportunidade (tem etiqueta)
          if (lead.id_etiquetas) {
            const ids = lead.id_etiquetas
              .split(',')
              .map(id => id.trim())
              .filter(id => id !== '')
              .map(id => id.toString());
            if (ids.some(id => idsEtiquetas.includes(id))) {
              oportunidadesCanal++;
            }
          }

          // Verificar se é venda
          if (lead.venda === true && lead.data_venda) {
            const dataVenda = lead.data_venda.slice(0, 10);
            if ((!from || dataVenda >= from) && (!to || dataVenda <= to)) {
              vendasCanal++;
            }
          }
        });

        setFunilData({
          entrouEmContato: leadsCanal.length,
          oportunidade: oportunidadesCanal,
          vendaRealizada: vendasCanal,
          totalLeadsPeriodo,
        });
      } catch (error) {
        console.error('Erro ao calcular funil:', error);
        setFunilData({
          entrouEmContato: 0,
          oportunidade: 0,
          vendaRealizada: 0,
          totalLeadsPeriodo: 0,
        });
      }
    };

    carregarFunil();
  }, [idCliente, dateRange?.from, dateRange?.to, origemFunil]);

  // Calcular porcentagens baseadas no total de leads do período
  const percentuaisFunil = React.useMemo(() => {
    const total = funilData.totalLeadsPeriodo || 1; // Evitar divisão por zero
    return {
      entrou: calcularPercentualFunil(funilData.entrouEmContato, total),
      oportunidade: calcularPercentualFunil(funilData.oportunidade, total),
      venda: calcularPercentualFunil(funilData.vendaRealizada, total),
    };
  }, [funilData]);

  // Dados do funil para exibição
  const funilDoGrafico = {
    entrouEmContato: funilData.entrouEmContato,
    oportunidade: funilData.oportunidade,
    vendaRealizada: funilData.vendaRealizada,
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-600 mt-1">
            Monitore suas oportunidades de vendas em tempo real
          </p>
          {error ? <p className="text-sm text-red-600 mt-2">{error}</p> : null}
        </div>

        <div className="flex items-center gap-4">
          {/* Date Range Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[280px] justify-start text-left font-normal">
                <Calendar className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, 'dd/MM/yy', { locale: ptBR })} -{' '}
                      {format(dateRange.to, 'dd/MM/yy', { locale: ptBR })}
                    </>
                  ) : (
                    format(dateRange.from, 'dd/MM/yy', { locale: ptBR })
                  )
                ) : (
                  <span>Selecione um período</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <CalendarComponent
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>

          <Button onClick={handleAtualizarRelatorio} disabled={atualizandoRelatorio}>
            <RefreshCw className={`mr-2 h-4 w-4 ${atualizandoRelatorio ? 'animate-spin' : ''}`} />
            {atualizandoRelatorio ? updateMessages[updateMsgIndex] : 'Atualizar'}
          </Button>

          <div className="text-sm text-gray-600">
            Última atualização: {dataHoraAtualizacaoRelatorio?.trim() || '—'}
          </div>

        

          
        </div>
      </div>

      {/* Seção Métricas Diárias */}
      <Card className="bg-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-xl font-semibold text-gray-900">Métricas Diárias</CardTitle>
                <p className="text-sm text-gray-600 mt-1">Acompanhe a evolução do seu negócio</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={visibleLines.leads ? 'default' : 'outline'}
                size="sm"
                className={visibleLines.leads ? 'bg-purple-600 hover:bg-purple-700' : ''}
                onClick={() => toggleLine('leads')}
              >
                <Users className="h-4 w-4 mr-1" />
                Leads
                {visibleLines.leads ? (
                  <Eye className="h-4 w-4 ml-1" />
                ) : (
                  <EyeOff className="h-4 w-4 ml-1" />
                )}
              </Button>
               
              <Button
                variant={visibleLines.vendas ? 'default' : 'outline'}
                size="sm"
                className={visibleLines.vendas ? 'bg-green-600 hover:bg-green-700' : ''}
                onClick={() => toggleLine('vendas')}
              >
                <ShoppingCart className="h-4 w-4 mr-1" />
                Vendas
                {visibleLines.vendas ? (
                  <Eye className="h-4 w-4 ml-1" />
                ) : (
                  <EyeOff className="h-4 w-4 ml-1" />
                )}
              </Button>

              <Button
                variant={visibleLines.oportunidades ? 'default' : 'outline'}
                size="sm"
                className={visibleLines.oportunidades ? 'bg-orange-500 hover:bg-orange-600' : ''}
                onClick={() => toggleLine('oportunidades')}
              >
                <Target className="h-4 w-4 mr-1" />
                Oportunidades
                {visibleLines.oportunidades ? (
                  <Eye className="h-4 w-4 ml-1" />
                ) : (
                  <EyeOff className="h-4 w-4 ml-1" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* KPIs (mock por enquanto) */}
          <div className="grid grid-cols-3 gap-6 mb-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">Leads</p>
              <p className="text-3xl font-bold text-purple-600">{kpisPeriodo.leads}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Vendas</p>
              <p className="text-3xl font-bold text-green-600">{kpisPeriodo.vendas}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Oportunidades</p>
              <p className="text-3xl font-bold text-orange-500">{kpisPeriodo.oportunidades}</p>
            </div>
          </div>

          {/* Gráfico de Linhas */}
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyMetrics}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: '12px' }} />
                <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} domain={[0, 20]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                {visibleLines.leads && (
                  <Line
                    type={dailyMetrics.length === 1 ? "linear" : "monotone"}
                    dataKey="leads"
                    stroke="#9333ea"
                    strokeWidth={2}
                    dot={true}
                    name="Leads"
                  />
                )}
                {visibleLines.vendas && (
                  <Line
                    type={dailyMetrics.length === 1 ? "linear" : "monotone"}
                    dataKey="vendas"
                    stroke="#16a34a"
                    strokeWidth={2}
                    dot={true}
                    name="Vendas"
                  />
                )}
                {visibleLines.oportunidades && (
                  <Line
                    type={dailyMetrics.length === 1 ? "linear" : "monotone"}
                    dataKey="oportunidades"
                    stroke="#f97316"
                    strokeWidth={2}
                    dot={true}
                    name="Oportunidades"
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Trial/Plus: ocultar cards de Receita e ROI */}
      {!hidePremiumDashboardSections && (
        <div className="grid grid-cols-2 gap-6">
          <Card className="bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-purple-600" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">{formatCurrency(kpis.receita)}</h3>
              <p className="text-sm text-gray-600 mb-1">Receita</p>
              <p className="text-xs text-gray-500">Faturamento do período</p>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">{kpis.roi}%</h3>
              <p className="text-sm text-gray-600 mb-1">ROI</p>
              <p className="text-xs text-gray-500">Retorno sobre investimento</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Grid: Insights + Funil */}
      <div className="grid grid-cols-2 gap-6">
        {/* Insights dos Leads */}
        <Card className="bg-white overflow-hidden">
          <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-slate-50 to-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-lg bg-slate-900 flex items-center justify-center">
                  <Lightbulb className="h-4 w-4 text-amber-400" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold text-gray-900">Insights</CardTitle>
                  <p className="text-xs text-gray-500 mt-0.5">Leads com análise no período</p>
                </div>
              </div>
              <Badge variant="secondary" className="font-mono text-xs bg-slate-100 text-slate-700">
                {loadingInsights ? '...' : leadsWithInsight.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loadingInsights ? (
              <div className="p-8 flex items-center justify-center">
                <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : leadsWithInsight.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">
                Nenhum lead com insight no período
              </div>
            ) : (
              <div className="divide-y divide-gray-100 max-h-[320px] overflow-y-auto">
                {leadsWithInsight.map((lead) => {
                  const score = lead.score_final_qualificacao ?? null;
                  const scoreLabel = score !== null ? `${Number(score).toFixed(1)}` : '—';
                  let scoreColor = 'bg-slate-100 text-slate-600 border-slate-200';
                  if (score !== null) {
                    if (score >= 7) scoreColor = 'bg-emerald-500/10 text-emerald-700 border-emerald-200';
                    else if (score >= 4) scoreColor = 'bg-amber-500/10 text-amber-700 border-amber-200';
                  }
                  return (
                    <button
                      key={lead.id}
                      type="button"
                      onClick={() => setSelectedLeadInsight(lead)}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50/80 transition-colors flex items-start gap-3 group"
                    >
                      <div
                        className={`flex-shrink-0 mt-0.5 h-8 min-w-[2rem] rounded-md border font-mono text-xs font-semibold flex items-center justify-center ${scoreColor}`}
                      >
                        {scoreLabel}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">{lead.nome || 'Sem nome'}</p>
                        <p className="text-xs text-gray-500 truncate mt-0.5 line-clamp-2">
                          {lead.insight || ''}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0 group-hover:text-slate-600" />
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Popup de Insight */}
        <Dialog open={!!selectedLeadInsight} onOpenChange={(open) => !open && setSelectedLeadInsight(null)}>
          <DialogContent className="max-w-lg bg-white">
            {selectedLeadInsight && (
              <>
                <DialogHeader className="pb-4 border-b">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`h-10 w-10 rounded-lg flex items-center justify-center text-sm font-semibold flex-shrink-0 ${
                          (selectedLeadInsight.score_final_qualificacao ?? 0) >= 7
                            ? 'bg-green-100 text-green-700'
                            : (selectedLeadInsight.score_final_qualificacao ?? 0) >= 4
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {selectedLeadInsight.score_final_qualificacao != null
                          ? Number(selectedLeadInsight.score_final_qualificacao).toFixed(1)
                          : '—'}
                      </div>
                      <div className="min-w-0">
                        <DialogTitle className="text-lg font-semibold text-gray-900 truncate">
                          {selectedLeadInsight.nome || 'Lead'}
                        </DialogTitle>
                        <DialogDescription className="text-gray-500 text-sm mt-0.5">
                          {selectedLeadInsight.telefone && (
                            <span>{selectedLeadInsight.telefone}</span>
                          )}
                          {selectedLeadInsight.data_criacao && (
                            <span className="ml-2">
                              {format(new Date(selectedLeadInsight.data_criacao), "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                          )}
                        </DialogDescription>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs flex-shrink-0">
                      Score
                    </Badge>
                  </div>
                </DialogHeader>
                <div className="pt-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">INSIGHT</p>
                  <div
                    className="rounded-lg bg-gray-50 border border-gray-200 p-4 text-sm leading-relaxed whitespace-pre-wrap break-words"
                    style={{ color: '#374151' }}
                  >
                    {selectedLeadInsight.insight || '—'}
                  </div>
                  {selectedLeadInsight.status && (() => {
                    const statusLower = selectedLeadInsight.status.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
                    let badgeClass = 'bg-gray-100 text-gray-700';
                    
                    if (statusLower === 'oportunidade') {
                      badgeClass = 'bg-yellow-100 text-yellow-700';
                    } else if (statusLower === 'ganho' || statusLower === 'venda realizada') {
                      badgeClass = 'bg-green-100 text-green-700';
                    } else if (statusLower === 'perdido' || statusLower === 'venda perdida') {
                      badgeClass = 'bg-red-100 text-red-700';
                    } else if (statusLower.includes('andamento') || statusLower === 'conversa em andamento') {
                      badgeClass = 'bg-blue-100 text-blue-700';
                    }
                    
                    return (
                      <div className="mt-3">
                        <Badge className={badgeClass}>
                          {selectedLeadInsight.status}
                        </Badge>
                      </div>
                    );
                  })()}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Funil de Conversão */}
        <Card className="bg-white">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Funil de Conversão no WhatsApp
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Acompanhe a evolução das conversas até a venda
                </p>
              </div>

              <Select value={origemFunil} onValueChange={(value) => setOrigemFunil(value as 'todos' | 'facebook' | 'indeterminado')}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="indeterminado">Indeterminado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>

          <CardContent>
            {/* barras do funil */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-2">
                <div className="h-10 bg-purple-700 rounded flex items-center justify-end pr-3" style={{ width: `${Math.min(100, percentuaisFunil.entrou)}%` }}>
                  <span className="text-white text-sm font-semibold">{percentuaisFunil.entrou}%</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div
                  className="h-10 bg-orange-500 rounded flex items-center justify-end pr-3"
                  style={{ width: `${percentuaisFunil.oportunidade}%` }}
                >
                  <span className="text-white text-sm font-semibold">{percentuaisFunil.oportunidade}%</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div
                  className="h-10 bg-green-600 rounded flex items-center justify-end pr-3"
                  style={{ width: `${percentuaisFunil.venda}%` }}
                >
                  <span className="text-white text-sm font-semibold">{percentuaisFunil.venda}%</span>
                </div>
              </div>
            </div>

            {/* cards do funil */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 border border-gray-200 rounded-lg text-center">
                <MessageSquare className="h-5 w-5 text-gray-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{funilDoGrafico.entrouEmContato}</p>
                <p className="text-xs text-gray-600 mt-1">Entrou em contato</p>
              </div>

              <div className="p-3 border border-gray-200 rounded-lg text-center">
                <Target className="h-5 w-5 text-gray-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{funilDoGrafico.oportunidade}</p>
                <p className="text-xs text-gray-600 mt-1">Oportunidade</p>
              </div>

              <div className="p-3 border border-gray-200 rounded-lg text-center">
                <CheckCircle className="h-5 w-5 text-gray-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{funilDoGrafico.vendaRealizada}</p>
                <p className="text-xs text-gray-600 mt-1">Venda realizada</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ROI por Canal de Marketing - COMENTADO TEMPORARIAMENTE */}
      {mostrarSecoesComentadas && (
      <Card className="bg-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-semibold text-gray-900">ROI por Canal de Marketing</CardTitle>
              <p className="text-sm text-gray-600 mt-1">Descubra onde investir mais para crescer</p>
            </div>
            <div className="flex items-center gap-2 text-green-600">
              <TrendingUp className="h-5 w-5" />
              <span className="font-semibold">562% ROI total</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {canais.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              Sem dados de canais no período
            </div>
          ) : (
            <>
              {canais.map((canal, index) => {
                const totalBar = canal.investido + canal.retorno;
                const investidoPercent = totalBar > 0 ? (canal.investido / totalBar) * 100 : 0;
                const retornoPercent = totalBar > 0 ? (canal.retorno / totalBar) * 100 : 0;

                return (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: canal.cor }}
                      >
                        {canal.nome === 'WhatsApp' && <MessageSquare className="h-5 w-5" />}
                        {canal.nome === 'Facebook Ads' && <span className="text-lg">f</span>}
                        {canal.nome === 'Instagram' && <span className="text-lg">📷</span>}
                      </div>

                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {canal.nome} {canal.leads} leads
                        </p>
                        <p className="text-xs text-gray-600">Investido → Retorno</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex-1 h-8 bg-gray-200 rounded-lg overflow-hidden flex relative">
                        {canal.investido > 0 && (
                          <div
                            className="bg-gray-400 flex items-center justify-end pr-2"
                            style={{ width: `${investidoPercent}%` }}
                          >
                            {investidoPercent > 15 && (
                              <span className="text-white text-xs font-medium">
                                {formatCurrency(canal.investido)}
                              </span>
                            )}
                          </div>
                        )}

                        <div
                          className="flex items-center justify-end pr-2"
                          style={{ width: `${retornoPercent}%`, backgroundColor: canal.cor }}
                        >
                          {retornoPercent > 15 && (
                            <span className="text-white text-xs font-medium">
                              {formatCurrency(canal.retorno)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right min-w-[140px]">
                        <div className="text-sm text-gray-900 mb-1">
                          <span className="text-gray-600">{formatCurrency(canal.investido)}</span>
                          {' → '}
                          <span className="font-semibold">{formatCurrency(canal.retorno)}</span>
                        </div>

                        {canal.roi ? (
                          <Badge
                            className={`text-xs ${canal.roi >= 300
                              ? 'bg-green-100 text-green-700 hover:bg-green-100'
                              : 'bg-orange-100 text-orange-700 hover:bg-orange-100'
                              }`}
                          >
                            {canal.roi}% ROI
                          </Badge>
                        ) : (
                          <Badge className="text-xs bg-green-100 text-green-700 hover:bg-green-100">
                            Orgânico ❤️
                          </Badge>
                        )}
                      </div>

                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                );
              })}

              {/* Recomendação */}
              <div className="mt-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-start gap-3">
                  <TrendingUp className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900 mb-1">Recomendação</p>
                    <p className="text-sm text-gray-700">
                      Aumente o investimento em <strong>Instagram</strong> - está com o melhor custo por lead (R$ 50) e
                      conversão alta.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      )}

      {/* Trial/Plus: ocultar card e modal de Meta */}
      {!hidePremiumDashboardSections && (
        <>
          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-lg bg-purple-600 flex items-center justify-center flex-shrink-0">
                    <Target className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Você está a {formatCurrency(metaCalculada?.faltante ?? meta.faltante)} de atingir sua meta!
                    </h3>
                    <p className="text-sm text-gray-700">
                      {metaCalculada ? (
                        <>
                          Meta: {formatCurrency(metaCalculada.meta)} | Receita atual: {formatCurrency(kpis.receita)}
                        </>
                      ) : (
                        <>
                          Com base no seu ritmo atual, você deve alcançar a meta em <strong>{meta.diasRestantes} dias</strong>.
                          Continue focando nos leads qualificados do WhatsApp.
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <Button
                  className="bg-purple-600 hover:bg-purple-700"
                  onClick={() => setOpenModalMeta(true)}
                >
                  {metaCalculada ? 'Editar Meta' : 'Adicionar Meta'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Dialog open={openModalMeta} onOpenChange={setOpenModalMeta}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Definir Meta</DialogTitle>
                <DialogDescription>
                  Insira o valor da meta que deseja atingir. O sistema calculará automaticamente quanto falta para alcançá-la.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="meta">Valor da Meta (R$)</Label>
                  <Input
                    id="meta"
                    type="text"
                    placeholder="0,00"
                    value={valorMeta}
                    onChange={(e) => {
                      let value = e.target.value.replace(/[^\d,.]/g, '');
                      const parts = value.split(/[,.]/);
                      if (parts.length > 2) {
                        value = parts[0] + ',' + parts.slice(1).join('');
                      }
                      setValorMeta(value);
                    }}
                    onBlur={(e) => {
                      const numValue = parseCurrencyToNumber(e.target.value);
                      if (!isNaN(numValue) && numValue > 0) {
                        setValorMeta(new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(numValue));
                      } else if (e.target.value.trim() === '') {
                        setValorMeta('');
                      }
                    }}
                  />
                </div>
                {valorMeta && !isNaN(parseCurrencyToNumber(valorMeta)) && parseCurrencyToNumber(valorMeta) > 0 && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">
                      <strong>Receita atual:</strong> {formatCurrency(kpis.receita)}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      <strong>Faltante:</strong>{' '}
                      <span className="text-purple-600 font-semibold">
                        {formatCurrency(Math.max(0, parseCurrencyToNumber(valorMeta) - kpis.receita))}
                      </span>
                    </p>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setOpenModalMeta(false);
                  setValorMeta('');
                }}>
                  Cancelar
                </Button>
                <Button
                  className="bg-purple-600 hover:bg-purple-700"
                  onClick={handleSalvarMeta}
                  disabled={!valorMeta || isNaN(parseCurrencyToNumber(valorMeta)) || parseCurrencyToNumber(valorMeta) <= 0 || !idCliente}
                >
                  Salvar Meta
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
