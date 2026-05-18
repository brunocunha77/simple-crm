import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Info, AlertCircle } from "lucide-react";
import GoogleCalendarTutorialButton from "./GoogleCalendarTutorialButton";

export default function GoogleCalendarTutorialExample() {
  return (
    <div className="p-6">
      <Card className="max-w-md">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>Configuração da Agenda</CardTitle>
              <CardDescription>
                Configure sua agenda do Google Calendar para integração
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Como funciona:</p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>Clique em "Configurar" para ver o tutorial</li>
                  <li>Siga os passos para configurar sua agenda</li>
                  <li>Ao sair do tutorial, insira o ID da agenda</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Botões de Configuração */}
          <div className="space-y-3">
            <GoogleCalendarTutorialButton className="w-full">
              Configurar
            </GoogleCalendarTutorialButton>
            
            <div className="text-center text-xs text-muted-foreground">
              ou
            </div>
            
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-2">
                Se o tutorial não abrir, use o botão abaixo:
              </p>
              <Button 
                variant="outline" 
                size="sm"
                className="text-xs"
                onClick={() => {
                  void 0;
                  // Aqui você pode adicionar lógica para abrir o tutorial diretamente
                }}
              >
                Teste Tutorial Direto
              </Button>
            </div>
          </div>

          {/* Status da Configuração */}
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <AlertCircle className="h-4 w-4" />
              <span>Status: Aguardando configuração</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
