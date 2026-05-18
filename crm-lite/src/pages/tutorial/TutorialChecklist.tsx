import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Circle, ArrowRight, Home, Users, Bot, Repeat, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth';
import { clientesService } from '@/services/clientesService';
import { supabase } from '@/lib/supabase';

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  route: string;
  completed: boolean;
  isGlobal: boolean;
  estimatedTime?: string;
}

export default function TutorialChecklist() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Itens globais que aparecem em todos os planos
  const globalItems: ChecklistItem[] = [
    {
      id: 'create-department',
      title: 'Criar Departamento',
      description: 'Organize seus leads por departamentos',
      icon: Users,
      route: '/departamentos',
      completed: false,
      isGlobal: true,
      estimatedTime: '1 min'
    },
    {
      id: 'connect-whatsapp',
      title: 'Conectar WhatsApp',
      description: 'Conecte sua conta do WhatsApp Business',
      icon: Zap,
      route: '/settings',
      completed: false,
      isGlobal: true,
      estimatedTime: '2 min'
    },
    {
      id: 'create-ai-agent',
      title: 'Criar Agente de IA',
      description: 'Configure seu assistente virtual inteligente',
      icon: Bot,
      route: '/chatbots',
      completed: false,
      isGlobal: true,
      estimatedTime: '3 min'
    },
    {
      id: 'setup-followup',
      title: 'Configurar Followup Automático',
      description: 'Automatize o acompanhamento de leads',
      icon: Repeat,
      route: '/followup',
      completed: false,
      isGlobal: true,
      estimatedTime: '2 min'
    }
  ];

  useEffect(() => {
    const checkItemStatus = async () => {
      if (!user?.id_cliente) {
        setLoading(false);
        return;
      }

      try {
        // Aqui você pode implementar a lógica para verificar se cada item foi completado
        // Por exemplo, verificar se existem departamentos, conexões, agentes, etc.
        const updatedItems = await Promise.all(
          globalItems.map(async (item) => {
            let completed = false;
            
            switch (item.id) {
              case 'create-department':
                // Verificar se existem departamentos
                completed = await checkDepartmentsExist();
                break;
              case 'connect-whatsapp':
                // Verificar se existe conexão WhatsApp
                completed = await checkWhatsAppConnection();
                break;
              case 'create-ai-agent':
                // Verificar se existem agentes de IA
                completed = await checkAIAgentsExist();
                break;
              case 'setup-followup':
                // Verificar se followup está configurado
                completed = await checkFollowupConfigured();
                break;
            }
            
            return { ...item, completed };
          })
        );

        setChecklistItems(updatedItems);
      } catch (error) {
        console.error('Erro ao verificar status dos itens:', error);
        setChecklistItems(globalItems);
      } finally {
        setLoading(false);
      }
    };

    checkItemStatus();
  }, [user?.id_cliente]);

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

  const handleItemClick = (item: ChecklistItem) => {
    navigate(item.route);
  };

  const handleSkipTutorial = () => {
    // Salvar no localStorage que o usuário pulou o tutorial
    localStorage.setItem('tutorialSkipped', 'true');
    navigate('/conversations');
  };

  const completedItems = checklistItems.filter(item => item.completed).length;
  const totalItems = checklistItems.length;
  const progressPercentage = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando checklist...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Finalizar Configuração
          </h1>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Complete estas etapas para configurar sua conta e começar a usar todas as funcionalidades do SmartCRM
          </p>
        </div>

        {/* Progress Overview */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Progresso Geral</h2>
            <span className="text-sm text-gray-600">
              {completedItems} de {totalItems} concluídos
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-purple-500 to-purple-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <p className="text-sm text-gray-600 mt-2">
            {progressPercentage.toFixed(0)}% completo
          </p>
        </div>

        {/* Checklist Items with Vertical Line */}
        <div className="relative">
          {/* Vertical Line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-purple-200"></div>
          
          <div className="space-y-8">
            {checklistItems.map((item, index) => {
              const Icon = item.icon;
              const isLast = index === checklistItems.length - 1;
              
              return (
                <div key={item.id} className="relative flex items-start gap-6">
                  {/* Step Circle */}
                  <div className="relative z-10 flex-shrink-0">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center border-4 border-white shadow-lg ${
                      item.completed 
                        ? 'bg-purple-500 text-white' 
                        : 'bg-white text-purple-500 border-purple-200'
                    }`}>
                      {item.completed ? (
                        <CheckCircle className="h-6 w-6" />
                      ) : (
                        <span className="text-lg font-semibold">{index + 1}</span>
                      )}
                    </div>
                  </div>

                  {/* Content Card */}
                  <div 
                    className={`flex-1 bg-white rounded-lg border-2 p-6 cursor-pointer transition-all duration-200 hover:shadow-md ${
                      item.completed 
                        ? 'border-purple-200 bg-purple-50' 
                        : 'border-gray-200 hover:border-purple-300'
                    }`}
                    onClick={() => handleItemClick(item)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className={`text-lg font-semibold mb-2 ${
                          item.completed ? 'text-purple-800' : 'text-gray-900'
                        }`}>
                          {item.title}
                        </h3>
                        <p className={`text-sm mb-3 ${
                          item.completed ? 'text-purple-600' : 'text-gray-600'
                        }`}>
                          {item.description}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full font-medium">
                            ~{item.estimatedTime || '2 min'}
                          </span>
                          {item.completed && (
                            <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded-full font-medium">
                              Concluído
                            </span>
                          )}
                        </div>
                      </div>
                      {!item.completed && (
                        <div className="flex items-center gap-2 text-gray-400">
                          <span className="text-sm">Concluir</span>
                          <ArrowRight className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4 mt-12">
          <Button 
            variant="outline" 
            onClick={handleSkipTutorial}
            className="px-6 py-2 text-gray-600 hover:text-gray-800 border-gray-300"
          >
            Pular Tutorial
          </Button>
          <Button 
            variant="outline" 
            onClick={() => navigate('/conversations')}
            className="px-6 py-2 border-gray-300"
          >
            <Home className="h-4 w-4 mr-2" />
            Ir para Conversas
          </Button>
          {completedItems === totalItems && (
            <Button 
              onClick={() => navigate('/conversations')}
              className="px-6 py-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white"
            >
              Começar a Usar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
