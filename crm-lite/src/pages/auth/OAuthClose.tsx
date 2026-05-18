import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

export default function OAuthClose() {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Extrair parâmetros da URL
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    const clientId = searchParams.get('clientId');
    
    void 0;

    // Enviar mensagem para a janela pai (que abriu o popup)
    const message = {
      type: 'oauth-complete',
      success: success !== 'false',
      error: error || null,
      clientId: clientId || null
    };

    // Tentar enviar para window.opener (janela que abriu este popup)
    if (window.opener && !window.opener.closed) {
      try {
        // Enviar para a origem do app
        const allowedOrigins = [
          window.location.origin,
          'https://app.usesmartcrm.com',
          'http://localhost:8080',
          'http://localhost:5173'
        ];

        allowedOrigins.forEach(origin => {
          try {
            window.opener.postMessage(message, origin);
            void 0;
          } catch (e) {
            void 0;
          }
        });

        // Também tentar enviar para '*' (menos seguro, mas funciona)
        try {
          window.opener.postMessage(message, '*');
          void 0;
        } catch (e) {
          void 0;
        }
      } catch (error) {
        console.error('[OAuthClose] Erro ao enviar mensagem:', error);
      }
    } else {
      void 0;
    }

    // Fechar o popup após um pequeno delay
    setTimeout(() => {
      try {
        window.close();
        void 0;
      } catch (error) {
        console.error('[OAuthClose] Erro ao fechar popup:', error);
      }
    }, 500);
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Conectando...
        </h2>
        <p className="text-sm text-gray-600">
          Esta janela será fechada automaticamente.
        </p>
      </div>
    </div>
  );
}
