import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/lib/supabase';
import { ChatbotSimulationService, ChatbotPrompt } from '@/services/chatbotSimulationService';
import { toast } from 'sonner';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export function useChatbotSimulation() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedChatbot, setSelectedChatbot] = useState<ChatbotPrompt | null>(null);
  const [availableChatbots, setAvailableChatbots] = useState<ChatbotPrompt[]>([]);
  const [simulationStarted, setSimulationStarted] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);

  const fetchChatbots = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      // Verificar se está em modo de impersonação
      const isImpersonating = sessionStorage.getItem('isImpersonating') === 'true';
      const impersonatedClienteStr = sessionStorage.getItem('impersonatedCliente');
      
      if (isImpersonating && impersonatedClienteStr) {
        // Usar dados do cliente impersonado para buscar chatbots
        try {
          const impersonatedCliente = JSON.parse(impersonatedClienteStr);
          void 0;
          
          // Buscar chatbots pelo id_cliente do cliente impersonado
          const { data: chatbotsData, error } = await supabase
            .from('prompts_oficial')
            .select('*')
            .eq('id_cliente', impersonatedCliente.id.toString());
          
          if (error) {
            console.error('Erro ao buscar chatbots para cliente impersonado:', error);
            throw error;
          }
          
          void 0;
          setAvailableChatbots(chatbotsData || []);
        } catch (error) {
          console.error('Erro ao parsear cliente impersonado:', error);
          throw error;
        }
      } else {
        // Buscar chatbots normalmente pelo id_usuario
        const chatbots = await ChatbotSimulationService.getChatbotsByUser(user.id);
        setAvailableChatbots(chatbots);
      }
    } catch (error) {
      console.error('Erro ao buscar chatbots:', error);
      toast.error('Erro ao carregar chatbots');
    }
  }, [user]);

  const fetchClientId = useCallback(async () => {
    if (!user) return;
    
    try {
      // Verificar se está em modo de impersonação
      const isImpersonating = sessionStorage.getItem('isImpersonating') === 'true';
      const impersonatedClienteStr = sessionStorage.getItem('impersonatedCliente');
      
      if (isImpersonating && impersonatedClienteStr) {
        // Usar dados do cliente impersonado
        try {
          const impersonatedCliente = JSON.parse(impersonatedClienteStr);
          setClientId(impersonatedCliente.id.toString());
          void 0;
        } catch (error) {
          console.error('Erro ao parsear cliente impersonado:', error);
        }
      } else {
        // Buscar cliente pelo email do usuário
        const { data: clienteInfo } = await supabase
          .from('clientes_info')
          .select('id')
          .eq('email', user.email)
          .single();

        if (clienteInfo) {
          setClientId(clienteInfo.id.toString());
        }
      }
    } catch (error) {
      console.error('Erro ao buscar ID do cliente:', error);
    }
  }, [user]);

  const startSimulation = useCallback(async () => {
    if (!selectedChatbot || !clientId) {
      toast.error('Selecione um chatbot e verifique se o cliente está configurado');
      return;
    }

    try {
      setIsLoading(true);
      const conversationId = await ChatbotSimulationService.startSimulation(
        clientId,
        selectedChatbot.id
      );
      
      setCurrentConversationId(conversationId);
      setSimulationStarted(true);
      
      // Carregar histórico de conversa se existir
      const history = await ChatbotSimulationService.getConversationHistory(
        clientId,
        selectedChatbot.id
      );

      if (history.length > 0) {
        const historyMessages: Message[] = history.map((msg, index) => ({
          id: `history_${index}`,
          text: msg.mensagem,
          isUser: msg.from_me,
          timestamp: new Date(`${msg.data_mensagem} ${msg.hora_mensagem}`),
        }));
        setMessages(historyMessages);
      } else {
        // Mensagem de boas-vindas
        setMessages([{
          id: 'welcome',
          text: `Olá! Sou o chatbot "${selectedChatbot.nome}". Como posso ajudar você hoje?`,
          isUser: false,
          timestamp: new Date(),
        }]);
      }

    } catch (error) {
      console.error('Erro ao iniciar simulação:', error);
      toast.error('Erro ao iniciar simulação');
    } finally {
      setIsLoading(false);
    }
  }, [selectedChatbot, clientId]);

  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim() || isLoading || !selectedChatbot || !simulationStarted || !currentConversationId || !clientId) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: message.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const messageText = message.trim();
    setInputMessage('');
    setIsLoading(true);

    try {
      // Salvar mensagem do usuário
      const now = new Date();
      await ChatbotSimulationService.saveMessage({
        id_conversa: currentConversationId,
        id_cliente: clientId,
        id_prompt_oficial: selectedChatbot.id,
        data_mensagem: now.toISOString().split('T')[0],
        hora_mensagem: now.toTimeString().split(' ')[0],
        mensagem: messageText,
        from_me: true,
      });

      // Enviar para webhook e obter resposta
      const botResponse = await ChatbotSimulationService.sendMessageToWebhook(
        clientId,
        currentConversationId,
        selectedChatbot.id,
        messageText
      );

      // Salvar resposta do bot
      await ChatbotSimulationService.saveMessage({
        id_conversa: currentConversationId,
        id_cliente: clientId,
        id_prompt_oficial: selectedChatbot.id,
        data_mensagem: now.toISOString().split('T')[0],
        hora_mensagem: now.toTimeString().split(' ')[0],
        mensagem: botResponse,
        from_me: false,
      });

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: botResponse,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      toast.error('Erro ao enviar mensagem');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, selectedChatbot, simulationStarted, currentConversationId, clientId]);

  const selectChatbot = useCallback((chatbot: ChatbotPrompt) => {
    setSelectedChatbot(chatbot);
    setSimulationStarted(false);
    setMessages([]);
  }, []);

  const resetSimulation = useCallback(() => {
    setMessages([]);
    setInputMessage('');
    setSelectedChatbot(null);
    setIsLoading(false);
    setSimulationStarted(false);
    setCurrentConversationId(null);
  }, []);

  return {
    messages,
    inputMessage,
    setInputMessage,
    isLoading,
    selectedChatbot,
    availableChatbots,
    simulationStarted,
    clientId,
    fetchChatbots,
    fetchClientId,
    startSimulation,
    sendMessage,
    selectChatbot,
    resetSimulation,
  };
} 