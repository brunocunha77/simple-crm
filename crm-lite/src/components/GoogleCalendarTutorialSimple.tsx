import React, { useState } from "react";
import { Button } from "@/components/ui/button";

export default function GoogleCalendarTutorialSimple() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Tutorial Simples</h2>
      
      <Button onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? "Fechar" : "Abrir"} Tutorial
      </Button>

      {isOpen && (
        <div className="mt-4 p-4 border rounded-lg bg-white shadow-lg">
          <h3 className="font-bold mb-2">Tutorial da Agenda</h3>
          <ol className="list-decimal list-inside space-y-1">
            <li>Acesse Google Calendar</li>
            <li>Crie uma nova agenda</li>
            <li>Copie o ID da agenda</li>
          </ol>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-3"
            onClick={() => setIsOpen(false)}
          >
            Fechar
          </Button>
        </div>
      )}
    </div>
  );
}
