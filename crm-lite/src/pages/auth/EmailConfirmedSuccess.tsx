import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Mail, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function EmailConfirmedSuccess() {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/login');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  const handleGoToLogin = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-xl border-0">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              E-mail Confirmado!
            </CardTitle>
            <CardDescription className="text-gray-600 mt-2">
              Sua conta foi verificada com sucesso
            </CardDescription>
          </CardHeader>
          
          <CardContent className="text-center space-y-6">
            <div className="flex items-center justify-center space-x-2 text-green-600">
              <Mail className="w-5 h-5" />
              <span className="font-medium">E-mail verificado com sucesso</span>
            </div>
            
            <p className="text-gray-600 text-sm leading-relaxed">
              Agora você pode fazer login em sua conta e começar a usar todas as funcionalidades do sistema.
            </p>

            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <p className="text-blue-800 text-sm">
                <strong>Você será redirecionado automaticamente em {countdown} segundos...</strong>
              </p>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={handleGoToLogin}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                size="lg"
              >
                <span>Ir para o Login</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              
              <p className="text-xs text-gray-500">
                Ou aguarde o redirecionamento automático
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
