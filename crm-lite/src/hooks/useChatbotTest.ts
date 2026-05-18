import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface Chatbot {
  id: number;
  nome: string;
  type: 'ia' | 'fluxo';
  active: boolean;
}

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export function useChatbotTest() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedChatbot, setSelectedChatbot] = useState<Chatbot | null>(null);
  const [availableChatbots, setAvailableChatbots] = useState<Chatbot[]>([]);

  const fetchChatbots = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('prompts_oficial')
        .select('id, nome, type, active')
        .eq('id_usuario', user.id)
        .eq('status', true)
        .eq('active', true);

      if (error) throw error;
      
      setAvailableChatbots(data || []);
    } catch (error) {
      console.error('Erro ao buscar chatbots:', error);
      toast.error('Erro ao carregar chatbots');
    }
  }, [user]);

  const resetChat = useCallback(() => {
    setMessages([]);
    setInputMessage('');
    setSelectedChatbot(null);
    setIsLoading(false);
  }, []);

  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim() || isLoading || !selectedChatbot) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: message.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Simular resposta do chatbot (será implementado no backend)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: `Resposta do chatbot "${selectedChatbot.nome}": ${message.trim()}`,
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
  }, [isLoading, selectedChatbot]);

  const selectChatbot = useCallback((chatbot: Chatbot) => {
    setSelectedChatbot(chatbot);
    setMessages([{
      id: 'welcome',
      text: `Olá! Sou o chatbot "${chatbot.nome}". Como posso ajudar você hoje?`,
      isUser: false,
      timestamp: new Date(),
    }]);
  }, []);

  return {
    messages,
    inputMessage,
    setInputMessage,
    isLoading,
    selectedChatbot,
    availableChatbots,
    fetchChatbots,
    resetChat,
    sendMessage,
    selectChatbot,
  };
} 