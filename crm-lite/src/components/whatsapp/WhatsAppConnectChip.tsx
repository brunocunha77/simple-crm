import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Smartphone, RefreshCw, CheckCircle, AlertCircle, Loader2, Building2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth";
import { supabase } from "@/lib/supabase";
import { departamentosService, Departamento } from "@/services/departamentosService";
import MyQRCode from './MyQRCode';
import { useWhatsAppConnect } from './useWhatsAppConnect';
import { useUserType } from '@/hooks/useUserType';

export type WhatsAppConnectChipProps = {
  instanceIdField: string;
  instanceNameField: string;
  senderNumberField: string;
  atendimentoHumanoField: string;
  atendimentoIAField: string;
  chipNumber?: number;
  label?: string;
};

export default function WhatsAppConnectChip(props: WhatsAppConnectChipProps) {
  const { user } = useAuth();
  const { userType } = useUserType();
  
  // Estados para controle de departamentos do chip
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [loadingDepartamentos, setLoadingDepartamentos] = useState(false);
  const [departamentoChip, setDepartamentoChip] = useState<string | null>(null);
  const [departamentoChipNome, setDepartamentoChipNome] = useState<string | null>(null);

  // Verificar se o usuário é Gestor (não pode conectar WhatsApp)
  const isGestor = userType === 'Gestor';

  const {
    isConnected,
    qrCode,
    instanceName,
    setInstanceName,
    instanceId,
    setInstanceId,
    senderNumber,
    setSenderNumber,
    connectionStatus,
    setConnectionStatus,
    isLoading,
    setIsLoading,
    checkingStatus,
    setCheckingStatus,
    webhookConfigured,
    setWebhookConfigured,
    atendimentoHumano,
    setAtendimentoHumano,
    atendimentoIA,
    setAtendimentoIA,
    lastStatusCheck,
    setLastStatusCheck,
    cachedStatus,
    setCachedStatus,
    selectedChatbotId,
    setSelectedChatbotId,
    availableChatbots,
    setAvailableChatbots,
    loadingChatbots,
    setLoadingChatbots,
    handleConnectWhatsApp,
    handleRefreshQRCode,
    fetchLeadsData,
    handleFirstAttendanceChange,
    handleChatbotChange,
  } = useWhatsAppConnect(props);

  // Buscar departamentos disponíveis
  const fetchDepartamentos = async () => {
    if (!user?.id_cliente) return;
    
    try {
      setLoadingDepartamentos(true);
      const departamentosData = await departamentosService.listar(user.id_cliente);
      setDepartamentos(departamentosData);
    } catch (error) {
      console.error('Erro ao buscar departamentos:', error);
      toast.error('Erro ao carregar departamentos');
    } finally {
      setLoadingDepartamentos(false);
    }
  };

  // Buscar nome do departamento pelo ID
  const fetchDepartamentoNome = async (departamentoId: string) => {
    if (!departamentoId) return null;
    
    try {
      const { data, error } = await supabase
        .from('departamento')
        .select('nome')
        .eq('id', departamentoId)
        .single();
      
      if (error) {
        console.error('Erro ao buscar nome do departamento:', error);
        return null;
      }
      
      return data?.nome || null;
    } catch (error) {
      console.error('Erro ao buscar nome do departamento:', error);
      return null;
    }
  };

  // Verificar se há departamentos disponíveis
  const hasDepartamentos = departamentos.length > 0;

  // Verificar se precisa selecionar departamento para conectar
  const needsDepartamentoSelection = () => {
    // Se não há departamentos, precisa criar
    if (!hasDepartamentos) return true;
    
    // Se não tem instance_id (não conectado), precisa selecionar pelo menos um departamento
    if (!instanceId) {
      return !departamentoChip;
    }
    
    // Se tem instance_id mas não tem departamento associado, precisa selecionar
    if (instanceId && !departamentoChip) return true;
    
    return false;
  };

  // Verificar se deve mostrar a seção de departamentos
  const shouldShowDepartamentoSection = () => {
    // Sempre mostrar se não há departamentos
    if (!hasDepartamentos) return true;
    
    // Sempre mostrar se há departamentos (para permitir alterações)
    return hasDepartamentos;
  };

  // Função para selecionar departamento para o chip
  const handleSelectDepartamento = async (departamentoId: string) => {
    // Não permitir valores vazios
    if (!departamentoId || departamentoId === '') {
      return;
    }

    try {
      const updateData: any = {};
      
      // Determinar qual campo atualizar baseado no número do chip
      if (props.chipNumber === 1) {
        updateData.id_departamento_chip_1 = departamentoId;
      } else if (props.chipNumber === 2) {
        updateData.id_departamento_chip_2 = departamentoId;
      }

      const { error } = await supabase
        .from('clientes_info')
        .update(updateData)
        .eq('email', user?.email);

      if (error) {
        console.error('Erro ao atualizar departamento do chip:', error);
        toast.error('Erro ao salvar departamento');
      } else {
        setDepartamentoChip(departamentoId);
        // Buscar nome do departamento
        const nome = await fetchDepartamentoNome(departamentoId);
        setDepartamentoChipNome(nome);
        toast.success(`Departamento associado ao ${props.label || `Chip ${props.chipNumber}`}`);
      }
    } catch (error) {
      console.error('Erro ao selecionar departamento:', error);
      toast.error('Erro ao selecionar departamento');
    }
  };

  // Carregar departamento do chip ao montar o componente
  useEffect(() => {
    if (user?.email) {
      fetchDepartamentos();
      
      // Carregar departamento atual do chip
      const loadDepartamentoChip = async () => {
        try {
          const { data: clientInfo } = await supabase
            .from('clientes_info')
            .select('id_departamento_chip_1, id_departamento_chip_2')
            .eq('email', user.email)
            .single();

          if (clientInfo) {
            if (props.chipNumber === 1) {
              setDepartamentoChip(clientInfo.id_departamento_chip_1 || null);
              if (clientInfo.id_departamento_chip_1) {
                const nome = await fetchDepartamentoNome(clientInfo.id_departamento_chip_1);
                setDepartamentoChipNome(nome);
              }
            } else if (props.chipNumber === 2) {
              setDepartamentoChip(clientInfo.id_departamento_chip_2 || null);
              if (clientInfo.id_departamento_chip_2) {
                const nome = await fetchDepartamentoNome(clientInfo.id_departamento_chip_2);
                setDepartamentoChipNome(nome);
              }
            }
          }
        } catch (error) {
          console.error('Erro ao carregar departamento do chip:', error);
        }
      };

      loadDepartamentoChip();
    }
  }, [user, props.chipNumber]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Conectar WhatsApp</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {connectionStatus === 'connected' ? (
            <div className="bg-green-50 border border-green-200 rounded-md p-4 flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-green-700 font-medium">WhatsApp conectado</p>
                <p className="text-green-600 text-sm">{senderNumber ? `Número: ${senderNumber}` : 'Número conectado'}</p>
              </div>
              {/* Botão de reconectar - oculto para Gestor */}
              {!isGestor && (
                <div className="ml-auto">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={handleRefreshQRCode}
                    className="text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
                  >
                    Reconectar
                  </Button>
                </div>
              )}
            </div>
          ) : connectionStatus === 'connecting' ? (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 flex items-center">
              <div className="flex-1">
                <p className="text-blue-700 font-medium">Conectando WhatsApp</p>
                <p className="text-blue-600 text-sm">Escaneie o QR Code abaixo com seu celular</p>
              </div>
              {isLoading && (
                <div className="animate-spin">
                  <RefreshCw className="h-5 w-5 text-blue-500" />
                </div>
              )}
          </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-md p-4 flex items-center">
              <AlertCircle className="h-5 w-5 text-amber-500 mr-3" />
              <div className="flex-1">
                <p className="text-amber-700 font-medium">WhatsApp desconectado</p>
                <p className="text-amber-600 text-sm">Conecte seu WhatsApp para começar</p>
              </div>
            </div>
          )}
          {/* QR Code - oculto para Gestor */}
          {!isGestor && qrCode && (connectionStatus === 'disconnected' || connectionStatus === 'connecting') && (
            <div className="flex justify-center py-4">
              <div className="bg-white p-4 rounded-lg shadow">
                <MyQRCode qrString={qrCode} />
              </div>
            </div>
          )}

          {/* Seção de seleção de departamentos */}
          {shouldShowDepartamentoSection() && (
            <div className="pt-4 space-y-3">
              {!hasDepartamentos ? (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="h-4 w-4 text-red-600" />
                    <p className="text-red-700 font-medium text-sm">Nenhum Departamento Encontrado</p>
                  </div>
                  <p className="text-red-600 text-xs mb-3">
                    É necessário criar pelo menos um departamento antes de conectar o WhatsApp.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open('/departamentos', '_blank')}
                    className="w-full"
                  >
                    Criar Departamento
                  </Button>
                </div>
              ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="h-4 w-4 text-blue-600" />
                    <p className="text-blue-700 font-medium text-sm">{props.label || `Chip ${props.chipNumber}`}</p>
                    {departamentoChip && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                        ✓ Departamento Ativo
                      </span>
                    )}
                  </div>
                  <p className="text-blue-600 text-xs mb-3">
                    {departamentoChip 
                      ? `Departamento associado ao ${props.label || `Chip ${props.chipNumber}`}: ${departamentoChipNome || `Departamento ${departamentoChip}`}`
                      : `Selecione um departamento para associar ao ${props.label || `Chip ${props.chipNumber}`}`
                    }
                  </p>
                  <Select
                    value={departamentoChip || ""}
                    onValueChange={(value) => {
                      if (value === "create") {
                        window.open('/departamentos', '_blank');
                      } else {
                        handleSelectDepartamento(value);
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        {departamentoChip 
                          ? departamentoChipNome || `Departamento ${departamentoChip}`
                          : "Selecione um departamento"
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {departamentos.map((departamento) => (
                        <SelectItem 
                          key={departamento.id} 
                          value={departamento.id.toString()}
                        >
                          {departamento.nome}
                        </SelectItem>
                      ))}
                      <SelectItem value="create" className="text-blue-600 font-medium">
                        + Criar novo departamento
                      </SelectItem>
                    </SelectContent>
                  </Select>

                </div>
              )}
            </div>
          )}

          <div className="pt-4 flex justify-between">
            {/* Botões de conexão WhatsApp - visíveis apenas para Admin */}
            {!isGestor && ((connectionStatus !== 'connected' && !qrCode) || needsDepartamentoSelection()) && (
              <Button
                variant="default"
                onClick={handleConnectWhatsApp}
                disabled={isLoading || needsDepartamentoSelection()}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Carregando...
                  </>
                ) : needsDepartamentoSelection() ? (
                  <>
                    <Building2 className="h-4 w-4 mr-2" />
                    {connectionStatus === 'connected' ? 'Selecione Departamento para Continuar' : 'Selecione um Departamento'}
                  </>
                ) : (
                  <>
                    <Smartphone className="h-4 w-4 mr-2" />
                    Conectar WhatsApp
                  </>
                )}
              </Button>
            )}
            {!isGestor && connectionStatus !== 'connected' && qrCode && (
              <Button 
                variant="outline" 
                onClick={handleRefreshQRCode}
                disabled={isLoading} 
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Carregando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Novo QR Code
                  </>
                )}
              </Button>
            )}
            {/* Botão de atualizar dados - visível para todos quando conectado */}
            {!isGestor && connectionStatus === 'connected' && (
              <Button
                variant="outline"
                onClick={fetchLeadsData}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Atualizando dados...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Atualizar dados da instância
                  </>
                )}
              </Button>
            )}
            
            {/* Mensagem informativa para Gestor */}
            {isGestor && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4 w-full">
                <p className="text-blue-700 text-sm">
                  Como gestor, você pode ativar/desativar a IA e selecionar bots, mas não pode conectar o WhatsApp.
                </p>
              </div>
            )}
          </div>
          {connectionStatus === 'connected' && (
            <div className="pt-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Selecionar primeiro atendimento
              </label>
              <Select
                value={atendimentoHumano ? "human" : "ai"}
                onValueChange={handleFirstAttendanceChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o tipo de primeiro atendimento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="human">Atendimento humano</SelectItem>
                  {/* <SelectItem value="ai">Atendimento por IA</SelectItem> */}
                </SelectContent>
              </Select>
            </div>
          )}
          {connectionStatus === 'connected' && atendimentoIA && (
            <div className="pt-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Selecionar chatbot para atendimento
              </label>
              {loadingChatbots ? (
                <div className="flex items-center space-x-2 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Carregando chatbots...</span>
                </div>
              ) : availableChatbots.length === 0 ? (
                <div className="bg-amber-50 border border-amber-200 rounded-md p-2 text-sm">
                  <p className="text-amber-700">Nenhum chatbot ativo disponível.</p>
                  <p className="text-amber-600">Ative algum chatbot na seção de Chatbots.</p>
                </div>
              ) : (
                <>
                  <Select
                    value={selectedChatbotId ? String(selectedChatbotId) : undefined}
                    onValueChange={handleChatbotChange}
                  >
                    <SelectTrigger className="w-full hover:border-green-500 focus:ring-green-500">
                      <SelectValue placeholder="Selecione um chatbot" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableChatbots.map((chatbot) => (
                        <SelectItem 
                          key={String(chatbot.id)} 
                          value={String(chatbot.id)}
                          className={chatbot.em_uso ? "font-bold text-green-600" : ""}
                        >
                          {chatbot.nome} {chatbot.em_uso && "✓"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {availableChatbots.length === 1 && (
                    <div className="text-xs text-gray-500 mt-1">Apenas um chatbot disponível para seleção.</div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 