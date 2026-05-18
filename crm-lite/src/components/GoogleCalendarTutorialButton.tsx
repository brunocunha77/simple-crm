import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Settings, Calendar, CheckCircle, Play } from "lucide-react";
import GoogleCalendarTutorial from "./GoogleCalendarTutorial";
import { clientesService } from "@/services/clientesService";
import { useAuth } from "@/contexts/auth";

interface GoogleCalendarTutorialButtonProps {
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  children?: React.ReactNode;
  onConnectionUpdate?: () => void; // Callback para atualizar status da conexão
}

export default function GoogleCalendarTutorialButton({ 
  variant = "default", 
  size = "default", 
  className = "",
  children = "Configurar Agenda",
  onConnectionUpdate
}: GoogleCalendarTutorialButtonProps) {
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [isIdInputOpen, setIsIdInputOpen] = useState(false);
  const [calendarId, setCalendarId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const handleClick = () => {
    void 0;
    setIsTutorialOpen(true);
  };

  const handleTutorialClose = () => {
    void 0;
    setIsTutorialOpen(false);
    // Abre automaticamente o popup para inserir o ID
    setIsIdInputOpen(true);
  };

  const handleSaveId = async () => {
    if (!calendarId.trim() || !user?.id) {
      alert("Por favor, insira o ID da agenda");
      return;
    }

    setIsLoading(true);
    try {
      // Salvar ID da agenda no banco de dados
      const success = await clientesService.setIdAgenda(user.id, calendarId.trim());
      
      if (success) {
        // Disparar webhook para planilha
        const webhookSuccess = await clientesService.dispararWebhookAgenda(user.id, calendarId.trim());
        
        if (webhookSuccess) {
          void 0;
        } else {
          void 0;
        }

        // Fechar popup e limpar campo
        setIsIdInputOpen(false);
        setCalendarId("");
        
        // Notificar componente pai para atualizar status
        if (onConnectionUpdate) {
          onConnectionUpdate();
        }
        
        alert(`ID da agenda salvo com sucesso: ${calendarId}`);
      } else {
        alert("Erro ao salvar ID da agenda. Tente novamente.");
      }
    } catch (error) {
      console.error('Erro ao conectar Google Agenda:', error);
      alert("Erro ao conectar Google Agenda. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelId = () => {
    setIsIdInputOpen(false);
    setCalendarId("");
  };

  void 0;

  return (
    <>
      {/* Botão Configurar */}
      <Button
        variant={variant}
        size={size}
        className={`flex items-center gap-2 w-full ${className}`}
        onClick={handleClick}
      >
        <Settings className="h-4 w-4" />
        {children}
      </Button>

      {/* Tutorial - VERIFICAR SE ESTÁ SENDO RENDERIZADO */}
      {isTutorialOpen && (
        <GoogleCalendarTutorial
          isOpen={isTutorialOpen}
          onClose={handleTutorialClose}
        />
      )}

      {/* Popup para inserir ID da agenda */}
      <Dialog open={isIdInputOpen} onOpenChange={setIsIdInputOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <div>
                <DialogTitle>Inserir ID da Agenda</DialogTitle>
                <DialogDescription>
                  Cole o ID da agenda que você obteve no tutorial
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="calendarId" className="text-sm font-medium">
                ID da Agenda Google Calendar
              </label>
              <Input
                id="calendarId"
                type="text"
                placeholder="Ex: 4565655548458f8945cfd25361e7e12312312312312312312@group.calendar.google.com"
                value={calendarId}
                onChange={(e) => setCalendarId(e.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                O ID deve terminar com @group.calendar.google.com
              </p>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={handleCancelId} disabled={isLoading}>
              Cancelar
            </Button>
            <Button onClick={handleSaveId} className="flex items-center gap-2" disabled={isLoading}>
              <CheckCircle className="h-4 w-4" />
              {isLoading ? 'Salvando...' : 'Salvar ID'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
