import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

/**
 * Componente para detectar códigos de confirmação de email na URL da raiz
 * e implementar timeout de 2 segundos para redirecionar para /login
 */
export const EmailConfirmationHandler = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Verificar se há um código na URL (confirmação de email)
    const code = searchParams.get('code');
    
    if (code) {
      void 0;
      void 0;
      void 0;
      
      // Tentar processar o código de confirmação
      const processConfirmationCode = async () => {
        try {
          void 0;
          
          // Usar exchangeCodeForSession para confirmar o email
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          
          if (error) {
            console.error('❌ [EMAIL CONFIRMATION] Erro ao processar código:', error);
            void 0;
            
            // Aguardar 2 segundos e redirecionar para login
            setTimeout(() => {
              void 0;
              navigate('/login');
            }, 2000);
            return;
          }
          
          if (data.session) {
            void 0;
            void 0;
            
            // Limpar a URL removendo os parâmetros de confirmação
            window.history.replaceState({}, document.title, window.location.pathname);
            
            // Comentado temporariamente - confirmação de e-mail desabilitada no Supabase
            // Redirecionar imediatamente para a página de sucesso
            // console.log('🚪 [EMAIL CONFIRMATION] Redirecionando para /email-confirmed');
            // navigate('/email-confirmed');
            
            // Redirecionar diretamente para login já que não há mais confirmação de e-mail
            void 0;
            navigate('/login');
          } else {
            void 0;
            setTimeout(() => {
              void 0;
              navigate('/login');
            }, 2000);
          }
          
        } catch (error) {
          console.error('❌ [EMAIL CONFIRMATION] Erro inesperado:', error);
          setTimeout(() => {
            void 0;
            navigate('/login');
          }, 2000);
        }
      };
      
      // Processar o código imediatamente
      processConfirmationCode();
    }
  }, [searchParams, navigate]);

  // Este componente não renderiza nada, apenas executa a lógica
  return null;
};
