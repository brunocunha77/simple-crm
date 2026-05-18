import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Play, ArrowRight, CheckCircle } from "lucide-react";
import GoogleCalendarTutorialButton from "./GoogleCalendarTutorialButton";

export default function GoogleCalendarTutorialFlow() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Fluxo Completo da Configuração</h1>
        <p className="text-muted-foreground">
          Veja como funciona o processo completo de configuração da agenda
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Passo 1: Tutorial */}
        <Card className="border-2 border-primary/20">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-3">
              <div className="p-3 bg-primary/10 rounded-full text-primary">
                <Play className="h-8 w-8" />
              </div>
            </div>
            <CardTitle className="text-lg">1. Tutorial Interativo</CardTitle>
            <CardDescription>
              Guia passo a passo para configurar sua agenda
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <GoogleCalendarTutorialButton className="w-full">
              Começar Tutorial
            </GoogleCalendarTutorialButton>
          </CardContent>
        </Card>

        {/* Passo 2: Seta */}
        <div className="flex items-center justify-center">
          <div className="p-4 bg-gray-100 rounded-full">
            <ArrowRight className="h-8 w-8 text-gray-600" />
          </div>
        </div>

        {/* Passo 3: Inserir ID */}
        <Card className="border-2 border-green-200 bg-green-50/30">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-3">
              <div className="p-3 bg-green-100 rounded-full text-green-600">
                <CheckCircle className="h-8 w-8" />
              </div>
            </div>
            <CardTitle className="text-lg">2. Inserir ID da Agenda</CardTitle>
            <CardDescription>
              Popup automático para colar o ID obtido
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="p-3 bg-white rounded-lg border border-green-200">
              <p className="text-sm text-green-700 font-medium">
                Aparece automaticamente após o tutorial
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fluxo Detalhado */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Fluxo Detalhado da Configuração
          </CardTitle>
          <CardDescription>
            Sequência completa de ações para configurar sua agenda
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                1
              </div>
              <div>
                <h4 className="font-semibold text-blue-900">Clique em "Configurar"</h4>
                <p className="text-sm text-blue-700">
                  O botão abre automaticamente o tutorial interativo com 3 passos detalhados
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-purple-50 rounded-lg">
              <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                2
              </div>
              <div>
                <h4 className="font-semibold text-purple-900">Siga o Tutorial</h4>
                <p className="text-sm text-purple-700">
                  Navegue pelos passos: criar agenda → compartilhar → obter ID
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-green-50 rounded-lg">
              <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                3
              </div>
              <div>
                <h4 className="font-semibold text-green-900">Popup para ID</h4>
                <p className="text-sm text-green-700">
                  Ao sair do tutorial, abre automaticamente o campo para inserir o ID da agenda
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-orange-50 rounded-lg">
              <div className="w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                4
              </div>
              <div>
                <h4 className="font-semibold text-orange-900">Configuração Completa</h4>
                <p className="text-sm text-orange-700">
                  Cole o ID e clique em "Salvar" para finalizar a configuração
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
