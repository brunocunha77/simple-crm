import React, { memo } from 'react';
import { AudioPlayer } from '@/components/AudioPlayer';
import { AudioPlayerSimples } from '@/components/AudioPlayerSimples';
import { AudioPlayerAdvanced } from '@/components/AudioPlayerAdvanced';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Message {
  id: string;
  mensagem: string;
  tipo_mensagem: string;
  is_from_me: boolean;
  timestamp: string;
  created_at: string;
  arquivo_url?: string;
  arquivo_nome?: string;
}

interface MessageBubbleProps {
  message: Message;
  isFromMe: boolean;
}

export const MessageBubble = memo<MessageBubbleProps>(({ message, isFromMe }) => {
  const formatTime = (timestamp: string) => {
    return format(new Date(timestamp), 'HH:mm', { locale: ptBR });
  };

  const renderMessageContent = () => {
    switch (message.tipo_mensagem) {
      case 'audio':
        return (
          <div className="w-full max-w-xs">
            <AudioPlayer 
              audioUrl={message.arquivo_url || ''} 
              fileName={message.arquivo_nome || 'Áudio'} 
            />
          </div>
        );
      
      case 'image':
        return (
          <div className="max-w-xs">
            <img 
              src={message.arquivo_url} 
              alt="Imagem" 
              className="rounded-lg max-w-full h-auto"
            />
          </div>
        );
      
      case 'video':
        return (
          <div className="max-w-xs">
            <video 
              src={message.arquivo_url} 
              controls 
              className="rounded-lg max-w-full h-auto"
            >
              Seu navegador não suporta vídeos.
            </video>
          </div>
        );
      
      case 'document':
        return (
          <div className="flex items-center space-x-2 p-2 bg-gray-100 rounded-lg">
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-sm text-gray-700 truncate">
              {message.arquivo_nome || 'Documento'}
            </span>
            <a 
              href={message.arquivo_url} 
              download 
              className="text-blue-500 hover:text-blue-700"
            >
              Download
            </a>
          </div>
        );
      
      default:
        return (
          <p className="text-sm whitespace-pre-wrap break-words">
            {message.mensagem}
          </p>
        );
    }
  };

  return (
    <div className={`flex ${isFromMe ? 'justify-end' : 'justify-start'} mb-2`}>
      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
        isFromMe 
          ? 'bg-blue-500 text-white' 
          : 'bg-gray-200 text-gray-800'
      }`}>
        {renderMessageContent()}
        
        <div className={`text-xs mt-1 ${
          isFromMe ? 'text-blue-100' : 'text-gray-500'
        }`}>
          {formatTime(message.timestamp || message.created_at)}
        </div>
      </div>
    </div>
  );
});

MessageBubble.displayName = 'MessageBubble';

