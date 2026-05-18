import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth";
import { clientesService } from "@/services/clientesService";

export default function FacebookConnection({ clientId, onSuccess, onError }) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [popup, setPopup] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    const handleMessage = (event) => {
      void 0;

      // Aceitar mensagens de:
      // 1. Webhook dev e app (originais)
      // 2. Mesmo domínio (para rota /oauth-close)
      // 3. Localhost (desenvolvimento)
      const allowedOrigins = [
        "https://webhook.dev.usesmartcrm.com",
        "https://app.usesmartcrm.com",
        window.location.origin, // Mesmo domínio (para /oauth-close)
        "http://localhost:8080",
        "http://localhost:5173",
        "*" // Aceitar de qualquer origem se a mensagem for válida (menos seguro, mas funciona)
      ];

      // Verificar se a origem é permitida OU se é do mesmo domínio
      const isAllowedOrigin = allowedOrigins.includes(event.origin) || 
                             event.origin === window.location.origin ||
                             allowedOrigins.includes("*");

      if (!isAllowedOrigin) {
        void 0;
        return;
      }

      const data = event.data;

      // Verificar se é uma mensagem de OAuth completa
      if (data?.type === "oauth-complete") {
        void 0;

        // Fechar popup se ainda estiver aberto
        if (popup && !popup.closed) {
          try {
            popup.close();
            void 0;
          } catch (e) {
            console.error('[Facebook OAuth] Erro ao fechar popup:', e);
          }
        }
        
        // Verificar se há erro
        if (data.success === false || data.error) {
          setIsConnecting(false);
          setPopup(null);
          onError?.(data.error || "OAuth falhou");
        } else {
          // Se não há erro, não chamar onSuccess ainda
          // Deixar o polling verificar se token_facebook foi preenchido
          void 0;
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [popup, onSuccess, onError]);

  useEffect(() => {
    if (!popup) return;

    const callbackUrl = "https://webhook.dev.usesmartcrm.com/webhook/auth/facebook/callback";
    let lastUrl = '';
    let checkCount = 0;
    const maxChecks = 300; // 5 minutos máximo (300 * 1 segundo)
    
    const timer = setInterval(() => {
      checkCount++;
      
      // Verificar se o popup foi fechado manualmente
      if (popup.closed) {
        void 0;
        setIsConnecting(false);
        setPopup(null);
        clearInterval(timer);
        return;
      }

      // Timeout de segurança - fechar após muito tempo
      if (checkCount >= maxChecks) {
        void 0;
        try {
          if (popup && !popup.closed) {
            popup.close();
          }
        } catch (e) {
          console.error('[Facebook OAuth] Erro ao fechar popup no timeout:', e);
        }
        setIsConnecting(false);
        setPopup(null);
        clearInterval(timer);
        onError?.('Timeout: O processo de autenticação demorou muito.');
        return;
      }

      // Tentar verificar a URL do popup para detectar redirecionamento
      try {
        // Acessar a URL do popup (pode falhar por CORS se ainda estiver no Facebook)
        const popupUrl = popup.location.href;
        
        // Log apenas quando a URL mudar
        if (popupUrl !== lastUrl) {
          void 0;
          lastUrl = popupUrl;
        }
        
        // Se a URL contém o callback do webhook, significa que o OAuth foi concluído
        if (popupUrl.includes(callbackUrl) || popupUrl.includes('/webhook/auth/facebook')) {
          void 0;
          
          // Dar um pequeno delay para garantir que o webhook processou
          setTimeout(() => {
            try {
              // Fechar o popup
              if (popup && !popup.closed) {
                void 0;
                popup.close();
                void 0;
              }
            } catch (closeError) {
              console.error('[Facebook OAuth] Erro ao fechar popup:', closeError);
              // Tentar forçar fechamento
              try {
                popup.close();
              } catch (e) {
                console.error('[Facebook OAuth] Erro ao forçar fechamento:', e);
              }
            }
            
            // Não fechar o popup nem chamar callbacks aqui
            // O polling vai verificar quando token_facebook for preenchido
            clearInterval(timer);
            
            // Verificar se há parâmetros de erro na URL
            try {
              const urlParams = new URL(popupUrl).searchParams;
              const error = urlParams.get('error');
              
              void 0;
              
              if (error) {
                // Se houver erro explícito, chamar onError
                setIsConnecting(false);
                setPopup(null);
                onError?.(error);
              } else {
                // Se não há erro, apenas fechar o popup e deixar o polling verificar as condições
                void 0;
                // O polling vai verificar token_facebook
              }
            } catch (urlError) {
              // Se não conseguir parsear a URL, deixar o polling verificar
              void 0;
            }
          }, 500); // Delay de 500ms antes de fechar
          
          // Parar o intervalo imediatamente
          clearInterval(timer);
        }
      } catch (error) {
        // Erro de CORS é esperado quando o popup ainda está no Facebook
        // Isso é normal e não é um problema
        // Apenas continuar verificando
        // Log apenas a cada 10 verificações para não poluir o console
        if (checkCount % 10 === 0) {
          // Silencioso - CORS é esperado
        }
      }
    }, 1000); // Verificar a cada 1 segundo (mais eficiente)

    return () => clearInterval(timer);
  }, [popup, onSuccess, onError]);

  // Polling para verificar se o token foi salvo no banco (Solução mais confiável)
  useEffect(() => {
    if (!popup || !isConnecting || !user?.id) return;

    let pollCount = 0;
    const maxPolls = 120; // 2 minutos máximo (120 * 1 segundo)
    let tokenFound = false;

    const pollTimer = setInterval(async () => {
      pollCount++;

      // Timeout de segurança
      if (pollCount >= maxPolls) {
        void 0;
        clearInterval(pollTimer);
        return;
      }

      // Não parar o polling se o popup foi fechado
      // Continuar verificando até que token_facebook seja preenchido

      try {
        // Limpar cache para garantir dados atualizados
        clientesService.clearCache(user.id);
        
        // Buscar dados do cliente
        const cliente = await clientesService.getClienteByUserId(user.id);
        
        // Verificar se token_facebook foi preenchido (única fonte de verdade)
        const facebookConectado = !!cliente?.token_facebook && cliente.token_facebook.trim() !== '';
        
        // Log detalhado a cada verificação
        if (pollCount % 5 === 0 || facebookConectado) {
          void 0;
        }
        
        if (facebookConectado) {
          void 0;
          tokenFound = true;
          
          // Parar polling
          clearInterval(pollTimer);
          
          // Fechar popup
          try {
            if (popup && !popup.closed) {
              void 0;
              popup.close();
              void 0;
            }
          } catch (closeError) {
            console.error('[Facebook OAuth] Erro ao fechar popup:', closeError);
          }
          
          setIsConnecting(false);
          setPopup(null);
          
          // Chamar onSuccess quando token_facebook for preenchido
          void 0;
          onSuccess?.({ success: true, source: 'polling' });
        } else {
          // Log apenas a cada 5 verificações para não poluir
          if (pollCount % 5 === 0) {
            void 0;
          }
        }
      } catch (error) {
        console.error('[Facebook OAuth] Erro no polling:', error);
        // Continuar tentando mesmo com erro
      }
    }, 1000); // Verificar a cada 1 segundo

    return () => {
      clearInterval(pollTimer);
      if (tokenFound) {
        void 0;
      }
    };
  }, [popup, isConnecting, user?.id, onSuccess]);

  const handleConnect = async () => {
    void 0;
    
    if (!clientId) {
      console.error('[FacebookConnection] clientId não fornecido');
      onError?.("Client ID não configurado.");
      return;
    }

    setIsConnecting(true);

    const facebookAuthUrl = new URL("https://www.facebook.com/v23.0/dialog/oauth");
    facebookAuthUrl.searchParams.append("client_id", clientId);
    facebookAuthUrl.searchParams.append(
      "redirect_uri",
      "https://webhook.dev.usesmartcrm.com/webhook/auth/facebook/callback"
    );
    facebookAuthUrl.searchParams.append("state", clientId);
    facebookAuthUrl.searchParams.append(
      "scope",
      "ads_management,ads_read,business_management"
    );
    facebookAuthUrl.searchParams.append("response_type", "code");

    const width = 600;
    const height = 700;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    void 0;

    const popupWindow = window.open(
      facebookAuthUrl.toString(),
      "FacebookAuth",
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes`
    );

    if (!popupWindow) {
      console.error('[FacebookConnection] Popup bloqueado');
      setIsConnecting(false);
      onError?.("Popup bloqueado. Permita popups para conectar com o Facebook.");
      return;
    }

    void 0;
    setPopup(popupWindow);
    popupWindow.focus();
  };

  return (
    <button 
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void 0;
        handleConnect();
      }} 
      disabled={isConnecting}
      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      style={{ width: '100%' }}
    >
      {isConnecting ? "Conectando..." : "Conectar Facebook"}
    </button>
  );
}
