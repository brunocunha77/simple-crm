import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Send, 
  HelpCircle, 
  User,
  Bot
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth";

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  isTyping?: boolean;
}

interface ChatbotSimulation {
  id: number;
  nome: string;
  // descricao: string; // ❌ Campo não existe na tabela
  prompt_type_id: number;
  instance_id: string;
  status: boolean;
  em_uso: boolean;
  created_at: string;
  updated_at: string;
}

interface TutorialMessage {
  id_conversa: number;
  id_cliente: number;
  id_prompt_oficial: string;
  data_mensagem: string;
  hora_mensagem: string;
  mensagem: string;
  from_me: boolean;
  created_at?: string;
}

const Ajuda: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chatbotSimulation, setChatbotSimulation] = useState<ChatbotSimulation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const [tutorialStarted, setTutorialStarted] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    initializeChatbotSimulation();
  }, []);

  // Buscar mensagens do banco (não é mais necessário com atualização direta)
  // const fetchMessages = async () => {
  //   if (!currentConversationId || !tutorialStarted) return;
  //   
  //   try {
  //     const history = await getConversationHistory(currentConversationId);
  //     const historyMessages: Message[] = history.map((msg, index) => ({
  //       id: `history_${index}`,
  //       text: msg.mensagem,
  //       sender: msg.from_me ? 'user' : 'ai',
  //       timestamp: msg.created_at ? new Date(msg.created_at) : buildTimestamp(msg.data_mensagem, msg.hora_mensagem),
  //     }));
  //     setMessages(historyMessages);
  //   } catch (error) {
  //     console.error('Erro ao buscar mensagens:', error);
  //   }
  // };

  // useEffect para polling (não é mais necessário)
  // useEffect(() => {
  //   if (tutorialStarted) {
  //     const interval = setInterval(fetchMessages, 2000);
  //     return () => clearInterval(interval);
  //   }
  // }, [tutorialStarted, currentConversationId, chatbotSimulation]);

  // Inicializar simulação do chatbot
  const initializeChatbotSimulation = async () => {
    try {
      setIsLoading(true);
      
      // Buscar simulação existente ou criar nova
      const { data: existingSimulation } = await supabase
        .from('simulacoes_chatbot')
        .select('*')
        .eq('nome', 'Tutorial SmartCRM')
        .single();

      if (existingSimulation) {
        setChatbotSimulation(existingSimulation);
        
        // Verificar se já existe uma conversa para este cliente
        const conversationId = await generateConversationId();
        if (conversationId > 0) {
          setCurrentConversationId(conversationId);
          
          // Carregar histórico existente
          const history = await getConversationHistory(conversationId);
          if (history.length > 0) {
            setTutorialStarted(true);
            // Converter TutorialMessage para Message
            const convertedMessages = history.map(msg => ({
              id: `${msg.id_conversa}_${msg.data_mensagem}_${msg.hora_mensagem}`,
              text: msg.mensagem,
              sender: msg.from_me ? 'user' : 'ai' as 'user' | 'ai',
              timestamp: new Date(`${msg.data_mensagem}T${msg.hora_mensagem}`)
            }));
            setMessages(convertedMessages);
            void 0;
          } else {
            void 0;
          }
        }
      } else {
        await createDefaultSimulation();
      }
    } catch (error) {
      console.error('Erro ao inicializar simulação:', error);
      await createDefaultSimulation();
    } finally {
      setIsLoading(false);
    }
  };

  const createDefaultSimulation = async () => {
    try {
      const defaultSimulation: Partial<ChatbotSimulation> = {
        nome: 'Tutorial SmartCRM',
        // descricao: 'Olá! Sou o assistente virtual do SmartCRM. Como posso ajudá-lo hoje?', // ❌ Campo não existe
        prompt_type_id: 1,
        instance_id: 'tutorial-help',
        status: true,
        em_uso: false
      };

      const { data, error } = await supabase
        .from('simulacoes_chatbot')  // ✅ Tabela correta
        .insert([defaultSimulation])
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar simulação padrão:', error);
        // Usar dados padrão mesmo com erro
        setChatbotSimulation({
          id: 0,
          nome: 'Tutorial SmartCRM',
          // descricao: 'Olá! Sou o assistente virtual do SmartCRM. Como posso ajudá-lo hoje?', // ❌ Campo não existe
          prompt_type_id: 1,
          instance_id: 'tutorial-help',
          status: true,
          em_uso: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      } else {
        setChatbotSimulation(data);
      }
    } catch (error) {
      console.error('Erro ao criar simulação padrão:', error);
    }
  };

  // Função utilitária para montar timestamp ISO corretamente
  function buildTimestamp(data: string, hora: string) {
    const partes = hora.split(':');
    const h = partes[0].padStart(2, '0');
    const m = (partes[1] || '00').padStart(2, '0');
    const s = (partes[2] || '00').padStart(2, '0');
    return new Date(`${data}T${h}:${m}:${s}`);
  }

  // Gerar ID de conversa único baseado no cliente (sempre o mesmo para cada cliente)
  const generateConversationId = async (): Promise<number> => {
    if (!user?.email) return 0;

    // Buscar o id_cliente da tabela clientes_info pelo email
    const { data: clienteData, error: clienteError } = await supabase
      .from('clientes_info')
      .select('id')
      .eq('email', user.email)
      .single();

    if (clienteError || !clienteData) {
      console.error('Erro ao buscar cliente:', clienteError);
      return 0;
    }

    // Verificar se já existe uma conversa para este cliente
    const { data: existingConversation } = await supabase
      .from('tutorial_smartcrm')
      .select('id_conversa')
      .eq('id_cliente', clienteData.id)
      .limit(1)
      .single();

    if (existingConversation) {
      void 0;
      return existingConversation.id_conversa;
    }

    // Se não existir, criar novo ID
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000);
    const newId = timestamp + random;
    void 0;
    return newId;
  };

  // Iniciar tutorial
  const startTutorial = async () => {
    try {
      const conversationId = await generateConversationId();
      setCurrentConversationId(conversationId);
      setTutorialStarted(true);
      
      // Carregar histórico se existir
      const history = await getConversationHistory(conversationId);
      if (history.length > 0) {
        // Converter TutorialMessage para Message
        const convertedMessages = history.map(msg => ({
          id: `${msg.id_conversa}_${msg.data_mensagem}_${msg.hora_mensagem}`,
          text: msg.mensagem,
          sender: msg.from_me ? 'user' : 'ai' as 'user' | 'ai',
          timestamp: new Date(`${msg.data_mensagem}T${msg.hora_mensagem}`)
        }));
        setMessages(convertedMessages);
        void 0;
      } else {
        setMessages([]); // Iniciar com chat vazio
        void 0;
      }
      
      toast.success('Tutorial iniciado!');
    } catch (error) {
      console.error('Erro ao iniciar tutorial:', error);
      toast.error('Erro ao iniciar tutorial');
    }
  };

  // Salvar mensagem na tabela
  const saveMessage = async (message: string, fromMe: boolean): Promise<void> => {
    if (!currentConversationId || !chatbotSimulation || !user?.email) return;

    void 0;

    // Buscar o id_cliente da tabela clientes_info pelo email
    const { data: clienteData, error: clienteError } = await supabase
      .from('clientes_info')
      .select('id')
      .eq('email', user.email)
      .single();

    if (clienteError || !clienteData) {
      console.error('Erro ao buscar cliente:', clienteError);
      throw new Error('Cliente não encontrado');
    }

    const now = new Date();
    const tutorialMessage: Partial<TutorialMessage> = {
      id_conversa: currentConversationId,
      id_cliente: clienteData.id, // ID do cliente da tabela clientes_info
      id_prompt_oficial: "35c242a7-9017-4da0-b741-d8f978b260de", // ID fixo
      data_mensagem: now.toISOString().split('T')[0],
      hora_mensagem: now.toTimeString().split(' ')[0],
      mensagem: message,
      from_me: fromMe
    };

    void 0;

    const { error } = await supabase
      .from('tutorial_smartcrm')
      .insert([tutorialMessage]);

    if (error) {
      console.error('Erro ao salvar mensagem:', error);
      throw error;
    }

    void 0;
  };

  // Buscar histórico de conversa
  const getConversationHistory = async (conversationId: number): Promise<TutorialMessage[]> => {
    const { data, error } = await supabase
      .from('tutorial_smartcrm')
      .select('*')
      .eq('id_conversa', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Erro ao buscar histórico:', error);
      return [];
    }

    return data || [];
  };

  // Enviar mensagem para webhook
  const sendMessageToWebhook = async (message: string): Promise<void> => {
    try {
      // Buscar o id_cliente da tabela clientes_info pelo email
      const { data: clienteData, error: clienteError } = await supabase
        .from('clientes_info')
        .select('id')
        .eq('email', user?.email)
        .single();

      if (clienteError || !clienteData) {
        console.error('Erro ao buscar cliente para webhook:', clienteError);
        throw new Error('Cliente não encontrado');
      }

      const payload = {
        message: message,
        chatbot_id: chatbotSimulation?.id || 0,
        instance_id: chatbotSimulation?.instance_id || "tutorial-help",
        id_cliente: clienteData.id, // ID do cliente da tabela clientes_info
        id_conversa: currentConversationId, // ID da conversa atual
        timestamp: new Date().toISOString()
      };
      
      void 0;
      
      const response = await fetch('https://webhook.dev.usesmartcrm.com/webhook/help', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      void 0;
      // Não retornamos mais a resposta da IA
      
    } catch (error) {
      console.error('Erro ao enviar mensagem para webhook:', error);
      // Em caso de erro, apenas logar - não afeta o fluxo
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !chatbotSimulation || !tutorialStarted) {
      if (!tutorialStarted) {
        toast.error('Inicie o tutorial primeiro!');
      }
      return;
    }

    const userMessage = inputMessage.trim();
    setInputMessage('');
    
    void 0;
    
    // Mostrar indicador de digitação
    setIsTyping(true);

    try {
      // Salvar APENAS mensagem do usuário no banco
      void 0;
      await saveMessage(userMessage, true);
      void 0;

      // Adicionar mensagem do usuário à interface imediatamente
      const userMessageObj: Message = {
        id: `${Date.now()}_user`,
        text: userMessage,
        sender: 'user',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, userMessageObj]);
      void 0;

      // Enviar para webhook (sem mostrar resposta na interface)
      void 0;
      await sendMessageToWebhook(userMessage);
      void 0;

      // ❌ RESPOSTA DA IA NUNCA É MOSTRADA NA INTERFACE
      void 0;

    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      toast.error('Erro ao enviar mensagem');
    } finally {
      setIsTyping(false);
      void 0;
    }
  };

  // Função para buscar mensagens atualizadas do banco
  const fetchLatestMessages = async () => {
    if (!currentConversationId || !tutorialStarted) return;
    
    try {
      const history = await getConversationHistory(currentConversationId);
      if (history.length > 0) {
        // Converter TutorialMessage para Message
        const convertedMessages = history.map(msg => ({
          id: `${msg.id_conversa}_${msg.data_mensagem}_${msg.hora_mensagem}`,
          text: msg.mensagem,
          sender: msg.from_me ? 'user' : 'ai' as 'user' | 'ai',
          timestamp: new Date(`${msg.data_mensagem}T${msg.hora_mensagem}`)
        }));
        setMessages(convertedMessages);
        void 0;
      }
    } catch (error) {
      console.error('Erro ao buscar mensagens atualizadas:', error);
    }
  };

  // Atualizar mensagens automaticamente a cada 3 segundos
  useEffect(() => {
    if (tutorialStarted && currentConversationId) {
      const interval = setInterval(fetchLatestMessages, 3000);
      return () => clearInterval(interval);
    }
  }, [tutorialStarted, currentConversationId]);

  // Scroll automático para a última mensagem
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  const generateSmartResponse = (message: string): string => {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('chatbot') || lowerMessage.includes('bot')) {
      return 'Para criar um chatbot, acesse a aba "Chatbots" no menu lateral. Lá você pode escolher entre diferentes tipos e configurar conforme suas necessidades.';
    }
    
    if (lowerMessage.includes('contato') || lowerMessage.includes('lead')) {
      return 'Para gerenciar contatos, use a aba "Contatos". Você pode adicionar, editar e organizar seus leads de forma eficiente.';
    }
    
    if (lowerMessage.includes('conversa') || lowerMessage.includes('mensagem')) {
      return 'As conversas ficam na aba "Conversas". Lá você pode visualizar todo o histórico de comunicação com seus contatos.';
    }
    
    if (lowerMessage.includes('departamento') || lowerMessage.includes('setor')) {
      return 'Para configurar departamentos, acesse "Departamentos" no menu. Isso ajuda a organizar melhor o atendimento.';
    }
    
    if (lowerMessage.includes('etiqueta') || lowerMessage.includes('tag')) {
      return 'As etiquetas estão na aba "Etiquetas". Use-as para categorizar e organizar seus contatos e conversas.';
    }
    
    if (lowerMessage.includes('disparo') || lowerMessage.includes('envio')) {
      return 'Para envios em massa, use "Disparo em Massa" ou "Grupos de Disparo". Configure grupos e envie mensagens para múltiplos contatos.';
    }
    
    if (lowerMessage.includes('configuração') || lowerMessage.includes('configurar')) {
      return 'As configurações estão em "Configurações" no menu. Lá você pode ajustar preferências da conta e gerenciar usuários.';
    }
    
    if (lowerMessage.includes('problema') || lowerMessage.includes('erro') || lowerMessage.includes('bug')) {
      return 'Entendo que você está enfrentando um problema. Vou conectar você com um agente especializado para resolver isso rapidamente.';
    }
    
    if (lowerMessage.includes('ajuda') || lowerMessage.includes('suporte')) {
      return 'Estou aqui para ajudar! Você pode me perguntar sobre qualquer funcionalidade do SmartCRM, como chatbots, contatos, conversas, departamentos, etiquetas, disparos em massa e configurações.';
    }
    
    return 'Obrigado pela sua mensagem! Sou o assistente virtual do SmartCRM e estou aqui para ajudá-lo com qualquer dúvida sobre a plataforma. Como posso ser útil hoje?';
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-primary-800 dark:text-primary-100 mb-2">
            Central de Ajuda
          </h1>
          <p className="text-muted-foreground">
            Estamos aqui para ajudar! Tire suas dúvidas sobre o SmartCRM.
          </p>
        </div>
        
        <Card className="h-[600px] flex items-center justify-center">
          <div className="text-center">
            <Bot className="h-12 w-12 mx-auto mb-4 text-primary-600 animate-pulse" />
            <p className="text-muted-foreground">Inicializando assistente virtual...</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card className="h-[calc(100vh-120px)] flex flex-col">
        {/* Header do Chat */}
        <CardHeader className="border-b bg-muted/50">
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Assistente Virtual SmartCRM
          </CardTitle>
        </CardHeader>

        {/* Área de Mensagens com Scroll */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full p-4">
            <div className="space-y-4 min-h-full">
              {!tutorialStarted ? (
                // Estado inicial
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <Bot className="h-16 w-16 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">
                    Clique em 'Iniciar Tutorial' para começar
                  </p>
                  <Button 
                    onClick={startTutorial} 
                    className="mt-4"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Carregando...' : 'Iniciar Tutorial'}
                  </Button>
                </div>
              ) : (
                // Chat ativo
                <>
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-4 py-2 ${
                          message.sender === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <p className="text-sm">{message.text}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {formatTime(message.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                  
                  {/* Indicador de digitação */}
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-lg px-4 py-2">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Input de Mensagem */}
        {tutorialStarted && (
          <div className="border-t p-4 bg-muted/50">
            <div className="flex gap-2">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Digite sua mensagem..."
                disabled={isTyping}
                className="flex-1"
              />
              <Button 
                onClick={handleSendMessage} 
                disabled={!inputMessage.trim() || isTyping}
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Ajuda;
