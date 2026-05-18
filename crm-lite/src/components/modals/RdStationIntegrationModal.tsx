import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Check, X, Zap, ArrowRight, Star, Settings } from 'lucide-react';
import { FunisRdService } from '@/services/funisRdService';
import { FunilRD, EtapaFunilRD } from '@/types/global';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

interface RdStationIntegrationModalProps {
  onClose: () => void;
  onConnect: (token: string) => Promise<boolean>;
  onComplete: () => void;
  isLoading: boolean;
}

type IntegrationStep = 'token' | 'loading';

export default function RdStationIntegrationModal({ 
  onClose, 
  onConnect, 
  onComplete,
  isLoading 
}: RdStationIntegrationModalProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<IntegrationStep>('token');
  const [token, setToken] = useState('');


  const handleTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;

    void 0;
    setCurrentStep('loading');
    
    try {
      const success = await onConnect(token);
      void 0;
      
      if (success) {
        void 0;
        toast({
          title: "Sucesso",
          description: "Token conectado com sucesso! Agora você pode configurar o funil padrão.",
        });
        onComplete(); // Fechar o modal
      } else {
        void 0;
        setCurrentStep('token');
      }
    } catch (error) {
      console.error('❌ Erro ao conectar RD Station:', error);
      setCurrentStep('token');
    }
  };

  const waitForFunisToLoad = async () => {
    // Aguardar 3 segundos para o webhook processar
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    try {
      void 0;
      
      // Consulta simples e direta
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const userMetadata = user.user_metadata || {};
      const id_cliente = userMetadata.id_cliente || userMetadata?.raw_user_meta_data?.id_cliente;
      
      if (!id_cliente) {
        throw new Error('ID do cliente não encontrado');
      }

      void 0;

      const { data, error } = await supabase
        .from('funis_rd')
        .select('*')
        .eq('id_cliente', id_cliente)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erro na consulta:', error);
        throw error;
      }

      void 0;

      if (data && data.length > 0) {
        // Processar os dados para garantir que funil_padrao seja boolean
        const processedData = data.map(funil => ({
          ...funil,
          funil_padrao: funil.funil_padrao === true || funil.funil_padrao === 'true'
        }));

        setFunisRd(processedData);
        setCurrentStep('select-funil');
      } else {
        toast({
          title: "Aviso",
          description: "Nenhum funil foi encontrado no RD Station. Verifique se o token está correto.",
          variant: "destructive"
        });
        setCurrentStep('token');
      }
    } catch (error) {
      console.error('❌ Erro ao buscar funis:', error);
      toast({
        title: "Erro",
        description: "Erro ao buscar funis do RD Station",
        variant: "destructive"
      });
      setCurrentStep('token');
    }
  };

  const handleSelectFunil = async (funilId: number) => {
    setSelectedFunilId(funilId);
    
    try {
      const funilCompleto = await FunisRdService.getFunilRdComEtapas(funilId);
      if (funilCompleto) {
        setEtapas(funilCompleto.etapas);
        
        // Inicializar palavras-chave existentes
        const palavrasIniciais: Record<number, string> = {};
        funilCompleto.etapas.forEach(etapa => {
          palavrasIniciais[etapa.id] = etapa.palavra_chave || '';
        });
        setPalavrasChave(palavrasIniciais);
        
        setCurrentStep('configure-keywords');
      }
    } catch (error) {
      console.error('Erro ao carregar etapas do funil:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as etapas do funil",
        variant: "destructive"
      });
    }
  };

  const handleSetFunilPadrao = async () => {
    if (!selectedFunilId) return;

    setIsConfiguring(true);
    try {
      const success = await FunisRdService.setFunilRdPadrao(selectedFunilId);
      if (success) {
        toast({
          title: "Sucesso",
          description: "Funil definido como padrão com sucesso!",
        });
        setCurrentStep('completed');
      } else {
        toast({
          title: "Erro",
          description: "Não foi possível definir o funil como padrão",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Erro ao definir funil padrão:', error);
      toast({
        title: "Erro",
        description: "Erro ao definir funil padrão",
        variant: "destructive"
      });
    } finally {
      setIsConfiguring(false);
    }
  };

  const handleSaveKeywords = async () => {
    setIsConfiguring(true);
    try {
      const etapasParaAtualizar = Object.entries(palavrasChave)
        .filter(([_, palavra]) => palavra.trim() !== '')
        .map(([id, palavra]) => ({ id: parseInt(id), palavra_chave: palavra }));

      if (etapasParaAtualizar.length > 0) {
        const success = await FunisRdService.atualizarPalavrasChaveEtapas(etapasParaAtualizar);
        if (!success) {
          toast({
            title: "Erro",
            description: "Erro ao salvar palavras-chave",
            variant: "destructive"
          });
          return;
        }
      }

      await handleSetFunilPadrao();
    } catch (error) {
      console.error('Erro ao salvar palavras-chave:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar palavras-chave",
        variant: "destructive"
      });
    } finally {
      setIsConfiguring(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'token':
        return (
          <form onSubmit={handleTokenSubmit} className="space-y-4">
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
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
                disabled={isLoading || !token.trim()}
              >
                {isLoading ? 'Conectando...' : 'Conectar'}
              </Button>
            </div>
          </form>
        );

      case 'loading':
        return (
          <div className="text-center py-8">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-orange-600 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Conectando...</h3>
            <p className="text-gray-600">
              Aguarde enquanto conectamos com o RD Station.
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Integração RD Station</h3>
              <p className="text-sm text-gray-500">
                {currentStep === 'token' && 'Conecte sua conta do RD Station'}
                {currentStep === 'loading' && 'Buscando funis...'}
                {currentStep === 'select-funil' && 'Escolha o funil padrão'}
                {currentStep === 'configure-keywords' && 'Configure as palavras-chave'}
                {currentStep === 'completed' && 'Integração concluída'}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
            disabled={currentStep === 'loading'}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {renderStepContent()}
      </div>
    </div>
  );
}
