import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, X, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface RdStationConnectModalProps {
  onClose: () => void;
  onConnect: (token: string) => Promise<boolean>;
  isLoading: boolean;
}

export default function RdStationConnectModal({ 
  onClose, 
  onConnect, 
  isLoading 
}: RdStationConnectModalProps) {
  const { toast } = useToast();
  const [token, setToken] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;

    setIsConnecting(true);
    
    try {
      const success = await onConnect(token);
      
      if (success) {
        toast({
          title: "Sucesso",
          description: "Token conectado com sucesso! Agora você pode configurar o funil padrão.",
        });
        onClose();
      } else {
        toast({
          title: "Erro",
          description: "Erro ao conectar token. Verifique se o token está correto.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Erro ao conectar RD Station:', error);
      toast({
        title: "Erro",
        description: "Erro ao conectar RD Station",
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
            <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Conectar RD Station</h3>
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
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-orange-600 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Conectando...</h3>
            <p className="text-gray-600">
              Aguarde enquanto conectamos com o RD Station.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="rd-token">Token de Integração</Label>
              <Input
                id="rd-token"
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Cole aqui seu token do RD Station"
                className="mt-1"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Você pode encontrar seu token nas configurações de integração do RD Station.
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
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
                disabled={isConnecting || !token.trim()}
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
