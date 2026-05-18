import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const UpdatePassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    void 0;
    
    // Verificar se há uma sessão ativa
    const checkSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      void 0;
      
      if (session) {
        void 0;
        setSessionReady(true);
      } else {
        void 0;
        // Verificar se há parâmetros de recuperação de senha na URL
        const urlParams = new URLSearchParams(window.location.search);
        const accessToken = urlParams.get('access_token');
        const refreshToken = urlParams.get('refresh_token');
        const type = urlParams.get('type');
        
        void 0;
        
        if (accessToken && refreshToken && type === 'recovery') {
          void 0;
          setIsPasswordRecovery(true);
          
          // Tentar fazer login com os tokens
          const { data, error: signInError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
          
          if (signInError) {
            console.error('❌ Erro ao definir sessão:', signInError);
            toast.error('Link de recuperação inválido ou expirado');
            navigate('/forgot-password');
            return;
          }
          
          if (data.session) {
            void 0;
            setSessionReady(true);
          }
        } else {
          void 0;
          toast.error('Link de recuperação inválido');
          navigate('/forgot-password');
        }
      }
    };

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      void 0;
      
      if (event === 'PASSWORD_RECOVERY') {
        void 0;
        setIsPasswordRecovery(true);
        setSessionReady(true);
      } else if (event === 'SIGNED_IN' && session) {
        void 0;
        setSessionReady(true);
      }
    });

    checkSession();

    return () => {
      void 0;
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('As senhas não conferem.');
      return;
    }
    
    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    
    setLoading(true);
    void 0;

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        console.error('❌ Erro ao atualizar senha:', error);
        toast.error(`Erro: ${error.message}`);
      } else {
        void 0;
        toast.success('Senha atualizada com sucesso! Você será redirecionado para o login.');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    } catch (error) {
      console.error('❌ Erro inesperado:', error);
      toast.error('Erro inesperado ao atualizar senha');
    } finally {
      setLoading(false);
    }
  };

  if (!sessionReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Carregando...</h1>
          <p className="text-gray-500">Aguarde enquanto preparamos o ambiente para você.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Crie sua nova senha</h1>
          {isPasswordRecovery && (
            <p className="text-sm text-gray-600 mt-2">
              Recuperação de senha
            </p>
          )}
        </div>
        <form onSubmit={handleUpdatePassword} className="space-y-6">
          <div>
            <label htmlFor="password-input" className="sr-only">
              Nova Senha
            </label>
            <Input
              id="password-input"
              type="password"
              placeholder="Digite a nova senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <div>
            <label htmlFor="confirm-password-input" className="sr-only">
              Confirmar Nova Senha
            </label>
            <Input
              id="confirm-password-input"
              type="password"
              placeholder="Confirme a nova senha"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Atualizando...' : 'Atualizar Senha'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default UpdatePassword; 