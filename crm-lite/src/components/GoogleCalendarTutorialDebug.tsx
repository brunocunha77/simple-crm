import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, X } from "lucide-react";

export default function GoogleCalendarTutorialDebug() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Debug do Tutorial</h2>
      
      <Button onClick={() => setIsOpen(true)}>
        Abrir Tutorial (Debug)
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Tutorial Debug - Funcionando!</DialogTitle>
            <DialogDescription>
              Se você está vendo isso, o Dialog está funcionando
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-6 text-center">
            <Calendar className="h-16 w-16 mx-auto text-primary mb-4" />
            <h3 className="text-lg font-medium mb-2">
              Tutorial da Agenda Google Calendar
            </h3>
            <p className="text-muted-foreground mb-4">
              Este é um teste para verificar se o Dialog está funcionando
            </p>
            
            <div className="space-y-3 text-left max-w-md mx-auto">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-primary text-sm font-medium">
                  1
                </div>
                <p className="text-sm">Acesse Google Calendar</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-primary text-sm font-medium">
                  2
                </div>
                <p className="text-sm">Crie uma nova agenda</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-primary text-sm font-medium">
                  3
                </div>
                <p className="text-sm">Copie o ID da agenda</p>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end">
            <Button onClick={() => setIsOpen(false)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
