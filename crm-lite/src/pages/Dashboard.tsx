import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, BarChart3, Users, PhoneCall, BadgeCheck, ChevronDown, Calendar } from "lucide-react";
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area,
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from "recharts";
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
import { pt } from "date-fns/locale";
import { DateRange } from "react-day-picker";
import { useAuth } from "@/contexts/auth";
import WhatsAppConnectMeta from "@/components/whatsapp/WhatsAppConnectMeta";
import { EmptyState } from "@/components/ui/empty-state";
import { clientesService } from "@/services/clientesService";
import { leadsService } from "@/services/leadsService";
import { toast } from "sonner";

// Dados de exemplo para os gráficos
const conversionData = [
  { name: "Jan", taxa: 18 },
  { name: "Fev", taxa: 20 },
  { name: "Mar", taxa: 19 },
  { name: "Abr", taxa: 22 },
  { name: "Mai", taxa: 24 },
  { name: "Jun", taxa: 23 },
  { name: "Jul", taxa: 24.3 },
];

const leadsData = [
  { name: "Jan", novos: 15, qualificados: 8, oportunidades: 5 },
  { name: "Fev", novos: 18, qualificados: 10, oportunidades: 7 },
  { name: "Mar", novos: 20, qualificados: 12, oportunidades: 8 },
  { name: "Abr", novos: 22, qualificados: 15, oportunidades: 10 },
  { name: "Mai", novos: 25, qualificados: 18, oportunidades: 12 },
  { name: "Jun", novos: 28, qualificados: 20, oportunidades: 15 },
  { name: "Jul", novos: 30, qualificados: 22, oportunidades: 18 },
];

// Dados iniciais vazios para distribuição por etapa
const initialStagesData = [
  { name: "Leads", value: 0 },
  { name: "Viu e não respondeu", value: 0 },
  { name: "Conversa em andamento", value: 0 },
  { name: "Parou de responder", value: 0 },
  { name: "Oportunidade", value: 0 },
  { name: "Ganho", value: 0 },
  { name: "Perdido", value: 0 }
];

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#16a34a', '#dc2626'];

//T

const config = {
  novos: { label: "Novos Leads", color: "#8884d8" },
  qualificados: { label: "Qualificados", color: "#82ca9d" },
  oportunidades: { label: "Oportunidades", color: "#ffc658" },
  taxa: { label: "Taxa de Conversão", color: "#8884d8" },
};

