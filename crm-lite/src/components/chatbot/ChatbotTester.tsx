import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  X, 
  Send, 
  Bot, 
  User, 
  Loader2,
  ChevronUp,
  ChevronDown,
  Settings,
  Play
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import ChatbotEmptyState from './ChatbotEmptyState';
import { ChatbotSimulationService, ChatbotPrompt } from '@/services/chatbotSimulationService';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface ChatbotTesterProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatbotTester({ isOpen, onClose }: ChatbotTesterProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedChatbot, setSelectedChatbot] = useState<ChatbotPrompt | null>(null);
  const [availableChatbots, setAvailableChatbots] = useState<ChatbotPrompt[]>([]);
  const [showChatbotSelector, setShowChatbotSelector] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [simulationStarted, setSimulationStarted] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Buscar ID do cliente quando o usuário for carregado
  useEffect(() => {
    const fetchClientId = async () => {
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
    };

    fetchClientId();
  }, [user]);

  // Buscar chatbots disponíveis
  useEffect(() => {
    const fetchChatbots = async () => {
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
              toast.error('Erro ao carregar chatbots');
              return;
            }
            
            void 0;
            setAvailableChatbots(chatbotsData || []);
          } catch (error) {
            console.error('Erro ao parsear cliente impersonado:', error);
            toast.error('Erro ao carregar chatbots');
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
    };

    if (isOpen) {
      fetchChatbots();
    }
  }, [user, isOpen]);

  // Função utilitária para montar timestamp ISO corretamente
  function buildTimestamp(data: string, hora: string) {
    // Garante que hora esteja no formato hh:mm:ss
    const partes = hora.split(':');
    const h = partes[0].padStart(2, '0');
    const m = (partes[1] || '00').padStart(2, '0');
    const s = (partes[2] || '00').padStart(2, '0');
    return new Date(`${data}T${h}:${m}:${s}`);
  }

  // Polling para buscar novas mensagens enquanto a simulação estiver ativa
  useEffect(() => {
    if (!simulationStarted || !clientId || !selectedChatbot) return;
    let polling: NodeJS.Timeout;
    let isUnmounted = false;

    const fetchMessages = async () => {
      try {
        const history = await ChatbotSimulationService.getConversationHistory(
          clientId,
          selectedChatbot.id
        );
        if (!isUnmounted) {
          const historyMessages: Message[] = history
            .map((msg, index) => {
              let timestamp: Date;
              if (msg.created_at) {
                timestamp = new Date(msg.created_at);
                timestamp = new Date(timestamp.getTime() + 3 * 60 * 60 * 1000); // Adiciona 3 horas
              } else {
                timestamp = buildTimestamp(msg.data_mensagem, msg.hora_mensagem);
              }
              return {
                id: `history_${index}`,
                text: msg.mensagem,
                isUser: msg.from_me,
                timestamp,
              };
            });
          
          setMessages(historyMessages);
        }
      } catch (error) {
        // Silenciar erro de polling
      }
    };

    polling = setInterval(fetchMessages, 2000);
    fetchMessages(); // Busca inicial

    return () => {
      isUnmounted = true;
      clearInterval(polling);
    };
  }, [simulationStarted, clientId, selectedChatbot]);

  // Reset do chat quando fechar
  useEffect(() => {
    if (!isOpen) {
      resetChat();
    }
  }, [isOpen]);

  const resetChat = () => {
    setMessages([]);
    setInputMessage('');
    setSelectedChatbot(null);
    setIsLoading(false);
    setSimulationStarted(false);
    setCurrentConversationId(null);
  };

  const handleStartSimulation = async () => {
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
          timestamp: msg.created_at ? new Date(msg.created_at) : buildTimestamp(msg.data_mensagem, msg.hora_mensagem),
        }));
        setMessages(historyMessages);
      } else {
        setMessages([]);
      }


    } catch (error) {
      console.error('Erro ao iniciar simulação:', error);
      toast.error('Erro ao iniciar simulação');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading || !selectedChatbot || !simulationStarted || !currentConversationId || !clientId) {
      void 0;
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputMessage.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    // Remover este trecho:
    // setMessages(prev => [...prev, userMessage]);
    // O chat só deve exibir mensagens vindas do banco via polling.
    const messageText = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);

    try {
      // Salvar mensagem do usuário
      const now = new Date();
      void 0;
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
      await ChatbotSimulationService.sendMessageToWebhook(
        clientId,
        currentConversationId,
        selectedChatbot.id,
        messageText
      );

      // Não adicionar mensagem da IA aqui! O polling vai buscar do banco.

    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      toast.error('Erro ao enviar mensagem');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSelectChatbot = (chatbot: ChatbotPrompt) => {
    setSelectedChatbot(chatbot);
    setShowChatbotSelector(false);
    setSimulationStarted(false);
    setMessages([]);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Chat flutuante */}
      <div className="fixed bottom-4 right-4 z-50">
        <Card className={`w-80 shadow-lg transition-all duration-300 ${
          isMinimized ? 'h-16' : 'h-[500px]'
        }`}>
          <CardHeader className="pb-2 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                <CardTitle className="text-sm">
                  {selectedChatbot ? `Teste: ${selectedChatbot.nome}` : 'Teste de Chatbot'}
                </CardTitle>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMinimized(!isMinimized)}
                >
                  {isMinimized ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>

          {!isMinimized && (
            <CardContent className="p-0 flex flex-col flex-1 overflow-hidden">
              {!selectedChatbot ? (
                // Seletor de chatbot
                <div className="p-4 overflow-y-auto flex-1">
                  <div className="text-center mb-4">
                    <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                    <h3 className="font-semibold mb-2">Selecione um Chatbot</h3>
                    <p className="text-sm text-muted-foreground">
                      Escolha um chatbot para testar
                    </p>
                  </div>
                  
                  {availableChatbots.length === 0 ? (
                    <ChatbotEmptyState 
                      onCreateChatbot={() => window.open('/chatbots', '_blank')}
                    />
                  ) : (
                    <div className="space-y-2">
                      {availableChatbots.map((chatbot) => (
                        <Button
                          key={chatbot.id}
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => handleSelectChatbot(chatbot)}
                        >
                          <Bot className="h-4 w-4 mr-2" />
                          {chatbot.nome}
                          <Badge variant="secondary" className="ml-auto">
                            IA
                          </Badge>
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              ) : !simulationStarted ? (
                // Tela de início de simulação
                <div className="p-4 flex flex-col items-center justify-center h-full">
                  <div className="text-center space-y-4">
                    <Bot className="h-16 w-16 text-primary mx-auto" />
                    <div>
                      <h3 className="font-semibold text-lg mb-2">
                        {selectedChatbot.nome}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Clique em "Iniciar Simulação" para começar a testar este chatbot
                      </p>
                    </div>
                    <Button 
                      onClick={handleStartSimulation}
                      disabled={isLoading}
                      className="w-full"
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4 mr-2" />
                      )}
                      Iniciar Simulação
                    </Button>
                  </div>
                </div>
              ) : (
                // Interface do chat
                <div className="flex flex-col h-full">
                  {/* Header do chat */}
                  <div className="flex items-center justify-between p-3 border-b">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback>
                          <Bot className="h-3 w-3" />
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-sm">{selectedChatbot.nome}</span>
                      <Badge variant="outline" className="text-xs">
                        IA
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowChatbotSelector(true)}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Área de mensagens - altura fixa para scroll */}
                  <div className="overflow-hidden" style={{ height: '300px' }}>
                    <ScrollArea className="h-full">
                      <div className="p-3 space-y-3">
                        {messages.map((message) => (
                          <div
                            key={message.id}
                            className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className={`flex gap-2 max-w-[80%] ${message.isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                              <Avatar className="h-6 w-6">
                                <AvatarFallback>
                                  {message.isUser ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
                                </AvatarFallback>
                              </Avatar>
                              <div className={`rounded-lg px-3 py-2 text-sm ${
                                message.isUser 
                                  ? 'bg-primary text-primary-foreground' 
                                  : 'bg-muted'
                              }`}>
                                <p>{message.text}</p>
                                <p className={`text-xs mt-1 ${
                                  message.isUser ? 'text-primary-foreground/70' : 'text-muted-foreground'
                                }`}>
                                  {formatTime(message.timestamp)}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                        {/* IA está digitando... */}
                        {isLoading && simulationStarted && (
                          <div className="flex justify-start">
                            <div className="flex gap-2 max-w-[80%] flex-row">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback>
                                  <Bot className="h-3 w-3" />
                                </AvatarFallback>
                              </Avatar>
                              <div className="rounded-lg px-3 py-2 text-sm bg-muted flex items-center gap-2">
                                <span className="animate-pulse">IA está digitando...</span>
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                              </div>
                            </div>
                          </div>
                        )}
                        {isLoading && (
                          <div className="flex justify-start">
                            <div className="flex gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback>
                                  <Bot className="h-3 w-3" />
                                </AvatarFallback>
                              </Avatar>
                              <div className="bg-muted rounded-lg px-3 py-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                              </div>
                            </div>
                          </div>
                        )}
                        <div ref={messagesEndRef} />
                      </div>
                    </ScrollArea>
                  </div>

                {/* Input de mensagem */}
                <div className="p-3 border-t">
                  <div className="flex gap-2">
                    <Input
                      ref={inputRef}
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Digite sua mensagem..."
                      disabled={isLoading}
                      className="flex-1"
                    />
                    <Button
                      size="sm"
                      onClick={handleSendMessage}
                      disabled={!inputMessage.trim() || isLoading}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>

    {/* Dialog para trocar de chatbot */}
    <Dialog open={showChatbotSelector} onOpenChange={setShowChatbotSelector}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Trocar Chatbot</DialogTitle>
          <DialogDescription>
            Selecione um chatbot diferente para testar
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {availableChatbots.map((chatbot) => (
            <Button
              key={chatbot.id}
              variant="outline"
              className="w-full justify-start"
              onClick={() => handleSelectChatbot(chatbot)}
            >
              <Bot className="h-4 w-4 mr-2" />
              {chatbot.nome}
              <Badge variant="secondary" className="ml-auto">
                IA
              </Badge>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  </>
);
}