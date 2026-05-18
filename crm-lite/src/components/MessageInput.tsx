import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Mic, Paperclip, Send } from "lucide-react";

interface MessageInputProps {
  onSendMessage: () => void;
  isSending: boolean;
  onStartRecording: () => void;
  onShowImageUploader: () => void;
  onShowVideoUploader: () => void;
  onShowDocumentUploader: () => void;
  selectedContact: string | null;
}

export const MessageInput = React.memo<MessageInputProps>(({
  onSendMessage,
  isSending,
  onStartRecording,
  onShowImageUploader,
  onShowVideoUploader,
  onShowDocumentUploader,
  selectedContact
}) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Handler otimizado para mudança de mensagem
  const handleMessageChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
  }, []);

  // Handler otimizado para envio de mensagem
  const handleMessageKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, []);

  // Handler otimizado para envio
  const handleSend = useCallback(() => {
    if (message.trim() && selectedContact && !isSending) {
      onSendMessage();
      setMessage('');
    }
  }, [message, selectedContact, isSending, onSendMessage]);

  // Auto-resize do textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px';
    }
  }, [message]);

  return (
    <div className="flex items-end gap-2 p-3 border-t bg-white">
      <Textarea
        ref={textareaRef}
        id="mensagem-input"
        placeholder="Digite sua mensagem..."
        value={message}
        onChange={handleMessageChange}
        onKeyDown={handleMessageKeyDown}
        className="flex-1 min-h-[40px] max-h-40 resize-none border-none bg-transparent focus:ring-0 focus:outline-none text-base"
        autoComplete="off"
        spellCheck={false}
        disabled={isSending}
        rows={1}
      />
      
      <Button 
        variant="ghost" 
        size="icon"
        onClick={onStartRecording}
        className="text-gray-600 hover:text-blue-600"
      >
        <Mic className="h-4 w-4" />
      </Button>
      
      <Button 
        variant="ghost" 
        size="icon"
        onClick={onShowImageUploader}
        className="text-gray-600 hover:text-blue-600"
      >
        <Paperclip className="h-4 w-4" />
      </Button>
      
      <Button 
        variant="ghost" 
        size="icon"
        onClick={onShowVideoUploader}
        className="text-gray-600 hover:text-green-600"
      >
        <span role="img" aria-label="Vídeo">🎬</span>
      </Button>
      
      <Button 
        variant="ghost" 
        size="icon"
        onClick={onShowDocumentUploader}
        className="text-gray-600 hover:text-purple-600"
      >
        <span role="img" aria-label="Documento">📄</span>
      </Button>
      
      <Button 
        onClick={handleSend} 
        disabled={isSending || !message.trim() || !selectedContact}
      >
        <Send className="h-4 w-4 mr-2" />
        {isSending ? 'Enviando...' : 'Enviar'}
      </Button>
    </div>
  );
});

MessageInput.displayName = 'MessageInput';
