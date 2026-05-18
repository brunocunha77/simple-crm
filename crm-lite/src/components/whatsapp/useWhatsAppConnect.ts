import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import {
  getConnectionState,
  ConnectionStateResponse,
  createWhatsAppInstance,
  getNewQRCode
} from '@/services/whatsappService';

export function useWhatsAppConnect({
  instanceIdField,
  instanceNameField,
  senderNumberField,
  atendimentoHumanoField,
  atendimentoIAField,
  chipNumber = 1,
}: {
  instanceIdField: string;
  instanceNameField: string;
  senderNumberField: string;
  atendimentoHumanoField: string;
  atendimentoIAField: string;
  chipNumber?: number;
}) {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [fetchingLeads, setFetchingLeads] = useState(false);
  const [instanceName, setInstanceName] = useState<string>('');
  const [instanceId, setInstanceId] = useState<string>('');
  const [senderNumber, setSenderNumber] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
  const [isLoading, setIsLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [webhookConfigured, setWebhookConfigured] = useState<boolean>(false);
  const [atendimentoHumano, setAtendimentoHumano] = useState<boolean>(true);
  const [atendimentoIA, setAtendimentoIA] = useState<boolean>(false);
  const [lastStatusCheck, setLastStatusCheck] = useState<number>(0);
  const [cachedStatus, setCachedStatus] = useState<ConnectionStateResponse | null>(null);
  const STATUS_CACHE_DURATION = 30000; // 30 segundos
  const [selectedChatbotId, setSelectedChatbotId] = useState<string | number | null>(null);
  const [availableChatbots, setAvailableChatbots] = useState<Array<{id: string | number, nome: string, em_uso?: boolean}>>([]);
  const [loadingChatbots, setLoadingChatbots] = useState<boolean>(false);
  const [apiKey, setApiKey] = useState<string>('');

  // ... (copiar toda a lógica do WhatsAppConnect, trocando os campos fixos pelos campos recebidos via parâmetro)

  // Exemplo de uso dos campos dinâmicos:
  // setInstanceName(clientInfo[instanceNameField] || '');
  // setInstanceId(clientInfo[instanceIdField] || '');
  // setSenderNumber(clientInfo[senderNumberField] || '');
  // setAtendimentoHumano(clientInfo[atendimentoHumanoField] !== null ? !!clientInfo[atendimentoHumanoField] : true);
  // setAtendimentoIA(clientInfo[atendimentoIAField] !== null ? !!clientInfo[atendimentoIAField] : false);

  useEffect(() => {
    // Buscar e setar os dados do chip ao montar
    async function fetchChipData() {
      if (!user?.email) return;
      const { data: clientInfo, error: clientInfoError } = await supabase
        .from('clientes_info')
        .select('*')
        .eq('email', user.email)
        .single();
      if (clientInfoError || !clientInfo) return;
      setInstanceName(clientInfo[instanceNameField] || '');
      setInstanceId(clientInfo[instanceIdField] || '');
      setSenderNumber(clientInfo[senderNumberField] || '');
      setAtendimentoHumano(clientInfo[atendimentoHumanoField] !== null ? !!clientInfo[atendimentoHumanoField] : true);
      setAtendimentoIA(clientInfo[atendimentoIAField] !== null ? !!clientInfo[atendimentoIAField] : false);
    }
    fetchChipData();
    // eslint-disable-next-line
  }, [user?.email, instanceNameField, instanceIdField, senderNumberField, atendimentoHumanoField, atendimentoIAField]);

  useEffect(() => {
    // Só checa status se houver instanceName
    if (!user?.email || !instanceName) return;

    let isMounted = true;

    async function checkStatus() {
      setCheckingStatus(true);
      try {
        void 0;
        const response = await getConnectionState(instanceName);
        void 0;
        if (!isMounted) return;

        if (response?.instance?.state === 'open') {
          setConnectionStatus('connected');
          setIsConnected(true);
        } else {
          setConnectionStatus('disconnected');
          setIsConnected(false);
        }
      } catch (err) {
        if (!isMounted) return;
        setConnectionStatus('disconnected');
        setIsConnected(false);
      } finally {
        if (isMounted) setCheckingStatus(false);
      }
    }

    checkStatus();
    const interval = setInterval(checkStatus, STATUS_CACHE_DURATION);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user?.email, instanceName]);

  // Handlers principais para conexão e atualização
  const handleConnectWhatsApp = async (e?: React.MouseEvent<HTMLButtonElement>) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    try {
      // Buscar informações do cliente
      const { data: clientInfo, error: clientInfoError } = await supabase
        .from('clientes_info')
        .select('id, name, email')
        .eq('email', user?.email)
        .single();
      if (clientInfoError || !clientInfo) {
        toast.error('Erro ao buscar informações do cliente');
        return;
      }
      setConnectionStatus('connecting');
      // Gerar nome da instância conforme o chip
      let sanitizedName = clientInfo.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .substring(0, 10);
      let instanceNameFinal = chipNumber === 1
        ? `smartcrm_${clientInfo.id}_${sanitizedName}`
        : `smartcrm${chipNumber}_${clientInfo.id}_${sanitizedName}`;
      // Chamar createWhatsAppInstance com o nome correto
      const response = await createWhatsAppInstance({
        phoneNumber: user?.id || '',
        instanceName: instanceNameFinal,
        email: user?.email || '',
      });
      setInstanceId(response.instance.instanceId);
      setInstanceName(response.instance.instanceName);
      setQrCode(response.qrCode);
      await supabase.from('clientes_info').update({
        [instanceIdField]: response.instance.instanceId,
        [instanceNameField]: response.instance.instanceName,
      }).eq('email', user?.email);
      toast.success('QR Code gerado com sucesso! Escaneie com seu WhatsApp');
    } catch (error: any) {
      setConnectionStatus('disconnected');
      toast.error('Erro ao gerar QR Code. Tente novamente mais tarde.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshQRCode = async (e?: React.MouseEvent<HTMLButtonElement>) => {
    if (e) e.preventDefault();
    if (!instanceName) {
      toast.error('Nome da instância não disponível');
      return;
    }
    setIsLoading(true);
    try {
      const qrCodeData = await getNewQRCode(instanceName);
      setQrCode(qrCodeData);
      toast.success('Novo QR Code gerado com sucesso!');
    } catch (error) {
      toast.error('Erro ao gerar novo QR Code');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLeadsData = async () => {
    try {
      if (fetchingLeads || !instanceName) return;
      setFetchingLeads(true);
      toast.info('Carregando dados do WhatsApp...');
      // Simulação de chamada à API
      setTimeout(() => {
        toast.success('Dados do WhatsApp atualizados com sucesso!');
        setFetchingLeads(false);
      }, 1500);
    } catch (error) {
      setFetchingLeads(false);
    }
  };

  const handleFirstAttendanceChange = (value: string) => {
    setAtendimentoHumano(value === 'human');
    setAtendimentoIA(value === 'ai');
  };

  const handleChatbotChange = (chatbotId: string | number) => {
    setSelectedChatbotId(chatbotId);
  };

  // O hook retorna todos os estados e handlers necessários para o card de conexão
  return {
    isConnected,
    setIsConnected,
    qrCode,
    setQrCode,
    fetchingLeads,
    setFetchingLeads,
    STATUS_CACHE_DURATION,
    apiKey,
    setApiKey,
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
    handleConnectWhatsApp,
    handleRefreshQRCode,
    fetchLeadsData,
    handleFirstAttendanceChange,
    handleChatbotChange,
    // ... outros handlers e funções
  };
} 