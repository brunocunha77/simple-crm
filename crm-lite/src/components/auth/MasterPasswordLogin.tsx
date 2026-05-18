import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Eye, EyeOff, User, Lock } from "lucide-react";
import { useMasterPassword } from "@/hooks/useMasterPassword";
import { toast } from "sonner";

interface MasterPasswordLoginProps {
  onSuccess: (email: string) => void;
  onCancel: () => void;
}

export const MasterPasswordLogin: React.FC<MasterPasswordLoginProps> = ({
  onSuccess,
  onCancel
}) => {
  const [email, setEmail] = useState('');
  const [masterPassword, setMasterPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { authenticateWithMasterPassword } = useMasterPassword();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim() || !masterPassword.trim()) {
      setError('Por favor, preencha todos os campos');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const success = await authenticateWithMasterPassword(email.trim(), masterPassword);
      
      if (success) {
        toast.success(`🔑 Acesso mestra concedido para ${email}`);
        // Redirecionar para o dashboard após sucesso
        window.location.href = '/';
      } else {
        setError('Email não encontrado ou senha mestra incorreta');
      }
    } catch (error) {
      setError('Erro ao autenticar. Tente novamente.');
      console.error('Erro na autenticação mestra:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
          <Shield className="w-8 h-8 text-white" />
        </div>
        <CardTitle className="text-2xl font-bold text-gray-900">
          Acesso Mestra
        </CardTitle>
        <p className="text-gray-600 text-sm">
          Digite o email da conta que deseja acessar e a senha mestra
        </p>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Campo Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-gray-700">
              Email da Conta
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                id="email"
                type="email"
                placeholder="usuario@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                disabled={isLoading}
                required
              />
            </div>
          </div>

          {/* Campo Senha Mestra */}
          <div className="space-y-2">
            <Label htmlFor="masterPassword" className="text-sm font-medium text-gray-700">
              Senha Mestra
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                id="masterPassword"
                type={showPassword ? "text" : "password"}
                placeholder="Digite a senha mestra"
                value={masterPassword}
                onChange={(e) => setMasterPassword(e.target.value)}
                className="pl-10 pr-10"
                disabled={isLoading}
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4 text-gray-400" />
                ) : (
                  <Eye className="w-4 h-4 text-gray-400" />
                )}
              </Button>
            </div>
          </div>

          {/* Mensagem de Erro */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Botões */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1"
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Acessando...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Acessar Conta
                </div>
              )}
            </Button>
          </div>
        </form>

        {/* Informações de Segurança */}
        <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2">
            <Shield className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-blue-800">
              <p className="font-medium mb-1">🔒 Segurança</p>
              <p>• Este acesso é registrado para auditoria</p>
              <p>• Use apenas para suporte técnico</p>
              <p>• Não compartilhe a senha mestra</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

