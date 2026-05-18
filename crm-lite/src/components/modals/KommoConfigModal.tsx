import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Check, X, Building2, Star, Settings } from 'lucide-react';
import { FunilKommo, EtapaFunilKommo } from '@/types/global';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

interface KommoConfigModalProps {
  onClose: () => void;
}

export default function KommoConfigModal({ onClose }: KommoConfigModalProps) {
  const { toast } = useToast();
  const [funisKommo, setFunisKommo] = useState<FunilKommo[]>([]);
  const [selectedFunilId, setSelectedFunilId] = useState<number | null>(null);
  const [etapas, setEtapas] = useState<EtapaFunilKommo[]>([]);
  const [palavrasChave, setPalavrasChave] = useState<Record<number, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<'select-funil' | 'configure-keywords' | 'completed'>('select-funil');

  // Carregar funis ao abrir o modal
  useEffect(() => {
    loadFunis();
  }, []);

  const loadFunis = async () => {
    try {
      setIsLoading(true);
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
        .from('funis_kommo')
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

        setFunisKommo(processedData);
      } else {
        toast({
          title: "Aviso",
          description: "Nenhum funil foi encontrado. Conecte primeiro os dados do Kommo.",
          variant: "destructive"
        });
        onClose();
      }
    } catch (error) {
      console.error('❌ Erro ao carregar funis:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar funis do Kommo",
        variant: "destructive"
      });
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectFunil = async (funilId: number) => {
    setSelectedFunilId(funilId);
    
    try {
      // Buscar etapas do funil selecionado
      const funil = funisKommo.find(f => f.id === funilId);
      if (!funil) return;

      const { data: etapasData, error } = await supabase
        .from('etapas_funis_kommo')
        .select('*')
        .eq('id_funil_kommo', funil.id_funil_kommo)
        .eq('id_cliente', funil.id_cliente)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ Erro ao buscar etapas:', error);
        throw error;
      }

      setEtapas(etapasData || []);
      
      // Inicializar palavras-chave existentes
      const palavrasIniciais: Record<number, string> = {};
      (etapasData || []).forEach(etapa => {
        palavrasIniciais[etapa.id] = etapa.palavra_chave || '';
      });
      setPalavrasChave(palavrasIniciais);
      
      setCurrentStep('configure-keywords');
    } catch (error) {
      console.error('❌ Erro ao carregar etapas:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar etapas do funil",
        variant: "destructive"
      });
    }
  };

  const handleSetFunilPadrao = async () => {
    if (!selectedFunilId) return;

    setIsLoading(true);
    try {
      // Primeiro, remover o padrão de todos os funis do cliente
      const { data: { user } } = await supabase.auth.getUser();
      const userMetadata = user?.user_metadata || {};
      const id_cliente = userMetadata.id_cliente || userMetadata?.raw_user_meta_data?.id_cliente;

      if (!id_cliente) throw new Error('ID do cliente não encontrado');

      const { error: removeError } = await supabase
        .from('funis_kommo')
        .update({ funil_padrao: false })
        .eq('id_cliente', id_cliente);

      if (removeError) throw removeError;

      // Depois, definir o funil selecionado como padrão
      const { error: setError } = await supabase
        .from('funis_kommo')
        .update({ funil_padrao: true })
        .eq('id', selectedFunilId)
        .eq('id_cliente', id_cliente);

      if (setError) throw setError;

      toast({
        title: "Sucesso",
        description: "Funil definido como padrão com sucesso!",
      });

      setCurrentStep('completed');
    } catch (error) {
      console.error('❌ Erro ao definir funil padrão:', error);
      toast({
        title: "Erro",
        description: "Erro ao definir funil padrão",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveKeywords = async () => {
    setIsLoading(true);
    try {
      const etapasParaAtualizar = Object.entries(palavrasChave)
        .filter(([_, palavra]) => palavra.trim() !== '')
        .map(([id, palavra]) => ({ id: parseInt(id), palavra_chave: palavra }));

      if (etapasParaAtualizar.length > 0) {
        for (const etapa of etapasParaAtualizar) {
          const { error } = await supabase
            .from('etapas_funis_kommo')
            .update({ palavra_chave: etapa.palavra_chave })
            .eq('id', etapa.id);

          if (error) throw error;
        }
      }

      await handleSetFunilPadrao();
    } catch (error) {
      console.error('❌ Erro ao salvar palavras-chave:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar palavras-chave",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderContent = () => {
    if (isLoading && currentStep === 'select-funil') {
      return (
        <div className="text-center py-8">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-700 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Carregando Funis...</h3>
          <p className="text-gray-600">
            Buscando funis disponíveis no Kommo.
          </p>
        </div>
      );
    }

    switch (currentStep) {
      case 'select-funil':
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Escolha o Funil Padrão</h3>
              <p className="text-gray-600 text-sm mb-4">
                Selecione qual funil do Kommo será usado como padrão para novos leads.
              </p>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto">
              {funisKommo.map((funil) => (
                <Card 
                  key={funil.id} 
                  className={`cursor-pointer transition-colors ${
                    selectedFunilId === funil.id 
                      ? 'ring-2 ring-blue-600 bg-blue-50' 
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedFunilId(funil.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Building2 className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-medium">{funil.nome_funil}</h4>
                          <p className="text-sm text-gray-500">ID: {funil.id_funil_kommo}</p>
                        </div>
                      </div>
                      {funil.funil_padrao && (
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                          <Star className="h-3 w-3 mr-1" />
                          Padrão
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => selectedFunilId && handleSelectFunil(selectedFunilId)}
                disabled={!selectedFunilId}
                className="flex-1 bg-blue-700 hover:bg-blue-800 text-white"
              >
                Configurar Palavras-chave
              </Button>
            </div>
          </div>
        );

      case 'configure-keywords':
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Configurar Palavras-chave</h3>
              <p className="text-gray-600 text-sm mb-4">
                Defina palavras-chave para cada etapa do funil (opcional, mas recomendado para atualização automática).
              </p>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto">
              {etapas.map((etapa) => (
                <Card key={etapa.id}>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <label className="font-medium text-sm">
                        {etapa.nome_etapa}
                      </label>
                      <input
                        type="text"
                        value={palavrasChave[etapa.id] || ''}
                        onChange={(e) => setPalavrasChave(prev => ({
                          ...prev,
                          [etapa.id]: e.target.value
                        }))}
                        placeholder="Digite as palavras-chave separadas por vírgula"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setCurrentStep('select-funil')}
                className="flex-1"
              >
                Voltar
              </Button>
              <Button
                onClick={handleSaveKeywords}
                disabled={isLoading}
                className="flex-1 bg-blue-700 hover:bg-blue-800 text-white"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Settings className="h-4 w-4 mr-2" />
                    Salvar e Finalizar
                  </>
                )}
              </Button>
            </div>
          </div>
        );

      case 'completed':
        return (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Configuração Concluída!</h3>
            <p className="text-gray-600 mb-6">
              O funil foi configurado com sucesso e está pronto para receber leads automaticamente.
            </p>
            <Button
              onClick={onClose}
              className="bg-blue-700 hover:bg-blue-800 text-white"
            >
              Fechar
            </Button>
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
            <div className="w-10 h-10 bg-blue-700 rounded-lg flex items-center justify-center">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Configurar Funil Kommo</h3>
              <p className="text-sm text-gray-500">
                {currentStep === 'select-funil' && 'Escolha o funil padrão'}
                {currentStep === 'configure-keywords' && 'Configure as palavras-chave'}
                {currentStep === 'completed' && 'Configuração concluída'}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
            disabled={isLoading}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {renderContent()}
      </div>
    </div>
  );
}
