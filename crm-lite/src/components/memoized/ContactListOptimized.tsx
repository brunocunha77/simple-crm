import React, { memo, useMemo, useCallback } from 'react';
import { Contact } from '@/types/global';

interface ContactListOptimizedProps {
  contacts: Contact[];
  selectedContactId?: string;
  onContactSelect: (contact: Contact) => void;
  searchTerm?: string;
  className?: string;
}

export const ContactListOptimized = memo<ContactListOptimizedProps>(({
  contacts,
  selectedContactId,
  onContactSelect,
  searchTerm = '',
  className = ''
}) => {
  // Memoizar contatos filtrados para evitar recálculo desnecessário
  const filteredContacts = useMemo(() => {
    if (!searchTerm.trim()) return contacts;
    
    const term = searchTerm.toLowerCase();
    return contacts.filter(contact => 
      contact.name?.toLowerCase().includes(term) ||
      contact.phone?.includes(term) ||
      contact.email?.toLowerCase().includes(term)
    );
  }, [contacts, searchTerm]);

  // Memoizar callback para evitar re-renders desnecessários
  const handleContactClick = useCallback((contact: Contact) => {
    onContactSelect(contact);
  }, [onContactSelect]);

  // Memoizar renderização de cada contato
  const ContactItem = memo<{ contact: Contact; isSelected: boolean; onClick: () => void }>(({
    contact,
    isSelected,
    onClick
  }) => (
    <div
      className={`p-3 cursor-pointer border-b hover:bg-gray-50 transition-colors ${
        isSelected ? 'bg-blue-50 border-blue-200' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
          <span className="text-gray-600 font-medium">
            {contact.name?.charAt(0)?.toUpperCase() || '?'}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {contact.name || 'Sem nome'}
          </p>
          <p className="text-sm text-gray-500 truncate">
            {contact.phone || contact.email || 'Sem contato'}
          </p>
        </div>
      </div>
    </div>
  ));

  return (
    <div className={`bg-white border-r border-gray-200 ${className}`}>
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Contatos</h3>
        <p className="text-sm text-gray-500">
          {filteredContacts.length} contato(s) encontrado(s)
        </p>
      </div>
      
      <div className="overflow-y-auto max-h-96">
        {filteredContacts.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            {searchTerm ? 'Nenhum contato encontrado' : 'Nenhum contato disponível'}
          </div>
        ) : (
          filteredContacts.map((contact) => (
            <ContactItem
              key={contact.id}
              contact={contact}
              isSelected={contact.id === selectedContactId}
              onClick={() => handleContactClick(contact)}
            />
          ))
        )}
      </div>
    </div>
  );
});

ContactListOptimized.displayName = 'ContactListOptimized';
