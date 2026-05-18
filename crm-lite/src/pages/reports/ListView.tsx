import React, { useState, useEffect } from "react";
import { leadsService, Lead } from "@/services/leadsService";
import { clientesService } from "@/services/clientesService";
import { useAuth } from "@/contexts/auth";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, MoreHorizontal, MessageSquare, Trophy, XCircle, Archive, Clock, Info, TrendingUp, TrendingDown, Target, User, Star } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { departamentosService, Departamento } from '@/services/departamentosService';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from '@/lib/supabase';

export default function ListView() {
  const [leadsList, setLeadsList] = useState<Lead[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [clientId, setClientId] = useState<number | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  
  // Buscar o ID do cliente quando o usuário for carregado
  useEffect(() => {
    const fetchClientId = async () => {
      if (!user) {
        setError("Usuário não autenticado");
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        void 0;
        
        // Se o usuário tem email, vamos tentar buscar por email primeiro
        let clienteInfo = null;
        if (user.email) {
          void 0;
          clienteInfo = await clientesService.getClienteByEmail(user.email);
        }
        
        // Se não encontrou pelo email, tenta pelo ID do usuário
        if (!clienteInfo && user.id) {
          void 0;
          clienteInfo = await clientesService.getClienteByIdCliente(user.id_cliente);
        }
        
        if (!clienteInfo) {
          console.error(`Nenhum cliente encontrado para o usuário ${user.id || 'desconhecido'}`);
          setError(`Nenhum cliente encontrado para o usuário. Verifique se o usuário está associado a um cliente na tabela clientes_info.`);
          setLoading(false);
          return;
        }
        
        void 0;
        setClientId(clienteInfo.id);
        
        // Agora que temos o ID do cliente, vamos buscar os leads
        await fetchLeads(clienteInfo.id);
      } catch (err) {
        console.error('Erro ao buscar ID do cliente:', err);
        setError('Falha ao recuperar informações do cliente');
        setLoading(false);
      }
    };
    
    fetchClientId();
  }, [user]);
  
  useEffect(() => {
    if (clientId && user?.email) {
      const fetchDepartamentos = async () => {
        try {
          // Buscar informações do usuário atual para verificar o tipo
          const { data: userInfo, error: userError } = await supabase
            .from('atendentes')
            .select('tipo_usuario, id_departamento, id_departamento_2, id_departamento_3, departamentos')
            .eq('email', user.email)
            .eq('id_cliente', clientId)
            .single();

          if (userError && userError.code !== 'PGRST116') {
            console.error('Erro ao buscar informações do usuário:', userError);
          }

          // Buscar todos os departamentos do cliente
          const allDeps = await departamentosService.listar(clientId);
          void 0;
          
          // Se for atendente, filtrar apenas os departamentos aos quais tem acesso
          if (userInfo?.tipo_usuario === 'Atendente') {
            // Coletar todos os departamentos do atendente (até 3)
            const departamentosIds: number[] = [];
            if (userInfo.id_departamento) departamentosIds.push(userInfo.id_departamento);
            if (userInfo.id_departamento_2) departamentosIds.push(userInfo.id_departamento_2);
            if (userInfo.id_departamento_3) departamentosIds.push(userInfo.id_departamento_3);
            
            // Compatibilidade: se não houver departamentos nas colunas, verificar o array departamentos
            if (departamentosIds.length === 0 && userInfo.departamentos) {
              departamentosIds.push(...userInfo.departamentos.map(id => parseInt(id)));
            }
            
            if (departamentosIds.length > 0) {
              void 0;
              const filteredDeps = allDeps.filter(dep => departamentosIds.includes(dep.id));
              setDepartamentos(filteredDeps);
              void 0;
            } else {
              setDepartamentos([]);
              void 0;
            }
          } else {
            // Se for gestor ou não tiver tipo definido, mostrar todos os departamentos
            void 0;
            setDepartamentos(allDeps);
            void 0;
          }
        } catch (error) {
          console.error('Erro ao carregar departamentos:', error);
          // Em caso de erro, carregar todos os departamentos
          const allDeps = await departamentosService.listar(clientId);
          setDepartamentos(allDeps);
        }
      };
      
      fetchDepartamentos();
    }
  }, [clientId, user?.email]);
  
  // Função para buscar leads do cliente
  const fetchLeads = async (clientIdValue: number | null = clientId) => {
    if (!clientIdValue) {
      setError("ID do cliente não disponível");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      void 0;
      const leads = await leadsService.getLeadsByClientId(clientIdValue);
      void 0;
      setLeadsList(leads);
    } catch (err) {
      console.error('Erro ao buscar leads:', err);
      setError("Falha ao carregar leads. Verifique o console para mais detalhes.");
    } finally {
      setLoading(false);
    }
  };
  
  const handleRefresh = () => {
    fetchLeads();
  };

  const handleViewConversation = (lead: Lead) => {
    // Verificar se o lead tem número de telefone
    if (!lead.telefone) {
      toast.error("Este lead não possui número de telefone associado");
      return;
    }
    
    // Navegar para conversas com o telefone do lead selecionado
    navigate(`/conversations?phone=${encodeURIComponent(lead.telefone)}`);
  };

  const handleMarkAsWon = async (lead: Lead) => {
    try {
      if (!clientId) throw new Error('Cliente não identificado');
      const result = await leadsService.marcarComoGanho(lead.id, clientId);
      
      if (!result.success) {
        toast.error(result.error || 'Erro ao marcar como ganho.');
        return;
      }
      
      toast.success(`Lead "${lead.nome}" movido para "${result.etapaNome}" e marcado como ganho!`);
      fetchLeads();
    } catch (e) {
      toast.error('Erro ao marcar como ganho.');
    }
  };

  const handleMarkAsLost = async (lead: Lead) => {
    try {
      if (!clientId) throw new Error('Cliente não identificado');
      await leadsService.updateVendaStatus(lead.id, clientId, false);
    toast.error(`Lead "${lead.nome}" marcado como perdido!`);
      fetchLeads();
    } catch (e) {
      toast.error('Erro ao marcar como perdido.');
    }
  };

  const handleArchive = (lead: Lead) => {
    toast.info(`Lead "${lead.nome}" arquivado!`);
  };
  
  // Função utilitária para pegar o nome do departamento
  const getDepartamentoNome = (id: string | number | null | undefined) => {
    if (!id) return null;
    const dep = departamentos.find(d => String(d.id) === String(id));
    return dep ? dep.nome : null;
  };
  
  // Função para gerar análise do score de qualificação baseada no valor real
  const getScoreQualificacaoAnalysis = (score: number) => {
    // Determinar o nível baseado no score real
    let level, color, bgColor, icon, description, factors, recommendation;
    
    if (score >= 7.0) {
      level = "Excelente";
      color = "text-green-600";
      bgColor = "bg-green-50";
      icon = <Star className="h-4 w-4 text-green-600" />;
      description = `Lead com score ${score.toFixed(1)}/10 - muito qualificado`;
      factors = [
        `Score: ${score.toFixed(1)}/10`,
        "Lead muito qualificado",
        "Alto potencial de conversão"
      ];
      recommendation = "Priorizar atendimento imediato";
    } else if (score >= 4.0) {
      level = "Bom";
      color = "text-blue-600";
      bgColor = "bg-blue-50";
      icon = <Target className="h-4 w-4 text-blue-600" />;
      description = `Lead com score ${score.toFixed(1)}/10 - qualificado`;
      factors = [
        `Score: ${score.toFixed(1)}/10`,
        "Lead qualificado",
        "Bom potencial"
      ];
      recommendation = "Manter acompanhamento ativo";
    } else {
      level = "Ruim";
      color = "text-red-600";
      bgColor = "bg-red-50";
      icon = <TrendingDown className="h-4 w-4 text-red-600" />;
      description = `Lead com score ${score.toFixed(1)}/10 - desqualificado`;
      factors = [
        `Score: ${score.toFixed(1)}/10`,
        "Lead desqualificado",
        "Baixo potencial"
      ];
      recommendation = "Considerar qualificação ou descarte";
    }
    
    return {
      level,
      color,
      bgColor,
      icon,
      description,
      factors,
      recommendation
    };
  };

  // Função para gerar análise do score do vendedor baseada no valor real
  const getScoreVendedorAnalysis = (score: number) => {
    // Determinar o nível baseado no score real
    let level, color, bgColor, icon, description, factors, recommendation, diagnostico, focoMelhoria;
    
    if (score >= 7.0) {
      level = "Desempenho Bom";
      color = "text-green-600";
      bgColor = "bg-green-50";
      icon = <Star className="h-4 w-4 text-green-600" />;
      description = `Performance ${score.toFixed(1)}/10 - conduz bem a conversa`;
      diagnostico = "O vendedor conduz bem a conversa, é claro, objetivo e sabe lidar com objeções, demonstrando domínio da jornada do cliente.";
      focoMelhoria = "Refinar ainda mais a persuasão, aumentar a conversão e desenvolver autonomia para lidar com casos complexos.";
      factors = [
        `Score: ${score.toFixed(1)}/10`,
        "Claro e objetivo",
        "Domínio da jornada do cliente"
      ];
      recommendation = "Reforçar boas práticas com o time, atuar como referência ou mentor para colegas, e explorar desafios de vendas mais complexos.";
    } else if (score >= 4.0) {
      level = "Desempenho Regular";
      color = "text-yellow-600";
      bgColor = "bg-yellow-50";
      icon = <Target className="h-4 w-4 text-yellow-600" />;
      description = `Performance ${score.toFixed(1)}/10 - boa intenção mas inconsistente`;
      diagnostico = "O vendedor demonstra boa intenção e algum domínio das técnicas, mas há inconsistência na condução e falhas pontuais na escuta, personalização ou follow-up.";
      focoMelhoria = "Aprimorar perguntas investigativas, personalização da fala e fechamento.";
      factors = [
        `Score: ${score.toFixed(1)}/10`,
        "Boa intenção",
        "Falhas pontuais na condução"
      ];
      recommendation = "Revisar as conversas recentes com um gestor e seguir um plano de melhoria contínua com feedbacks semanais.";
    } else {
      level = "Desempenho Crítico";
      color = "text-red-600";
      bgColor = "bg-red-50";
      icon = <TrendingDown className="h-4 w-4 text-red-600" />;
      description = `Performance ${score.toFixed(1)}/10 - comunicação abaixo do esperado`;
      diagnostico = "A comunicação está abaixo do esperado, com baixa empatia, pouca clareza e ausência de direcionamento na conversa.";
      focoMelhoria = "Reforçar fundamentos da abordagem comercial, escuta ativa e técnicas de rapport.";
      factors = [
        `Score: ${score.toFixed(1)}/10`,
        "Baixa empatia",
        "Ausência de direcionamento"
      ];
      recommendation = "Realizar uma reunião individual para feedback. Considerar novo treinamento intensivo e acompanhamento mais próximo. Avaliar se o perfil do vendedor está alinhado ao modelo de vendas da empresa.";
    }
    
    return {
      level,
      color,
      bgColor,
      icon,
      description,
      diagnostico,
      focoMelhoria,
      factors,
      recommendation
    };
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Carregando leads...</span>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-4 border border-red-300 bg-red-50 text-red-800 rounded-md">
        <h3 className="text-lg font-medium mb-2">Erro</h3>
        <p>{error}</p>
        {clientId && (
          <Button 
            variant="outline" 
            className="mt-2" 
            onClick={handleRefresh}
          >
            Tentar novamente
          </Button>
        )}
      </div>
    );
  }
  
  if (leadsList.length === 0) {
    return (
      <div className="text-center p-8 border border-dashed rounded-md">
        <h3 className="text-lg font-medium mb-2">Nenhum lead encontrado</h3>
        <p className="text-muted-foreground mb-4">
          Não encontramos nenhum lead associado ao seu cliente (ID: {clientId})
        </p>
        <Button onClick={handleRefresh}>Atualizar</Button>
      </div>
    );
  }
  
  const filteredLeads = leadsList.filter(lead => {
    const termo = search.trim().toLowerCase();
    if (!termo) return true;
    return (
      lead.nome.toLowerCase().includes(termo) ||
      (lead.telefone || '').includes(termo)
    );
  });
  
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Leads</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 max-w-md">
            <input
              type="text"
              placeholder="Buscar por nome ou número..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            <Table>
              <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                <TableRow>
                  <TableHead className="bg-white">Nome</TableHead>
                  <TableHead className="bg-white">Data de Criação</TableHead>
                  <TableHead className="bg-white">Score de Qualificação</TableHead>
                  <TableHead className="bg-white">Score do Vendedor</TableHead>
                  <TableHead className="bg-white">Conversa</TableHead>
                  <TableHead className="text-right bg-white">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map(lead => (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {lead.nome}
                        {lead.followup_programado && (
                          <span title="Follow-up automático ativado" className="text-yellow-600">
                            <Clock className="inline-block h-4 w-4" />
                          </span>
                        )}
                        {getDepartamentoNome(lead.id_departamento) ? (
                          <span className="ml-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-semibold">
                            {getDepartamentoNome(lead.id_departamento)}
                          </span>
                        ) : (
                          <span className="ml-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs font-normal">
                            Sem departamento
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(lead.data_criacao), "PPp", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-green-100 text-green-800 cursor-help">
                              {typeof lead.score_final_qualificacao === 'number' ? lead.score_final_qualificacao.toFixed(1) : '0.0'}/10
                              <Info className="h-3 w-3 ml-1" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="w-80 p-0">
                            {(() => {
                               const analysis = getScoreQualificacaoAnalysis(typeof lead.score_final_qualificacao === 'number' ? lead.score_final_qualificacao : 0);
                              return (
                                <div className={`p-4 ${analysis.bgColor} rounded-lg border`}>
                                  <div className="flex items-center gap-2 mb-3">
                                    {analysis.icon}
                                    <h4 className={`font-semibold ${analysis.color}`}>
                                      Score de Qualificação: {analysis.level}
                                    </h4>
                                  </div>
                                  <p className="text-sm text-gray-700 mb-3">
                                    {analysis.description}
                                  </p>
                                  <div className="mb-3">
                                    <h5 className="text-xs font-semibold text-gray-600 mb-1">Fatores Analisados:</h5>
                                    <ul className="text-xs text-gray-600 space-y-1">
                                      {analysis.factors.map((factor, index) => (
                                        <li key={index} className="flex items-center gap-1">
                                          <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                                          {factor}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                  <div className="pt-2 border-t border-gray-200">
                                    <p className="text-xs font-semibold text-gray-700">
                                      💡 Recomendação: {analysis.recommendation}
                                    </p>
                                  </div>
                                </div>
                              );
                            })()}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-orange-100 text-orange-800 cursor-help">
                              {typeof lead.score_final_vendedor === 'number' ? lead.score_final_vendedor.toFixed(1) : '0.0'}/10
                              <Info className="h-3 w-3 ml-1" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="w-80 p-0">
                            {(() => {
                              const analysis = getScoreVendedorAnalysis(typeof lead.score_final_vendedor === 'number' ? lead.score_final_vendedor : 0);
                              return (
                                <div className={`p-4 ${analysis.bgColor} rounded-lg border`}>
                                  <div className="flex items-center gap-2 mb-3">
                                    {analysis.icon}
                                    <h4 className={`font-semibold ${analysis.color}`}>
                                      Score do Vendedor: {analysis.level}
                                    </h4>
                                  </div>
                                  <p className="text-sm text-gray-700 mb-3">
                                    {analysis.description}
                                  </p>
                                  <div className="mb-3">
                                    <h5 className="text-xs font-semibold text-gray-600 mb-1">Diagnóstico:</h5>
                                    <p className="text-xs text-gray-600 mb-2">
                                      {analysis.diagnostico}
                                    </p>
                                    <h5 className="text-xs font-semibold text-gray-600 mb-1">Foco de Melhoria:</h5>
                                    <p className="text-xs text-gray-600 mb-2">
                                      {analysis.focoMelhoria}
                                    </p>
                                    <h5 className="text-xs font-semibold text-gray-600 mb-1">Critérios Avaliados:</h5>
                                    <ul className="text-xs text-gray-600 space-y-1">
                                      {analysis.factors.map((factor, index) => (
                                        <li key={index} className="flex items-center gap-1">
                                          <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                                          {factor}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                  <div className="pt-2 border-t border-gray-200">
                                    <p className="text-xs font-semibold text-gray-700">
                                      💡 Recomendação: {analysis.recommendation}
                                    </p>
                                  </div>
                      </div>
                              );
                            })()}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleViewConversation(lead)}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Ver conversa
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Ações</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleMarkAsWon(lead)}>
                            <Trophy className="h-4 w-4 mr-2 text-green-600" />
                            <span>Marcar como ganho</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleMarkAsLost(lead)}>
                            <XCircle className="h-4 w-4 mr-2 text-red-600" />
                            <span>Marcar como perdido</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleArchive(lead)}>
                            <Archive className="h-4 w-4 mr-2" />
                            <span>Arquivar</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
