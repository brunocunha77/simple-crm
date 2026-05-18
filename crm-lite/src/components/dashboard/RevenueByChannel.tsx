import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { usePlanoPlus } from '@/hooks/usePlanoPlus';
import { MetricasFbService, MetricasFbAgregadas } from '@/services/metricasFbService';
import { useAuth } from '@/contexts/auth';
import { DateRange } from 'react-day-picker';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface ChannelData {
  id: string;
  name: string;
  color: string;
  revenue: number;
  percentage: number;
  isActive?: boolean;
}

interface RevenueByChannelProps {
  channels?: ChannelData[];
  onChannelClick?: (channel: ChannelData) => void;
  className?: string;
  dateRange?: DateRange;
}

// Dados padrão com valores zerados - removidos Google e Orgânico
const defaultChannels: ChannelData[] = [
  {
    id: 'facebook',
    name: 'Facebook',
    color: 'bg-blue-500',
    revenue: 0,
    percentage: 0,
    isActive: true
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    color: 'bg-green-600',
    revenue: 0,
    percentage: 0,
    isActive: true
  }
];

export const RevenueByChannel: React.FC<RevenueByChannelProps> = ({
  channels: propChannels,
  onChannelClick,
  className = '',
  dateRange
}) => {
  const navigate = useNavigate();
  const { isPlanoPlus, loading } = usePlanoPlus();
  const { user } = useAuth();
  const [channels, setChannels] = useState<ChannelData[]>(defaultChannels);
  const [expandedChannel, setExpandedChannel] = useState<string | null>(null);
  const [detalhesFacebook, setDetalhesFacebook] = useState<MetricasFbAgregadas['metricasPorAnuncio']>([]);
  const [loadingDetalhes, setLoadingDetalhes] = useState(false);

  // Buscar métricas do Facebook da tabela metricas_fb
  // Agora disponível para todos os planos, incluindo Trial
  useEffect(() => {
    const fetchFacebookMetricas = async () => {
      if (!user?.id_cliente) return;

      try {
        // Usar filtro de data se fornecido
        const dataInicio = dateRange?.from;
        const dataFim = dateRange?.to;
        
        const totalInvestimento = await MetricasFbService.getTotalInvestimentoPorCliente(
          user.id_cliente,
          dataInicio,
          dataFim
        );
        
        // Atualizar apenas o canal Facebook com os valores reais
        setChannels(prevChannels => {
          const updatedChannels = prevChannels.map(channel => {
            if (channel.id === 'facebook') {
              return { ...channel, revenue: totalInvestimento };
            }
            return channel;
          });
          
          // Calcular percentuais
          const totalRevenue = updatedChannels.reduce((sum, ch) => sum + ch.revenue, 0);
          return updatedChannels.map(ch => ({
            ...ch,
            percentage: totalRevenue > 0 ? (ch.revenue / totalRevenue) * 100 : 0
          }));
        });
      } catch (error) {
        console.error('Erro ao buscar métricas do Facebook:', error);
      }
    };

    fetchFacebookMetricas();
  }, [user?.id_cliente, dateRange?.from, dateRange?.to]);

  // Se channels foram passados como prop, usar eles
  useEffect(() => {
    if (propChannels) {
      setChannels(propChannels);
    }
  }, [propChannels]);

  // Recarregar detalhes quando o dateRange mudar e estiver expandido
  // Agora disponível para todos os planos, incluindo Trial
  useEffect(() => {
    if (expandedChannel === 'facebook' && user?.id_cliente) {
      const fetchDetalhes = async () => {
        setLoadingDetalhes(true);
        try {
          const dataInicio = dateRange?.from;
          const dataFim = dateRange?.to;
          const detalhes = await MetricasFbService.getMetricasDetalhadasPorCliente(
            user.id_cliente,
            dataInicio,
            dataFim
          );
          setDetalhesFacebook(detalhes);
        } catch (error) {
          console.error('Erro ao buscar detalhes do Facebook:', error);
        } finally {
          setLoadingDetalhes(false);
        }
      };
      fetchDetalhes();
    }
  }, [dateRange?.from, dateRange?.to, expandedChannel, user?.id_cliente]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const handleChannelClick = async (channelId: string) => {
    if (channelId === 'facebook') {
      if (expandedChannel === 'facebook') {
        // Fechar
        setExpandedChannel(null);
        setDetalhesFacebook([]);
      } else {
        // Abrir e buscar detalhes
        setExpandedChannel('facebook');
        if (detalhesFacebook.length === 0) {
          setLoadingDetalhes(true);
          try {
            const dataInicio = dateRange?.from;
            const dataFim = dateRange?.to;
            const detalhes = await MetricasFbService.getMetricasDetalhadasPorCliente(
              user?.id_cliente!,
              dataInicio,
              dataFim
            );
            setDetalhesFacebook(detalhes);
          } catch (error) {
            console.error('Erro ao buscar detalhes do Facebook:', error);
          } finally {
            setLoadingDetalhes(false);
          }
        }
      }
    }
  };

  // Métricas agora disponíveis para todos os planos, incluindo Trial
  // Removida a verificação de plano Plus

  // Se está carregando, mostrar skeleton
  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-900">
            Investimento por Canal
          </CardTitle>
          <CardDescription className="text-gray-600">
            Verificando seu plano...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                    <div className="h-4 bg-gray-300 rounded w-20"></div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-32 h-2 bg-gray-300 rounded"></div>
                    <div className="h-4 bg-gray-300 rounded w-16"></div>
                    <div className="h-4 bg-gray-300 rounded w-12"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-gray-900">
          Investimento por Canal
        </CardTitle>
        <CardDescription className="text-gray-600">
          Investimento detalhado por canal de anúncios
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {channels.map((channel) => (
            <div key={channel.id} className="space-y-0">
              <div
                onClick={() => channel.id === 'facebook' && handleChannelClick(channel.id)}
                className={`
                  flex items-center justify-between p-4 rounded-lg border border-gray-200 
                  transition-all duration-200
                  ${channel.isActive ? 'opacity-100' : 'opacity-60'}
                  ${channel.id === 'facebook' ? 'cursor-pointer hover:bg-gray-50' : ''}
                `}
              >
                {/* Nome do canal com indicador de cor */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={`w-3 h-3 ${channel.color} rounded-full flex-shrink-0`}></div>
                  <span className="font-medium text-gray-900 truncate">
                    {channel.name}
                  </span>
                  {channel.id === 'facebook' && (
                    <span className="text-gray-400">
                      {expandedChannel === 'facebook' ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </span>
                  )}
                </div>

                {/* Barra de progresso e valores */}
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  {/* Barra de progresso */}
                  <div className="flex-1 max-w-xs min-w-0">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className={`${channel.color} h-2.5 rounded-full transition-all duration-300`}
                        style={{ 
                          width: `${Math.max(channel.percentage, 1)}%`,
                          minWidth: '4px'
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Valor do investimento */}
                  <span className="font-semibold text-gray-900 text-right min-w-0">
                    {formatCurrency(channel.revenue)}
                  </span>

                  {/* Percentual */}
                  <span className="text-sm text-gray-600 text-right min-w-0">
                    {formatPercentage(channel.percentage)}
                  </span>
                </div>
              </div>

              {/* Detalhes expandidos do Facebook */}
              {channel.id === 'facebook' && expandedChannel === 'facebook' && (
                <div className="mt-2 ml-7 border-l-2 border-blue-200 pl-4 py-2">
                  {loadingDetalhes ? (
                    <div className="text-sm text-gray-500">Carregando detalhes...</div>
                  ) : detalhesFacebook.length === 0 ? (
                    <div className="text-sm text-gray-500">Nenhum dado disponível</div>
                  ) : (
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">
                        Gastos por Campanha e Anúncio
                      </h4>
                      <div className="space-y-2">
                        {detalhesFacebook.map((anuncio, index) => (
                          <div
                            key={index}
                            className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm text-gray-900 mb-1">
                                  {anuncio.nome_campanha}
                                </div>
                                <div className="text-xs text-gray-600 mb-2">
                                  {anuncio.nome_anuncio}
                                </div>
                                <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                                  <span>
                                    Impressões: {anuncio.impressoes?.toLocaleString('pt-BR') || 0}
                                  </span>
                                  <span>
                                    Cliques: {anuncio.cliques?.toLocaleString('pt-BR') || 0}
                                  </span>
                                  {anuncio.ROI !== null && (
                                    <span>
                                      ROI: {anuncio.ROI.toFixed(2)}%
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-semibold text-sm text-gray-900">
                                  {formatCurrency(anuncio.Investimento || 0)}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Resumo total */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">Total</span>
            <div className="text-right">
              <div className="text-lg font-bold text-gray-900">
                {formatCurrency(channels.reduce((sum, channel) => sum + channel.revenue, 0))}
              </div>
              <div className="text-xs text-gray-500">
                {channels.length} canais ativos
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RevenueByChannel;
