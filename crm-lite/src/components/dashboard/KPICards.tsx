import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Target, DollarSign, TrendingUp } from 'lucide-react';
import { usePlanoPlus } from '@/hooks/usePlanoPlus';
import { useAuth } from '@/contexts/auth';
import { MetricasFbService } from '@/services/metricasFbService';
import { DateRange } from 'react-day-picker';

interface KPIData {
  id: string;
  title: string;
  value: string | number;
  change: string;
  description: string;
  icon: React.ReactNode;
  isPositive?: boolean;
}

interface KPICardsProps {
  kpis?: KPIData[];
  className?: string;
  dateRange?: DateRange;
}

// Dados padrão com valores zerados
const defaultKPIs: KPIData[] = [
  {
    id: 'total-leads',
    title: 'Total de Leads',
    value: 0,
    change: '+0% vs período anterior',
    description: 'Contatos captados',
    icon: <Users className="h-5 w-5 text-blue-600" />,
    isPositive: true
  },
  {
    id: 'conversoes',
    title: 'Conversões',
    value: 0,
    change: '+0% vs período anterior',
    description: 'Vendas fechadas',
    icon: <Target className="h-5 w-5 text-green-600" />,
    isPositive: true
  },
  {
    id: 'receita-total',
    title: 'Receita Total',
    value: 'R$ 0',
    change: '+0% vs período anterior',
    description: 'Faturamento do período',
    icon: <DollarSign className="h-5 w-5 text-purple-600" />,
    isPositive: true
  },
  {
    id: 'investimento-total',
    title: 'Investimento Total',
    value: 'R$ 0',
    change: '+0% vs período anterior',
    description: 'Total investido em anúncios',
    icon: <TrendingUp className="h-5 w-5 text-orange-600" />,
    isPositive: true
  }
];

export const KPICards: React.FC<KPICardsProps> = ({
  kpis: propKPIs,
  className = '',
  dateRange
}) => {
  const { isPlanoPlus, loading } = usePlanoPlus();
  const { user } = useAuth();
  const [kpis, setKpis] = useState<KPIData[]>(defaultKPIs);
  const [loadingData, setLoadingData] = useState(true);

  // Buscar dados reais
  // Agora disponível para todos os planos, incluindo Trial
  useEffect(() => {
    const fetchKPIData = async () => {
      if (!user?.id_cliente) {
        setLoadingData(false);
        return;
      }

      try {
        setLoadingData(true);
        
        // Usar filtro de data se fornecido (sempre passar, mesmo que undefined)
        const dataInicio = dateRange?.from;
        const dataFim = dateRange?.to;

        void 0;
        void 0;

        // Buscar investimento total e leads do Facebook Ads
        const [metricas, totalLeads] = await Promise.all([
          MetricasFbService.getMetricasPorCliente(user.id_cliente, dataInicio, dataFim),
          MetricasFbService.getTotalLeadsFacebookAds(user.id_cliente, dataInicio, dataFim)
        ]);

        void 0;

        const formatCurrency = (value: number) => {
          return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
          }).format(value);
        };

        // Atualizar KPIs com dados reais
        setKpis([
          {
            id: 'total-leads',
            title: 'Total de Leads',
            value: totalLeads,
            change: '+0% vs período anterior',
            description: 'Leads gerados pelo Facebook Ads',
            icon: <Users className="h-5 w-5 text-blue-600" />,
            isPositive: true
          },
          {
            id: 'conversoes',
            title: 'Conversões',
            value: 0,
            change: '+0% vs período anterior',
            description: 'Vendas fechadas',
            icon: <Target className="h-5 w-5 text-green-600" />,
            isPositive: true
          },
          {
            id: 'receita-total',
            title: 'Receita Total',
            value: 'R$ 0',
            change: '+0% vs período anterior',
            description: 'Faturamento do período',
            icon: <DollarSign className="h-5 w-5 text-purple-600" />,
            isPositive: true
          },
          {
            id: 'investimento-total',
            title: 'Investimento Total',
            value: formatCurrency(metricas.totalInvestimento),
            change: '+0% vs período anterior',
            description: 'Total investido em anúncios',
            icon: <TrendingUp className="h-5 w-5 text-orange-600" />,
            isPositive: true
          }
        ]);
      } catch (error) {
        console.error('Erro ao buscar dados dos KPIs:', error);
      } finally {
        setLoadingData(false);
      }
    };

    fetchKPIData();
  }, [user?.id_cliente, isPlanoPlus, dateRange?.from, dateRange?.to]);

  // Se KPIs foram passados como prop, usar eles
  useEffect(() => {
    if (propKPIs) {
      setKpis(propKPIs);
    }
  }, [propKPIs]);

  const formatValue = (value: string | number) => {
    if (typeof value === 'number') {
      return value.toLocaleString('pt-BR');
    }
    return value;
  };

  // Se não tem plano plus, mostrar mensagem de upgrade
  if (!isPlanoPlus && !loading) {
    return (
      <div className={`${className}`}>
        <Card className="bg-white border border-gray-200">
          <CardContent className="p-8">
            <div className="text-center">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                KPIs Avançados
              </h3>
              <p className="text-gray-600 mb-4">
                Desbloqueie métricas detalhadas de performance com o plano Pro ou Plus!
              </p>
              <div className="text-sm text-gray-500">
                • Total de Leads<br/>
                • Conversões<br/>
                • Receita Total<br/>
                • Investimento Total
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Se está carregando, mostrar skeleton
  if (loading || loadingData) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${className}`}>
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="bg-white border border-gray-200 animate-pulse">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="h-4 bg-gray-300 rounded w-20"></div>
                <div className="w-5 h-5 bg-gray-300 rounded"></div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                <div className="h-8 bg-gray-300 rounded w-16"></div>
                <div className="h-4 bg-gray-300 rounded w-24"></div>
                <div className="h-4 bg-gray-300 rounded w-20"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${className}`}>
      {kpis.map((kpi) => (
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
              
              {/* Indicador de mudança */}
              <div className="flex items-center gap-1">
                <svg 
                  className={`w-4 h-4 ${
                    kpi.isPositive ? 'text-green-500' : 'text-red-500'
                  }`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d={kpi.isPositive ? "M5 10l7-7m0 0l7 7m-7-7v18" : "M19 14l-7 7m0 0l-7-7m7 7V3"}
                  />
                </svg>
                <span className={`text-sm font-medium ${
                  kpi.isPositive ? 'text-green-600' : 'text-red-600'
                }`}>
                  {kpi.change}
                </span>
              </div>
              
              {/* Descrição */}
              <p className="text-xs text-gray-500">
                {kpi.description}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default KPICards;
