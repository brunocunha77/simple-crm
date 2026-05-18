import React, { memo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bot, User, CheckCircle, XCircle } from "lucide-react";

interface Contact {
  id: string;
  name: string;
  lastMessage: string;
  lastMessageTime: string;
  avatar?: string;
  telefone_id: string;
  atendimento_ia?: boolean;
  atendimento_humano?: boolean;
  status_conversa?: string | null;
  lastMessageType?: 'texto' | 'audio' | 'imagem' | 'video' | 'documento' | 'documento pdf' | 'documento doc' | 'documento docx' | 'documento xls' | 'documento xlsx' | 'documento ppt' | 'documento pptx' | 'documento txt' | null;
  instance_id?: string;
}

interface ContactListProps {
  contacts: Contact[];
  selectedContact: string | null;
  onSelectContact: (contactId: string) => void;
  getStatusColor: (status: string | null) => { bgColor: string; textColor: string; label: string };
}

const ContactItem = memo<{
  contact: Contact;
  isSelected: boolean;
  onSelect: (contactId: string) => void;
  getStatusColor: (status: string | null) => { bgColor: string; textColor: string; label: string };
}>(({ contact, isSelected, onSelect, getStatusColor }) => {
  const formatTime = (timeString: string) => {
    try {
      const date = new Date(timeString);
      if (isToday(date)) {
        return format(date, 'HH:mm', { locale: ptBR });
      } else if (isYesterday(date)) {
        return 'Ontem';
      } else {
        return format(date, 'dd/MM', { locale: ptBR });
      }
    } catch {
      return '';
    }
  };

  const statusInfo = getStatusColor(contact.status_conversa);

  return (
    <div
      className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 transition-colors ${
        isSelected ? 'bg-blue-50 border-r-2 border-blue-500' : ''
      }`}
      onClick={() => onSelect(contact.id)}
    >
      <Avatar className="h-10 w-10">
        <AvatarImage src={contact.avatar} />
        <AvatarFallback>{contact.name.charAt(0).toUpperCase()}</AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-900 truncate">{contact.name}</h3>
          <span className="text-xs text-gray-500">{formatTime(contact.lastMessageTime)}</span>
        </div>
        
        <div className="flex items-center gap-2 mt-1">
          {contact.lastMessage && (
            <p className="text-sm text-gray-600 truncate flex-1">
              {contact.lastMessage}
            </p>
          )}
          
          <div className="flex items-center gap-1">
            {contact.atendimento_ia && <Bot className="h-3 w-3 text-blue-500" />}
            {contact.atendimento_humano && <User className="h-3 w-3 text-green-500" />}
          </div>
        </div>
        
        {contact.status_conversa && (
          <Badge 
            className={`mt-1 text-xs ${statusInfo.bgColor} ${statusInfo.textColor}`}
            variant="secondary"
          >
            {statusInfo.label}
          </Badge>
        )}
      </div>
    </div>
  );
});

ContactItem.displayName = 'ContactItem';

export const ContactList = memo<ContactListProps>(({
  contacts,
  selectedContact,
  onSelectContact,
  getStatusColor
}) => {
  return (
    <div className="flex flex-col divide-y divide-gray-200">
      {contacts.map((contact) => (
        <ContactItem
          key={contact.id}
          contact={contact}
          isSelected={selectedContact === contact.id}
          onSelect={onSelectContact}
          getStatusColor={getStatusColor}
        />
      ))}
    </div>
  );
});

ContactList.displayName = 'ContactList';
