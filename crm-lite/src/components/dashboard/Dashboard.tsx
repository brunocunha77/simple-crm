import React from "react";
import NovoDashboard from "@/components/dashboard/novoDashboard";

// Código antigo comentado - usando NovoDashboard agora
/*
import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DateRange } from "react-day-picker";
import { Calendar, ChevronDown, RefreshCw } from "lucide-react";
import FunnelFlow from '@/components/FunnelFlow';
import ScorePieChart, { ScoreData } from '@/components/ScorePieChart';
import { useAuth } from "@/contexts/auth";
import { clientesService } from "@/services/clientesService";
import { LeadsService, Lead } from "@/services/leadsService";
import { FunisService } from "@/services/funisService";
import { toast } from "sonner";
import { useRealtime } from "@/contexts/realtimeContext";
import { Link } from "react-router-dom";
import { RevenueByChannel, KPICards } from '@/components/dashboard';

// Adicione estas cores no início do arquivo, após os imports
const BRAND_COLORS = {
  primary: '#4F46E5', // Índigo
  secondary: '#10B981', // Verde
  accent: '#F59E0B', // Âmbar
  background: '#F3F4F6', // Cinza claro
  gradient: {
    start: '#4F46E5',
    end: '#818CF8'
  }
};

// Dados iniciais para o funnel
const initialFunnelData = [
  { name: "Conversas Iniciadas", value: 0 },
  { name: "Leads Qualificados", value: 0 },
  { name: "Oportunidades", value: 0 },
  { name: "Vendas Realizadas", value: 0 },
];
*/

