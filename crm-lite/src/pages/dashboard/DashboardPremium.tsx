import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { RevenueByChannel, KPICards } from '@/components/dashboard';
import { useAuth } from "@/contexts/auth";
import { clientesService } from "@/services/clientesService";
import { leadsService } from "@/services/leadsService";
import { toast } from "sonner";
import { useRealtime } from "@/contexts/realtimeContext";

// Dados iniciais para o funnel
const initialFunnelData = [
  { name: "Conversas Iniciadas", value: 0 },
  { name: "Leads Qualificados", value: 0 },
  { name: "Oportunidades", value: 0 },
  { name: "Vendas Realizadas", value: 0 },
];

export default function DashboardPremium() {
  // Calcular dinamicamente os últimos 30 dias
  const getDefaultDateRange = (): DateRange => {
    const today = new Date();
    return {
      from: startOfDay(subDays(today, 29)), // Hoje - 30 dias (29 porque inclui hoje)
      to: endOfDay(today), // Hoje
    };
  };

  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange());
  const [selectedShortcut, setSelectedShortcut] = useState("last30days");
  const [dateRangeApplied, setDateRangeApplied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [funnelData, setFunnelData] = useState(initialFunnelData);
  const [loadingGraphs, setLoadingGraphs] = useState(false);
  const [atualizandoRelatorio, setAtualizandoRelatorio] = useState(false);
  const [clientInfo, setClientInfo] = useState<any>(null);
  const [updateMessages] = useState([
    "Atualizando Relatório",
    "Calculando Score", 
    "Verificando Oportunidades"
  ]);
  const [currentUpdateMessage, setCurrentUpdateMessage] = useState(0);
  
  // Usar o contexto de tempo real
  const { clientId, lastUpdate, subscribeComponent, unsubscribeComponent } = useRealtime();
  const { user } = useAuth();

  // Atualizar o efeito inicial para usar 30 dias
  useEffect(() => {
    const today = new Date();
    setDateRange({
      from: subDays(today, 29),
      to: endOfDay(today)
    });
    setSelectedShortcut("last30days");
    setDateRangeApplied(true); // Aplicar automaticamente o filtro inicial
  }, []); // Dependências vazias para executar apenas uma vez

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
        newDateRange = {
          from: startOfDay(subDays(today, 1)),
          to: endOfDay(subDays(today, 1))
        };
        break;
      case 'last7days':
        newDateRange = {
          from: startOfDay(subDays(today, 6)),
          to: endOfDay(today)
        };
        break;
      case 'last30days':
        newDateRange = {
          from: startOfDay(subDays(today, 29)),
          to: endOfDay(today)
        };
        break;
      default:
        newDateRange = {
          from: startOfDay(subDays(today, 29)),
          to: endOfDay(today)
        };
    }

    setDateRange(newDateRange);
    setDateRangeApplied(true);
  };

  // Função para formatar o intervalo de datas
  const formatDateRange = () => {
    if (dateRange.from && dateRange.to) {
      return `${format(dateRange.from, "dd/MM/yy")} - ${format(dateRange.to, "dd/MM/yy")}`;
    }
    return "Selecione período";
  };

  // Função para aplicar o filtro de data
  const handleApplyDateFilter = () => {
    setDateRangeApplied(true);
    void 0;
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
      
      void 0;
      void 0;

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
            void 0;
          } else {
            console.error(`❌ DashboardPremium: Erro ao disparar webhook ${index + 1} (${endpoints[index]}):`, result.value.status, result.value.statusText);
          }
        } else {
          console.error(`💥 DashboardPremium: Erro ao disparar webhook ${index + 1} (${endpoints[index]}):`, result.reason);
        }
      });
    } catch (error) {
      console.error('💥 DashboardPremium: Erro ao disparar webhook:', error);
    }
  };

  // Função manual para buscar dados
  const handleFetchData = async () => {
    void 0;
    void 0;
    void 0;
    
    if (!clientId) {
      toast.error('Cliente não identificado');
      return;
    }
    
    if (!dateRange.from || !dateRange.to) {
      toast.error('Selecione um período');
      return;
    }
    
    void 0;
    
    try {
      // Definir estado de atualização como true
      setAtualizandoRelatorio(true);
      await clientesService.setAtualizandoRelatorio(user?.id || '', true);
      
      // Buscar informações do cliente para obter o instance_name
      const clientInfo = await clientesService.getClienteByIdCliente(clientId);
      
      // Executar as funções de busca de dados
      await Promise.all([
        fetchLeadsForFunnel(clientId),
      ]);
      
      // Disparar webhook se tivermos o instance_name
      if (clientInfo?.instance_name) {
        void 0;
        await triggerWebhook(clientInfo.instance_name);
      } else {
        void 0;
      }
      
      toast.success('Dados atualizados com sucesso!');
    } catch (error) {
      console.error('DashboardPremium: Erro ao atualizar dados:', error);
      toast.error('Erro ao atualizar dados');
      // Em caso de erro, resetar o estado de atualização
      setAtualizandoRelatorio(false);
      await clientesService.setAtualizandoRelatorio(user?.id || '', false);
    }
  };

  // Função para determinar o estágio correto baseado no status, igual à lógica usada na visualização em quadro
  const determineStatusCounts = (leads: any[]) => {
    const counts = {
      total: leads.length,
      leads: 0,
      viuNaoRespondeu: 0,
      conversaEmAndamento: 0,
      parouDeResponder: 0,
      oportunidade: 0,
      ganho: 0,
      perdido: 0
    };
    
    leads.forEach(lead => {
      if (!lead.status) {
        counts.leads++;
        return;
      }
      
      // Normalizar o status para minúsculas e sem acentos
      const normalizedStatus = lead.status.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      
      // Usar a mesma lógica do BoardContext.determineStage
      switch (normalizedStatus) {
        case 'leads':
          counts.leads++;
          break;
        case 'viu e nao respondeu':
        case 'viu-nao-respondeu':
        case 'viu e não respondeu':
          counts.viuNaoRespondeu++;
          break;
        case 'conversa em andamento':
        case 'conversa-em-andamento':
          counts.conversaEmAndamento++;
          break;
        case 'parou de responder':
        case 'parou-de-responder':
          counts.parouDeResponder++;
          break;
        case 'oportunidade':
          counts.oportunidade++;
          break;
        case 'ganho':
          counts.ganho++;
          break;
        case 'perdido':
          counts.perdido++;
          break;
        default:
          counts.leads++;
      }
    });
    
    return counts;
  };

  // Função para buscar leads e atualizar o funil
  const fetchLeadsForFunnel = async (clientId: number) => {
    if (!clientId || !dateRange.from || !dateRange.to) return;
    
    void 0;
    setLoadingGraphs(true);
    
    try {
      // Usar o mesmo método do Dashboard comum se disponível, senão usar o método atual
      let leads;
      try {
        leads = await leadsService.getLeadsByClientIdAndDateRange(clientId, dateRange.from, dateRange.to);
      } catch (error) {
        void 0;
        leads = await leadsService.getLeadsByClientId(clientId);
      }
      
      if (!leads || leads.length === 0) {
        void 0;
        setFunnelData([
          { name: "Conversas Iniciadas", value: 0 },
          { name: "Leads Qualificados", value: 0 },
          { name: "Oportunidades", value: 0 },
          { name: "Vendas Realizadas", value: 0 }
        ]);
        setLoadingGraphs(false);
        return;
      }
      
      // Log para depuração - mostrar distribuição de status
      const statusCounts = leads.reduce((counts: any, lead: any) => {
        counts[lead.status] = (counts[lead.status] || 0) + 1;
        return counts;
      }, {} as Record<string, number>);
      
      // Usar a função de determinação de status
      const counts = determineStatusCounts(leads);
      
      // Contar total de leads para "Conversas Iniciadas"
      const totalLeads = leads.length;
      
      // Contar leads em "Conversa em andamento" + "Parou de responder"
      const conversasEmAndamento = counts.conversaEmAndamento + counts.parouDeResponder;
      
      // Contar leads em "Oportunidade"
      const oportunidades = counts.oportunidade;
      
      // Contar leads em "Ganho"
      const vendasRealizadas = counts.ganho;
      
      // Log detalhado para depuração
      void 0;
      
      // Atualizar o estado do funil
      const newFunnelData = [
        { name: "Conversas Iniciadas", value: totalLeads },
        { name: "Leads Qualificados", value: conversasEmAndamento },
        { name: "Oportunidades", value: oportunidades },
        { name: "Vendas Realizadas", value: vendasRealizadas }
      ];
      
      void 0;
      setFunnelData(newFunnelData);
    } catch (error) {
      console.error('DashboardPremium: Erro ao buscar leads:', error);
      toast.error('Erro ao carregar dados para o funil');
    } finally {
      setLoadingGraphs(false);
    }
  };

  // Função para buscar informações do cliente
  const fetchClientInfo = async () => {
    if (!clientId) return;
    
    try {
      const info = await clientesService.getClienteByIdCliente(clientId);
      setClientInfo(info);
      setAtualizandoRelatorio(info?.atualizando_relatorio || false);
    } catch (error) {
      console.error('DashboardPremium: Erro ao buscar informações do cliente:', error);
    }
  };

  // Efeito para buscar dados quando o componente é montado ou quando clientId muda
  useEffect(() => {
    if (clientId) {
      void 0;
      // Buscar informações do cliente
      fetchClientInfo().finally(() => {
        setLoading(false); // Definir loading como false após buscar informações
        // Se o filtro inicial já estiver aplicado, carregar os leads
        if (dateRangeApplied && dateRange.from && dateRange.to) {
          fetchLeadsForFunnel(clientId);
        }
      });
    }
  }, [clientId]); // Apenas clientId como dependência

  // Efeito para atualizar dados quando o dateRange mudar
  useEffect(() => {
    if (clientId && dateRange.from && dateRange.to && dateRangeApplied) {
      void 0;
      fetchLeadsForFunnel(clientId);
    }
  }, [dateRangeApplied, clientId]); // Removido dateRange das dependências para evitar loops

  // Inscrever no contexto de tempo real
  // DESABILITADO: Causava recursão infinita
  // useEffect(() => {
  //   if (clientId) {
  //     subscribeComponent('dashboard-premium');
  //   }

  //   return () => {
  //     if (clientId) {
  //       unsubscribeComponent('dashboard-premium');
  //     }
  //   };
  // }, [clientId, subscribeComponent, unsubscribeComponent]);

  // Efeito para verificar periodicamente o estado de atualização
  useEffect(() => {
    if (atualizandoRelatorio && clientId) {
      const interval = setInterval(async () => {
        try {
          const info = await clientesService.getClienteByIdCliente(clientId);
          if (info && !info.atualizando_relatorio) {
            setAtualizandoRelatorio(false);
            setClientInfo(info);
            toast.success('Relatório atualizado com sucesso!');
          }
        } catch (error) {
          console.error('DashboardPremium: Erro ao verificar status de atualização:', error);
        }
      }, 5000); // Verificar a cada 5 segundos

      return () => clearInterval(interval);
    }
  }, [atualizandoRelatorio, clientId]); // Apenas estas duas dependências

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
  }, [atualizandoRelatorio]); // Apenas atualizandoRelatorio como dependência

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
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
          
          {/* Informação da última atualização */}
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
              <CardTitle>Funil de Vendas</CardTitle>
              <CardDescription>
                Acompanhe a evolução das conversas até a venda
                {dateRange.from && dateRange.to && (
                  <span className="block mt-1 text-sm text-gray-600">
                    Período: {format(dateRange.from, "dd/MM/yyyy")} a {format(dateRange.to, "dd/MM/yyyy")}
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FunnelFlow
                stages={funnelData}
                height={300}
              />
            </CardContent>
          </Card>
        </section>
      </div>

      {/* Cards de KPI */}
      <section>
        <KPICards dateRange={dateRangeApplied ? dateRange : undefined} />
      </section>

      {/* Investimento por Canal */}
      <section>
        <RevenueByChannel dateRange={dateRangeApplied ? dateRange : undefined} />
      </section>
    </div>
  );
}
