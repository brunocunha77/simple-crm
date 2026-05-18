import { useEffect } from 'react';

export default function FacebookCallback() {
  useEffect(() => {
    // Aguardar um pouco para garantir que a página carregou completamente
    const timer = setTimeout(() => {
      try {
        // Verificar se window.opener existe (janela que abriu este popup)
        if (window.opener && !window.opener.closed) {
          // Enviar mensagem FACEBOOK_CONNECTED para a janela principal
          window.opener.postMessage({ type: 'FACEBOOK_CONNECTED' }, '*');
          void 0;
        } else {
          void 0;
        }
      } catch (error) {
        console.error('[Facebook Callback] ❌ Erro ao enviar mensagem:', error);
      }
      
      // Fechar a janela
      try {
        window.close();
        void 0;
      } catch (error) {
        console.error('[Facebook Callback] ❌ Erro ao fechar janela:', error);
        // Se não conseguir fechar, mostrar mensagem para o usuário
        document.body.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: center; height: 100vh; font-family: Arial, sans-serif;">
            <div style="text-align: center;">
              <h2 style="color: #1877f2; margin-bottom: 20px;">✓ Conectado com sucesso!</h2>
              <p style="color: #666;">Você pode fechar esta janela.</p>
            </div>
          </div>
        `;
      }
    }, 500); // Aguardar 500ms antes de enviar mensagem e fechar

    return () => {
      clearTimeout(timer);
    };
  }, []);

  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '100vh',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          border: '4px solid #1877f2',
          borderTopColor: 'transparent',
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 20px'
        }}></div>
        <h2 style={{ color: '#1877f2', margin: '0 0 10px 0' }}>Conectando Facebook...</h2>
        <p style={{ color: '#666', margin: 0 }}>Esta janela será fechada automaticamente.</p>
      </div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
