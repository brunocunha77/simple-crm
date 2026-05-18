import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, X, Building2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface KommoConnectModalProps {
  onClose: () => void;
  isLoading: boolean;
}

export default function KommoConnectModal({ 
  onClose, 
  isLoading 
}: KommoConnectModalProps) {
  const { toast } = useToast();
  const [link, setLink] = useState('');
  const [token, setToken] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!link.trim() || !token.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos.",
        variant: "destructive"
      });
      return;
    }

    setIsConnecting(true);
    
    try {
      // TODO: Implementar conexão com o banco de dados
      // Por enquanto, apenas simular o processo
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Sucesso",
        description: "Conexão com Kommo configurada com sucesso!",
      });
      onClose();
    } catch (error) {
      console.error('Erro ao conectar Kommo:', error);
      toast({
        title: "Erro",
        description: "Erro ao conectar com Kommo. Verifique os dados informados.",
        variant: "destructive"
      });
    } finally {
      setIsConnecting(false);
    }
  };

  return (
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
            onClick={onClose}
            className="h-8 w-8 p-0"
            disabled={isConnecting}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {isConnecting ? (
          <div className="text-center py-8">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-700 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Conectando...</h3>
            <p className="text-gray-600">
              Aguarde enquanto conectamos com o CRM Kommo.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="kommo-link">Link da Página Inicial</Label>
              <Input
                id="kommo-link"
                type="url"
                value={link}
                onChange={(e) => setLink(e.target.value)}
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
                value={token}
                onChange={(e) => setToken(e.target.value)}
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
                onClick={onClose}
                className="flex-1"
                disabled={isConnecting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-blue-700 hover:bg-blue-800 text-white"
                disabled={isConnecting || !link.trim() || !token.trim()}
              >
                {isConnecting ? 'Conectando...' : 'Conectar'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
