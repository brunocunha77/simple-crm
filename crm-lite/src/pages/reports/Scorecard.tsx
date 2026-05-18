import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import { format, isWithinInterval, parseISO, subDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LeadsService } from "@/services/leadsService";
import { Lead } from "@/types/global";
import { clientesService } from "@/services/clientesService";
import { useAuth } from "@/contexts/auth";
import { toast } from "sonner";
import { useRealtime } from "@/contexts/realtimeContext";
import { DateRange } from "react-day-picker";
import { supabase } from "@/lib/supabase";

export default function Scorecard() {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
    to: new Date()
  });
  const [selectedShortcut, setSelectedShortcut] = useState("today");
  const [loading, setLoading] = useState(true);
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
    totalVendas: 0, // Adicionar total de vendas
  });
  
  // Ref para armazenar o ID do cliente
  const clientIdRef = useRef<number | null>(null);
  
  // Usar o contexto de tempo real
  const { clientId, lastUpdate, subscribeComponent, unsubscribeComponent } = useRealtime();
  const isSubscribedRef = useRef(false);

  // Efeito para definir o intervalo de datas inicial como "hoje"
  useEffect(() => {
    const today = new Date();
    setDateRange({
      from: startOfDay(today),
      to: endOfDay(today)
    });
  }, []);

  useEffect(() => {
    // Armazenar o ID do cliente quando disponível
    if (clientId) {
      clientIdRef.current = clientId;
      void 0;
      fetchData();
    }
  }, [clientId]);
  
  // Efeito para inscrever o componente para atualizações
  // DESABILITADO: Causava recursão infinita
  // useEffect(() => {
  //   // Evitar múltiplas inscrições
  //   if (!isSubscribedRef.current) {
  //     subscribeComponent('Scorecard');
  //     isSubscribedRef.current = true;
  //     console.log('Scorecard: Componente inscrito para atualizações em tempo real');
  //   }
  //   
  //   // Cleanup
  //   return () => {
  //     if (isSubscribedRef.current) {
  //       unsubscribeComponent('Scorecard');
  //       isSubscribedRef.current = false;
  //       console.log('Scorecard: Componente desinscrito das atualizações em tempo real');
  //   };
  // }, []); // Removidas dependências desnecessárias
  
  // Efeito para atualizar os dados quando lastUpdate é alterado
  // DESABILITADO: Causava recursão infinita
  // useEffect(() => {
  //   if (lastUpdate && clientIdRef.current) {
  //     // Verificar se é uma atualização que afeta o status
  //     const isStatusChange = 
  //       lastUpdate.type === 'UPDATE' && 
  //       lastUpdate.status !== lastUpdate.oldStatus;
  //     
  //     const isNewLead = lastUpdate.type === 'INSERT';
  //     const isDeletedLead = lastUpdate.type === 'DELETE';
  //     
  //     // Se for uma mudança de status, nova inserção ou exclusão, atualizar indicadores
  //     if (isStatusChange || isNewLead || isDeletedLead) {
  //       console.log('Scorecard: Atualizando indicadores devido a mudança em lead');
  //       fetchData();
  //     }
  //   }
  // }, [lastUpdate]);
  
  // Efeito para atualizar dados quando período ou data mudam
  useEffect(() => {
    if (clientIdRef.current) {
      void 0;
      fetchData();
    }
  }, [dateRange]);

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
  };

  // Formato da data no botão
  const formatDateRange = () => {
    if (dateRange.from && dateRange.to) {
      return `${format(dateRange.from, "dd/MM/yy")} - ${format(dateRange.to, "dd/MM/yy")}`;
    }
    return "Selecionar período";
  };

  // Função para filtrar leads baseado no intervalo de datas
  const filterLeadsByDateRange = (leads: Lead[], range: { start: Date, end: Date }, field: 'data_criacao' | 'data_ultimo_status' = 'data_criacao'): Lead[] => {
    return leads.filter(lead => {
      try {
        const leadDate = parseISO(lead[field]);
        return isWithinInterval(leadDate, range);
      } catch (error) {
        console.error(`Erro ao analisar data do lead (${field}):`, lead[field], error);
        return false;
      }
    });
  };

  // Função para calcular a diferença percentual entre períodos
  const calculatePercentageChange = (current: number, previous: number): string => {
    if (previous === 0) return current > 0 ? "+100%" : "0%";
    const change = ((current - previous) / previous) * 100;
    return `${change > 0 ? "+" : ""}${change.toFixed(1)}%`;
  };

  // Função para determinar o estágio correto baseado no status, igual à lógica usada na visualização em quadro
  const determineStatusCounts = (leads: Lead[]) => {
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

  const fetchData = async () => {
    if (!dateRange.from || !dateRange.to) return;
    
    try {
      setLoading(true);
      
      void 0;
      
      // Buscar todos os leads do cliente usando o leadsService
              const allLeads = await LeadsService.getLeadsByClientId(clientIdRef.current);
      
      void 0;
      
      // ============ VERIFICAÇÃO PARA CONTAS NOVAS ============
      // Se não há leads, definir todos os valores como zero
      if (allLeads.length === 0) {
        void 0;
        setData({
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
          totalVendas: 0, // Adicionar total de vendas
        });
        return;
      }
      
      // Log para depuração - mostrar distribuição de status
      const statusCounts = allLeads.reduce((counts, lead) => {
        counts[lead.status] = (counts[lead.status] || 0) + 1;
        return counts;
      }, {} as Record<string, number>);
      void 0;
      
      // Usar a função de determinação de status para todo o conjunto de leads
      const allStatusCounts = determineStatusCounts(allLeads);
      void 0;
      
      // Filtrar leads pelo intervalo de data selecionado
      const currentLeads = filterLeadsByDateRange(allLeads, {
        start: dateRange.from,
        end: dateRange.to
      });
      
      void 0;
      
      // ============ SCORE DO VENDEDOR (IMPLEMENTAÇÃO REAL) ============
      void 0;
      void 0;
      
      // Primeiro, vamos verificar se existem dados na tabela leads para este cliente
      const { data: leadsCount, error: countError } = await supabase
        .from('leads')
        .select('id, id_cliente')
        .eq('id_cliente', clientIdRef.current);
      
      void 0;
      
      // Vamos também verificar se há leads na tabela com scores preenchidos (sem filtro de cliente)
      const { data: allLeadsWithScores, error: allScoresError } = await supabase
        .from('leads')
        .select('score_final_vendedor, id_cliente, id, nome_instancia')
        .not('score_final_vendedor', 'is', null)
        .limit(10);
      
      void 0;
      void 0;
      
      // Buscar dados reais da tabela leads com score_final_vendedor
      const { data: leadsWithScore, error: scoreError } = await supabase
        .from('leads')
        .select('score_final_vendedor, id_cliente, id, nome_instancia')
        .eq('id_cliente', clientIdRef.current)
        .not('score_final_vendedor', 'is', null);
      
      void 0;
      
      let scoreVendedor = 0;
      
      if (scoreError) {
        console.error('Erro ao buscar scores do vendedor:', scoreError);
        void 0;
        
        // Fallback: tentar na tabela prompts_auxiliar
        const { data: fallbackLeads, error: fallbackError } = await supabase
          .from('prompts_auxiliar')
          .select('score_final_vendedor, id_cliente')
          .eq('id_cliente', clientIdRef.current)
          .not('score_final_vendedor', 'is', null);
          
        if (fallbackError) {
          console.error('Erro no fallback também:', fallbackError);
          scoreVendedor = 0; // Valor padrão se não conseguir buscar
        } else if (fallbackLeads && fallbackLeads.length > 0) {
          // Calcular média dos scores (incluindo zeros, excluindo nulls)
          const validScores = fallbackLeads
            .map(lead => lead.score_final_vendedor)
            .filter(score => score !== null && score !== undefined);
          
          if (validScores.length > 0) {
            const somaScores = validScores.reduce((sum, score) => sum + (score || 0), 0);
            scoreVendedor = somaScores / validScores.length; // Escala 0-10
            void 0;
          }
        }
      } else if (leadsWithScore && leadsWithScore.length > 0) {
        // Calcular média dos scores (incluindo zeros, excluindo nulls)
        const validScores = leadsWithScore
          .map(lead => lead.score_final_vendedor)
          .filter(score => score !== null && score !== undefined);
        
        void 0;
        void 0;
        
        if (validScores.length > 0) {
          const somaScores = validScores.reduce((sum, score) => sum + (score || 0), 0);
          scoreVendedor = somaScores / validScores.length; // Escala 0-10
          void 0;
          void 0;
        } else {
          void 0;
        }
      } else {
        void 0;
      }
      
      // Garantir que o score está entre 0 e 10
      scoreVendedor = Math.max(0, Math.min(10, scoreVendedor));
      
      void 0;
      
      // ============ PROBABILIDADE DE FECHAMENTO (IMPLEMENTAÇÃO REAL) ============
      void 0;
      
      // Buscar dados reais da tabela leads com probabilidade_final_fechamento
      const { data: leadsWithProbabilidade, error: probabilidadeError } = await supabase
        .from('leads')
        .select('probabilidade_final_fechamento, id_cliente, id, nome_instancia')
        .eq('id_cliente', clientIdRef.current)
        .not('probabilidade_final_fechamento', 'is', null);
      
      void 0;
      
      let probabilidadeFechamento = 0;
      
      if (probabilidadeError) {
        console.error('Erro ao buscar probabilidades de fechamento:', probabilidadeError);
        void 0;
        
        // Fallback: tentar na tabela prompts_auxiliar
        const { data: fallbackProbabilidades, error: fallbackProbError } = await supabase
          .from('prompts_auxiliar')
          .select('probabilidade_final_fechamento, id_cliente')
          .eq('id_cliente', clientIdRef.current)
          .not('probabilidade_final_fechamento', 'is', null);
          
        if (fallbackProbError) {
          console.error('Erro no fallback também:', fallbackProbError);
          probabilidadeFechamento = 0; // Valor zero quando não há dados
        } else if (fallbackProbabilidades && fallbackProbabilidades.length > 0) {
          // Calcular média das probabilidades (incluindo zeros, excluindo nulls)
          const validProbabilidades = fallbackProbabilidades
            .map(lead => lead.probabilidade_final_fechamento)
            .filter(prob => prob !== null && prob !== undefined);
          
          if (validProbabilidades.length > 0) {
            const somaProbabilidades = validProbabilidades.reduce((sum, prob) => sum + (prob || 0), 0);
            probabilidadeFechamento = somaProbabilidades / validProbabilidades.length; // Escala 0-100
            void 0;
          } else {
            probabilidadeFechamento = 0; // Valor zero quando não há dados válidos
          }
        } else {
          probabilidadeFechamento = 0; // Valor zero quando não há dados
        }
      } else if (leadsWithProbabilidade && leadsWithProbabilidade.length > 0) {
        // Calcular média das probabilidades (incluindo zeros, excluindo nulls)
        const validProbabilidades = leadsWithProbabilidade
          .map(lead => lead.probabilidade_final_fechamento)
          .filter(prob => prob !== null && prob !== undefined);
        
        void 0;
        void 0;
        
        if (validProbabilidades.length > 0) {
          const somaProbabilidades = validProbabilidades.reduce((sum, prob) => sum + (prob || 0), 0);
          probabilidadeFechamento = somaProbabilidades / validProbabilidades.length; // Escala 0-100
          void 0;
          void 0;
        } else {
          void 0;
          probabilidadeFechamento = 0; // Valor zero quando não há dados válidos
        }
      } else {
        void 0;
        probabilidadeFechamento = 0; // Valor zero quando não há dados
      }
      
      // Garantir que a probabilidade está entre 0 e 100
      probabilidadeFechamento = Math.max(0, Math.min(100, probabilidadeFechamento));
      
      void 0;
      
      // ============ SCORE DE QUALIFICAÇÃO (IMPLEMENTAÇÃO REAL) ============
      void 0;
      
      // Buscar dados reais da tabela leads com score_final_qualificacao
      const { data: leadsWithQualificacao, error: qualificacaoError } = await supabase
        .from('leads')
        .select('score_final_qualificacao, id_cliente, id, nome_instancia')
        .eq('id_cliente', clientIdRef.current)
        .not('score_final_qualificacao', 'is', null);
      
      void 0;
      
      let scoreQualificacao = 0;
      
      if (qualificacaoError) {
        console.error('Erro ao buscar scores de qualificação:', qualificacaoError);
        void 0;
        
        // Fallback: tentar na tabela prompts_auxiliar
        const { data: fallbackQualificacao, error: fallbackQualError } = await supabase
          .from('prompts_auxiliar')
          .select('score_final_qualificacao, id_cliente')
          .eq('id_cliente', clientIdRef.current)
          .not('score_final_qualificacao', 'is', null);
          
        if (fallbackQualError) {
          console.error('Erro no fallback também:', fallbackQualError);
          scoreQualificacao = 0; // Valor zero quando não há dados
        } else if (fallbackQualificacao && fallbackQualificacao.length > 0) {
          // Calcular média dos scores (incluindo zeros, excluindo nulls)
          const validQualificacao = fallbackQualificacao
            .map(lead => lead.score_final_qualificacao)
            .filter(score => score !== null && score !== undefined);
          
          if (validQualificacao.length > 0) {
            const somaQualificacao = validQualificacao.reduce((sum, score) => sum + (score || 0), 0);
            scoreQualificacao = somaQualificacao / validQualificacao.length; // Escala 0-100
            void 0;
          } else {
            scoreQualificacao = 0; // Valor zero quando não há dados válidos
          }
        } else {
          scoreQualificacao = 0; // Valor zero quando não há dados
        }
      } else if (leadsWithQualificacao && leadsWithQualificacao.length > 0) {
        // Calcular média dos scores (incluindo zeros, excluindo nulls)
        const validQualificacao = leadsWithQualificacao
          .map(lead => lead.score_final_qualificacao)
          .filter(score => score !== null && score !== undefined);
        
        void 0;
        void 0;
        
        if (validQualificacao.length > 0) {
          const somaQualificacao = validQualificacao.reduce((sum, score) => sum + (score || 0), 0);
          scoreQualificacao = somaQualificacao / validQualificacao.length; // Escala 0-100
          void 0;
          void 0;
        } else {
          void 0;
          scoreQualificacao = 0; // Valor zero quando não há dados válidos
        }
      } else {
        void 0;
        scoreQualificacao = 0; // Valor zero quando não há dados
      }
      
      // Garantir que o score está entre 0 e 100
      scoreQualificacao = Math.max(0, Math.min(100, scoreQualificacao));
      
      void 0;
      
      // ============ TEMPO DE RESPOSTA MÉDIO (IMPLEMENTAÇÃO REAL) ============
      void 0;
      
      // Buscar dados reais da tabela leads com tempo_medio_interacao_inicial
      const { data: leadsWithTempo, error: tempoError } = await supabase
        .from('leads')
        .select('tempo_medio_interacao_inicial, id_cliente, id, nome_instancia')
        .eq('id_cliente', clientIdRef.current)
        .not('tempo_medio_interacao_inicial', 'is', null);
      
      void 0;
      
      let tempoRespostaMedio = "0min";
      let tempoRespostaComparacao = "0%";
      
      if (tempoError) {
        console.error('Erro ao buscar tempos de resposta:', tempoError);
        void 0;
        
        // Fallback: tentar na tabela prompts_auxiliar
        const { data: fallbackTempos, error: fallbackTempoError } = await supabase
          .from('prompts_auxiliar')
          .select('tempo_medio_interacao_inicial, id_cliente')
          .eq('id_cliente', clientIdRef.current)
          .not('tempo_medio_interacao_inicial', 'is', null);
          
        if (fallbackTempoError) {
          console.error('Erro no fallback também:', fallbackTempoError);
          tempoRespostaMedio = "0min"; // Valor zero quando não há dados
        } else if (fallbackTempos && fallbackTempos.length > 0) {
          // Calcular média dos tempos (incluindo zeros, excluindo nulls)
          const validTempos = fallbackTempos
            .map(lead => lead.tempo_medio_interacao_inicial)
            .filter(tempo => tempo !== null && tempo !== undefined);
          
          if (validTempos.length > 0) {
            const somaTempos = validTempos.reduce((sum, tempo) => sum + (tempo || 0), 0);
            const tempoMedio = somaTempos / validTempos.length;
            tempoRespostaMedio = `${tempoMedio.toFixed(1)}min`;
            void 0;
          } else {
            tempoRespostaMedio = "0min"; // Valor zero quando não há dados válidos
          }
        } else {
          tempoRespostaMedio = "0min"; // Valor zero quando não há dados
        }
      } else if (leadsWithTempo && leadsWithTempo.length > 0) {
        // Calcular média dos tempos (incluindo zeros, excluindo nulls)
        const validTempos = leadsWithTempo
          .map(lead => lead.tempo_medio_interacao_inicial)
          .filter(tempo => tempo !== null && tempo !== undefined);
        
        void 0;
        void 0;
        
        if (validTempos.length > 0) {
          const somaTempos = validTempos.reduce((sum, tempo) => sum + (tempo || 0), 0);
          const tempoMedio = somaTempos / validTempos.length;
          tempoRespostaMedio = `${tempoMedio.toFixed(1)}min`;
          void 0;
          void 0;
        } else {
          void 0;
          tempoRespostaMedio = "0min"; // Valor zero quando não há dados válidos
        }
      } else {
        void 0;
        tempoRespostaMedio = "0min"; // Valor zero quando não há dados
      }
      
      void 0;
      
      // ============ CICLO MÉDIO DE VENDA (IMPLEMENTAÇÃO REAL) ============
      void 0;
      
      // Buscar dados reais da tabela leads com tempo_ganho
      const { data: leadsWithCiclo, error: cicloError } = await supabase
        .from('leads')
        .select('tempo_ganho, id_cliente, id, nome_instancia')
        .eq('id_cliente', clientIdRef.current)
        .not('tempo_ganho', 'is', null);
      
      void 0;
      
      let cicloVenda = "0 dias";
      let cicloVendaComparacao = "0 dias";
      
      if (cicloError) {
        console.error('Erro ao buscar ciclos de venda:', cicloError);
        void 0;
        
        // Fallback: tentar na tabela prompts_auxiliar
        const { data: fallbackCiclos, error: fallbackCicloError } = await supabase
          .from('prompts_auxiliar')
          .select('tempo_ganho, id_cliente')
          .eq('id_cliente', clientIdRef.current)
          .not('tempo_ganho', 'is', null);
          
        if (fallbackCicloError) {
          console.error('Erro no fallback também:', fallbackCicloError);
          cicloVenda = "0 dias"; // Valor zero quando não há dados
        } else if (fallbackCiclos && fallbackCiclos.length > 0) {
          // Calcular média dos ciclos (incluindo zeros, excluindo nulls)
          const validCiclos = fallbackCiclos
            .map(lead => lead.tempo_ganho)
            .filter(ciclo => ciclo !== null && ciclo !== undefined);
          
          if (validCiclos.length > 0) {
            const somaCiclos = validCiclos.reduce((sum, ciclo) => sum + (ciclo || 0), 0);
            const cicloMedio = somaCiclos / validCiclos.length;
            cicloVenda = `${cicloMedio.toFixed(0)} dias`;
            void 0;
          } else {
            cicloVenda = "0 dias"; // Valor zero quando não há dados válidos
          }
        } else {
          cicloVenda = "0 dias"; // Valor zero quando não há dados
        }
      } else if (leadsWithCiclo && leadsWithCiclo.length > 0) {
        // Calcular média dos ciclos (incluindo zeros, excluindo nulls)
        const validCiclos = leadsWithCiclo
          .map(lead => lead.tempo_ganho)
          .filter(ciclo => ciclo !== null && ciclo !== undefined);
        
        void 0;
        void 0;
        
        if (validCiclos.length > 0) {
          const somaCiclos = validCiclos.reduce((sum, ciclo) => sum + (ciclo || 0), 0);
          const cicloMedio = somaCiclos / validCiclos.length;
          cicloVenda = `${cicloMedio.toFixed(0)} dias`;
          void 0;
          void 0;
        } else {
          void 0;
          cicloVenda = "0 dias"; // Valor zero quando não há dados válidos
        }
      } else {
        void 0;
        cicloVenda = "0 dias"; // Valor zero quando não há dados
      }
      
      void 0;
      
      // ============ OUTROS CÁLCULOS (MANTENDO SIMULADOS POR ENQUANTO) ============
      
      // 1. Calcular Taxa de Oportunidades (baseado em TODOS os leads do cliente)
      void 0;
      const totalLeadsCliente = allLeads.length;
      const leadsOportunidade = allLeads.filter(lead => {
        if (!lead.status) return false;
        
        // Normalizar o status para comparação
        const normalizedStatus = lead.status.toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');
        
        return normalizedStatus === 'oportunidade';
      }).length;
      
      const taxaOportunidades = totalLeadsCliente > 0 
        ? (leadsOportunidade / totalLeadsCliente) * 100 
        : 0;
      
      void 0;
      
      // 2. Contar leads com status "Oportunidade" para exibição
      const numOportunidades = leadsOportunidade;
      
      // 3. Contar leads com status "Conversa em andamento" e "Parou de responder"
      const conversasAndamento = allStatusCounts.conversaEmAndamento + allStatusCounts.parouDeResponder;
      
      // 4. Contar conversas que requerem atenção (do período selecionado)
      const conversasRequerAtencao = currentLeads.filter(lead => 
        lead.status === 'Parou de responder'
      ).length;
      
      // 5. Calcular taxa de resposta (simulado)
      const taxaResposta = 0;
      
      // ============ TOTAL DE VENDAS (USANDO NOVAS COLUNAS) ============
      void 0;
      
      // Buscar estatísticas de vendas usando o novo método
              const vendasStats = await LeadsService.getVendasStats(
        clientIdRef.current,
        dateRange.from,
        dateRange.to
      );
      
      void 0;
      
      // Atualizar o estado com os dados calculados
      setData({
        scoreVendedor,
        probabilidadeFechamento,
        scoreQualificacao,
        tempoRespostaMedio,
        tempoRespostaComparacao,
        cicloVenda,
        cicloVendaComparacao,
        taxaOportunidades,
        numOportunidades: numOportunidades,
        numOportunidadesComparacao: "0",
        conversasAndamento: conversasAndamento,
        conversasRequerAtencao: conversasRequerAtencao,
        taxaResposta,
        totalLeads: totalLeadsCliente,
        totalLeadsComparacao: "0",
        totalVendas: vendasStats.totalVendas, // Usar dados das novas colunas
      });
      
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      toast.error('Erro ao carregar dados do scorecard');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4 gap-4">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="flex items-center gap-2"
            >
              <CalendarIcon className="h-4 w-4" />
              {formatDateRange()}
              <ChevronDown className="h-4 w-4" />
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
            <Calendar
              locale={ptBR}
              mode="range"
              selected={dateRange}
              onSelect={(range) => range && setDateRange(range)}
              initialFocus
              numberOfMonths={2}
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>
    
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Score do Vendedor ({format(new Date(), "dd/MM/yyyy", { locale: ptBR })})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.scoreVendedor.toFixed(1)}/10</div>
            <Progress value={data.scoreVendedor * 10} className="h-2 mt-2" />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Score de Qualificação</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.scoreQualificacao.toFixed(1)}/10</div>
            <Progress value={data.scoreQualificacao * 10} className="h-2 mt-2" />
          </CardContent>
        </Card>
        
        {/* Card de Tempo de Resposta Médio - Temporariamente oculto
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tempo de Resposta Médio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.tempoRespostaMedio}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.tempoRespostaComparacao} em relação ao período anterior
            </p>
          </CardContent>
        </Card>
        */}
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Ciclo Médio de Venda</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.cicloVenda}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.cicloVendaComparacao} em relação ao período anterior
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Oportunidades</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.taxaOportunidades.toFixed(1)}%</div>
            <Progress value={data.taxaOportunidades} className="h-2 mt-2" />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Nº de Oportunidades</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.numOportunidades}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.numOportunidadesComparacao} em relação ao período anterior
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total de Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalLeads}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.totalLeadsComparacao} em relação ao período anterior
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total de Vendas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalVendas}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Vendas fechadas no período
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Leads Qualificados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.conversasAndamento}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.conversasRequerAtencao} requerem atenção
            </p>
          </CardContent>
        </Card>
        
        {/* Card de Taxa de Resposta ao Primeiro Contato - Temporariamente oculto
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Resposta ao Primeiro Contato</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.taxaResposta}%</div>
            <Progress value={data.taxaResposta} className="h-2 mt-2" />
          </CardContent>
        </Card>
        */}
      </div>
    </div>
  );
}
