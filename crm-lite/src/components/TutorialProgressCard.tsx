import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/lib/supabase';
import { CheckCircle, ArrowRight, X } from 'lucide-react';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  estimatedTime: string;
}

function TutorialProgressCard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [steps, setSteps] = useState<TutorialStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCard, setShowCard] = useState(true);

  const tutorialSteps: TutorialStep[] = [
    {
      id: 'create-department',
      title: 'Criar Departamento',
      description: 'Organize seus leads por departamentos',
      completed: false,
      estimatedTime: '1 min'
    },
    {
      id: 'connect-whatsapp',
      title: 'Conectar WhatsApp',
      description: 'Conecte sua conta do WhatsApp Business',
      completed: false,
      estimatedTime: '2 min'
    },
    {
      id: 'create-ai-agent',
      title: 'Criar Agente de IA',
      description: 'Configure seu assistente virtual inteligente',
      completed: false,
      estimatedTime: '3 min'
    },
    {
      id: 'setup-followup',
      title: 'Configurar Followup',
      description: 'Automatize o acompanhamento de leads',
      completed: false,
      estimatedTime: '2 min'
    }
  ];

  useEffect(() => {
    const checkTutorialProgress = async () => {
      if (!user?.id_cliente) {
        setLoading(false);
        return;
      }

      try {
        const tutorialSkipped = localStorage.getItem('tutorialSkipped');
        if (tutorialSkipped === 'true') {
          setShowCard(false);
          return;
        }

        const updatedSteps = await Promise.all(
          tutorialSteps.map(async (step) => {
            let completed = false;

            switch (step.id) {
              case 'create-department':
                completed = await checkDepartmentsExist();
                break;
              case 'connect-whatsapp':
                completed = await checkWhatsAppConnection();
                break;
              case 'create-ai-agent':
                completed = await checkAIAgentsExist();
                break;
              case 'setup-followup':
                completed = await checkFollowupConfigured();
                break;
            }

            return { ...step, completed };
          })
        );

        setSteps(updatedSteps);
      } catch (error) {
        console.error('Erro ao verificar progresso do tutorial:', error);
        setSteps(tutorialSteps);
      } finally {
        setLoading(false);
      }
    };

    checkTutorialProgress();
  }, [user?.id_cliente]);

  const checkDepartmentsExist = async (): Promise<boolean> => {
    try {
      if (!user?.id_cliente) return false;
      
      const { data, error } = await supabase
        .from('departamento')
        .select('id')
        .eq('id_cliente', user.id_cliente)
        .limit(1);
      
      return !error && data && data.length > 0;
    } catch (error) {
      return false;
    }
  };

  const checkWhatsAppConnection = async (): Promise<boolean> => {
    try {
      if (!user?.id_cliente) return false;
      
      const { data, error } = await supabase
        .from('clientes_info')
        .select('instance_id')
        .eq('id', user.id_cliente)
        .single();
      
      return !error && data?.instance_id !== null;
    } catch (error) {
      return false;
    }
  };

  const checkAIAgentsExist = async (): Promise<boolean> => {
    try {
      if (!user?.id_cliente) return false;
      
      const { data, error } = await supabase
        .from('prompts_oficial')
        .select('id')
        .eq('id_cliente', user.id_cliente)
        .limit(1);
      
      return !error && data && data.length > 0;
    } catch (error) {
      return false;
    }
  };

  const checkFollowupConfigured = async (): Promise<boolean> => {
    try {
      if (!user?.id_cliente) return false;
      
      const { data, error } = await supabase
        .from('followup_programado')
        .select('id')
        .eq('id_cliente', user.id_cliente)
        .limit(1);
      
      return !error && data && data.length > 0;
    } catch (error) {
      return false;
    }
  };

  const handleSkipTutorial = () => {
    localStorage.setItem('tutorialSkipped', 'true');
    setShowCard(false);
  };

  const handleGoToTutorial = () => {
    navigate('/tutorial');
  };

  if (loading || !showCard) return null;

  const completedSteps = steps.filter(step => step.completed).length;
  const totalSteps = steps.length;
  const progressPercentage = (completedSteps / totalSteps) * 100;

  if (completedSteps === totalSteps) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 text-sm">Finalizar Configuração</h3>
        <button
          onClick={handleSkipTutorial}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-600">
            {completedSteps} de {totalSteps} concluídos
          </span>
          <span className="text-xs text-purple-600 font-medium">
            {Math.round(progressPercentage)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      <div className="space-y-2 mb-3">
        {steps.slice(0, 3).map((step, index) => (
          <div key={step.id} className="flex items-center gap-2">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium ${
              step.completed 
                ? 'bg-purple-500 text-white' 
                : 'bg-gray-200 text-gray-600'
            }`}>
              {step.completed ? (
                <CheckCircle className="h-3 w-3" />
              ) : (
                <span>{index + 1}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-medium truncate ${
                step.completed ? 'text-gray-900' : 'text-gray-600'
              }`}>
                {step.title}
              </p>
            </div>
            <span className="text-xs text-green-600 bg-green-100 px-1.5 py-0.5 rounded">
              {step.estimatedTime}
            </span>
          </div>
        ))}
      </div>

      <button
        onClick={handleGoToTutorial}
        className="w-full bg-purple-500 hover:bg-purple-600 text-white text-xs font-medium py-2 px-3 rounded-lg transition-colors duration-200 flex items-center justify-center gap-1"
      >
        Continuar Configuração
        <ArrowRight className="h-3 w-3" />
      </button>
    </div>
  );
}

export default TutorialProgressCard;
