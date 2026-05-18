import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Bot, Plus, MessageSquare } from 'lucide-react';

interface ChatbotEmptyStateProps {
  onCreateChatbot: () => void;
}

export default function ChatbotEmptyState({ onCreateChatbot }: ChatbotEmptyStateProps) {
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="p-6 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
            <Bot className="h-8 w-8 text-muted-foreground" />
          </div>
          
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">Nenhum Chatbot Disponível</h3>
            <p className="text-sm text-muted-foreground">
              Você ainda não criou nenhum chatbot. Crie seu primeiro chatbot para começar a testar.
            </p>
          </div>
          
          <div className="flex flex-col gap-2 w-full">
            <Button onClick={onCreateChatbot} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeiro Chatbot
            </Button>
            
            <Button variant="outline" className="w-full" onClick={() => window.open('/chatbots', '_blank')}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Ir para Chatbots
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 