export default function Dashboard() {
  /*
  // Alterar o padrão para últimos 30 dias
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 29), // 30 dias incluindo hoje
    to: new Date()
  });
  const [selectedShortcut, setSelectedShortcut] = useState("last30days");
  const [dateRangeApplied, setDateRangeApplied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [funnelData, setFunnelData] = useState(initialFunnelData);
  const [scoreData, setScoreData] = useState<ScoreData[]>([]);
  const [loadingGraphs, setLoadingGraphs] = useState(false);
  const [atualizandoRelatorio, setAtualizandoRelatorio] = useState(false);
  const [clientInfo, setClientInfo] = useState<any>(null);
  
  // Estados para gerenciar funis
  const [funis, setFunis] = useState<any[]>([]);
  const [funilSelecionado, setFunilSelecionado] = useState<any | null>(null);
  const [loadingFunis, setLoadingFunis] = useState(true);
  
  // Estado para as métricas do Scorecard
  const [data, setData] = useState({
    scoreVendedor: 0,
    probabilidadeFechamento: 0,
    scoreQualificacao: 0,
    tempoRespostaMedio: "0min",
    tempoRespostaComparacao: "0%",
    cicloVenda: "0 dias",
    cicloVendaComparacao: "0 dias",
    taxaOportunidades: 0,
    numOportunidades: 0,
    numOportunidadesComparacao: "0",
    conversasAndamento: 0,
    conversasRequerAtencao: 0,
    taxaResposta: 0,
    totalLeads: 0,
    totalLeadsComparacao: "0",
    totalVendas: 0,
  });
  const [updateMessages] = useState([
    "Atualizando Relatório",
    "Calculando Score", 
    "Verificando Oportunidades"
  ]);
  const [currentUpdateMessage, setCurrentUpdateMessage] = useState(0);
  
  // Usar o contexto de tempo real
  const { clientId, lastUpdate, subscribeComponent, unsubscribeComponent } = useRealtime();
  const { user } = useAuth();

  // Função para buscar funis disponíveis
  const fetchFunis = async () => {
    try {
      setLoadingFunis(true);
      const funisData = await FunisService.getFunis();
      
      if (funisData.length === 0) {
        console.log('Dashboard: Nenhum funil encontrado');
        setFunis([]);
        setFunilSelecionado(null);
        return;
      }

      // Buscar cada funil com suas etapas
      const funisComEtapas = await Promise.all(
        funisData.map(async (funil) => {
          const funilCompleto = await FunisService.getFunilComEtapas(funil.id);
          return funilCompleto;
        })
      );

      const funisValidos = funisComEtapas.filter(f => f !== null);
      setFunis(funisValidos);

      if (funisValidos.length > 0) {
        // Selecionar o funil padrão ou o mais antigo
        // getFunis() retorna ordenado por funil_padrao DESC, created_at DESC
        // Então o padrão vem primeiro, e o mais antigo está no final
        const funilPadrao = funisValidos.find(f => f.funil_padrao === true);
        const funilInicial = funilPadrao || funisValidos[funisValidos.length - 1]; // O mais antigo fica no final
        
        setFunilSelecionado(funilInicial);
        console.log('Dashboard: Funil selecionado:', funilInicial?.nome);
      }
    } catch (error) {
      console.error('Dashboard: Erro ao buscar funis:', error);
      toast.error('Erro ao carregar funis');
    } finally {
      setLoadingFunis(false);
    }
  };

  // Efeito para buscar funis ao carregar o componente
  useEffect(() => {
    fetchFunis();
  }, []);

  // Atualizar o efeito inicial para usar 30 dias
  useEffect(() => {
    const today = new Date();
    setDateRange({
      from: subDays(today, 29),
      to: endOfDay(today)
    });
    setSelectedShortcut("last30days");
    setDateRangeApplied(true); // Aplicar automaticamente o filtro inicial
  }, []);

  // Função para atualizar o dateRange baseado no atalho selecionado
  const handleDateShortcut = (shortcut: string) => {
    setSelectedShortcut(shortcut);
    const today = new Date();
    let newDateRange: DateRange;

    switch (shortcut) {
      case 'today':
        newDateRange = {
          from: startOfDay(today),
          to: endOfDay(today)
        };
        break;
      case 'yesterday':
        const yesterday = subDays(today, 1);
        newDateRange = {
          from: startOfDay(yesterday),
          to: endOfDay(yesterday)
        };
        break;
      case 'last7days':
        newDateRange = {
          from: subDays(today, 6),
          to: endOfDay(today)
        };
        break;
      case 'last30days':
        newDateRange = {
          from: subDays(today, 29),
          to: endOfDay(today)
        };
        break;
      default:
        return;
    }

    setDateRange(newDateRange);
    setDateRangeApplied(false); // Resetar para aguardar confirmação
  };

  // Função para aplicar o filtro de data
  const handleApplyDateFilter = () => {
    setDateRangeApplied(true);
    console.log('Dashboard: Filtro de data aplicado:', dateRange);
  };

  // Função para disparar webhook
  const triggerWebhook = async (instanceName: string) => {
    try {
      const webhookData = {
        instance_name: instanceName,
        timestamp: new Date().toISOString(),
        action: "atualizar_dashboard"
      };

      const endpoints = [
        'https://webhook.dev.usesmartcrm.com/webhook/atualiza-dash',
        'https://webhook.dev.usesmartcrm.com/webhook/dados-facebook'
      ];
      
      console.log('🔄 Dashboard: Enviando requisição para atualizar dados');
      console.log('📦 JSON enviado:', JSON.stringify(webhookData, null, 2));

      // Enviar para ambos os endpoints
      const responses = await Promise.allSettled(
        endpoints.map(endpoint => 
          fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'text/plain;charset=UTF-8',
            },
            body: JSON.stringify(webhookData)
          })
        )
      );

      responses.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          if (result.value.ok) {
            console.log(`✅ Dashboard: Webhook ${index + 1} (${endpoints[index]}) disparado com sucesso`);
          } else {
            console.error(`❌ Dashboard: Erro ao disparar webhook ${index + 1} (${endpoints[index]}):`, result.value.status, result.value.statusText);
          }
        } else {
          console.error(`💥 Dashboard: Erro ao disparar webhook ${index + 1} (${endpoints[index]}):`, result.reason);
        }
      });
    } catch (error) {
      console.error('💥 Dashboard: Erro ao disparar webhook:', error);
    }
  };

  // Função manual para buscar dados
  const handleFetchData = async () => {
    console.log('🚀 Dashboard: Botão "Atualizar dados" clicado');
    console.log('👤 Cliente ID:', clientId);
    console.log('📅 Período selecionado:', dateRange);
    
    if (!clientId) {
      toast.error('Cliente não identificado');
      return;
    }
    
    if (!dateRange.from || !dateRange.to) {
      toast.error('Selecione um período');
      return;
    }
    
    console.log('Dashboard: Atualizando dados manualmente para o período:', dateRange);
    
    try {
      // Definir estado de atualização como true
      setAtualizandoRelatorio(true);
      await clientesService.setAtualizandoRelatorio(user?.id || '', true);
      
      // Buscar informações do cliente para obter o instance_name
      const clientInfo = await clientesService.getClienteByIdCliente(clientId);
      
      // Executar as funções de busca de dados
      await Promise.all([
        fetchLeadsForFunnel(clientId),
        fetchScorecardData(clientId),
        // fetchScoreQualificacaoData() // Removido
      ]);
      
      // Disparar webhook se tivermos o instance_name
      if (clientInfo?.instance_name) {
        console.log('📱 Dashboard: Disparando webhook para instance:', clientInfo.instance_name);
        await triggerWebhook(clientInfo.instance_name);
      } else {
        console.warn('Dashboard: Instance name não encontrado para disparar webhook');
      }
      
      toast.success('Dados atualizados com sucesso!');
    } catch (error) {
      console.error('Dashboard: Erro ao atualizar dados:', error);
      toast.error('Erro ao atualizar dados');
      // Em caso de erro, resetar o estado de atualização
      setAtualizandoRelatorio(false);
      await clientesService.setAtualizandoRelatorio(user?.id || '', false);
    }
  };

  // Efeito para buscar dados quando o componente é montado ou quando clientId muda
  useEffect(() => {
    if (clientId) {
      console.log('Dashboard: Cliente ID disponível:', clientId);
      fetchLeadsForFunnel(clientId);
      fetchScorecardData(clientId);
      fetchClientInfo();
      // fetchScoreQualificacaoData(); // Removido
    }
  }, [clientId]);

  // Efeito para buscar informações do cliente
  const fetchClientInfo = async () => {
    if (!clientId) return;
    
    try {
      const info = await clientesService.getClienteByIdCliente(clientId);
      setClientInfo(info);
      setAtualizandoRelatorio(info?.atualizando_relatorio || false);
    } catch (error) {
      console.error('Dashboard: Erro ao buscar informações do cliente:', error);
    }
  };

  // Efeito para controlar a animação de atualização
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (atualizandoRelatorio) {
      interval = setInterval(() => {
        setCurrentUpdateMessage((prev) => (prev + 1) % updateMessages.length);
      }, 2000); // Troca a cada 2 segundos
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [atualizandoRelatorio, updateMessages.length]);

  // Efeito para atualizar dados quando o dateRange ou funil selecionado mudar
  useEffect(() => {
    if (clientId && dateRange.from && dateRange.to && dateRangeApplied && funilSelecionado) {
      console.log('Dashboard: DateRange ou funil alterado, atualizando dados:', dateRange, 'Funil:', funilSelecionado?.nome);
      fetchLeadsForFunnel(clientId);
      fetchScorecardData(clientId);
    }
  }, [dateRange, clientId, dateRangeApplied, funilSelecionado]);
  
  // Efeito para inscrever o componente para atualizações
  // DESABILITADO: Causava recursão infinita
  // useEffect(() => {
  //   // Registrar este componente para receber atualizações
  //   subscribeComponent('Dashboard');
  //   console.log('Dashboard: Componente inscrito para atualizações em tempo real');
  //   
  //   // Cleanup
  //   return () => {
  //     unsubscribeComponent('Dashboard');
  //     console.log('Dashboard: Componente desinscrito das atualizações em tempo real');
  //   };
  // }, [subscribeComponent, unsubscribeComponent]);

  // Efeito para atualizar dados quando receber atualizações em tempo real
  // DESABILITADO: Causava recursão infinita
  // useEffect(() => {
  //   if (lastUpdate && clientId) {
  //     console.log('Dashboard: Recebida atualização em tempo real, atualizando dados');
  //     fetchLeadsForFunnel(clientId);
  //     fetchClientInfo(); // Atualizar informações do cliente também
  //   }
  // }, [lastUpdate, clientId]);

  // Efeito para verificar periodicamente o estado de atualização
  useEffect(() => {
    if (atualizandoRelatorio) {
      const interval = setInterval(async () => {
        try {
          const info = await clientesService.getClienteByIdCliente(clientId);
          if (info && !info.atualizando_relatorio) {
            setAtualizandoRelatorio(false);
            setClientInfo(info);
            toast.success('Relatório atualizado com sucesso!');
          }
        } catch (error) {
          console.error('Dashboard: Erro ao verificar estado de atualização:', error);
        }
      }, 5000); // Verificar a cada 5 segundos
      
      return () => clearInterval(interval);
    }
  }, [atualizandoRelatorio, clientId]);

  // Função para contar leads por etapa do funil
  const contarLeadsPorEtapa = (leads: Lead[], etapasFunil: any[]) => {
    // Criar um mapa de contagem por id_funil_etapa
    const contagemPorEtapa = new Map<number, number>();
    
    // Inicializar contagem para todas as etapas com 0
    etapasFunil.forEach(etapa => {
      contagemPorEtapa.set(etapa.id, 0);
    });
    
    // Contar leads em cada etapa
    leads.forEach(lead => {
      if (lead.id_funil_etapa) {
        const contagem = contagemPorEtapa.get(lead.id_funil_etapa) || 0;
        contagemPorEtapa.set(lead.id_funil_etapa, contagem + 1);
      }
    });
    
    return contagemPorEtapa;
  };

  // Função para buscar leads e atualizar o funil
  const fetchLeadsForFunnel = async (clientIdValue: number) => {
    if (!clientIdValue || !dateRange.from || !dateRange.to) return;
    
    console.log('Dashboard: Buscando leads para atualizar funil, cliente ID:', clientIdValue, 'período:', dateRange);
    setLoading(true);
    
    try {
      // Verificar se há um funil selecionado
      if (!funilSelecionado || !funilSelecionado.etapas || funilSelecionado.etapas.length === 0) {
        console.log('Dashboard: Nenhum funil selecionado');
        setFunnelData([]);
        setLoading(false);
        return;
      }

      const etapasFunil = funilSelecionado.etapas;
      console.log('Dashboard: Usando funil selecionado:', funilSelecionado.nome, 'com', etapasFunil.length, 'etapas');
      
      // Buscar todos os leads do cliente no período
      const todosLeads = await LeadsService.getLeadsByClientIdAndDateRange(clientIdValue, dateRange.from, dateRange.to);
      
      // Filtrar apenas os leads que pertencem ao funil selecionado
      const leadsDofunil = todosLeads.filter(lead => lead.id_funil === funilSelecionado.id);
      
      console.log('Dashboard: Total de leads no período:', todosLeads.length);
      console.log('Dashboard: Leads do funil selecionado:', leadsDofunil.length);
      
      if (leadsDofunil.length === 0) {
        // Criar dados do funil vazio com as etapas do funil
        const emptyFunnelData = etapasFunil.map(etapa => ({
          name: etapa.nome,
          value: 0
        }));
        setFunnelData(emptyFunnelData);
        setScoreData([]);
        setLoading(false);
        return;
      }
      
      // Contar leads por etapa usando a nova função
      const contagemPorEtapa = contarLeadsPorEtapa(leadsDofunil, etapasFunil);
      
      // Montar os dados do funil baseado na contagem real por etapa
      const rawFunnelData = etapasFunil.map(etapa => ({
        name: etapa.nome,
        value: contagemPorEtapa.get(etapa.id) || 0
      }));

      const cumulativeFunnelData = rawFunnelData.map(stage => ({ ...stage }));
      for (let i = cumulativeFunnelData.length - 2; i >= 0; i--) {
        cumulativeFunnelData[i].value += cumulativeFunnelData[i + 1].value;
      }
      
      // Log detalhado para depuração
      console.log('Dashboard: Análise detalhada de leads por etapa:', {
        funilId: funilSelecionado.id,
        funilNome: funilSelecionado.nome,
        totalLeads: leadsDofunil.length,
        etapas: etapasFunil.map(e => ({
          id: e.id,
          nome: e.nome,
          quantidade: contagemPorEtapa.get(e.id) || 0
        })),
        funnelData: cumulativeFunnelData,
        rawFunnelData
      });
      
      setFunnelData(cumulativeFunnelData);
      
      // Calcular dados do gráfico de pizza de notas (usando apenas leads do funil)
      const scoreChartData = calculateScoreData(leadsDofunil);
      setScoreData(scoreChartData);
      console.log('Dashboard: Dados do gráfico de notas:', scoreChartData);
    } catch (error) {
      console.error('Dashboard: Erro ao buscar leads:', error);
      toast.error('Erro ao carregar dados para o funil');
    } finally {
      setLoading(false);
    }
  };

  // Função para calcular dados do gráfico de pizza de notas
  const calculateScoreData = (leads: Lead[]): ScoreData[] => {
    const leadsWithScore = leads.filter(lead => lead.score_final_qualificacao !== null && lead.score_final_qualificacao !== undefined);
    
    if (leadsWithScore.length === 0) {
      return [];
    }

    const scoreGroups = {
      baixo: [] as Lead[],    // < 4 (vermelho)
      medio: [] as Lead[],    // 4-6 (amarelo)
      alto: [] as Lead[]      // > 6 (verde)
    };

    leadsWithScore.forEach(lead => {
      const score = lead.score_final_qualificacao || 0;
      if (score < 4) {
        scoreGroups.baixo.push(lead);
      } else if (score >= 4 && score <= 6) {
        scoreGroups.medio.push(lead);
      } else if (score > 6) {
        scoreGroups.alto.push(lead);
      }
    });

    return [
      {
        name: 'Nota Baixa (< 4)',
        value: scoreGroups.baixo.length,
        color: '#EF4444', // Vermelho
        leads: scoreGroups.baixo
      },
      {
        name: 'Nota Média (4-6)',
        value: scoreGroups.medio.length,
        color: '#F59E0B', // Amarelo
        leads: scoreGroups.medio
      },
      {
        name: 'Nota Alta (> 6)',
        value: scoreGroups.alto.length,
        color: '#10B981', // Verde
        leads: scoreGroups.alto
      }
    ].filter(item => item.value > 0); // Só mostrar categorias com leads
  };

  // Função para buscar dados do Scorecard
  const fetchScorecardData = async (clientIdValue: number) => {
    if (!clientIdValue) return;
    
    console.log('Dashboard: Buscando dados do scorecard para cliente ID:', clientIdValue);
    
    try {
      // Buscar todos os leads do cliente
      const allLeads = await LeadsService.getLeadsByClientId(clientIdValue);
      
      if (allLeads.length === 0) {
        console.log('Dashboard: Nenhum lead encontrado para scorecard');
        return;
      }
      
      // Filtrar leads do funil selecionado (se houver)
      const leadsDofunil = funilSelecionado 
        ? allLeads.filter(lead => lead.id_funil === funilSelecionado.id)
        : allLeads;
      
      // Calcular métricas baseadas nos leads do funil
      const totalLeadsCliente = leadsDofunil.length;
      
      // Contar oportunidades - depende de como você identifica oportunidades
      // Pode ser uma etapa específica do funil ou o campo venda/status
      const leadsOportunidade = leadsDofunil.filter(lead => {
        // Aqui você pode ajustar a lógica para identificar oportunidades
        // Por exemplo, se houver uma etapa chamada "Oportunidade" ou similar
        return lead.status?.toLowerCase().includes('oportunidade');
      }).length;
      
      const taxaOportunidades = totalLeadsCliente > 0 
        ? (leadsOportunidade / totalLeadsCliente) * 100 
        : 0;
      
      // Contar conversas em andamento baseado no campo status ou outro critério
      const conversasAndamento = leadsDofunil.filter(lead => 
        lead.status?.toLowerCase().includes('conversa') || 
        lead.status?.toLowerCase().includes('andamento')
      ).length;
      
      // Contar conversas que requerem atenção
      const conversasRequerAtencao = leadsDofunil.filter(lead => 
        lead.status?.toLowerCase().includes('parou')
      ).length;
      
      // Buscar estatísticas de vendas
      const vendasStats = await LeadsService.getVendasStats(
        clientIdValue,
        dateRange.from || new Date(),
        dateRange.to || new Date()
      );
      
      // Atualizar o estado com os dados calculados
      setData({
        scoreVendedor: 0, // Será implementado posteriormente
        probabilidadeFechamento: 0, // Será implementado posteriormente
        scoreQualificacao: 0, // Será implementado posteriormente
        tempoRespostaMedio: "0min", // Será implementado posteriormente
        tempoRespostaComparacao: "0%", // Será implementado posteriormente
        cicloVenda: "0 dias", // Será implementado posteriormente
        cicloVendaComparacao: "0 dias", // Será implementado posteriormente
        taxaOportunidades,
        numOportunidades: leadsOportunidade,
        numOportunidadesComparacao: "0",
        conversasAndamento,
        conversasRequerAtencao,
        taxaResposta: 0, // Será implementado posteriormente
        totalLeads: totalLeadsCliente,
        totalLeadsComparacao: "0",
        totalVendas: vendasStats.total_vendas || 0,
      });
      
      console.log('Dashboard: Dados do scorecard atualizados:', {
        funilSelecionado: funilSelecionado?.nome,
        taxaOportunidades,
        numOportunidades: leadsOportunidade,
        conversasAndamento,
        conversasRequerAtencao,
        totalLeads: totalLeadsCliente,
        totalVendas: vendasStats.total_vendas || 0,
      });
      
    } catch (error) {
      console.error('Dashboard: Erro ao buscar dados do scorecard:', error);
    }
  };

  // Formato da data no botão
  const formatDateRange = () => {
    if (dateRange.from && dateRange.to) {
      return `${format(dateRange.from, "dd/MM/yy")} - ${format(dateRange.to, "dd/MM/yy")}`;
    }
    return "Selecionar período";
  };

  // Função para formatar a data da última atualização
  const formatLastUpdate = () => {
    if (!clientInfo?.data_hora_atualizacao_relatorio) {
      return "Relatório ainda não foi atualizado. Clique para atualizar.";
    }
    
    return `Última atualização: ${clientInfo.data_hora_atualizacao_relatorio}`;
  };

  // Função para formatar apenas a data
  const formatLastUpdateDate = () => {
    if (!clientInfo?.data_hora_atualizacao_relatorio) {
      return null;
    }
    
    return clientInfo.data_hora_atualizacao_relatorio;
  };

  // Função para formatar apenas a hora
  const formatLastUpdateTime = () => {
    if (!clientInfo?.data_hora_atualizacao_relatorio) {
      return null;
    }
    
    return clientInfo.data_hora_atualizacao_relatorio;
  };

  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      Drawer/Menu lateral para mobile
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex">
          Fundo escuro para fechar o menu
          <div className="fixed inset-0 bg-black bg-opacity-30" onClick={() => setMenuOpen(false)} />
          Menu lateral
          <div className="relative w-64 max-w-full h-full bg-white shadow-lg flex flex-col p-6 animate-slide-in-left">
            <button className="self-end mb-4 p-2 rounded hover:bg-gray-100" onClick={() => setMenuOpen(false)} aria-label="Fechar menu">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <nav className="flex flex-col gap-4">
              <Link to="/" className="text-lg font-medium text-gray-700 hover:text-primary-600" onClick={() => setMenuOpen(false)}>Dashboard</Link>

              <Link to="/conversations" className="text-lg font-medium text-gray-700 hover:text-primary-600" onClick={() => setMenuOpen(false)}>Atendimentos</Link>
              <Link to="/contatos" className="text-lg font-medium text-gray-700 hover:text-primary-600" onClick={() => setMenuOpen(false)}>Contatos</Link>
              <Link to="/chatbots" className="text-lg font-medium text-gray-700 hover:text-primary-600" onClick={() => setMenuOpen(false)}>Chatbots</Link>
              <Link to="/departamentos" className="text-lg font-medium text-gray-700 hover:text-primary-600" onClick={() => setMenuOpen(false)}>Departamentos</Link>
              <Link to="/followup" className="text-lg font-medium text-gray-700 hover:text-primary-600" onClick={() => setMenuOpen(false)}>Followup Automático</Link>
              <Link to="/settings" className="text-lg font-medium text-gray-700 hover:text-primary-600" onClick={() => setMenuOpen(false)}>Configurações</Link>
            </nav>
          </div>
        </div>
      )}
      Topo com botão de menu (apenas mobile)
      <div className="flex items-center gap-2 p-4 border-b bg-white md:hidden sticky top-0 z-40">
        <button
          className="p-2 rounded hover:bg-gray-100"
          onClick={() => setMenuOpen(true)}
          aria-label="Abrir menu"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="ml-2 text-2xl font-semibold">Dashboard</span>
      </div>
      <div className="space-y-8">
        <div className="flex justify-between items-center mb-4 gap-4">
          <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={dateRangeApplied ? "default" : "outline"}
                className="flex items-center gap-2"
              >
                <Calendar className="h-4 w-4" />
                {formatDateRange()}
                <ChevronDown className="h-4 w-4" />
                {dateRangeApplied && (
                  <div className="w-2 h-2 bg-green-500 rounded-full ml-1"></div>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <div className="p-3 border-b">
                <Select value={selectedShortcut} onValueChange={handleDateShortcut}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Hoje</SelectItem>
                    <SelectItem value="yesterday">Ontem</SelectItem>
                    <SelectItem value="last7days">Últimos 7 dias</SelectItem>
                    <SelectItem value="last30days">Últimos 30 dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <CalendarComponent
                locale={ptBR}
                mode="range"
                selected={dateRange}
                onSelect={(range) => {
                  if (range) {
                    setDateRange(range);
                    setDateRangeApplied(false); // Resetar para aguardar confirmação
                  }
                }}
                initialFocus
                numberOfMonths={2}
                className="p-3 pointer-events-auto"
              />
              <div className="p-3 border-t">
                <Button 
                  onClick={handleApplyDateFilter}
                  className="w-full"
                  disabled={!dateRange.from || !dateRange.to}
                >
                  Aplicar Filtro
                </Button>
              </div>
            </PopoverContent>
          </Popover>
            
            <Button
              onClick={handleFetchData}
              disabled={loadingGraphs || !clientId || atualizandoRelatorio}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loadingGraphs || atualizandoRelatorio ? 'animate-spin' : ''}`} />
              {atualizandoRelatorio 
                ? updateMessages[currentUpdateMessage]
                : loadingGraphs 
                  ? 'Buscando...' 
                  : 'Atualizar Dados'
              }
            </Button>
            
            Informação da última atualização
            <div className="text-sm text-gray-600 ml-4">
              {!clientInfo?.data_hora_atualizacao_relatorio ? (
                <span>Relatório ainda não foi atualizado. Clique para atualizar.</span>
              ) : (
                <div className="flex flex-col">
                  <span className="font-medium">Última atualização:</span>
                  <span className="text-blue-600">{clientInfo.data_hora_atualizacao_relatorio}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="max-h-[calc(100vh-200px)] overflow-y-auto pr-4">
        <section>
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle>Funil de Vendas</CardTitle>
                  <CardDescription>
                    Acompanhe a evolução das conversas até a venda
                    {dateRange.from && dateRange.to && (
                      <span className="block mt-1 text-sm text-gray-600">
                        Período: {format(dateRange.from, "dd/MM/yyyy")} a {format(dateRange.to, "dd/MM/yyyy")}
                      </span>
                    )}
                  </CardDescription>
                </div>
                <div className="ml-4">
                  <Select 
                    value={funilSelecionado?.id?.toString() || ""} 
                    onValueChange={(value) => {
                      const funil = funis.find(f => f.id.toString() === value);
                      if (funil) {
                        setFunilSelecionado(funil);
                        console.log('Dashboard: Funil alterado para:', funil.nome);
                      }
                    }}
                    disabled={loadingFunis || funis.length === 0}
                  >
                    <SelectTrigger className="w-[280px]">
                      <SelectValue placeholder={loadingFunis ? "Carregando funis..." : "Selecione um funil"}>
                        {funilSelecionado?.nome || "Selecione um funil"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {funis.map((funil) => (
                        <SelectItem key={funil.id} value={funil.id.toString()}>
                          {funil.nome} {funil.funil_padrao && "(Padrão)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <FunnelFlow
                stages={funnelData}
                height={300}
              />
            </CardContent>
          </Card>
        </section>

        Seção de Distribuição de Notas comentada - código removido

        Cards de KPI
        section className="mt-8"
          KPICards dateRange={dateRangeApplied ? dateRange : (dateRange.from && dateRange.to ? dateRange : undefined)} /
        /section

        Investimento por Canal
        section className="mt-8"
          RevenueByChannel dateRange={dateRangeApplied ? dateRange : undefined} /
        /section
        </div>
      </div>
    </>
  );
  */
  
  // ============================================
  // CÓDIGO ATUAL - Usando NovoDashboard
  // ============================================
  return <NovoDashboard />;
}
