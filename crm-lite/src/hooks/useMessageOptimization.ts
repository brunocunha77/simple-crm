import { useState, useCallback, useRef, useEffect } from 'react';

interface UseMessageOptimizationProps {
  selectedContact: string | null;
  onSendMessage: (message: string) => void;
  isSending: boolean;
}

export const useMessageOptimization = ({
  selectedContact,
  onSendMessage,
  isSending
}: UseMessageOptimizationProps) => {
  const [message, setMessage] = useState('');
  const [draftMessage, setDraftMessage] = useState('');
  const draftTimeoutRef = useRef<NodeJS.Timeout>();
  const lastTypingTimeRef = useRef<number>(0);

  // Debounce otimizado para salvamento de rascunho
  const saveDraftDebounced = useCallback((text: string) => {
    if (draftTimeoutRef.current) {
      clearTimeout(draftTimeoutRef.current);
    }

    draftTimeoutRef.current = setTimeout(() => {
      setDraftMessage(text);
      // Aqui você pode implementar a lógica de salvamento no localStorage ou banco
      if (selectedContact && text.trim()) {
        localStorage.setItem(`draft_${selectedContact}`, text);
      }
    }, 1000); // 1 segundo de debounce
  }, [selectedContact]);

  // Handler otimizado para mudança de mensagem
  const handleMessageChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessage(value);
    
    // Debounce para salvamento de rascunho
    saveDraftDebounced(value);
    
    // Atualizar timestamp de digitação
    lastTypingTimeRef.current = Date.now();
  }, [saveDraftDebounced]);

  // Handler otimizado para envio
  const handleSend = useCallback(() => {
    if (message.trim() && selectedContact && !isSending) {
      onSendMessage(message);
      setMessage('');
      setDraftMessage('');
      
      // Limpar rascunho do localStorage
      if (selectedContact) {
        localStorage.removeItem(`draft_${selectedContact}`);
      }
    }
  }, [message, selectedContact, isSending, onSendMessage]);

  // Handler otimizado para teclas
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // Carregar rascunho quando mudar o contato selecionado
  useEffect(() => {
    if (selectedContact) {
      const savedDraft = localStorage.getItem(`draft_${selectedContact}`);
      if (savedDraft) {
        setDraftMessage(savedDraft);
        setMessage(savedDraft);
      } else {
        setDraftMessage('');
        setMessage('');
      }
    }
  }, [selectedContact]);

  // Cleanup do timeout ao desmontar
  useEffect(() => {
    return () => {
      if (draftTimeoutRef.current) {
        clearTimeout(draftTimeoutRef.current);
      }
    };
  }, []);

  // Verificar se o usuário está digitando ativamente
  const isTyping = Date.now() - lastTypingTimeRef.current < 2000; // 2 segundos

  return {
    message,
    draftMessage,
    handleMessageChange,
    handleSend,
    handleKeyDown,
    isTyping,
    clearMessage: () => setMessage('')
  };
};
