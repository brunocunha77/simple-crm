import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Wifi, WifiOff, CheckCircle } from "lucide-react";
import { WebhookService } from "@/services/webhookService";
import { useTemaLogin } from "@/hooks/useTemaLogin";

// 🎯 Declaração de tipo para Facebook Pixel
declare global {
  interface Window {
    fbq: any;
  }
}

export default function Signup() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { signUp, error } = useAuth();
  const navigate = useNavigate();
  const { tema, hasTema } = useTemaLogin();
  const [success, setSuccess] = useState(false);
  const [timer, setTimer] = useState(5);

  // Monitorar o status da conexão
  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 🎯 Facebook Pixel ViewContent - Disparado ao carregar a página
  React.useEffect(() => {
    if (typeof window !== 'undefined' && window.fbq) {
      window.fbq('track', 'ViewContent', {
        content_name: 'Cadastro de Usuário',
        content_category: 'Signup',
        value: 1,
        currency: 'BRL'
      });
      void 0;
    }
  }, []);

  // 🎯 Tags de conversão - disparadas apenas quando a tela de sucesso é exibida
  React.useEffect(() => {
    if (!success) return;
    if (typeof window === 'undefined') return;

    // Facebook Pixel - CompleteRegistration
    if (window.fbq) {
      window.fbq('track', 'CompleteRegistration', {
        content_name: 'Cadastro de Usuário',
        content_category: 'Signup',
        value: 1,
        currency: 'BRL'
      });
      void 0;
    }

    // Google Tag Manager
    if (window.dataLayer) {
      window.dataLayer.push({
        event: 'user_signed_up',
        signupMethod: 'email',
      });
      void 0;
    }

    // Mixpanel
    if (window.mixpanel) {
      window.mixpanel.track('User Signup', {
        signupMethod: 'email',
        timestamp: new Date().toISOString()
      });
      void 0;
    }
  }, [success]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError("");
    
    // Verificar conexão antes de tentar o cadastro
    if (!isOnline) {
      setValidationError("Você está offline. Verifique sua conexão com a internet e tente novamente.");
      return;
    }
    
    if (!firstName || !lastName || !email || !phone) {
      setValidationError("Por favor preencha todos os campos");
      return;
    }
    
    if (password !== confirmPassword) {
      setValidationError("As senhas não coincidem");
      return;
    }
    
    if (password.length < 6) {
      setValidationError("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // console.log("Enviando formulário de cadastro:", { email, firstName, lastName, phone });
      await signUp(email, password, firstName, lastName, phone);
      
      // 📡 ENVIAR DADOS PARA WEBHOOK APÓS CADASTRO BEM-SUCEDIDO
      try {
        const webhookResult = await WebhookService.sendUserSignup(
          `${firstName} ${lastName}`,
          phone,
          email
        );
        
        if (webhookResult.success) {
          void 0;
        } else {
          void 0;
        }
      } catch (webhookError) {
        console.error('❌ Erro ao enviar dados para webhook:', webhookError);
        // Não interrompe o fluxo de sucesso do cadastro
      }
      
      setSuccess(true);
      setIsSubmitting(false);
      let countdown = 5;
      setTimer(countdown);
      const interval = setInterval(() => {
        countdown -= 1;
        setTimer(countdown);
        if (countdown === 0) {
          clearInterval(interval);
          navigate("/login");
        }
      }, 1000);
      return;
    } catch (error: any) {
      console.error("Erro no formulário de cadastro:", error);
      
      // Tratamento específico para erros de conexão na interface
      if (error.message?.includes("Failed to fetch") || 
          error.name === "AuthRetryableFetchError" || 
          !isOnline) {
        setValidationError("Falha na conexão com o servidor. Verifique sua internet e tente novamente.");
      }
      
      setIsSubmitting(false);
    }
  };

  const signupStyles = hasTema && tema ? {
    background: tema.cor_primaria || "#ffffff",
  } : {};

  const logoSrc =
    hasTema && tema?.logo_url
      ? tema.logo_url
      : "/lovable-uploads/14b51735-5bca-4815-8a9a-30f309cc5b38.png";

  const logoClassName =
    "mx-auto h-20 w-auto max-h-28 min-h-[4.5rem] max-w-[min(100%,18rem)] sm:h-24 sm:max-h-32 sm:max-w-[20rem] object-contain";

  return (
    <div
      className="flex items-center justify-center min-h-screen bg-white"
      style={Object.keys(signupStyles).length ? signupStyles : undefined}
    >
      <Card className="w-[400px] shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="flex min-h-[5.5rem] items-center justify-center px-2 pb-2 pt-1 sm:min-h-[6.5rem]">
            <img
              src={logoSrc}
              alt="SmartCRM Logo"
              className={logoClassName}
            />
          </div>
          <CardTitle className="text-2xl">Criar Conta</CardTitle>
          <CardDescription>
            Preencha os dados abaixo para criar sua conta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {success ? (
            <Alert variant="default" className="flex flex-col items-center text-center">
              <CheckCircle className="h-8 w-8 text-green-600 mb-2" />
              <AlertDescription>
                Cadastro realizado com sucesso!<br />
                Enviamos um e-mail de confirmação para <b>{email}</b>.<br />
                Você será redirecionado para o login em {timer} segundos.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {!isOnline && (
                <Alert variant="destructive">
                  <WifiOff className="h-4 w-4" />
                  <AlertDescription>
                    Você está offline. Conecte-se à internet para criar uma conta.
                  </AlertDescription>
                </Alert>
              )}
              {(error || validationError) && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {validationError || error}
                  </AlertDescription>
                </Alert>
              )}
              <form onSubmit={handleSubmit} className="signup-form">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="firstName" className="text-sm font-medium">
                        Nome
                      </label>
                      <Input
                        id="firstName"
                        placeholder="João"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="lastName" className="text-sm font-medium">
                        Sobrenome
                      </label>
                      <Input
                        id="lastName"
                        placeholder="Silva"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium">
                      Email
                    </label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="phone" className="text-sm font-medium">
                      Telefone
                    </label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="(00) 00000-0000"
                      value={phone}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        if (value.length <= 11) {
                          const formatted = value.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
                          setPhone(formatted);
                        }
                      }}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="password" className="text-sm font-medium">
                      Senha
                    </label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="confirmPassword" className="text-sm font-medium">
                      Confirmar Senha
                    </label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={isSubmitting || !isOnline}
                  >
                    {isSubmitting ? "Cadastrando..." : "Cadastrar"}
                  </Button>
                </div>
              </form>
            </>
          )}
        </CardContent>
        <CardFooter className="flex flex-col">
          <div className="text-center text-sm">
            Já tem uma conta?{" "}
            <Link to="/login" className="text-primary hover:underline">
              Faça login
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
