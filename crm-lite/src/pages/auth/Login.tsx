import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useTemaLogin } from "@/hooks/useTemaLogin";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signIn, error } = useAuth();
  const { tema, hasTema } = useTemaLogin();

  // Debug: Verificar tema carregado
  void 0;
  void 0;
  void 0;

  // Aplicar estilos CSS dinâmicos para o botão de login
  useEffect(() => {
    if (hasTema && tema?.cor_botao) {
      const styleId = 'login-button-style';
      let styleElement = document.getElementById(styleId) as HTMLStyleElement;

      if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = styleId;
        document.head.appendChild(styleElement);
      }

      styleElement.textContent = `
        .login-button-custom,
        .login-button-custom.bg-primary,
        button[type="submit"].login-button-custom {
          background-color: ${tema.cor_botao} !important;
          border-color: ${tema.cor_botao} !important;
        }
        .login-button-custom:hover,
        .login-button-custom.bg-primary:hover,
        button[type="submit"].login-button-custom:hover {
          background-color: ${tema.cor_botao} !important;
          opacity: 0.9;
        }
      `;

      void 0;
    }

    return () => {
      const styleElement = document.getElementById('login-button-style');
      if (styleElement) {
        styleElement.remove();
      }
    };
  }, [hasTema, tema]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      void 0;
      await signIn(email, password);
    } catch (error) {
      console.error("Erro no login:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Estilos inline baseados no tema (se houver)
  const loginStyles = hasTema && tema ? {
    background: tema.cor_primaria || '#ffffff'
  } : {};

  const logoSrc = hasTema && tema?.logo_url 
    ? tema.logo_url 
    : "/lovable-uploads/14b51735-5bca-4815-8a9a-30f309cc5b38.png";

  // Logo: altura confortável no card (~400px); largura limitada para logos horizontais
  const logoClassName =
    "mx-auto h-20 w-auto max-h-28 min-h-[4.5rem] max-w-[min(100%,18rem)] sm:h-24 sm:max-h-32 sm:max-w-[20rem] object-contain";

  return (
    <div className="flex items-center justify-center min-h-screen" style={loginStyles}>
      <Card className="w-[400px] shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="flex min-h-[5.5rem] items-center justify-center px-2 pb-2 pt-1 sm:min-h-[6.5rem]">
            <img
              src={logoSrc}
              alt="Logo"
              className={logoClassName}
            />
          </div>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>
            Acesse sua conta para continuar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
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
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-sm font-medium">
                    Senha
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-xs text-primary hover:underline"
                  >
                    Esqueceu a senha?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button 
                type="submit" 
                className={`w-full ${hasTema && tema?.cor_botao ? 'login-button-custom' : ''}`}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Entrando..." : "Entrar"}
              </Button>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col">
          <div className="text-center text-sm">
            Não tem uma conta?{" "}
            <Link to="/signup" className="text-primary hover:underline">
              Cadastre-se
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
