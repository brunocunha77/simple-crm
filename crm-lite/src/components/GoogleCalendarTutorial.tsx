import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Calendar, Users, Copy, X, Play, SkipForward, CheckCircle } from "lucide-react";

interface TutorialStep {
  title: string;
  description: string;
  instructions: string[];
  icon: React.ReactNode;
  imageUrl?: string;
}

const tutorialSteps: TutorialStep[] = [
  {
    title: "Criar uma nova agenda no Google Calendar",
    description: "Primeiro, vamos criar uma agenda específica para suas consultas",
    instructions: [
      "Acesse Google Calendar",
      "No menu lateral, clique no símbolo \"+\" ao lado de Outras agendas",
      "Selecione \"Criar nova agenda\"",
      "Dê um nome claro para identificar essa agenda (ex.: Agenda de Consultas)",
      "Clique em Criar agenda"
    ],
    icon: <Calendar className="h-6 w-6" />
  },
  {
    title: "Configurar o compartilhamento da agenda",
    description: "Agora vamos compartilhar a agenda com nossa equipe",
    instructions: [
      "Volte para a tela principal do Google Calendar",
      "No menu lateral, encontre a agenda criada",
      "Clique nos três pontos ao lado do nome da agenda",
      "Selecione \"Configurações e compartilhamento\"",
      "Role até \"Compartilhar com pessoas e grupos\"",
      "Adicione o email: bruno.cunha@usesmartcrm.com",
      "Defina as permissões: Fazer alterações e gerenciar compartilhamento",
      "Clique em Enviar"
    ],
    icon: <Users className="h-6 w-6" />
  },
  {
    title: "Obter o ID da agenda",
    description: "Por fim, vamos copiar o ID da agenda para a plataforma",
    instructions: [
      "Ainda dentro de Configurações e compartilhamento, role até \"Integrar agenda\"",
      "Copie o campo ID da agenda",
      "O formato será semelhante a:",
      "4565655548458f8945cfd25361e7e12312312312312312312@group.calendar.google.com",
      "Copie e cole na plataforma"
    ],
    icon: <Copy className="h-6 w-6" />
  }
];

interface GoogleCalendarTutorialProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GoogleCalendarTutorial({ isOpen, onClose }: GoogleCalendarTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isStarted, setIsStarted] = useState(false);

  void 0;

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStart = () => {
    void 0;
    setIsStarted(true);
    setCurrentStep(0);
  };

  const handleSkip = () => {
    void 0;
    onClose();
    setIsStarted(false);
    setCurrentStep(0);
  };

  const handleClose = () => {
    void 0;
    onClose();
    setIsStarted(false);
    setCurrentStep(0);
  };

  const currentStepData = tutorialSteps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === tutorialSteps.length - 1;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">
              Tutorial: Configurar Agenda Google Calendar
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription>
            Siga os passos para configurar sua agenda e obter o ID necessário
          </DialogDescription>
        </DialogHeader>

        {!isStarted ? (
          <div className="text-center py-8">
            <div className="mb-6">
              <Calendar className="h-16 w-16 mx-auto text-primary mb-4" />
              <h3 className="text-lg font-medium mb-2">
                Configuração da Agenda Google Calendar
              </h3>
              <p className="text-muted-foreground">
                Este tutorial irá guiá-lo através do processo de configuração da sua agenda
                para integração com nossa plataforma.
              </p>
            </div>
            <div className="flex gap-3 justify-center">
              <Button onClick={handleStart} className="flex items-center gap-2">
                <Play className="h-4 w-4" />
                Começar Tutorial
              </Button>
              <Button variant="outline" onClick={handleSkip} className="flex items-center gap-2">
                <SkipForward className="h-4 w-4" />
                Pular
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / tutorialSteps.length) * 100}%` }}
              />
            </div>

            {/* Step Counter */}
            <div className="text-center text-sm text-muted-foreground">
              Passo {currentStep + 1} de {tutorialSteps.length}
            </div>

            {/* Current Step Content */}
            <Card>
              <CardHeader className="text-center">
                <div className="flex justify-center mb-3">
                  <div className="p-3 bg-primary/10 rounded-full text-primary">
                    {currentStepData.icon}
                  </div>
                </div>
                <CardTitle className="text-lg">{currentStepData.title}</CardTitle>
                <CardDescription>{currentStepData.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {currentStepData.instructions.map((instruction, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-primary text-sm font-medium">
                        {index + 1}
                      </div>
                      <p className="text-sm leading-relaxed">{instruction}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={isFirstStep}
                className="flex items-center gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>

              <div className="flex gap-2">
                <Button variant="outline" onClick={handleSkip}>
                  Pular Tutorial
                </Button>
                
                {isLastStep ? (
                  <Button onClick={handleClose} className="flex items-center gap-2">
                    Concluir
                    <CheckCircle className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button onClick={handleNext} className="flex items-center gap-2">
                    Próximo
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
