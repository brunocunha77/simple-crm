import React, { useState, useEffect } from 'react';
import { useAuth } from "@/contexts/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Smartphone, RefreshCw, CheckCircle, AlertCircle, Loader2, Building2 } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { departamentosService, Departamento } from "@/services/departamentosService";
import { 
  createWhatsAppInstance, 
  getNewQRCode, 
  getConnectionState, 
  checkAndSetWebhook,
  ConnectionStateResponse 
} from "@/services/whatsappService";
import { supabase } from "@/lib/supabase";
import MyQRCode from './MyQRCode';
import { useWhatsAppConnect } from './useWhatsAppConnect';
import { useUserType } from '@/hooks/useUserType';

/**
 * WhatsAppConnect Component
 * 
 * This component manages WhatsApp connection and chatbot selection functionality.
 * 
 * Important implementation details:
 * 1. The 'em_uso' field in the prompts_oficial table is transitioning from string values ('sim'/'não')
 *    to boolean values (true/false) for consistency and reliability.
 * 2. The code includes compatibility handling to support both string and boolean values during 
 *    this transition period.
 * 3. The 'forceUpdateChatbotField' function can be used to convert all string values to booleans.
 * 4. Only one chatbot should be marked as 'em_uso: true' at any time for a user.
 * 5. The 'ensureOnlyOneChatbotInUse' function maintains this consistency.
 * 6. When switching between human and AI service modes, chatbot selection is updated accordingly.
 */
