import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, X, Calendar, Facebook, Instagram, Zap, Building2, RefreshCw, Mail, Cpu, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/auth';
import { clientesService } from '@/services/clientesService';
import { useToast } from '@/hooks/use-toast';
import GoogleCalendarTutorialButton from '@/components/GoogleCalendarTutorialButton';
import RdStationConnectModal from '@/components/modals/RdStationConnectModal';
import RdStationConfigModal from '@/components/modals/RdStationConfigModal';
import KommoConfigModal from '@/components/modals/KommoConfigModal';

const conexoesData = [
  {
    id: 'mcp-personalizado',
    titulo: 'MCP Personalizado',
    descricao: 'Conecte ferramentas externas via protocolo MCP',
    icone: <Cpu className="h-6 w-6" />,
    status: 'em_breve',
    ultimaSincronizacao: 'Em breve',
    acao: 'Em Breve',
    cor: 'bg-gradient-to-br from-violet-500 to-purple-700'
  },
];

const hiddenConnectionCardIds = new Set<string>();

export default function ConexoesPage() {
  const [showFacebookModal, setShowFacebookModal] = useState(false);
  const [showInstagramModal, setShowInstagramModal] = useState(false);
  const [showRdStationModal, setShowRdStationModal] = useState(false);
  const [showRdStationConfigModal, setShowRdStationConfigModal] = useState(false);
  const [showKommoModal, setShowKommoModal] = useState(false);
  const [showKommoConfigModal, setShowKommoConfigModal] = useState(false);
  const [showGmailModal, setShowGmailModal] = useState(false);
  const [showMcpModal, setShowMcpModal] = useState(false);
  const [clickUpToken, setClickUpToken] = useState('');
  const [clickUpLoading, setClickUpLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [kommoLink, setKommoLink] = useState('');
  const [kommoToken, setKommoToken] = useState('');
  const [isKommoConnecting, setIsKommoConnecting] = useState(false);
  const [conexoes, setConexoes] = useState(conexoesData);
  const [cliente, setCliente] = useState<any>(null);
  const facebookPopupRef = useRef<Window | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  // Carregar status das conexões ao montar o componente
  useEffect(() => {
    loadConnectionStatus();
  }, [user]);

  // Escutar mensagem FACEBOOK_CONNECTED do callback
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Verificar se é a mensagem FACEBOOK_CONNECTED
      if (event.data?.type === 'FACEBOOK_CONNECTED') {
        void 0;
        
        // Fechar popup (se ainda estiver aberto)
        if (facebookPopupRef.current && !facebookPopupRef.current.closed) {
          try {
            facebookPopupRef.current.close();
            void 0;
          } catch (error) {
            console.error('[FACEBOOK CONNECT] Erro ao fechar popup:', error);
          }
        }
        facebookPopupRef.current = null;
        
        // Atualizar dados do cliente (refetch)
        if (user?.id) {
          void 0;
          clientesService.clearCache(user.id);
          loadConnectionStatus()
            .then(() => {
              void 0;
              toast({
                title: "Conectado!",
                description: "Facebook conectado com sucesso.",
              });
            })
            .catch((error) => {
              console.error('[FACEBOOK CONNECT] Erro ao atualizar dados:', error);
            });
        }
      }
    };

    // Registrar listener
    window.addEventListener('message', handleMessage);
    void 0;
    
    // Cleanup
    return () => {
      window.removeEventListener('message', handleMessage);
      void 0;
    };
  }, [user?.id, toast]);




  // Sistema de polling para atualizar status das conexões automaticamente
  useEffect(() => {
    if (!user?.id) return;

    void 0;
    
    // Polling a cada 10 segundos para verificar mudanças nas conexões
    const pollingInterval = setInterval(() => {
      void 0;
      loadConnectionStatus(false); // false = não mostrar logs desnecessários
    }, 10000); // 10 segundos

    return () => {
      void 0;
      clearInterval(pollingInterval);
    };
  }, [user?.id]);

  const loadConnectionStatus = async (showLogs = true) => {
    if (!user?.id) return;

    try {
      // Limpar cache para garantir dados atualizados
      clientesService.clearCache(user.id);
      const clienteAtual = await clientesService.getClienteByUserId(user.id);
      
      if (clienteAtual) {
        // Atualizar estado do cliente para que o useEffect reaja às mudanças
        setCliente(clienteAtual);
        
        const updatedConexoes = conexoes.map(conexao => {
          if (conexao.id === 'facebook') {
            const conectado = !!clienteAtual.token_facebook && clienteAtual.token_facebook.trim() !== '';
            return {
              ...conexao,
              status: conectado ? 'conectado' : 'desconectado',
              ultimaSincronizacao: conectado ? 'Conectado' : 'Nunca sincronizado'
            };
          }
          if (conexao.id === 'google-agenda') {
            return {
              ...conexao,
              status: clienteAtual.id_agenda ? 'conectado' : 'desconectado',
              ultimaSincronizacao: clienteAtual.id_agenda ? 'Conectado' : 'Nunca sincronizado'
            };
          }
          if (conexao.id === 'instagram') {
            return {
              ...conexao,
              status: clienteAtual.int_instagram ? 'conectado' : 'desconectado',
              ultimaSincronizacao: clienteAtual.int_instagram ? 'Conectado' : 'Nunca sincronizado'
            };
          }
          if (conexao.id === 'rd-station') {
            return {
              ...conexao,
              status: clienteAtual.int_rd ? 'conectado' : 'desconectado',
              ultimaSincronizacao: clienteAtual.int_rd ? 'Conectado' : 'Nunca sincronizado'
            };
          }
          if (conexao.id === 'kommo') {
            return {
              ...conexao,
              status: clienteAtual.int_kommo && clienteAtual.int_kommo_token ? 'conectado' : 'desconectado',
              ultimaSincronizacao: clienteAtual.int_kommo ? 'Conectado' : 'Nunca sincronizado'
            };
          }
          if (conexao.id === 'gmail') {
            return {
              ...conexao,
              status: clienteAtual.gmail_on ? 'conectado' : 'desconectado',
              ultimaSincronizacao: clienteAtual.gmail_on
                ? (clienteAtual.email_gmail || 'Conectado')
                : 'Nunca sincronizado'
            };
          }
          if (conexao.id === 'mcp-personalizado') {
            return {
              ...conexao,
              status: clienteAtual.int_clickup ? 'conectado' : 'desconectado',
              ultimaSincronizacao: clienteAtual.int_clickup ? 'ClickUp conectado' : 'Nenhuma ferramenta conectada',
            };
          }
          return conexao;
        });
        
        // Verificar se houve mudanças antes de atualizar o estado
        const hasChanges = updatedConexoes.some((conexao, index) => {
          const currentConexao = conexoes[index];
          return conexao.status !== currentConexao.status || 
                 conexao.ultimaSincronizacao !== currentConexao.ultimaSincronizacao;
        });
        
        if (hasChanges) {
          if (showLogs) {
            void 0;
          }
        setConexoes(updatedConexoes);
        } else if (showLogs) {
          void 0;
        }
      }
    } catch (error) {
      console.error('Erro ao carregar status das conexões:', error);
    }
  };

  const handleFacebookConnect = () => {
    if (!user?.id) return;

    const clientId = user?.id_cliente || 'unknown';
    
    // URL do callback deve apontar para o backend que redireciona para o frontend
    // O backend processa o OAuth e redireciona para /facebook-callback
    const facebookAuthUrl =
      `https://www.facebook.com/v19.0/dialog/oauth` +
      `?client_id=767483022321276` +
      `&redirect_uri=https%3A%2F%2Fwebhook.dev.usesmartcrm.com%2Fwebhook%2Fauth%2Ffacebook%2Fcallback` +
      `&response_type=code` +
      `&state=${clientId}` +
      `&scope=public_profile,email,ads_read,business_management`;
    
    const width = 600;
    const height = 700;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    const popupFeatures = `width=${width},height=${height},left=${left},top=${top}`;
    
    const popupWindow = window.open(facebookAuthUrl, 'FacebookAuth', popupFeatures);
    
    if (!popupWindow) {
      toast({
        title: "Erro",
        description: "Popup bloqueado. Permita popups para conectar.",
        variant: "destructive"
      });
      return;
    }

    facebookPopupRef.current = popupWindow;
    void 0;

    setShowFacebookModal(false);
  };
  
  const handleInstagramConnect = () => {
    const clientId = user?.id_cliente || 'unknown';
    const instagramAuthUrl = `https://www.instagram.com/oauth/authorize?force_reauth=true&client_id=763288226475208&redirect_uri=https://webhook.dev.usesmartcrm.com/webhook/callback&response_type=code&scope=instagram_business_basic%2Cinstagram_business_manage_messages%2Cinstagram_business_manage_comments%2Cinstagram_business_content_publish%2Cinstagram_business_manage_insights&state=${clientId}`;
    
    // Abrir em nova aba
    window.open(instagramAuthUrl, '_blank', 'width=600,height=700,scrollbars=yes,resizable=yes');
    
    // Fechar modal
    setShowInstagramModal(false);
  };

  const handleRdStationConnect = async (token: string) => {
    if (!user?.id || !token.trim()) return false;
    
    try {
      setIsLoading(true);
      const success = await clientesService.setRdStationToken(user.id, token.trim());
      
      if (success) {
        // Atualizar status das conexões
        await loadConnectionStatus();
        // NÃO fechar o modal aqui - deixar o modal gerenciar as próximas etapas
        return true;
      } else {
        console.error('Erro ao conectar RD Station');
        return false;
      }
    } catch (error) {
      console.error('Erro ao conectar RD Station:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleRdStationDisconnect = async () => {
    if (!user?.id) return;
    
    try {
      setIsLoading(true);
      const success = await clientesService.disconnectRdStation(user.id);
      
      if (success) {
        // Atualizar status das conexões
        await loadConnectionStatus();
        // Aqui você pode adicionar um toast de sucesso se quiser
      } else {
        // Aqui você pode adicionar um toast de erro se quiser
        console.error('Erro ao desconectar RD Station');
      }
    } catch (error) {
      console.error('Erro ao desconectar RD Station:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKommoConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !kommoLink.trim() || !kommoToken.trim()) return;
    
    setIsKommoConnecting(true);
    
    try {
      // Extrair apenas o subdomínio da URL
      const url = new URL(kommoLink);
      const subdomain = url.hostname.split('.')[0];
      
      const success = await clientesService.setKommoData(user.id, kommoToken.trim(), subdomain);
      
      if (success) {
        setShowKommoModal(false);
        setKommoLink('');
        setKommoToken('');
        
        // Atualizar status das conexões
        await loadConnectionStatus();
        
        toast({
          title: "Sucesso",
          description: "Conexão com Kommo configurada com sucesso!",
        });
      } else {
        toast({
          title: "Erro",
          description: "Erro ao conectar com Kommo. Verifique os dados informados.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Erro ao conectar Kommo:', error);
      toast({
        title: "Erro",
        description: "Erro ao conectar com Kommo. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsKommoConnecting(false);
    }
  };


  const handleGmailConnect = () => {
    const clientId = user?.id_cliente;
    if (!clientId) {
      toast({ title: "Erro", description: "Cliente não identificado.", variant: "destructive" });
      return;
    }

    const scope = [
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/calendar',
    ].join(' ');

    const gmailAuthUrl =
      `https://accounts.google.com/o/oauth2/v2/auth` +
      `?client_id=898602838404-mttmj81g4kbsas6bia87mbje8cdguqr5.apps.googleusercontent.com` +
      `&redirect_uri=https://workflow.dev.usesmartcrm.com/webhook/oauth-callback` +
      `&response_type=code` +
      `&scope=${encodeURIComponent(scope)}` +
      `&access_type=offline` +
      `&prompt=consent` +
      `&state=${clientId}`;

    window.open(gmailAuthUrl, '_blank', 'width=600,height=700,scrollbars=yes,resizable=yes');
    setShowGmailModal(false);
  };

  const handleGmailDisconnect = async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      const success = await clientesService.disconnectGmail(user.id);

      if (success) {
        await loadConnectionStatus();
        toast({ title: "Gmail desconectado", description: "A conta Gmail foi desvinculada com sucesso." });
      } else {
        toast({ title: "Erro", description: "Não foi possível desconectar o Gmail.", variant: "destructive" });
      }
    } catch (error) {
      console.error('Erro ao desconectar Gmail:', error);
      toast({ title: "Erro", description: "Erro ao desconectar Gmail.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'conectado') {
      return <Badge className="bg-purple-600 text-white">Conectado</Badge>;
    } else if (status === 'erro') {
      return <Badge className="bg-red-600 text-white">Erro</Badge>;
    }
    return <Badge variant="secondary">Desconectado</Badge>;
  };

  const getActionButton = (conexao: any) => {
    if (conexao.status === 'erro') {
      return (
        <Button variant="outline" className="w-full">
          <Settings className="h-4 w-4 mr-2" />
          {conexao.acao}
        </Button>
      );
    }

    if (conexao.id === 'google-agenda') {
      return (
        <GoogleCalendarTutorialButton 
          variant="outline"
          className="w-full"
          onConnectionUpdate={loadConnectionStatus}
        >
          {conexao.status === 'conectado' ? 'Configurar' : 'Conectar'}
        </GoogleCalendarTutorialButton>
      );
    }

    if (conexao.id === 'instagram') {
      return (
        <Button 
          variant="outline" 
          className="w-full"
          onClick={() => setShowInstagramModal(true)}
        >
          <Settings className="h-4 w-4 mr-2" />
          {conexao.acao}
        </Button>
      );
    }

    if (conexao.id === 'rd-station') {
      return (
        <div className="space-y-2">
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => setShowRdStationModal(true)}
            disabled={isLoading}
          >
            <Settings className="h-4 w-4 mr-2" />
            {conexao.status === 'conectado' ? 'Conectar Token' : 'Conectar Token'}
          </Button>
          {conexao.status === 'conectado' && (
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setShowRdStationConfigModal(true)}
              disabled={isLoading}
            >
              <Zap className="h-4 w-4 mr-2" />
              Configurar Funil
            </Button>
          )}
        </div>
      );
    }

    if (conexao.id === 'kommo') {
      return (
        <div className="space-y-2">
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => setShowKommoModal(true)}
            disabled={isLoading}
          >
            <Settings className="h-4 w-4 mr-2" />
            {conexao.status === 'conectado' ? 'Reconectar' : 'Conectar'}
          </Button>
          {conexao.status === 'conectado' && (
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setShowKommoConfigModal(true)}
              disabled={isLoading}
            >
              <Building2 className="h-4 w-4 mr-2" />
              Configurar Funil
            </Button>
          )}
        </div>
      );
    }

    if (conexao.id === 'mcp-personalizado') {
      return (
        <Button
          variant="outline"
          className="w-full text-violet-700 border-violet-300 hover:bg-violet-50"
          onClick={() => setShowMcpModal(true)}
        >
          <Settings className="h-4 w-4 mr-2" />
          Gerenciar
        </Button>
      );
    }

    if (conexao.id === 'gmail') {
      if (conexao.status === 'conectado') {
        return (
          <Button
            variant="outline"
            className="w-full text-red-600 border-red-300 hover:bg-red-50"
            onClick={handleGmailDisconnect}
            disabled={isLoading}
          >
            <X className="h-4 w-4 mr-2" />
            Desconectar
          </Button>
        );
      }
      return (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setShowGmailModal(true)}
        >
          <Settings className="h-4 w-4 mr-2" />
          Conectar
        </Button>
      );
    }

    return (
      <Button 
        variant="outline" 
        className="w-full"
        onClick={() => setShowFacebookModal(true)}
      >
        <Settings className="h-4 w-4 mr-2" />
        {conexao.status === 'conectado' ? 'Reconectar' : 'Conectar'}
      </Button>
    );
  };


  return (
    <div className="min-h-screen bg-gray-50">
      

      {/* Conteúdo principal */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="space-y-8">
                     {/* Header da seção */}
           <div className="flex items-center justify-between">
             <div>
               <h2 className="text-2xl font-bold text-gray-900">Conexões</h2>
               <p className="text-sm text-gray-600 mt-1">Gerencie suas integrações e conexões externas</p>
             </div>
             <div className="flex items-center gap-2">
               <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                 <span className="text-xs text-gray-500">Atualização automática (10s)</span>
               </div>
             </div>
          </div>

                     {/* Cards das conexões */}
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {conexoes
               .filter((conexao) => {
                 if (hiddenConnectionCardIds.has(conexao.id)) return false;
                 return true;
               })
               .map((conexao) => (
               <Card key={conexao.id} className="bg-white border border-gray-200 hover:shadow-md transition-shadow duration-200">
                 <CardHeader className="pb-4">
                   <div className="flex items-start justify-between">
                     <div className="flex items-center gap-3">
                       <div className={`w-12 h-12 ${conexao.cor} rounded-lg flex items-center justify-center`}>
                         {conexao.icone}
                       </div>
                       <div>
                         <CardTitle className="text-lg font-semibold text-gray-900">
                           {conexao.titulo}
                         </CardTitle>
                         <CardDescription className="text-sm text-gray-600 mt-1">
                           {conexao.descricao}
                         </CardDescription>
                       </div>
                     </div>
                     {getStatusBadge(conexao.status)}
                   </div>
                 </CardHeader>
                 
                 <CardContent className="space-y-4">
                   <div className="text-sm text-gray-500">
                     {conexao.id === 'gmail' ? 'Email conectado' : 'Última sincronização'}: {conexao.ultimaSincronizacao}
                   </div>
                   
                   {getActionButton(conexao)}
                 </CardContent>
               </Card>
             ))}
           </div>

           {/* Modal de Conexão do Facebook */}
           {showFacebookModal && (
             <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
               <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                 <div className="flex items-center justify-between mb-4">
                   <div className="flex items-center gap-3">
                     <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                       <Facebook className="h-6 w-6 text-white" />
                     </div>
                     <h3 className="text-lg font-semibold text-gray-900">Conectar Facebook Ads</h3>
                   </div>
                   <Button
                     variant="ghost"
                     size="sm"
                     onClick={() => setShowFacebookModal(false)}
                     className="h-8 w-8 p-0"
                   >
                     <X className="h-4 w-4" />
                   </Button>
                 </div>
                 
                 <p className="text-sm text-gray-600 mb-6">
                   Você será redirecionado para o Facebook para autorizar o acesso à sua conta de anúncios.
                 </p>
                 
                 <div className="flex gap-3">
                   <Button
                     variant="outline"
                     onClick={() => setShowFacebookModal(false)}
                     className="flex-1"
                   >
                     Cancelar
                   </Button>
                   <Button
                     onClick={handleFacebookConnect}
                     className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                   >
                     Conectar Facebook
                   </Button>
                 </div>
               </div>
             </div>
           )}

           {/* Modal de Conexão do Instagram */}
           {showInstagramModal && (
             <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
               <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                 <div className="flex items-center justify-between mb-4">
                   <div className="flex items-center gap-3">
                     <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                       <Instagram className="h-6 w-6 text-white" />
                     </div>
                     <h3 className="text-lg font-semibold text-gray-900">Conectar Instagram Business</h3>
                   </div>
                   <Button
                     variant="ghost"
                     size="sm"
                     onClick={() => setShowInstagramModal(false)}
                     className="h-8 w-8 p-0"
                   >
                     <X className="h-4 w-4" />
                   </Button>
                 </div>
                 
                 <p className="text-sm text-gray-600 mb-6">
                   Você será redirecionado para o Instagram para autorizar o acesso à sua conta Business.
                 </p>
                 
                 <div className="flex gap-3">
                   <Button
                     variant="outline"
                     onClick={() => setShowInstagramModal(false)}
                     className="flex-1"
                   >
                     Cancelar
                   </Button>
                   <Button
                     onClick={handleInstagramConnect}
                     className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                   >
                     Conectar Instagram
                   </Button>
                 </div>
               </div>
             </div>
           )}

           {/* Modal de Conexão do RD Station */}
          {showRdStationModal && (
            <RdStationConnectModal 
              onClose={() => setShowRdStationModal(false)}
              onConnect={handleRdStationConnect}
              isLoading={isLoading}
            />
          )}

          {showRdStationConfigModal && (
            <RdStationConfigModal 
              onClose={() => setShowRdStationConfigModal(false)}
            />
          )}

          {/* Modal de Conexão do Kommo */}
          {showKommoModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-700 rounded-lg flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Conectar CRM Kommo</h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowKommoModal(false)}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                {isKommoConnecting ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700 mx-auto mb-4"></div>
                    <h3 className="text-lg font-semibold mb-2">Conectando...</h3>
                    <p className="text-gray-600">
                      Aguarde enquanto conectamos com o CRM Kommo.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleKommoConnect} className="space-y-4">
                  <div>
                    <Label htmlFor="kommo-link">Link da Página Inicial</Label>
                    <Input
                      id="kommo-link"
                      type="url"
                      value={kommoLink}
                      onChange={(e) => setKommoLink(e.target.value)}
                      placeholder="https://seu-dominio.kommo.com"
                      className="mt-1"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      URL da página inicial da sua conta Kommo.
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="kommo-token">Token de Integração</Label>
                    <Input
                      id="kommo-token"
                      type="text"
                      value={kommoToken}
                      onChange={(e) => setKommoToken(e.target.value)}
                      placeholder="Cole aqui seu token do Kommo"
                      className="mt-1"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Você pode encontrar seu token nas configurações de integração do Kommo.
                    </p>
                  </div>
                  
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowKommoModal(false)}
                      className="flex-1"
                      disabled={isKommoConnecting}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 bg-blue-700 hover:bg-blue-800 text-white"
                      disabled={isKommoConnecting || !kommoLink.trim() || !kommoToken.trim()}
                    >
                      {isKommoConnecting ? 'Conectando...' : 'Conectar'}
                    </Button>
                  </div>
                </form>
                )}
              </div>
            </div>
          )}

          {/* Modal de Configuração do Kommo */}
          {showKommoConfigModal && (
            <KommoConfigModal 
              onClose={() => setShowKommoConfigModal(false)}
            />
          )}

          {/* Modal de Conexão do Gmail */}
          {showGmailModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
                      <Mail className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Conectar Gmail</h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowGmailModal(false)}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <p className="text-sm text-gray-600 mb-4">
                  Você será redirecionado para o Google para autorizar o acesso à sua conta Gmail.
                </p>

                <ul className="text-sm text-gray-500 space-y-1 mb-6 list-disc list-inside">
                  <li>Leitura e envio de e-mails</li>
                  <li>Acesso ao seu endereço de e-mail e perfil</li>
                </ul>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowGmailModal(false)}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                    onClick={handleGmailConnect}
                  >
                    Autorizar com Google
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Modal MCP — Conectar Ferramentas */}
          {showMcpModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Conectar Ferramentas MCP</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowMcpModal(false)}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Card ClickUp */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-700 rounded-lg flex items-center justify-center">
                      <Cpu className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">ClickUp</p>
                      <p className="text-xs text-gray-500">Gerencie tarefas e projetos</p>
                    </div>
                  </div>

                  {cliente?.int_clickup ? (
                    <div className="space-y-3">
                      <p className="text-sm text-green-600 font-medium">ClickUp conectado ✅</p>
                      <Button
                        variant="outline"
                        className="w-full text-red-600 border-red-300 hover:bg-red-50"
                        disabled={clickUpLoading}
                        onClick={async () => {
                          if (!user?.id) return;
                          setClickUpLoading(true);
                          try {
                            await clientesService.disconnectClickUp(user.id);
                            await loadConnectionStatus();
                          } finally {
                            setClickUpLoading(false);
                          }
                        }}
                      >
                        {clickUpLoading ? 'Desconectando...' : 'Desconectar'}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="clickup-token">API Token</Label>
                        <Input
                          id="clickup-token"
                          type="text"
                          value={clickUpToken}
                          onChange={(e) => setClickUpToken(e.target.value)}
                          placeholder="pk_xxxxxxxxxxxxxxxx"
                          className="mt-1"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Encontre em: ClickUp → Configurações → Apps → API Token
                        </p>
                      </div>
                      <Button
                        className="w-full bg-violet-600 hover:bg-violet-700 text-white"
                        disabled={!clickUpToken.trim() || clickUpLoading}
                        onClick={async () => {
                          if (!user?.id || !clickUpToken.trim()) return;
                          setClickUpLoading(true);
                          try {
                            await clientesService.setClickUpToken(user.id, clickUpToken.trim());
                            setClickUpToken('');
                            await loadConnectionStatus();
                          } finally {
                            setClickUpLoading(false);
                          }
                        }}
                      >
                        {clickUpLoading ? 'Conectando...' : 'Conectar'}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Componente do Modal RD Station
