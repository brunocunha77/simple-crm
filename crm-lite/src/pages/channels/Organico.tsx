import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, TrendingUp, Users, Target, DollarSign, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

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
    description: 'Return on Ad Spend (sem custo)',
    icon: <BarChart3 className="h-5 w-5 text-orange-600" />,
  },
];

export default function OrganicoPage() {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/');
  };

  const formatValue = (value: string | number) => {
    if (typeof value === 'number') {
      return value.toLocaleString('pt-BR');
    }
    return value;
  };

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
            <div className="w-10 h-10 bg-gray-500 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Orgânico</h1>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {kpiData.map((kpi) => (
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
              ))}
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
                      
                      {/* Linha de Custo (sempre zero para orgânico) */}
                      <Line
                        type="monotone"
                        dataKey="custo"
                        stroke="#6b7280"
                        strokeWidth={2}
                        dot={{ fill: '#6b7280', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: '#6b7280', strokeWidth: 2 }}
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
