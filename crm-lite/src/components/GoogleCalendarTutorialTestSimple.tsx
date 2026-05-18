import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function GoogleCalendarTutorialTestSimple() {
  const [isOpen, setIsOpen] = useState(false);

  void 0;

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Teste Simples do Dialog</h2>
      
      <Button onClick={() => {
        void 0;
        setIsOpen(true);
      }}>
        Abrir Dialog de Teste
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Teste do Dialog</DialogTitle>
            <DialogDescription>
              Se você está vendo isso, o Dialog está funcionando!
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <p>Este é um teste simples para verificar se o Dialog está funcionando.</p>
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
