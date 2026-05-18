import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Play, Calendar, AlertTriangle } from "lucide-react";
import GoogleCalendarTutorial from "./GoogleCalendarTutorial";

export default function GoogleCalendarTutorialTestDirect() {
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);

  void 0;

  const handleOpenTutorial = () => {
    void 0;
    setIsTutorialOpen(true);
  };

  const handleCloseTutorial = () => {
    void 0;
    setIsTutorialOpen(false);
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-3">
            <div className="p-3 bg-primary/10 rounded-full text-primary">
              <Calendar className="h-8 w-8" />
            </div>
          </div>
          <CardTitle>Teste Direto do Tutorial</CardTitle>
          <CardDescription>
            Teste o tutorial independentemente do botão principal
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Botão para abrir tutorial */}
          <Button 
            onClick={handleOpenTutorial}
            className="w-full flex items-center gap-2"
          >
            <Play className="h-4 w-4" />
            Abrir Tutorial Direto
          </Button>

          {/* Status do tutorial */}
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <span>
                Status: {isTutorialOpen ? "Tutorial Aberto" : "Tutorial Fechado"}
              </span>
            </div>
          </div>

          {/* Instruções */}
          <div className="text-xs text-muted-foreground text-center">
            <p>Clique no botão acima para testar o tutorial.</p>
            <p>Verifique o console para mensagens de debug.</p>
          </div>
        </CardContent>
      </Card>

      {/* Tutorial renderizado diretamente */}
      {isTutorialOpen && (
        <GoogleCalendarTutorial
          isOpen={isTutorialOpen}
          onClose={handleCloseTutorial}
        />
      )}
    </div>
  );
}
