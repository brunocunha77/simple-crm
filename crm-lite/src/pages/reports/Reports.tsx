import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/contexts/auth";
import { clientesService } from "@/services/clientesService";
import { WebhookService } from "@/services/webhookService";
import BoardView from "./BoardView";
import { Link } from "react-router-dom";

export default function Reports() {
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [atualizandoRelatorio, setAtualizandoRelatorio] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'success' | 'error' | 'warning'>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  // Mensagens dinâmicas para a animação
  const updateMessages = [
    'Aguarde um instante...',
    'Atualizando dados...',
    'Calculando probabilidades e scores...'
  ];
  const [updateMsgIndex, setUpdateMsgIndex] = useState(0);

  const handleRefresh = async () => {
    if (!user?.id) {
      console.error("Usuário não autenticado");
      setUpdateStatus('error');
      setStatusMessage('Usuário não autenticado');
      setTimeout(() => setUpdateStatus('idle'), 3000);
      return;
    }

    setIsRefreshing(true);
    setIsUpdating(true);
    setUpdateStatus('idle');
    setStatusMessage('');
    
    try {
      void 0;
      
      // Buscar informações do cliente na tabela clientes_info usando o user_id
      const clienteInfo = await clientesService.getClienteByIdCliente(Number(user.id_cliente));
      
      if (!clienteInfo) {
        console.error("Informações do cliente não encontradas para o usuário:", user.id);
        setUpdateStatus('warning');
        setStatusMessage('Informações do cliente não encontradas');
        setTimeout(() => setUpdateStatus('idle'), 5000);
        return;
      }

      void 0;

      // Atualizar campo atualizando_relatorio para true
      await clientesService.setAtualizandoRelatorio(user.id, true);
      setAtualizandoRelatorio(true);
      
      // Limpar cache para garantir dados atualizados
      clientesService.clearCache(user.id);

             // Enviar dados para o webhook do n8n
       const sucesso = await WebhookService.enviarAtualizacaoDashboard(clienteInfo);
      
      if (sucesso) {
        void 0;
        setLastUpdate(new Date());
        setUpdateStatus('success');
        setStatusMessage('Dashboard atualizado com sucesso!');
        setTimeout(() => setUpdateStatus('idle'), 3000);
      } else {
        console.error("Falha ao enviar dados para o webhook");
        setUpdateStatus('error');
        setStatusMessage('Falha ao comunicar com o servidor');
        setTimeout(() => setUpdateStatus('idle'), 5000);
      }
      
    } catch (error) {
      console.error("Erro durante a atualização do dashboard:", error);
      setUpdateStatus('error');
      setStatusMessage('Erro durante a atualização');
      setTimeout(() => setUpdateStatus('idle'), 3000);
    } finally {
      setIsRefreshing(false);
      setIsUpdating(false);
    }
  };

  // Polling simples e direto para monitorar o campo atualizando_relatorio
  useEffect(() => {
    let interval: any;
    let previousValue = false;
    
    async function checkAtualizando() {
      if (!user?.id) return;
      
      try {
        // Limpar cache para garantir dados atualizados
        clientesService.clearCache(user.id);
        const clienteInfo = await clientesService.getClienteByUserId(user.id);
      if (clienteInfo && typeof clienteInfo.atualizando_relatorio === 'boolean') {
          void 0;
          
          // Se o status mudou de true para false, parar o polling
          if (previousValue && !clienteInfo.atualizando_relatorio) {
            void 0;
            setAtualizandoRelatorio(false);
              clearInterval(interval);
            return;
          }
          
          // Atualizar estado local
          setAtualizandoRelatorio(clienteInfo.atualizando_relatorio);
          previousValue = clienteInfo.atualizando_relatorio;
          
          // Se está atualizando e não há intervalo ativo, iniciar polling
          if (clienteInfo.atualizando_relatorio && !interval) {
            void 0;
            interval = setInterval(checkAtualizando, 2000);
          }
        }
      } catch (error) {
        console.error('Erro ao verificar status:', error);
      }
    }
    
    // Verificar status inicial
    async function checkInitialStatus() {
      if (!user?.id) return;
      
      try {
        // Limpar cache para garantir dados atualizados
        clientesService.clearCache(user.id);
        const clienteInfo = await clientesService.getClienteByUserId(user.id);
        if (clienteInfo && typeof clienteInfo.atualizando_relatorio === 'boolean') {
          void 0;
          setAtualizandoRelatorio(clienteInfo.atualizando_relatorio);
          
          // Se estiver atualizando, forçar o início do polling
          if (clienteInfo.atualizando_relatorio) {
            void 0;
          }
        }
      } catch (error) {
        console.error('Erro ao verificar status inicial:', error);
      }
    }
    
    checkInitialStatus();
  }, [user]);

  // Alternar mensagem a cada piscada
  useEffect(() => {
    if (!atualizandoRelatorio) return;
    const interval = setInterval(() => {
      setUpdateMsgIndex((prev) => (prev + 1) % updateMessages.length);
    }, 1200);
    return () => clearInterval(interval);
  }, [atualizandoRelatorio]);

  const getStatusIcon = () => {
    switch (updateStatus) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  return (
    <>
      {/* Drawer/Menu lateral para mobile */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Fundo escuro para fechar o menu */}
          <div className="fixed inset-0 bg-black bg-opacity-30" onClick={() => setMenuOpen(false)} />
          {/* Menu lateral */}
          <div className="relative w-64 max-w-full h-full bg-white shadow-lg flex flex-col p-6 animate-slide-in-left">
            <button className="self-end mb-4 p-2 rounded hover:bg-gray-100" onClick={() => setMenuOpen(false)} aria-label="Fechar menu">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <nav className="flex flex-col gap-4">
              <Link to="/" className="text-lg font-medium text-gray-700 hover:text-primary-600" onClick={() => setMenuOpen(false)}>Dashboard</Link>
              <Link to="/reports" className="text-lg font-medium text-gray-700 hover:text-primary-600" onClick={() => setMenuOpen(false)}>Quadro de Leads</Link>
              <Link to="/conversations" className="text-lg font-medium text-gray-700 hover:text-primary-600" onClick={() => setMenuOpen(false)}>Atendimentos</Link>
              <Link to="/contatos" className="text-lg font-medium text-gray-700 hover:text-primary-600" onClick={() => setMenuOpen(false)}>Contatos</Link>
              <Link to="/chatbots" className="text-lg font-medium text-gray-700 hover:text-primary-600" onClick={() => setMenuOpen(false)}>Chatbots</Link>
              <Link to="/departamentos" className="text-lg font-medium text-gray-700 hover:text-primary-600" onClick={() => setMenuOpen(false)}>Departamentos</Link>
              <Link to="/followup" className="text-lg font-medium text-gray-700 hover:text-primary-600" onClick={() => setMenuOpen(false)}>Followup Automático</Link>
              <Link to="/settings" className="text-lg font-medium text-gray-700 hover:text-primary-600" onClick={() => setMenuOpen(false)}>Configurações</Link>
            </nav>
          </div>
        </div>
      )}
      
      {/* Topo com botão de menu (apenas mobile) */}
      <div className="flex items-center gap-2 p-4 border-b bg-white md:hidden sticky top-0 z-40">
        <button
          className="p-2 rounded hover:bg-gray-100"
          onClick={() => setMenuOpen(true)}
          aria-label="Abrir menu"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="font-bold text-xl text-primary-700">SmartChat</span>
        <span className="ml-2 text-2xl font-semibold">Quadro de Leads</span>
      </div>

             <div className="flex flex-col h-screen overflow-y-auto space-y-6 px-2 sm:px-0">
        <Card className="flex-1 flex flex-col min-h-0 w-full max-w-full h-full">
          <CardContent className="p-2 sm:p-6 flex-1 flex flex-col min-h-0 overflow-y-auto h-full">
            <div className="pt-4 flex-1 min-h-0 h-full">
              <BoardView />
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

