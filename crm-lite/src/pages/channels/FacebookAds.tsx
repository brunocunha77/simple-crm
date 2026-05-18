import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Facebook, Users, Target, DollarSign, TrendingUp, RefreshCw, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { useAuth } from '@/contexts/auth';
import { MetricasFbService } from '@/services/metricasFbService';
import { DateRange } from 'react-day-picker';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';

// Dados mockados para o gráfico (serão substituídos por dados reais)
const performanceData = [
  { date: '01/01', leads: 0, conversoes: 0, custo: 0 },
  { date: '02/01', leads: 0, conversoes: 0, custo: 0 },
  { date: '03/01', leads: 0, conversoes: 0, custo: 0 },
  { date: '04/01', leads: 0, conversoes: 0, custo: 0 },
  { date: '05/01', leads: 0, conversoes: 0, custo: 0 },
  { date: '06/01', leads: 0, conversoes: 0, custo: 0 },
  { date: '07/01', leads: 0, conversoes: 0, custo: 0 },
];

// Dados dos KPIs (serão substituídos por dados reais)
const kpiData = [
  {
    id: 'total-leads',
    title: 'Total de Leads',
    value: 0,
    description: 'Leads gerados',
    icon: <Users className="h-5 w-5 text-blue-600" />,
  },
  {
    id: 'conversoes',
    title: 'Conversões',
    value: 0,
    description: 'Vendas fechadas',
    icon: <Target className="h-5 w-5 text-green-600" />,
  },
  {
    id: 'receita-total',
    title: 'Receita Total',
    value: 'R$ 0',
    description: 'Faturamento gerado',
    icon: <DollarSign className="h-5 w-5 text-purple-600" />,
  },
  {
    id: 'roas',
    title: 'ROAS',
    value: '0,0',
    description: 'Return on Ad Spend',
    icon: <TrendingUp className="h-5 w-5 text-orange-600" />,
  },
];

