import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, ArrowUp, Loader2, Sparkles, User, MessageSquare, PanelLeftClose, PanelLeft, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/lib/supabase';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface Sessao {
  id: string;
  titulo: string | null;
  created_at: string;
  updated_at: string;
}

function AssistenteAvatar() {
  return (
    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-sm">
      <Sparkles className="h-4 w-4 text-white" />
    </div>
  );
}

function UserAvatar() {
  return (
    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center shadow-sm">
      <User className="h-4 w-4 text-white" />
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-3">
      <AssistenteAvatar />
      <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
        <div className="flex gap-1 items-center h-5">
          <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  if (msg.isUser) {
    return (
      <div className="flex items-start gap-3 justify-end">
        <div className="max-w-[75%] bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
        </div>
        <UserAvatar />
      </div>
    );
  }
  return (
    <div className="flex items-start gap-3">
      <AssistenteAvatar />
      <div className="max-w-[75%] bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
        <div className="text-sm leading-relaxed text-gray-800 whitespace-pre-wrap">
          <ReactMarkdown
            components={{
              p: ({children}) => <span className="block text-sm leading-relaxed text-gray-800">{children}</span>,
              ul: ({children}) => <ul className="list-disc pl-4 text-sm leading-relaxed text-gray-800">{children}</ul>,
              ol: ({children}) => <ol className="list-decimal pl-4 text-sm leading-relaxed text-gray-800">{children}</ol>,
              li: ({children}) => <li className="text-sm leading-relaxed text-gray-800">{children}</li>,
              strong: ({children}) => <strong className="font-semibold">{children}</strong>,
              em: ({children}) => <em className="italic">{children}</em>,
              code: ({children}) => <code className="bg-gray-100 rounded px-1 text-xs font-mono">{children}</code>,
            }}
          >
            {msg.text}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

interface InputBoxProps {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onAttach: () => void;
  isLoading: boolean;
  compact?: boolean;
}

function InputBox({ value, onChange, onSend, onAttach, isLoading, compact }: InputBoxProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className={`bg-white rounded-3xl border border-gray-200 shadow-md transition-shadow focus-within:shadow-lg focus-within:border-gray-300 ${compact ? 'px-4 pt-3 pb-2' : 'px-5 pt-4 pb-3'}`}>
      <textarea
        ref={textareaRef}
        rows={1}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Atribua uma tarefa ou pergunte qualquer coisa"
        disabled={isLoading}
        className="w-full resize-none bg-transparent text-gray-800 placeholder-gray-400 text-sm leading-relaxed outline-none min-h-[24px] max-h-[160px] disabled:opacity-60"
      />
      <div className="flex items-center justify-between mt-2">
        <button
          onClick={onAttach}
          className="flex items-center justify-center w-8 h-8 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          title="Anexar arquivo"
          disabled={isLoading}
        >
          <Plus className="h-5 w-5" />
        </button>
        <button
          onClick={onSend}
          disabled={!value.trim() || isLoading}
          className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-800 text-white hover:bg-gray-700 disabled:bg-gray-200 disabled:text-gray-400 transition-colors"
          title="Enviar"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowUp className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Ontem';
  if (diffDays < 7) return `${diffDays} dias atrás`;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export default function AssistentePage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessoes, setSessoes] = useState<Sessao[]>([]);
  const [sessaoAtiva, setSessaoAtiva] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sessaoAtivaRef = useRef<string | null>(null);
  const hasMessages = messages.length > 0;

  useEffect(() => {
    sessaoAtivaRef.current = sessaoAtiva;
  }, [sessaoAtiva]);

  useEffect(() => {
    if (user?.id) carregarSessoes();
  }, [user?.id]);

  useEffect(() => {
    if (hasMessages) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  const carregarSessoes = async () => {
    const { data, error } = await supabase
      .from('assistente_sessoes')
      .select('id, titulo, created_at, updated_at')
      .order('updated_at', { ascending: false });
    if (!error && data) setSessoes(data as Sessao[]);
  };

  const carregarMensagens = async (sessaoId: string) => {
    const { data, error } = await supabase
      .from('assistente_mensagens')
      .select('id, role, content, created_at')
      .eq('sessao_id', sessaoId)
      .order('created_at', { ascending: true });
    if (error || !data) return;
    setMessages(
      data.map(m => ({
        id: m.id as string,
        text: m.content as string,
        isUser: m.role === 'user',
        timestamp: new Date(m.created_at as string),
      }))
    );
  };

  const selecionarSessao = async (sessao: Sessao) => {
    setSessaoAtiva(sessao.id);
    sessaoAtivaRef.current = sessao.id;
    setInput('');
    await carregarMensagens(sessao.id);
  };

  const novaConversa = () => {
    setSessaoAtiva(null);
    sessaoAtivaRef.current = null;
    setMessages([]);
    setInput('');
  };

  const deletarSessao = async (sessao: Sessao) => {
    if (!window.confirm('Tem certeza que deseja apagar este chat?')) return;
    await supabase.from('assistente_mensagens').delete().eq('sessao_id', sessao.id);
    const { error } = await supabase.from('assistente_sessoes').delete().eq('id', sessao.id);
    if (error) { toast.error('Erro ao apagar sessão'); return; }
    setSessoes(prev => prev.filter(s => s.id !== sessao.id));
    if (sessaoAtivaRef.current === sessao.id) novaConversa();
  };

  const gerarTitulo = async (sessaoId: string, primeiraMsg: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('gerar-titulo', {
        body: { primeira_mensagem: primeiraMsg },
      });
      if (error || !data?.titulo) return;
      const titulo = String(data.titulo).trim().slice(0, 60);
      if (!titulo) return;
      await supabase.from('assistente_sessoes').update({ titulo }).eq('id', sessaoId);
      setSessoes(prev => prev.map(s => s.id === sessaoId ? { ...s, titulo } : s));
    } catch {
      // silently fail — title is cosmetic
    }
  };

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const messageText = input.trim();
    const isFirstMessage = messages.length === 0;
    const userMsg: Message = {
      id: `${Date.now()}-user`,
      text: messageText,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // Session: get existing or create on first message
    let sessaoId = sessaoAtivaRef.current;
    if (!sessaoId && user?.id) {
      const { data } = await supabase
        .from('assistente_sessoes')
        .insert({ user_id: user.id, id_cliente: user.id_cliente ?? null })
        .select('id')
        .single();
      if (data?.id) {
        sessaoId = data.id as string;
        sessaoAtivaRef.current = sessaoId;
        setSessaoAtiva(sessaoId);
        setSessoes(prev => [{
          id: sessaoId!,
          titulo: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, ...prev]);
      }
    }

    if (sessaoId) {
      void 0;
      const { error: errUser } = await supabase
        .from('assistente_mensagens')
        .insert({ sessao_id: sessaoId, role: 'user', content: messageText });
      void 0;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const apiUrl = import.meta.env.VITE_SUPABASE_URL
        ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-assistente-inteligente`
        : '/api/chat';

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: messageText,
          history: messages.map(m => ({
            role: m.isUser ? 'user' : 'assistant',
            content: m.text,
          })),
          userEmail: user?.email,
          clienteId: user?.id_cliente,
          userName: user?.firstName ? `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}` : undefined,
        }),
      });

      if (!response.ok) throw new Error('Falha na resposta');

      const data = await response.json();
      const aiMsg: Message = {
        id: `${Date.now()}-ai`,
        text: data.response || data.message || 'Não consegui processar sua mensagem.',
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMsg]);

      if (sessaoId) {
        void 0;
        const { error: errAi } = await supabase
          .from('assistente_mensagens')
          .insert({ sessao_id: sessaoId, role: 'assistant', content: aiMsg.text });
        void 0;
        await supabase.from('assistente_sessoes').update({ updated_at: new Date().toISOString() }).eq('id', sessaoId);
        if (isFirstMessage) gerarTitulo(sessaoId, messageText);
      }
    } catch {
      toast.error('Erro ao obter resposta. Tente novamente.');
      // Remove the user message optimistically if the AI fails
      setMessages(prev => prev.filter(m => m.id !== userMsg.id));
      setInput(messageText);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, user?.email, user?.id_cliente, user?.id, user?.firstName, user?.lastName]);

  const handleAttach = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex h-full bg-[#FAF9F7]">
      {/* ── Sidebar ── */}
      {sidebarOpen && (
        <div className="w-64 flex-shrink-0 bg-white border-r border-gray-100 flex flex-col h-full">
          <div className="p-3 border-b border-gray-100 flex items-center gap-2">
            <button
              onClick={novaConversa}
              className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-sm font-medium hover:opacity-90 transition-opacity shadow-sm"
            >
              <Plus className="h-4 w-4 flex-shrink-0" />
              Novo chat
            </button>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0"
              title="Fechar painel"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-2 px-1">
            {sessoes.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-gray-400">
                Nenhuma conversa ainda
              </p>
            ) : (
              sessoes.map(sessao => (
                <div
                  key={sessao.id}
                  className={`group relative flex items-center rounded-lg mb-0.5 transition-colors ${
                    sessaoAtiva === sessao.id
                      ? 'bg-emerald-50 text-emerald-800'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <button
                    onClick={() => selecionarSessao(sessao)}
                    className="flex-1 text-left px-3 py-2.5 min-w-0"
                  >
                    <div className="flex items-start gap-2">
                      <MessageSquare className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${sessaoAtiva === sessao.id ? 'text-emerald-500' : 'text-gray-400'}`} />
                      <div className="min-w-0 pr-5">
                        <p className="text-xs font-medium truncate leading-snug">
                          {sessao.titulo || 'Novo chat'}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {formatDate(sessao.updated_at)}
                        </p>
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deletarSessao(sessao); }}
                    className="absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-gray-300 hover:text-red-400 hover:bg-red-50"
                    title="Apagar chat"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Main area ── */}
      <div className="flex flex-col flex-1 min-w-0 relative">
        {/* Hidden file input */}
        <input ref={fileInputRef} type="file" className="hidden" multiple />

        {/* Toggle button when sidebar is closed */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="absolute top-3 left-3 z-10 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-white/80 transition-colors"
            title="Abrir painel"
          >
            <PanelLeft className="h-4 w-4" />
          </button>
        )}

        {!hasMessages ? (
          /* ── Estado vazio: título centralizado + input ── */
          <div className="flex-1 flex flex-col items-center justify-center px-4 pb-8">
            <div className="mb-8 flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg">
                <Sparkles className="h-7 w-7 text-white" />
              </div>
              <h1
                className="text-4xl text-gray-800 text-center tracking-tight"
                style={{ fontFamily: "'Georgia', 'Times New Roman', serif", fontWeight: 400 }}
              >
                O que posso fazer por você?
              </h1>
              <p className="text-sm text-gray-400 text-center">
                Assistente Inteligente · Powered by IA
              </p>
            </div>

            {/* Sugestões rápidas */}
            <div className="flex flex-wrap gap-2 justify-center mb-8 max-w-xl">
              {[
                'Resuma os leads do mês',
                'Como melhorar meu funil de vendas?',
                'Crie um roteiro de follow-up',
                'Analise meu desempenho',
              ].map(suggestion => (
                <button
                  key={suggestion}
                  onClick={() => setInput(suggestion)}
                  className="px-4 py-2 rounded-full border border-gray-200 bg-white text-sm text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm"
                >
                  {suggestion}
                </button>
              ))}
            </div>

            <div className="w-full max-w-2xl">
              <InputBox
                value={input}
                onChange={setInput}
                onSend={handleSend}
                onAttach={handleAttach}
                isLoading={isLoading}
              />
            </div>
          </div>
        ) : (
          /* ── Estado com mensagens ── */
          <>
            {/* Header mínimo */}
            <div className="flex items-center gap-2 px-6 py-3 border-b border-gray-100 bg-white/70 backdrop-blur-sm">
              {!sidebarOpen && <div className="w-6" />}
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center">
                <Sparkles className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-700">Assistente Inteligente</span>
            </div>

            {/* Área de mensagens */}
            <div className="flex-1 overflow-y-auto px-4 py-6">
              <div className="max-w-2xl mx-auto space-y-5">
                {messages.map(msg => (
                  <MessageBubble key={msg.id} msg={msg} />
                ))}
                {isLoading && <TypingIndicator />}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input fixo na base */}
            <div className="px-4 pb-4 bg-[#FAF9F7]">
              <div className="max-w-2xl mx-auto">
                <InputBox
                  value={input}
                  onChange={setInput}
                  onSend={handleSend}
                  onAttach={handleAttach}
                  isLoading={isLoading}
                  compact
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
