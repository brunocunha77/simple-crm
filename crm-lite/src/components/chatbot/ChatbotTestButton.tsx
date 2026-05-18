import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquare, X } from 'lucide-react';
import ChatbotTester from './ChatbotTester';

export default function ChatbotTestButton() {
  const [isTesterOpen, setIsTesterOpen] = useState(false);

  return (
    <>
      {/* Botão flutuante */}
      <Button
        onClick={() => setIsTesterOpen(true)}
        className="fixed bottom-4 right-4 z-40 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 bg-primary hover:bg-primary/90"
        size="lg"
      >
        <MessageSquare className="h-6 w-6" />
      </Button>

      {/* Componente de teste */}
      <ChatbotTester 
        isOpen={isTesterOpen} 
        onClose={() => setIsTesterOpen(false)} 
      />
    </>
  );
} 