export default function FacebookAdsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [metricas, setMetricas] = useState({
    totalImpressoes: 0,
    totalCliques: 0,
    totalInvestimento: 0,
    totalROI: null as number | null,
    totalLeads: 0
  });
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 29), // Últimos 30 dias
    to: new Date()
  });
  const [dateRangeApplied, setDateRangeApplied] = useState(false);

  useEffect(() => {
    const fetchMetricas = async () => {
      if (!user?.id_cliente) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // Usar filtro de data apenas se aplicado
        const dataInicio = dateRangeApplied ? dateRange.from : undefined;
        const dataFim = dateRangeApplied ? dateRange.to : undefined;
        
        void 0;
        void 0;
        void 0;
        void 0;
        
        const dados = await MetricasFbService.getMetricasPorCliente(
          user.id_cliente,
          dataInicio,
          dataFim
        );
        const totalLeads = await MetricasFbService.getTotalLeadsFacebookAds(
          user.id_cliente,
          dataInicio,
          dataFim
        );
        void 0;
        void 0;
        setMetricas({
          ...dados,
          totalLeads
        });
      } catch (error) {
        console.error('Erro ao buscar métricas do Facebook:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetricas();
  }, [user?.id_cliente, dateRangeApplied, dateRange.from, dateRange.to]);

  const handleBack = () => {
    navigate('/');
  };

  const formatValue = (value: string | number) => {
    if (typeof value === 'number') {
      return value.toLocaleString('pt-BR');
    }
    return value;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Dados dos KPIs com valores reais
  const kpiData = [
    {
      id: 'total-leads',
      title: 'Total de Leads',
      value: metricas.totalLeads || 0,
      description: 'Leads gerados pelo Facebook Ads',
      icon: <Users className="h-5 w-5 text-blue-600" />,
    },
    {
      id: 'total-impressoes',
      title: 'Total de Impressões',
      value: metricas.totalImpressoes,
      description: 'Impressões dos anúncios',
      icon: <Users className="h-5 w-5 text-blue-600" />,
    },
    {
      id: 'total-cliques',
      title: 'Total de Cliques',
      value: metricas.totalCliques,
      description: 'Cliques nos anúncios',
      icon: <Target className="h-5 w-5 text-green-600" />,
    },
    {
      id: 'investimento-total',
      title: 'Investimento Total',
      value: formatCurrency(metricas.totalInvestimento),
      description: 'Total investido (filtrado)',
      icon: <DollarSign className="h-5 w-5 text-purple-600" />,
    },
    {
      id: 'roi',
      title: 'ROI',
      value: metricas.totalROI !== null ? `${metricas.totalROI.toFixed(2)}%` : 'N/A',
      description: 'Return on Investment',
      icon: <TrendingUp className="h-5 w-5 text-orange-600" />,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header com navegação */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Facebook className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Facebook Ads</h1>
              <p className="text-sm text-gray-600">Análise detalhada de performance</p>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="space-y-8">
          {/* Cards de KPI */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Métricas Principais</h2>
              <div className="flex items-center gap-2">
                {/* Filtro de Data */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {dateRangeApplied && dateRange.from && dateRange.to
                        ? `${format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} - ${format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}`
                        : "Filtrar por data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <CalendarComponent
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange.from}
                      selected={dateRange}
                      onSelect={(range) => {
                        setDateRange(range || { from: undefined, to: undefined });
                        setDateRangeApplied(false);
                      }}
                      numberOfMonths={2}
                      locale={ptBR}
                    />
                    <div className="p-3 border-t">
                      <Button
                        onClick={() => {
                          setDateRangeApplied(true);
                        }}
                        className="w-full"
                        disabled={!dateRange.from || !dateRange.to}
                      >
                        Aplicar Filtro
                      </Button>
                      {dateRangeApplied && (
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setDateRangeApplied(false);
                            setDateRange({
                              from: subDays(new Date(), 29),
                              to: new Date()
                            });
                          }}
                          className="w-full mt-2"
                        >
                          Remover Filtro
                        </Button>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    if (!user?.id_cliente) return;
                    setLoading(true);
                    try {
                      const dataInicio = dateRangeApplied ? dateRange.from : undefined;
                      const dataFim = dateRangeApplied ? dateRange.to : undefined;
                      const dados = await MetricasFbService.getMetricasPorCliente(
                        user.id_cliente,
                        dataInicio,
                        dataFim
                      );
                      const totalLeads = await MetricasFbService.getTotalLeadsFacebookAds(
                        user.id_cliente,
                        dataInicio,
                        dataFim
                      );
                      setMetricas({
                        ...dados,
                        totalLeads
                      });
                    } catch (error) {
                      console.error('Erro ao atualizar métricas:', error);
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Atualizar
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
              {loading ? (
                <div className="col-span-full text-center py-8 text-gray-500">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                  Carregando métricas...
                </div>
              ) : (
                kpiData.map((kpi) => (
                <Card key={kpi.id} className="bg-white border border-gray-200 hover:shadow-md transition-shadow duration-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium text-gray-700">
                        {kpi.title}
                      </CardTitle>
                      <div className="text-gray-400">
                        {kpi.icon}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      {/* Valor principal */}
                      <div className="text-3xl font-bold text-gray-900">
                        {formatValue(kpi.value)}
                      </div>
                      
                      {/* Descrição */}
                      <p className="text-xs text-gray-500">
                        {kpi.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))
              )}
            </div>
          </section>

          {/* Gráfico de Performance */}
          <section>
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-gray-900">
                  Performance ao Longo do Tempo
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Evolução das métricas principais do canal
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="date" 
                        stroke="#6b7280"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        stroke="#6b7280"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => value.toString()}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                        labelStyle={{ fontWeight: 'bold', color: '#374151' }}
                      />
                      <Legend 
                        verticalAlign="bottom" 
                        height={36}
                        wrapperStyle={{
                          paddingTop: '20px'
                        }}
                      />
                      
                      {/* Linha de Leads */}
                      <Line
                        type="monotone"
                        dataKey="leads"
                        stroke="#8b5cf6"
                        strokeWidth={2}
                        dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: '#8b5cf6', strokeWidth: 2 }}
                        name="Leads"
                      />
                      
                      {/* Linha de Conversões */}
                      <Line
                        type="monotone"
                        dataKey="conversoes"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2 }}
                        name="Conversões"
                      />
                      
                      {/* Linha de Custo */}
                      <Line
                        type="monotone"
                        dataKey="custo"
                        stroke="#ef4444"
                        strokeWidth={2}
                        dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: '#ef4444', strokeWidth: 2 }}
                        name="Custo"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}
