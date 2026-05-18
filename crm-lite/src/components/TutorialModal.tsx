import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';
import { clientesService } from '@/services/clientesService';
import { supabase } from '@/lib/supabase';
import { X, CheckCircle, Users, Zap, Bot, Repeat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  route: string;
  completed: boolean;
}

export default function TutorialModal() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);

  // Itens globais do checklist
  const globalItems: ChecklistItem[] = [
    {
      id: 'create-department',
      title: 'Criar Departamento',
      description: 'Organize seus leads por departamentos',
      icon: Users,
      route: '/departamentos',
      completed: false
    },
    {
      id: 'connect-whatsapp',
      title: 'Conectar WhatsApp',
      description: 'Conecte sua conta do WhatsApp Business',
      icon: Zap,
      route: '/settings',
      completed: false
    },
    {
      id: 'create-ai-agent',
      title: 'Criar Agente de IA',
      description: 'Configure seu assistente virtual inteligente',
      icon: Bot,
      route: '/chatbots',
      completed: false
    },
    {
      id: 'setup-followup',
      title: 'Configurar Followup Automático',
      description: 'Automatize o acompanhamento de leads',
      icon: Repeat,
      route: '/followup',
      completed: false
    }
  ];

  // Funções para verificar se cada item foi completado
  const checkDepartmentsExist = async (): Promise<boolean> => {
    try {
      if (!user?.id_cliente) return false;
      
      const { data, error } = await supabase
        .from('departamento')
        .select('id')
        .eq('id_cliente', user.id_cliente)
        .limit(1);
      
      if (error) {
        console.error('Erro ao verificar departamentos:', error);
        return false;
      }
      
      return data && data.length > 0;
    } catch (error) {
      console.error('Erro ao verificar departamentos:', error);
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
      
      if (error) {
        console.error('Erro ao verificar conexão WhatsApp:', error);
        return false;
      }
      
      return data?.instance_id !== null;
    } catch (error) {
      console.error('Erro ao verificar conexão WhatsApp:', error);
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
      
      if (error) {
        console.error('Erro ao verificar chatbots:', error);
        return false;
      }
      
      return data && data.length > 0;
    } catch (error) {
      console.error('Erro ao verificar chatbots:', error);
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
      
      if (error) {
        console.error('Erro ao verificar followup:', error);
        return false;
      }
      
      return data && data.length > 0;
    } catch (error) {
      console.error('Erro ao verificar followup:', error);
      return false;
    }
  };

  useEffect(() => {
    const checkShouldShowTutorial = async () => {
      if (!user?.id_cliente) return;

      try {
        // Verificar se o usuário já pulou o tutorial
        const tutorialSkipped = localStorage.getItem('tutorialSkipped');
        if (tutorialSkipped === 'true') {
          return;
        }

        // Verificar se é um usuário novo (primeira vez logando)
        const clientInfo = await clientesService.getClienteByIdCliente(user.id_cliente);
        
        // Se trial for true, mostrar tutorial
        if (clientInfo?.trial === true) {
          // Verificar status real dos itens
          const updatedItems = await Promise.all(
            globalItems.map(async (item) => {
              let completed = false;
              
              switch (item.id) {
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
              
              return { ...item, completed };
            })
          );
          
          setChecklistItems(updatedItems);
          setShowModal(true);
        }
      } catch (error) {
        console.error('Erro ao verificar se deve mostrar tutorial:', error);
      }
    };

    checkShouldShowTutorial();
  }, [user?.id_cliente]);

  const handleItemClick = (item: ChecklistItem) => {
    navigate(item.route);
    setShowModal(false);
  };

  const handleSkipTutorial = () => {
    localStorage.setItem('tutorialSkipped', 'true');
    setShowModal(false);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Bem-vindo ao SmartChat! 🎉
            </h2>
            <p className="text-gray-600 mt-1">
              Complete estas etapas para configurar sua conta
            </p>
          </div>
          <button
            onClick={handleCloseModal}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Checklist Items */}
        <div className="p-6 space-y-4">
          {checklistItems.map((item) => {
            const Icon = item.icon;
            return (
              <Card 
                key={item.id}
                className={`p-4 cursor-pointer transition-all duration-200 hover:shadow-md ${
                  item.completed 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-white border-gray-200 hover:border-blue-300'
                }`}
                onClick={() => handleItemClick(item)}
              >
                <div className="flex items-center gap-4">
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                    item.completed 
                      ? 'bg-green-100 text-green-600' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {item.completed ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-semibold ${
                      item.completed ? 'text-green-800' : 'text-gray-900'
                    }`}>
                      {item.title}
                    </h3>
                    <p className={`text-sm ${
                      item.completed ? 'text-green-600' : 'text-gray-600'
                    }`}>
                      {item.description}
                    </p>
                  </div>
                  {!item.completed && (
                    <div className="text-gray-400">
                      →
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t bg-gray-50">
          <Button 
            variant="outline" 
            onClick={handleSkipTutorial}
            className="text-gray-600 hover:text-gray-800"
          >
            Pular Tutorial
          </Button>
          <Button 
            onClick={() => navigate('/conversations')}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
          >
            Começar a Usar
          </Button>
        </div>
      </div>
    </div>
  );
}
