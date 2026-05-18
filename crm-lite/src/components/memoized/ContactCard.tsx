import React, { memo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Contact {
  id: string;
  name: string;
  lastMessage: string;
  lastMessageTime: string;
  avatar: string;
  telefone_id: string;
  atendimento_ia: boolean;
  atendimento_humano: boolean;
  lastMessageType: string;
  instance_id: string;
  unreadCount?: number;
}

interface ContactCardProps {
  contact: Contact;
  isSelected: boolean;
  onClick: (contact: Contact) => void;
  onContextMenu?: (contact: Contact) => void;
  hasUnreadMessages: boolean;
}

export const ContactCard = memo<ContactCardProps>(({ 
  contact, 
  isSelected, 
  onClick, 
  onContextMenu, 
  hasUnreadMessages 
}) => {
  const formatLastMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    if (isToday(date)) {
      return format(date, 'HH:mm', { locale: ptBR });
    } else if (isYesterday(date)) {
      return 'Ontem';
    } else {
      return format(date, 'dd/MM', { locale: ptBR });
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div
      className={`p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 ${
        isSelected ? 'bg-blue-50 border-blue-200' : ''
      }`}
      onClick={() => onClick(contact)}
      onContextMenu={(e) => {
        e.preventDefault();
        onContextMenu?.(contact);
      }}
    >
      <div className="flex items-center space-x-3">
        <div className="relative">
          <Avatar className="h-10 w-10">
            <AvatarImage src={contact.avatar} alt={contact.name} />
            <AvatarFallback className="text-xs">
              {getInitials(contact.name)}
            </AvatarFallback>
          </Avatar>
          {hasUnreadMessages && (
            <div className="absolute -top-1 -right-1 h-4 w-4 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-xs text-white font-bold">
                {contact.unreadCount || '!'}
              </span>
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-900 truncate">
              {contact.name}
            </h4>
            <span className="text-xs text-gray-500">
              {formatLastMessageTime(contact.lastMessageTime)}
            </span>
          </div>
          
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-gray-600 truncate flex-1">
              {contact.lastMessage}
            </p>
            
            <div className="flex items-center space-x-1 ml-2">
              {contact.atendimento_ia && (
                <Badge variant="secondary" className="text-xs px-1 py-0">
                  IA
                </Badge>
              )}
              {contact.atendimento_humano && (
                <Badge variant="outline" className="text-xs px-1 py-0">
                  Humano
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

ContactCard.displayName = 'ContactCard';