export default function Dashboard() {
  // Calcular dinamicamente os últimos 30 dias
  const getDefaultDateRange = (): DateRange => {
    const today = new Date();
    return {
      from: startOfDay(subDays(today, 29)), // Hoje - 30 dias (29 porque inclui hoje)
      to: endOfDay(today), // Hoje
    };
  };

  const [period, setPeriod] = useState("month");
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange());
  const { user, hasConnectedWhatsApp } = useAuth();
  const [loading, setLoading] = useState(true);
  const [clientId, setClientId] = useState<number | null>(null);
  const [stagesData, setStagesData] = useState(initialStagesData);
  
  // Função para buscar o ID do cliente
  useEffect(() => {
    const fetchClientId = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        // Se o usuário tem email, vamos tentar buscar por email primeiro
        let clienteInfo = null;
        if (user.email) {
          clienteInfo = await clientesService.getClienteByEmail(user.email);
        }
        
        // Se não encontrou pelo email, tenta pelo ID do usuário
        if (!clienteInfo && user.id_cliente) {
          clienteInfo = await clientesService.getClienteByIdCliente(user.id_cliente);
        }
        
        if (!clienteInfo) {
          console.error(`Nenhum cliente encontrado para o usuário ${user.id_cliente || 'desconhecido'}`);
          toast.error("Nenhum cliente encontrado para o usuário.");
          setLoading(false);
          return;
        }
        
        setClientId(clienteInfo.id);
        
        // Agora que temos o ID do cliente, vamos buscar os leads
        fetchLeadsForStages(clienteInfo.id);
      } catch (err) {
        console.error('Erro ao buscar ID do cliente:', err);
        toast.error('Falha ao recuperar informações do cliente');
        setLoading(false);
      }
    };
    
    fetchClientId();
  }, [user]);

  // Função para buscar leads e atualizar a distribuição por etapa
  const fetchLeadsForStages = async (clientIdValue: number) => {
    if (!clientIdValue) return;
    
    setLoading(true);
    try {
      const leads = await leadsService.getLeadsByClientId(clientIdValue);
      
      if (leads.length === 0) {
        setStagesData(initialStagesData);
        setLoading(false);
        return;
      }
      
      // Contar leads por etapa
      const leadsByStage = {
        "Leads": 0,
        "Viu e não respondeu": 0,
        "Conversa em andamento": 0,
        "Parou de responder": 0,
        "Oportunidade": 0,
        "Ganho": 0,
        "Perdido": 0
      };
      
      // Contar leads em cada etapa
      leads.forEach(lead => {
        const status = lead.status;
        if (leadsByStage.hasOwnProperty(status)) {
          leadsByStage[status]++;
        } else {
          // Se o status não corresponder exatamente às etapas definidas, categorizar
          if (status.includes("Lead") || !status) {
            leadsByStage["Leads"]++;
          } else if (status.includes("Viu") && status.includes("respond")) {
            leadsByStage["Viu e não respondeu"]++;
          } else if (status.includes("Conversa") && status.includes("andamento")) {
            leadsByStage["Conversa em andamento"]++;
          } else if (status.includes("Parou") && status.includes("responder")) {
            leadsByStage["Parou de responder"]++;
          } else if (status.includes("Oportunidade")) {
            leadsByStage["Oportunidade"]++;
          } else if (status.includes("Ganho")) {
            leadsByStage["Ganho"]++;
          } else if (status.includes("Perdido")) {
            leadsByStage["Perdido"]++;
          } else {
            // Se não corresponder a nenhuma categoria, colocar em Leads
            leadsByStage["Leads"]++;
          }
        }
      });
      
      // Atualizar o estado da distribuição por etapa
      setStagesData([
        { name: "Leads", value: leadsByStage["Leads"] },
        { name: "Viu e não respondeu", value: leadsByStage["Viu e não respondeu"] },
        { name: "Conversa em andamento", value: leadsByStage["Conversa em andamento"] },
        { name: "Parou de responder", value: leadsByStage["Parou de responder"] },
        { name: "Oportunidade", value: leadsByStage["Oportunidade"] },
        { name: "Ganho", value: leadsByStage["Ganho"] },
        { name: "Perdido", value: leadsByStage["Perdido"] }
      ]);
      
      // Configurar atualização em tempo real
      subscribeToLeadUpdates(clientIdValue);
    } catch (error) {
      console.error('Erro ao buscar leads:', error);
      toast.error('Erro ao carregar dados para distribuição por etapa');
    } finally {
      setLoading(false);
    }
  };
  
  // Configurar listener para mudanças nos leads
  const subscribeToLeadUpdates = (clientIdValue: number) => {
    // Se já tivermos uma subscription, removemos antes de criar nova
    leadsService.unsubscribeFromLeadsUpdates(clientIdValue);
    
    // Criar nova subscription para atualizações em tempo real
    leadsService.subscribeToLeadsUpdates(clientIdValue, (update) => {
      // Quando receber uma atualização, refaz a busca dos leads
      fetchLeadsForStages(clientIdValue);
    });
  };
  
  // Cleanup ao desmontar o componente
  useEffect(() => {
    return () => {
      if (clientId) {
        leadsService.unsubscribeFromLeadsUpdates(clientId);
      }
    };
  }, [clientId]);
  
  // Formato da data no botão
  const formatDateRange = () => {
    if (dateRange.from && dateRange.to) {
      return `${format(dateRange.from, "dd/MM/yy")} - ${format(dateRange.to, "dd/MM/yy")}`;
    }
    return "Selecionar período";
  };

  // Filtragem de dados com base na data selecionada
  const filterDataByDateRange = (data: any[]) => {
    if (!dateRange.from || !dateRange.to) return data;
    
    // Simulação de filtragem
    return data.slice(0, Math.max(3, Math.floor(data.length * 0.75)));
  };

  const filteredConversionData = filterDataByDateRange(conversionData);
  const filteredLeadsData = filterDataByDateRange(leadsData);

  // Se o usuário não conectou o WhatsApp, mostrar tela de conexão
  if (!hasConnectedWhatsApp) {
    return (
      <div className="space-y-8">
        <section className="space-y-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Bem-vindo ao SmartChat, {user?.firstName}</h2>
            <p className="text-muted-foreground">
              Para começar a usar o sistema, conecte sua conta do WhatsApp
            </p>
          </div>
        </section>
        
        <div className="flex items-center justify-center py-10">
          <WhatsAppConnectMeta email={user?.email} id={user?.id} />
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Bem-vindo ao SmartChat, {user?.firstName}</h2>
            <p className="text-muted-foreground">
              Gerencie suas oportunidades e conversas em um só lugar.
            </p>
          </div>
          <Button className="flex items-center gap-2" size="lg">
            <PhoneCall className="h-4 w-4" />
            Integrar com WhatsApp
          </Button>
        </div>
      </section>
      
      <div className="flex justify-between items-center mb-4 gap-4">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="flex items-center gap-2"
            >
              <Calendar className="h-4 w-4" />
              {formatDateRange()}
              <ChevronDown className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              locale={pt}
              mode="range"
              selected={dateRange}
              onSelect={(range) => range && setDateRange(range)}
              initialFocus
              numberOfMonths={2}
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
        
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Selecionar período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Semanal</SelectItem>
            <SelectItem value="month">Mensal</SelectItem>
            <SelectItem value="quarter">Trimestral</SelectItem>
            <SelectItem value="year">Anual</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <section>
        <h3 className="text-xl font-semibold mb-4">Visão Geral</h3>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">
                Total de Oportunidades
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stagesData.find(s => s.name === "Oportunidade")?.value || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Leads em fase de Oportunidade
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">
                Conversas em Andamento
              </CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(stagesData.find(s => s.name === "Conversa em andamento")?.value || 0) + 
                 (stagesData.find(s => s.name === "Parou de responder")?.value || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Conversas ativas e pendentes
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">
                Taxa de Conversão
              </CardTitle>
              <BadgeCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(() => {
                  const total = stagesData.reduce((sum, stage) => sum + stage.value, 0);
                  const ganhos = stagesData.find(s => s.name === "Ganho")?.value || 0;
                  return total ? `${((ganhos / total) * 100).toFixed(1)}%` : "0%";
                })()}
              </div>
              <p className="text-xs text-muted-foreground">
                Leads convertidos em vendas
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">
                Vendas Realizadas
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stagesData.find(s => s.name === "Ganho")?.value || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Leads convertidos em vendas
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
      
      <section className="grid gap-8 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Evolução de Leads</CardTitle>
            <CardDescription>
              Acompanhe a evolução dos leads ao longo do tempo
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ChartContainer config={config} className="h-[350px] w-full">
              <AreaChart
                data={filteredLeadsData}
                margin={{
                  top: 20,
                  right: 30,
                  left: 0,
                  bottom: 0,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip content={<ChartTooltipContent />} />
                <Legend />
                <Area type="monotone" dataKey="novos" stackId="1" stroke="#8884d8" fill="#8884d8" />
                <Area type="monotone" dataKey="qualificados" stackId="1" stroke="#82ca9d" fill="#82ca9d" />
                <Area type="monotone" dataKey="oportunidades" stackId="1" stroke="#ffc658" fill="#ffc658" />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Taxa de Conversão</CardTitle>
            <CardDescription>
              Porcentagem de leads convertidos em oportunidades
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ChartContainer config={config} className="h-[350px] w-full">
              <LineChart
                data={filteredConversionData}
                margin={{
                  top: 20,
                  right: 30,
                  left: 0,
                  bottom: 0,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip content={<ChartTooltipContent />} />
                <Legend />
                <Line type="monotone" dataKey="taxa" stroke="#8884d8" activeDot={{ r: 8 }} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </section>
      
      <section className="grid gap-4 grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Etapa</CardTitle>
            <CardDescription>
              Quantidade de leads em cada etapa do funil de vendas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stagesData.filter(stage => stage.value > 0)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {stagesData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stagesData.filter(stage => stage.value > 0)}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 20,
                      bottom: 70,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45} 
                      textAnchor="end" 
                      height={80}
                    />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" name="Quantidade" fill="#8884d8">
                      {stagesData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <h3 className="text-xl font-semibold mb-4">Ações Rápidas</h3>
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="text-lg">Conversas</CardTitle>
              <CardDescription>
                Gerencie suas conversas pendentes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" asChild className="w-full">
                <a href="/conversations">Ver Conversas</a>
              </Button>
            </CardContent>
          </Card>
          
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="text-lg">Chatbots</CardTitle>
              <CardDescription>
                Configure seus assistentes virtuais
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" asChild className="w-full">
                <a href="/chatbots">Configurar Chatbots</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