export default function WhatsAppConnect() {
  const { user } = useAuth();
  const { userType } = useUserType();
  const {
    isConnected,
    setIsConnected,
    qrCode,
    setQrCode,
    fetchingLeads,
    setFetchingLeads,
    STATUS_CACHE_DURATION,
    instanceName,
    setInstanceName,
    instanceId,
    setInstanceId,
    senderNumber,
    setSenderNumber,
    connectionStatus,
    setConnectionStatus,
    isLoading,
    setIsLoading,
    checkingStatus,
    setCheckingStatus,
    webhookConfigured,
    setWebhookConfigured,
    atendimentoHumano,
    setAtendimentoHumano,
    atendimentoIA,
    setAtendimentoIA,
    lastStatusCheck,
    setLastStatusCheck,
    cachedStatus,
    setCachedStatus,
    selectedChatbotId,
    setSelectedChatbotId,
    availableChatbots,
    setAvailableChatbots,
    loadingChatbots,
    setLoadingChatbots,
  } = useWhatsAppConnect({
    instanceIdField: 'instance_id',
    instanceNameField: 'instance_name',
    senderNumberField: 'sender_number',
    atendimentoHumanoField: 'atendimento_humano',
    atendimentoIAField: 'atendimento_ia',
  });

  // Verificar se o usuário é Gestor (não pode conectar WhatsApp)
  const isGestor = userType === 'Gestor';
  const isAdmin = userType === 'Admin';

  // Estados para controle de departamentos dos chips
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [loadingDepartamentos, setLoadingDepartamentos] = useState(false);
  const [departamentoChip1, setDepartamentoChip1] = useState<string | null>(null);
  const [departamentoChip2, setDepartamentoChip2] = useState<string | null>(null);
  const [departamentoChip1Nome, setDepartamentoChip1Nome] = useState<string | null>(null);
  const [departamentoChip2Nome, setDepartamentoChip2Nome] = useState<string | null>(null);

  const checkConnectionStatus = async () => {
    if (!instanceName) return null;
    
    const now = Date.now();
    // Usar cache se ainda estiver válido
    if (cachedStatus && (now - lastStatusCheck) < STATUS_CACHE_DURATION) {
      return cachedStatus;
    }

    try {
      setCheckingStatus(true);
      const response = await getConnectionState(instanceName);
      
      // Atualizar cache
      setCachedStatus(response);
      setLastStatusCheck(now);
      
      // Atualizar estado apenas se houver mudança
      if (response?.instance?.state === 'open' && !isConnected) {
        setConnectionStatus('connected');
        setIsConnected(true);
      } else if (response?.instance?.state !== 'open' && isConnected) {
        setConnectionStatus('disconnected');
        setIsConnected(false);
      }
      
      return response;
    } catch (error) {
      console.error('Erro ao verificar status da conexão:', error);
      return null;
    } finally {
      setCheckingStatus(false);
    }
  };

  const updateClientInfo = async (instanceData: {
    instance_id: string;
    sender_number: string;
    instance_name: string;
    apikey: string;
    atendimento_humano?: boolean;
    atendimento_ia?: boolean;
  }) => {
    try {
      const { error } = await supabase
        .from('clientes_info')
        .update(instanceData)
        .eq('email', user?.email);

      if (error) {
        console.error('Erro ao atualizar informações do cliente:', error);
        toast.error('Erro ao salvar informações');
      } else {
        void 0;
      }
    } catch (error) {
      console.error('Erro ao atualizar informações do cliente:', error);
      toast.error('Erro ao salvar informações');
    }
  };

  const checkExistingInstance = async () => {
    try {
      void 0;
      
      // Verificar se está em modo de impersonação
      const isImpersonating = sessionStorage.getItem('isImpersonating') === 'true';
      const impersonatedClienteStr = sessionStorage.getItem('impersonatedCliente');
      
      let clientInfo;
      
      if (isImpersonating && impersonatedClienteStr) {
        // Usar dados do cliente impersonado
        try {
          const impersonatedCliente = JSON.parse(impersonatedClienteStr);
          const { data, error } = await supabase
            .from('clientes_info')
            .select('*')
            .eq('id', impersonatedCliente.id)
            .single();
          
          if (error) {
            console.error('Erro ao buscar informações do cliente impersonado:', error);
            return;
          }
          
          clientInfo = data;
          void 0;
        } catch (error) {
          console.error('Erro ao parsear cliente impersonado:', error);
          return;
        }
      } else {
        // Buscar dados do usuário autenticado
        const { data, error } = await supabase
        .from('clientes_info')
        .select('*')
        .eq('email', user?.email)
        .single();

      if (error) {
        console.error('Erro ao buscar informações do cliente:', error);
        return;
        }
        
        clientInfo = data;
      }

      if (clientInfo) {
        // Atualizar estados em lote para evitar re-renders desnecessários
        const updates = {
          atendimentoHumano: clientInfo.atendimento_humano !== null ? !!clientInfo.atendimento_humano : true,
          atendimentoIA: clientInfo.atendimento_ia !== null ? !!clientInfo.atendimento_ia : false,
          instanceName: clientInfo.instance_name || '',
          instanceId: clientInfo.instance_id || '',
          senderNumber: clientInfo.sender_number || '',
          apiKey: clientInfo.apikey || ''
        };

        setAtendimentoHumano(updates.atendimentoHumano);
        setAtendimentoIA(updates.atendimentoIA);
        setInstanceName(updates.instanceName);
        setInstanceId(updates.instanceId);
        setSenderNumber(updates.senderNumber);

        // Carregar departamentos dos chips
        setDepartamentoChip1(clientInfo.id_departamento_chip_1 || null);
        setDepartamentoChip2(clientInfo.id_departamento_chip_2 || null);
        
        // Buscar nomes dos departamentos
        if (clientInfo.id_departamento_chip_1) {
          const nome1 = await fetchDepartamentoNome(clientInfo.id_departamento_chip_1);
          setDepartamentoChip1Nome(nome1);
        }
        if (clientInfo.id_departamento_chip_2) {
          const nome2 = await fetchDepartamentoNome(clientInfo.id_departamento_chip_2);
          setDepartamentoChip2Nome(nome2);
        }

        if (clientInfo.instance_id) {
          // Verificar status apenas se houver uma instância
          const status = await checkConnectionStatus();
          if (status?.instance?.state === 'open') {
            setConnectionStatus('connected');
            setIsConnected(true);
          } else {
            setConnectionStatus('disconnected');
            setIsConnected(false);
          }
        } else {
          setConnectionStatus('disconnected');
          setIsConnected(false);
        }
      }
    } catch (error) {
      console.error('Erro ao verificar instância existente:', error);
      setConnectionStatus('disconnected');
      setIsConnected(false);
    }
  };

  // Buscar departamentos disponíveis
  const fetchDepartamentos = async () => {
    if (!user?.id_cliente) return;
    
    try {
      setLoadingDepartamentos(true);
      const departamentosData = await departamentosService.listar(user.id_cliente);
      
      // Filtrar departamentos: mostrar apenas os criados pelo usuário
      // Se não houver nenhum departamento criado pelo usuário, mostrar apenas "Atendimento"
      const departamentosCriadosPeloUsuario = departamentosData.filter(dep => dep.nome !== 'Atendimento');
      
      let departamentosFiltrados: Departamento[] = [];
      
      if (departamentosCriadosPeloUsuario.length === 0) {
        // Se não há departamentos criados pelo usuário, mostrar apenas "Atendimento"
        const atendimento = departamentosData.find(dep => dep.nome === 'Atendimento');
        departamentosFiltrados = atendimento ? [atendimento] : [];
      } else {
        // Se há departamentos criados pelo usuário, mostrar todos (incluindo "Atendimento" se existir)
        departamentosFiltrados = departamentosData;
      }
      
      // Garantir que o departamento associado ao chip sempre apareça na lista
      // Mesmo que tenha sido filtrado, se estiver associado, deve aparecer
      const departamentosComAssociados = [...departamentosFiltrados];
      
      // Adicionar departamento do chip 1 se não estiver na lista
      if (departamentoChip1) {
        const depChip1 = departamentosData.find(dep => dep.id.toString() === departamentoChip1);
        if (depChip1 && !departamentosComAssociados.find(dep => dep.id === depChip1.id)) {
          departamentosComAssociados.push(depChip1);
        }
      }
      
      // Adicionar departamento do chip 2 se não estiver na lista
      if (departamentoChip2) {
        const depChip2 = departamentosData.find(dep => dep.id.toString() === departamentoChip2);
        if (depChip2 && !departamentosComAssociados.find(dep => dep.id === depChip2.id)) {
          departamentosComAssociados.push(depChip2);
        }
      }
      
      setDepartamentos(departamentosComAssociados);
    } catch (error) {
      console.error('Erro ao buscar departamentos:', error);
      toast.error('Erro ao carregar departamentos');
    } finally {
      setLoadingDepartamentos(false);
    }
  };

  // Buscar nome do departamento pelo ID
  const fetchDepartamentoNome = async (departamentoId: string) => {
    if (!departamentoId) return null;
    
    try {
      const { data, error } = await supabase
        .from('departamento')
        .select('nome')
        .eq('id', departamentoId)
        .single();
      
      if (error) {
        console.error('Erro ao buscar nome do departamento:', error);
        return null;
      }
      
      return data?.nome || null;
    } catch (error) {
      console.error('Erro ao buscar nome do departamento:', error);
      return null;
    }
  };

  // Verificar se há departamentos disponíveis
  const hasDepartamentos = departamentos.length > 0;

  // Verificar se precisa selecionar departamento para conectar
  const needsDepartamentoSelection = () => {
    // Se não há departamentos, precisa criar
    if (!hasDepartamentos) return true;
    
    // Se não tem instance_id (não conectado), precisa selecionar pelo menos um departamento
    if (!instanceId) {
      return !departamentoChip1 && !departamentoChip2;
    }
    
    // Se tem instance_id mas não tem departamento associado, precisa selecionar
    if (instanceId && !departamentoChip1 && !departamentoChip2) return true;
    
    return false;
  };

  // Verificar se deve mostrar a seção de departamentos
  const shouldShowDepartamentoSection = () => {
    // Sempre mostrar se não há departamentos
    if (!hasDepartamentos) return true;
    
    // Sempre mostrar se há departamentos (para permitir alterações)
    return hasDepartamentos;
  };

  // Verificar instância existente ao carregar o componente
  useEffect(() => {
    if (user?.email) {
      checkExistingInstance();
    }
  }, [user?.email]);

  // Carregar departamentos quando os departamentos associados mudarem
  useEffect(() => {
    if (user?.id_cliente) {
      fetchDepartamentos();
    }
  }, [user?.id_cliente, departamentoChip1, departamentoChip2]);

  // Configurar polling otimizado para status
  useEffect(() => {
    if (user?.email && instanceName) {
      const statusInterval = setInterval(async () => {
        if (!checkingStatus && instanceName) {
          const now = Date.now();
          // Só verificar se o cache expirou
          if (!cachedStatus || (now - lastStatusCheck) >= STATUS_CACHE_DURATION) {
            await checkConnectionStatus();
          }
        }
      }, STATUS_CACHE_DURATION); // Verificar a cada 30 segundos
      
      return () => clearInterval(statusInterval);
    }
  }, [user, instanceName, checkingStatus, cachedStatus, lastStatusCheck]);



  // Função para selecionar departamento para um chip
  const handleSelectDepartamento = async (chip: 'chip1' | 'chip2', departamentoId: string) => {
    // Não permitir valores vazios
    if (!departamentoId || departamentoId === '') {
      return;
    }

    try {
      const updateData: any = {};
      
      if (chip === 'chip1') {
        updateData.id_departamento_chip_1 = departamentoId;
        setDepartamentoChip1(departamentoId);
        // Buscar nome do departamento
        const nome = await fetchDepartamentoNome(departamentoId);
        setDepartamentoChip1Nome(nome);
      } else {
        updateData.id_departamento_chip_2 = departamentoId;
        setDepartamentoChip2(departamentoId);
        // Buscar nome do departamento
        const nome = await fetchDepartamentoNome(departamentoId);
        setDepartamentoChip2Nome(nome);
      }

      const { error } = await supabase
        .from('clientes_info')
        .update(updateData)
        .eq('email', user?.email);

      if (error) {
        console.error('Erro ao atualizar departamento do chip:', error);
        toast.error('Erro ao salvar departamento');
      } else {
        toast.success(`Departamento associado ao ${chip === 'chip1' ? 'Chip 1' : 'Chip 2'}`);
      }
    } catch (error) {
      console.error('Erro ao selecionar departamento:', error);
      toast.error('Erro ao selecionar departamento');
    }
  };

  // Limpar cache quando desconectar
  useEffect(() => {
    if (connectionStatus === 'disconnected') {
      setCachedStatus(null);
      setLastStatusCheck(0);
    }
  }, [connectionStatus]);

  // Add this useEffect to fetch available chatbots
  useEffect(() => {
    // Only fetch chatbots if atendimento IA is enabled
    if (atendimentoIA) {
      fetchAvailableChatbots();
    }
  }, [atendimentoIA]);

  // Variável para evitar chamadas repetidas em progresso
  let isFetchingChatbots = false;

  const fetchAvailableChatbots = async () => {
    // Evitar chamadas repetidas em progresso
    if (isFetchingChatbots || loadingChatbots) {
      void 0;
      return;
    }
    
    isFetchingChatbots = true;
    setLoadingChatbots(true);
    try {
      // Fetch active chatbots from prompts_oficial table
      void 0;
      
      // Obter informações do cliente primeiro para uso posterior
      const clientInfo = await getClientInfo();
      if (!clientInfo) {
        void 0;
      }
      
      // Verificar se está em modo de impersonação
      const isImpersonating = sessionStorage.getItem('isImpersonating') === 'true';
      const impersonatedClienteStr = sessionStorage.getItem('impersonatedCliente');
      
      let data, error;
      
      if (isImpersonating && impersonatedClienteStr) {
        // Usar dados do cliente impersonado para buscar chatbots
        try {
          const impersonatedCliente = JSON.parse(impersonatedClienteStr);
          void 0;
          
          // Buscar chatbots pelo id_cliente do cliente impersonado
          const response = await supabase
            .from('prompts_oficial')
            .select('id, nome, instance_id, em_uso')
            .eq('id_cliente', impersonatedCliente.id.toString());
          
          data = response.data;
          error = response.error;
        } catch (parseError) {
          console.error('Erro ao parsear cliente impersonado:', parseError);
          error = parseError;
        }
      } else {
        // Buscar chatbots normalmente pelo id_usuario
      // Primeiro tentar buscar usando o campo status
        let response = await supabase
        .from('prompts_oficial')
        .select('id, nome, instance_id, em_uso')
        .eq('status', true)
        .eq('id_usuario', user?.id);
      
        data = response.data;
        error = response.error;
      
      // Se der erro ou não retornar dados, tentar buscar todos os chatbots do usuário
      if (error || !data || data.length === 0) {
        void 0;
        void 0;
        
          response = await supabase
          .from('prompts_oficial')
          .select('id, nome, instance_id, em_uso')
          .eq('id_usuario', user?.id);
          
        data = response.data;
        error = response.error;
        }
      }
      
      if (error) {
        console.error('Erro ao buscar chatbots disponíveis:', error);
        toast.error('Falha ao carregar lista de chatbots');
        return;
      }
      
      if (data && data.length > 0) {
        void 0;
        
        // Mapear os dados para o formato esperado
        const mappedChatbots = data.map(chatbot => ({
          id: chatbot.id,
          nome: chatbot.nome || 'Sem nome',
          instance_id: chatbot.instance_id || '',
          em_uso: chatbot.em_uso === true || chatbot.em_uso === 'true'
        }));
        
        setAvailableChatbots(mappedChatbots);
        
        // Verificar se há algum chatbot em uso
        const chatbotEmUso = mappedChatbots.find(chatbot => chatbot.em_uso);
        if (chatbotEmUso) {
          setSelectedChatbotId(chatbotEmUso.id);
          void 0;
          } else {
          void 0;
        }
              } else {
        void 0;
        setAvailableChatbots([]);
      }
    } catch (error) {
      console.error('Erro ao buscar chatbots:', error);
      toast.error('Erro ao carregar lista de chatbots');
    } finally {
      setLoadingChatbots(false);
      isFetchingChatbots = false;
    }
  };
  
  // Add this function to get client info
  const getClientInfo = async () => {
    try {
      // Verificar se está em modo de impersonação
      const isImpersonating = sessionStorage.getItem('isImpersonating') === 'true';
      const impersonatedClienteStr = sessionStorage.getItem('impersonatedCliente');
      
      if (isImpersonating && impersonatedClienteStr) {
        // Usar dados do cliente impersonado
        try {
          const impersonatedCliente = JSON.parse(impersonatedClienteStr);
          const { data, error } = await supabase
            .from('clientes_info')
            .select('*')
            .eq('id', impersonatedCliente.id)
            .single();
          
          if (error) {
            console.error('Erro ao buscar informações do cliente impersonado:', error);
            return null;
          }
          
          void 0;
          return data;
        } catch (error) {
          console.error('Erro ao parsear cliente impersonado:', error);
          return null;
        }
      } else {
        // Buscar dados do usuário autenticado
      const { data, error } = await supabase
        .from('clientes_info')
        .select('*')
        .eq('email', user?.email)
        .single();
      
      if (error) {
        console.error('Erro ao buscar informações do cliente:', error);
        return null;
      }
      
      return data;
      }
    } catch (error) {
      console.error('Erro ao buscar informações do cliente:', error);
      return null;
    }
  };
  
  // Add this function to handle chatbot selection
  const handleChatbotChange = async (chatbotId: string | number) => {
    // Check if the ID is a UUID (string with dashes)
    const isUUID = typeof chatbotId === 'string' && chatbotId.includes('-');
    
    // If it's a UUID, use it directly; otherwise try to convert to number
    const id = isUUID ? chatbotId : (typeof chatbotId === 'string' ? parseInt(chatbotId) : chatbotId);
    
    // Validate the ID
    if ((isUUID && typeof id === 'string') || (!isUUID && !isNaN(id as number) && (id as number) > 0)) {
      void 0;
      
      // Atualizando o estado local para feedback imediato
      setSelectedChatbotId(id);
      
      // Atualizar o chatbot diretamente no banco de dados
      await updateChatbotAsInUse(id);
    } else {
      console.error('ID de chatbot inválido:', chatbotId);
      toast.error('ID de chatbot inválido');
    }
  };

  // Nova função simplificada para atualizar o chatbot como "em uso"
  const updateChatbotAsInUse = async (chatbotId: string | number) => {
    try {
      // Mostrar feedback para o usuário
      toast.info('Ativando chatbot...');

      // 1. Primeiro desativar todos os chatbots do usuário
      const { error: resetError } = await supabase
        .from('prompts_oficial')
        .update({ em_uso: false })
        .eq('id_usuario', user?.id);
        
      if (resetError) {
        console.error('Erro ao resetar status dos chatbots:', resetError);
        toast.error('Erro ao preparar ativação do chatbot');
        return;
      }
      
      // 2. Ativar apenas o chatbot selecionado
      const { data, error } = await supabase
        .from('prompts_oficial')
        .update({ em_uso: true })
        .eq('id', chatbotId)
        .select('nome');
        
      if (error) {
        console.error('Erro ao ativar chatbot:', error);
        toast.error('Erro ao ativar chatbot');
        return;
      }
      
      // 3. Atualizar as preferências do cliente
      const { error: clientError } = await supabase
        .from('clientes_info')
        .update({
          id_chatbot: chatbotId,
          atendimento_ia: true,
          atendimento_humano: false
        })
        .eq('email', user?.email);
      
      if (clientError) {
        console.error('Erro ao atualizar preferências do cliente:', clientError);
        toast.error('Erro ao salvar preferências');
        return;
      }
      
      // 4. Atualizar estados locais da interface
      setAtendimentoHumano(false);
      setAtendimentoIA(true);
      
      // 5. Mostrar confirmação ao usuário
      const botName = data?.[0]?.nome || 'Selecionado';
      toast.success(`Chatbot "${botName}" ativado com sucesso`);
      
      // 6. Atualizar a lista localmente sem causar um loop
      setAvailableChatbots(prev => 
        prev.map(bot => ({
          ...bot,
          em_uso: bot.id === chatbotId
        }))
      );
      
    } catch (err) {
      console.error('Erro inesperado ao ativar chatbot:', err);
      toast.error('Erro ao ativar chatbot');
    }
  };

  // Add this function to update instance_id for all chatbots of a user
  const checkAndUpdateChatbotInstanceId = async () => {
    try {
      if (!user?.id) return;
      
      const clientInfo = await getClientInfo();
      if (!clientInfo?.instance_id) {
        void 0;
        return;
      }
      
      void 0;
      
      // Primeiro, buscar todos os chatbots do usuário
      const { data: chatbots, error } = await supabase
        .from('prompts_oficial')
        .select('id, nome, instance_id, em_uso')
        .eq('id_usuario', user.id);
      
      if (error) {
        console.error('Erro ao buscar chatbots para atualizar instance_id:', error);
        return;
      }
      
      if (!chatbots || chatbots.length === 0) {
        void 0;
        return;
      }
      
      void 0;
      
      // Filtrar chatbots com instance_id nulo ou diferente do atual
      const chatbotsToUpdate = chatbots.filter(bot => 
        bot.instance_id === null || 
        bot.instance_id === undefined || 
        bot.instance_id !== clientInfo.instance_id
      );
      
      if (chatbotsToUpdate.length === 0) {
        void 0;
        return;
      }
      
      void 0;
      
      // Atualizar cada chatbot
      for (const bot of chatbotsToUpdate) {
        void 0;
        
        const { error: updateError } = await supabase
          .from('prompts_oficial')
          .update({ instance_id: clientInfo.instance_id })
          .eq('id', bot.id);
          
        if (updateError) {
          console.error(`Erro ao atualizar instance_id do chatbot ${bot.id}:`, updateError);
        } else {
          void 0;
        }
      }
      
      void 0;
      
    } catch (error) {
      console.error('Erro ao verificar e atualizar instance_id dos chatbots:', error);
    }
  };
  
  // Adicionar useEffect para verificar e atualizar instance_id quando a conexão estiver estabelecida
  useEffect(() => {
    if (isConnected && instanceId) {
      checkAndUpdateChatbotInstanceId();
    }
  }, [isConnected, instanceId]);

  // Add this function to ensure only one chatbot is marked as "em_uso"
  const ensureOnlyOneChatbotInUse = async () => {
    if (!user?.id) return;
    
    void 0;
    
    try {
      // Primeiro, obter as informações do cliente para saber qual chatbot deve estar em uso
      const clientInfo = await getClientInfo();
      if (!clientInfo) {
        console.error('Não foi possível obter informações do cliente');
        return;
      }
      
      // Verificar as configurações de atendimento
      const shouldUseAI = !!clientInfo.atendimento_ia;
      const selectedChatbotId = clientInfo.id_chatbot;
      
      void 0;
      
      // Obter todos os chatbots do usuário
      const { data: allChatbots, error: fetchError } = await supabase
        .from('prompts_oficial')
        .select('id, nome, em_uso')
        .eq('id_usuario', user.id);
        
      if (fetchError) {
        console.error('Erro ao buscar chatbots do usuário:', fetchError);
        return;
      }
      
      if (!allChatbots || allChatbots.length === 0) {
        void 0;
        return;
      }
      
      void 0;
      
      // Normalize em_uso values to handle both string and boolean values
      const normalizedChatbots = allChatbots.map(bot => ({
        ...bot,
        em_uso: typeof bot.em_uso === 'string' 
          ? bot.em_uso.toLowerCase() === 'sim' 
          : !!bot.em_uso
      }));
      
      // Verificar inconsistências
      const chatbotsInUse = normalizedChatbots.filter(bot => bot.em_uso === true);
      
      // Function to safely compare IDs regardless of type
      const idsMatch = (id1: any, id2: any) => String(id1) === String(id2);
      
      const hasInconsistency = (
        // Caso 1: Atendimento por IA está ligado, mas nenhum chatbot está marcado como em uso
        (shouldUseAI && selectedChatbotId && chatbotsInUse.length === 0) ||
        // Caso 2: Atendimento por IA está desligado, mas há chatbots marcados como em uso
        (!shouldUseAI && chatbotsInUse.length > 0) ||
        // Caso 3: Há mais de um chatbot marcado como em uso
        chatbotsInUse.length > 1 ||
        // Caso 4: O chatbot selecionado no cliente_info não é o mesmo que está marcado como em uso
        (shouldUseAI && selectedChatbotId && 
          chatbotsInUse.length === 1 && 
          !idsMatch(chatbotsInUse[0].id, selectedChatbotId))
      );
      
      if (hasInconsistency) {
        void 0;
        
        // 1. Primeiro, marcar todos os chatbots como não em uso
        const { error: resetError } = await supabase
          .from('prompts_oficial')
          .update({ em_uso: false })
          .eq('id_usuario', user.id);
          
        if (resetError) {
          console.error('Erro ao resetar status de uso dos chatbots:', resetError);
          return;
        }
        
        // 2. Se atendimento por IA estiver ligado e houver um chatbot selecionado, marcá-lo como em uso
        if (shouldUseAI && selectedChatbotId) {
          void 0;
          
          const { error: updateError } = await supabase
            .from('prompts_oficial')
            .update({ em_uso: true })
            .eq('id', selectedChatbotId);
            
          if (updateError) {
            console.error('Erro ao marcar chatbot como em uso:', updateError);
          } else {
            void 0;
          }
        }
        
        void 0;
      } else {
        void 0;
        
        // Even if there's no inconsistency, ensure all em_uso fields are boolean values
        const stringValueChatbots = allChatbots.filter(
          bot => typeof bot.em_uso === 'string'
        );
        
        if (stringValueChatbots.length > 0) {
          void 0;
          
          for (const bot of stringValueChatbots) {
            const boolValue = bot.em_uso.toLowerCase() === 'sim';
            void 0;
            
            const { error: updateError } = await supabase
              .from('prompts_oficial')
              .update({ em_uso: boolValue })
              .eq('id', bot.id);
              
            if (updateError) {
              console.error(`Erro ao converter tipo do campo em_uso para o chatbot ${bot.id}:`, updateError);
            }
          }
        }
      }
    } catch (error) {
      console.error('Erro ao verificar consistência do campo em_uso:', error);
    }
  };

  // Add the forceUpdateChatbotField function to update database structure
  const forceUpdateChatbotField = async () => {
    try {
      toast.info('Verificando estrutura dos dados dos chatbots...');
      void 0;
      
      // Get all chatbots for the user
      const { data: allChatbots, error: fetchError } = await supabase
        .from('prompts_oficial')
        .select('id, nome, status, em_uso')
        .eq('id_usuario', user?.id);
        
      if (fetchError) {
        console.error('Erro ao buscar chatbots para verificação:', fetchError);
        toast.error('Erro ao verificar chatbots');
        return;
      }
      
      if (!allChatbots || allChatbots.length === 0) {
        void 0;
        toast.info('Nenhum chatbot encontrado');
        return;
      }
      
      void 0;
      
      // Check for chatbots with undefined fields or string values for boolean fields
      const chatbotsToUpdate = allChatbots.filter(bot => 
        bot.status === undefined || 
        bot.status === null || 
        bot.em_uso === undefined || 
        bot.em_uso === null ||
        typeof bot.em_uso === 'string' // Check for string values (like 'sim'/'não')
      );
      
      if (chatbotsToUpdate.length === 0) {
        void 0;
        toast.success('Estrutura de dados OK');
        return;
      }
      
      void 0;
      
      // Update each chatbot with the correct field structure
      let successCount = 0;
      for (const bot of chatbotsToUpdate) {
        void 0;
        
        // Prepare the update payload
        const updatePayload: any = {};
        
        // Fix status field if needed
        if (bot.status === undefined || bot.status === null) {
          updatePayload.status = true; // Default to active
        }
        
        // Fix em_uso field if needed
        if (bot.em_uso === undefined || bot.em_uso === null) {
          updatePayload.em_uso = false; // Default to not in use
        } else if (typeof bot.em_uso === 'string') {
          // Convert string values to boolean
          updatePayload.em_uso = bot.em_uso.toLowerCase() === 'sim'; 
        }
        
        if (Object.keys(updatePayload).length > 0) {
          const { error: updateError } = await supabase
            .from('prompts_oficial')
            .update(updatePayload)
            .eq('id', bot.id);
            
          if (updateError) {
            console.error(`Erro ao atualizar estrutura do chatbot ${bot.id}:`, updateError);
          } else {
            void 0;
            successCount++;
          }
        }
      }
      
      // Force a check for consistency after structure update
      await ensureOnlyOneChatbotInUse();
      
      // Refresh the available chatbots list
      if (atendimentoIA) {
        await fetchAvailableChatbots();
      }
      
      toast.success(`Atualização concluída: ${successCount} chatbots atualizados`);
    } catch (error) {
      console.error('Erro ao atualizar estrutura dos chatbots:', error);
      toast.error('Erro na atualização estrutural');
    }
  };

  // Função para salvar as preferências de atendimento
  const handleFirstAttendanceChange = async (value: string) => {
    const isHuman = value === "human";
    
    // Atualiza o estado local primeiro para feedback imediato ao usuário
    setAtendimentoHumano(isHuman);
    setAtendimentoIA(!isHuman);
    
    try {
      toast.info(isHuman ? "Configurando para atendimento humano..." : "Configurando para atendimento por IA...");
      
      // Se mudar para IA, verifica se há chatbots disponíveis
      if (!isHuman) {
        // Carregar chatbots disponíveis
        const { data: chatbots, error: chatbotError } = await supabase
          .from('prompts_oficial')
          .select('id, nome, em_uso')
          .eq('status', true)
          .eq('id_usuario', user?.id);
        
        if (chatbotError) {
          console.error('Erro ao buscar chatbots:', chatbotError);
          toast.error('Erro ao buscar chatbots disponíveis');
          return;
        } 
        
        if (!chatbots || chatbots.length === 0) {
          toast.warning('Nenhum chatbot ativo encontrado. Ative um chatbot na seção Chatbots.');
          return;
        }
        
        // Se houver exatamente um chatbot, selecioná-lo automaticamente
        if (chatbots.length === 1) {
          const singleChatbot = chatbots[0];
          setSelectedChatbotId(singleChatbot.id);
          await updateChatbotAsInUse(singleChatbot.id);
        } else {
          // Caso contrário, não selecionar automaticamente
          setSelectedChatbotId(null);
        }
        return;
      }
      
      // Se chegou aqui, está configurando para atendimento humano
      // Preparar dados para atualização
      const updateData: any = { 
        atendimento_humano: isHuman,
        atendimento_ia: !isHuman
      };
      
      // If switching to human mode, clear chatbot selection and mark all as not in use
      if (isHuman) {
        updateData.id_chatbot = null;
        
        // Se estiver mudando para atendimento humano, marque todos os chatbots como não em uso
        try {
          void 0;
          const { error: resetError } = await supabase
            .from('prompts_oficial')
            .update({ em_uso: false })
            .eq('id_usuario', user?.id);
            
          if (resetError) {
            console.error('Erro ao resetar status de uso dos chatbots:', resetError);
          } else {
            void 0;
            
            // Atualizar a lista localmente
            setAvailableChatbots(prev => 
              prev.map(bot => ({
                ...bot,
                em_uso: false
              }))
            );
          }
        } catch (chatbotUpdateError) {
          console.error('Erro ao atualizar status dos chatbots ao mudar para atendimento humano:', chatbotUpdateError);
        }
      }
      
      // Atualizar configurações do cliente
      const { error } = await supabase
        .from('clientes_info')
        .update(updateData)
        .eq('email', user?.email);

      if (error) {
        console.error('Erro ao salvar preferências de atendimento:', error);
        toast.error('Erro ao salvar preferências de atendimento');
        return;
      }
      
      toast.success(isHuman 
        ? 'Atendimento humano configurado com sucesso' 
        : 'Atendimento por IA configurado com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar preferências de atendimento:', error);
      toast.error('Erro ao salvar preferências de atendimento');
      
      // Reverter estados locais em caso de erro
      setAtendimentoHumano(!isHuman);
      setAtendimentoIA(isHuman);
    }
  };

  const handleConnectWhatsApp = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    
    // Verificar se precisa selecionar departamento
    if (needsDepartamentoSelection()) {
      if (!hasDepartamentos) {
        toast.error('É necessário criar pelo menos um departamento antes de conectar o WhatsApp');
        // Redirecionar para página de departamentos
        window.open('/departamentos', '_blank');
        return;
      } else {
        toast.error('É necessário selecionar um departamento para conectar o WhatsApp');
        return;
      }
    }
    
    setIsLoading(true);
    try {
      // Buscar informações do cliente
      const { data: clientInfo, error: clientInfoError } = await supabase
        .from('clientes_info')
        .select('*')
        .eq('email', user?.email)
        .single();

      if (clientInfoError || !clientInfo) {
        console.error('Erro ao buscar informações do cliente:', clientInfoError);
        toast.error('Erro ao buscar informações do cliente');
        return;
      }

      void 0;
      setConnectionStatus('connecting');
      
      try {
      const response = await createWhatsAppInstance({
        phoneNumber: user?.id || '',
        instanceName: undefined, // Deixa a função createConsistentInstanceName gerar o nome
        email: user?.email || '',
      });
      
      void 0;
        const newInstanceId = response.instance.instanceId;
        setInstanceId(newInstanceId);
      setInstanceName(response.instance.instanceName);
      setQrCode(response.qrCode);
      
      // Atualizar dados da instância no banco
      void 0;
      await updateClientInfo({
          instance_id: newInstanceId,
        sender_number: '',
        instance_name: response.instance.instanceName,
          apikey: response.hash?.apikey || '',
          atendimento_humano: atendimentoHumano,
          atendimento_ia: atendimentoIA
      });
      
      toast.success("QR Code gerado com sucesso! Escaneie com seu WhatsApp");
      } catch (error: any) {
      console.error("Erro ao criar instância:", error);
      setConnectionStatus('disconnected');
      
      if (error.message === 'NUMBER_IN_USE') {
        toast.error("Não é possível conectar este número. Por favor, verifique se ele já está sendo utilizado ou tente com outro número.");
      } else {
        toast.error("Erro ao gerar QR Code. Tente novamente mais tarde.");
      }
      }
    } catch (error) {
      console.error("Erro ao buscar dados do cliente:", error);
      toast.error("Erro ao preparar conexão com WhatsApp");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshQRCode = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!instanceName) {
      toast.error("Nome da instância não disponível");
      return;
    }
    
    setIsLoading(true);
    try {
      const qrCodeData = await getNewQRCode(instanceName);
      setQrCode(qrCodeData);
      toast.success("Novo QR Code gerado com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar novo QR Code:", error);
      toast.error("Erro ao gerar novo QR Code");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLeadsData = async () => {
    try {
      if (fetchingLeads || !instanceName) return;
      setFetchingLeads(true);
      
      void 0;
      toast.info('Carregando dados do WhatsApp...');
      
      // Chamada à API fetchInstances para buscar dados da instância
      const apiKey = 'MI8J85niN3Ir70htmScnxGpGKl2jZgwa';
      const url = `https://api.usesmartcrm.com/instance/fetchInstances?instanceName=${instanceName}`;
      
      void 0;
      
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'apikey': apiKey,
            'Accept': 'application/json'
          }
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Erro na requisição: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        void 0;
        
        // Trata diferentes formatos de resposta
        let instanceData;
        
        if (Array.isArray(data) && data.length > 0) {
          // Se a resposta for um array, pega o primeiro item
          const instance = data[0];
          
          instanceData = {
            instance_id: instance.instanceId || instance.id || '',
            sender_number: instance.ownerJid?.split('@')[0] || '',
            instance_name: instance.name || instanceName,
            apikey: apiKey
          };
        } else if (data.instance) {
          // Se a resposta tiver uma propriedade 'instance'
          instanceData = {
            instance_id: data.instance.instanceId || data.instance.id || '',
            sender_number: data.instance.ownerJid?.split('@')[0] || '',
            instance_name: data.instance.name || instanceName,
            apikey: apiKey
          };
        } else if (data.id) {
          // Se a resposta for o objeto de instância diretamente
          instanceData = {
            instance_id: data.instanceId || data.id || '',
            sender_number: data.ownerJid?.split('@')[0] || '',
            instance_name: data.name || instanceName,
            apikey: apiKey
          };
        } else {
          throw new Error('Formato de resposta desconhecido');
        }
        
        void 0;
        
        // Atualizar no Supabase
        await updateClientInfo(instanceData);
        
        // Atualizar estado local
        setSenderNumber(instanceData.sender_number);
        setInstanceId(instanceData.instance_id);
        
        // Atualizar instance_id para todos os chatbots
        await checkAndUpdateChatbotInstanceId();
        
        toast.success('Dados do WhatsApp atualizados com sucesso!');
      } catch (error) {
        console.error('Erro ao buscar dados da instância:', error);
        toast.error('Erro ao carregar dados do WhatsApp');
      }
    } finally {
      setFetchingLeads(false);
    }
  };

  return (
    <>
      <Card>
      <CardHeader className="pb-3">
        <CardTitle>Conectar WhatsApp</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {connectionStatus === 'connected' ? (
            <div className="bg-green-50 border border-green-200 rounded-md p-4 flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-green-700 font-medium">WhatsApp conectado</p>
                <p className="text-green-600 text-sm">{senderNumber ? `Número: ${senderNumber}` : 'Número conectado'}</p>
              </div>
              {/* Botão de reconectar - oculto para Gestor */}
              {!isGestor && (
                <div className="ml-auto">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={handleRefreshQRCode}
                    className="text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
                  >
                    Reconectar
                  </Button>
                </div>
              )}
            </div>
          ) : connectionStatus === 'connecting' ? (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 flex items-center">
              <div className="flex-1">
                <p className="text-blue-700 font-medium">Conectando WhatsApp</p>
                <p className="text-blue-600 text-sm">Escaneie o QR Code abaixo com seu celular</p>
              </div>
              {isLoading && (
                <div className="animate-spin">
                  <RefreshCw className="h-5 w-5 text-blue-500" />
                </div>
              )}
          </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-md p-4 flex items-center">
              <AlertCircle className="h-5 w-5 text-amber-500 mr-3" />
              <div className="flex-1">
                <p className="text-amber-700 font-medium">WhatsApp desconectado</p>
                <p className="text-amber-600 text-sm">Conecte seu WhatsApp para começar</p>
              </div>
            </div>
          )}
          
          {/* QR Code - oculto para Gestor */}
          {!isGestor && qrCode && (connectionStatus === 'disconnected' || connectionStatus === 'connecting') && (
            <div className="flex justify-center py-4">
              <div className="bg-white p-4 rounded-lg shadow">
                <MyQRCode qrString={qrCode} />
              </div>
            </div>
          )}

          {/* Seção de seleção de departamentos - Chip 1 */}
          {shouldShowDepartamentoSection() && (
            <div className="pt-4 space-y-3">
              {!hasDepartamentos ? (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="h-4 w-4 text-red-600" />
                    <p className="text-red-700 font-medium text-sm">Nenhum Departamento Encontrado</p>
                  </div>
                  <p className="text-red-600 text-xs mb-3">
                    É necessário criar pelo menos um departamento antes de conectar o WhatsApp.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open('/departamentos', '_blank')}
                    className="w-full"
                  >
                    Criar Departamento
                  </Button>
                </div>
              ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="h-4 w-4 text-blue-600" />
                    <p className="text-blue-700 font-medium text-sm">Chip 1</p>
                    {departamentoChip1 && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                        ✓ Departamento Ativo
                      </span>
                    )}
                  </div>
                  <p className="text-blue-600 text-xs mb-3">
                    {departamentoChip1 
                      ? `Departamento associado ao Chip 1: ${departamentoChip1Nome || `Departamento ${departamentoChip1}`}`
                      : 'Selecione um departamento para associar ao Chip 1'
                    }
                  </p>
                                                          <Select
                      value={departamentoChip1 || ""}
                      onValueChange={(value) => {
                        if (value === "create") {
                          window.open('/departamentos', '_blank');
                        } else {
                          handleSelectDepartamento('chip1', value);
                        }
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue>
                          {departamentoChip1 
                            ? departamentoChip1Nome || `Departamento ${departamentoChip1}`
                            : "Selecione um departamento"
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {departamentos.map((departamento) => (
                          <SelectItem 
                            key={departamento.id} 
                            value={departamento.id.toString()}
                            disabled={departamentoChip2 === departamento.id.toString()}
                          >
                            {departamento.nome}
                            {departamentoChip2 === departamento.id.toString() && " (Em uso no Chip 2)"}
                          </SelectItem>
                        ))}
                        <SelectItem value="create" className="text-blue-600 font-medium">
                          + Criar novo departamento
                        </SelectItem>
                      </SelectContent>
                    </Select>

                </div>
              )}
            </div>
          )}

          

          <div className="pt-4 flex justify-between">
            {/* Botões de conexão WhatsApp - visíveis apenas para Admin */}
            {!isGestor && ((connectionStatus !== 'connected' && !qrCode) || needsDepartamentoSelection()) && (
              <Button
                variant="default"
                onClick={handleConnectWhatsApp}
                disabled={isLoading || needsDepartamentoSelection()}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Carregando...
                  </>
                ) : needsDepartamentoSelection() ? (
                  <>
                    <Building2 className="h-4 w-4 mr-2" />
                    {connectionStatus === 'connected' ? 'Selecione Departamento para Continuar' : 'Selecione um Departamento'}
                  </>
                ) : (
                  <>
                    <Smartphone className="h-4 w-4 mr-2" />
                    Conectar WhatsApp
                  </>
                )}
              </Button>
            )}
            
            {!isGestor && connectionStatus !== 'connected' && qrCode && (
              <Button 
                variant="outline" 
                onClick={handleRefreshQRCode}
                disabled={isLoading} 
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Carregando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Novo QR Code
                  </>
                )}
              </Button>
            )}
            
            {/* Botão de atualizar dados - visível para todos quando conectado */}
            {!isGestor && connectionStatus === 'connected' && (
              <Button
                variant="outline"
                onClick={fetchLeadsData}
                disabled={fetchingLeads}
                className="w-full"
              >
                {fetchingLeads ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Atualizando dados...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Atualizar dados da instância
                  </>
                )}
              </Button>
            )}
            
            {/* Mensagem informativa para Gestor */}
            {isGestor && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4 w-full">
                <p className="text-blue-700 text-sm">
                  Como gestor, você pode ativar/desativar a IA e selecionar bots, mas não pode conectar o WhatsApp.
                </p>
              </div>
            )}
          </div>
          
          {/* Dropdown para seleção do primeiro atendimento */}
          {connectionStatus === 'connected' && (
            <div className="pt-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Selecionar primeiro atendimento
              </label>
              <Select
                value={atendimentoHumano ? "human" : "ai"}
                onValueChange={handleFirstAttendanceChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o tipo de primeiro atendimento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="human">Atendimento humano</SelectItem>
                  {/* <SelectItem value="ai">Atendimento por IA</SelectItem> */}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {/* Seletor de chatbot (aparece somente quando atendimento por IA está ativado) */}
          {connectionStatus === 'connected' && atendimentoIA && (
            <div className="pt-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Selecionar chatbot para atendimento
              </label>
              
              {loadingChatbots ? (
                <div className="flex items-center space-x-2 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Carregando chatbots...</span>
                </div>
              ) : availableChatbots.length === 0 ? (
                <div className="bg-amber-50 border border-amber-200 rounded-md p-2 text-sm">
                  <p className="text-amber-700">Nenhum chatbot ativo disponível.</p>
                  <p className="text-amber-600">Ative algum chatbot na seção de Chatbots.</p>
                </div>
              ) : (
                <>
                  <Select
                    value={selectedChatbotId ? String(selectedChatbotId) : undefined}
                    onValueChange={handleChatbotChange}
                  >
                    <SelectTrigger className="w-full hover:border-green-500 focus:ring-green-500">
                      <SelectValue placeholder="Selecione um chatbot" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableChatbots.map((chatbot) => (
                        <SelectItem 
                          key={String(chatbot.id)} 
                          value={String(chatbot.id)}
                          className={chatbot.em_uso ? "font-bold text-green-600" : ""}
                        >
                          {chatbot.nome} {chatbot.em_uso && "✓"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {availableChatbots.length === 1 && (
                    <div className="text-xs text-gray-500 mt-1">Apenas um chatbot disponível para seleção.</div>
                  )}
                </>
              )}
            </div>
          )}
            </div>
        </CardContent>
      </Card>


    </>
  );
}
