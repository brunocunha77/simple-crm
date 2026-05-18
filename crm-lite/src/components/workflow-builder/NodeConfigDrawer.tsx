import { Node } from '@xyflow/react';
import { ArrowLeft, Variable, Flag, X, MessageSquare, User, Clock, Volume2, FileText, Link, ListTodo, Plus, Trash2, AlertCircle, Upload, Loader2, Check, Image as ImageIcon, Copy, Save } from 'lucide-react';
import { 
  InicioNodeData, 
  MessageNodeData, 
  EndNodeData, 
  IaNodeData, 
  RandomizadorNodeData,
  MenuNodeData,
  IfNodeData,
  DelayNodeData,
  TransferDepartmentNodeData
} from '@/types/workflow';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/auth';
import { storageService } from '@/services/storageService';
import { departamentosService, Departamento } from '@/services/departamentosService';
import { toast } from 'sonner';

interface NodeConfigDrawerProps {
  selectedNode: Node | null;
  open: boolean;
  onUpdate: (nodeId: string, data: any) => void;
  onClose: () => void;
  workflowId?: string;
}

// Helper function to generate secure final path from client path
function generateSecurePath(clientPath: string): string {
  if (!clientPath) return '';
  
  // Remove leading slash if present for processing
  const cleanClientPath = clientPath.startsWith('/') ? clientPath.slice(1) : clientPath;
  
  // Generate secret suffix (8 characters from UUID)
  // Use crypto.randomUUID() if available, otherwise fallback to Math.random()
  let secret: string;
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    secret = crypto.randomUUID()
      .replace(/-/g, '')
      .slice(0, 8);
  } else {
    // Fallback for environments without crypto.randomUUID()
    secret = Array.from({ length: 8 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
  }
  
  // Combine clientPath with secret
  const finalPath = `/${cleanClientPath}_${secret}`;
  
  return finalPath;
}

// Helper function to extract clientPath from finalPath (for editing existing paths)
function extractClientPath(finalPath: string | undefined): string {
  if (!finalPath) return '';
  
  // Remove leading slash
  const cleanPath = finalPath.startsWith('/') ? finalPath.slice(1) : finalPath;
  
  // Check if path has the secret suffix pattern (ends with _ followed by 8 alphanumeric chars)
  const secretPattern = /^(.+)_[a-f0-9]{8}$/i;
  const match = cleanPath.match(secretPattern);
  
  if (match) {
    // Extract clientPath (without secret suffix)
    return match[1];
  }
  
  // If no secret suffix found, return as is (for backward compatibility)
  return cleanPath;
}

export function NodeConfigDrawer({ selectedNode, open, onUpdate, onClose, workflowId }: NodeConfigDrawerProps) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState<{ [key: string]: boolean }>({});
  const [webhookPathError, setWebhookPathError] = useState<string | null>(null);
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [clientPath, setClientPath] = useState<string>('');
  const audioInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);

  // Impedir scroll do body quando modal estiver aberto
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Carregar departamentos quando abrir drawer para nó de transferência
  useEffect(() => {
    if (!open || selectedNode?.type !== 'transfer_department' || !user?.id_cliente) return;
    departamentosService.listar(user.id_cliente).then(setDepartamentos).catch(() => setDepartamentos([]));
  }, [open, selectedNode?.type, user?.id_cliente]);

  // Inicializar clientPath quando abrir drawer para nó de início/trigger com webhook_external
  useEffect(() => {
    if (!open || !selectedNode) return;
    const nodeType = selectedNode.type;
    const nodeData = selectedNode.data as any;
    
    if ((nodeType === 'inicio' || nodeType === 'trigger') && 
        nodeData?.triggerType === 'webhook_external' && 
        nodeData?.webhookPath) {
      // Extrair clientPath do webhookPath existente
      const extracted = extractClientPath(nodeData.webhookPath);
      setClientPath(extracted);
    } else if ((nodeType === 'inicio' || nodeType === 'trigger') && 
               nodeData?.triggerType === 'webhook_external') {
      // Se não tem webhookPath, limpar clientPath
      setClientPath('');
    }
  }, [open, selectedNode]);

  // Não renderizar se não houver node selecionado
  // O Dialog controla sua própria visibilidade via prop `open`
  if (!selectedNode) return null;

  const { type, data, id } = selectedNode;

  const handleChange = (field: string, value: any) => {
    onUpdate(id, { [field]: value });
  };

  const extractVariables = (text: string): string[] => {
    const matches = text.match(/\{\{(\w+)\}\}/g);
    return matches ? [...new Set(matches.map(m => m))] : [];
  };

  const handleMessageChange = (value: string) => {
    const variables = extractVariables(value);
    handleChange('message', value);
    handleChange('variables', variables);
  };

  // Handler de upload de arquivo
  const handleFileUpload = async (
    file: File,
    category: 'audio' | 'file' | 'image' | 'video' | 'document',
    nodeData: MessageNodeData
  ) => {
    if (!workflowId || !user?.id_cliente) {
      toast.error('Workflow ID ou ID do cliente não encontrado');
      return;
    }

    // Mapear categoria para categoria do storageService
    const storageCategory = category === 'document' ? 'document' : 
                            category === 'video' ? 'video' : 
                            category === 'image' ? 'image' : 
                            category === 'audio' ? 'audio' : 'file';
    
    const allowedTypes = storageService.getAllowedTypes(storageCategory);
    const maxSizeMB = storageService.getMaxSizeMB(storageCategory);

    // Validação
    const error = storageService.validateFile(file, allowedTypes, maxSizeMB);
    if (error) {
      toast.error(error);
      return;
    }

    setUploading((prev) => ({ ...prev, [category]: true }));

    try {
      // Se já existe arquivo anterior, deletar
      const filePathsToDelete = [
        nodeData.filePath,
        nodeData.audioFile,
        nodeData.imageFile,
        nodeData.videoFile,
        nodeData.documentFile,
      ].filter(Boolean) as string[];

      for (const path of filePathsToDelete) {
        await storageService.deleteFile(path);
      }

      // Upload
      const result = await storageService.uploadWorkflowFile(
        file,
        user.id_cliente,
        workflowId,
        id
      );

      if (result.error) {
        toast.error(result.error);
        return;
      }

      // Atualizar dados do node
      const updatedData: Partial<MessageNodeData> = {
        ...nodeData,
        fileUrl: result.url,
        filePath: result.path,
        fileName: file.name,
      };

      // Definir messageType e fileType baseado na categoria
      if (category === 'audio') {
        updatedData.audioUrl = result.url;
        updatedData.messageType = 'audio';
        updatedData.fileType = file.type; // MIME type para áudio
      } else if (category === 'image') {
        updatedData.imageUrl = result.url;
        updatedData.imageFile = result.path;
        updatedData.messageType = 'image';
        updatedData.fileType = 'image';
      } else if (category === 'video') {
        updatedData.videoUrl = result.url;
        updatedData.videoFile = result.path;
        updatedData.messageType = 'video';
        updatedData.fileType = 'video';
      } else if (category === 'document') {
        updatedData.documentUrl = result.url;
        updatedData.documentFile = result.path;
        updatedData.messageType = 'document';
        updatedData.fileType = 'document';
      } else {
        updatedData.messageType = 'file';
        // Manter o fileType existente ou definir baseado na extensão
        if (!nodeData.fileType) {
          const ext = file.name.split('.').pop()?.toLowerCase();
          if (ext === 'pdf') {
            updatedData.fileType = 'pdf';
          } else if (['doc', 'docx'].includes(ext || '')) {
            updatedData.fileType = 'document';
          } else {
            updatedData.fileType = 'other';
          }
        } else {
          updatedData.fileType = nodeData.fileType;
        }
      }

      handleChange('', updatedData);
      toast.success('Arquivo enviado com sucesso!');
    } catch (error: any) {
      console.error('Erro no upload:', error);
      toast.error('Erro ao enviar arquivo. Tente novamente.');
    } finally {
      setUploading((prev) => ({ ...prev, [category]: false }));
    }
  };

  // Remover arquivo
  const handleRemoveFile = async (nodeData: MessageNodeData) => {
    // Deletar todos os filePaths possíveis
    const filePaths = [
      nodeData.filePath,
      nodeData.audioFile,
      nodeData.imageFile,
      nodeData.videoFile,
      nodeData.documentFile,
    ].filter(Boolean) as string[];

    for (const path of filePaths) {
      await storageService.deleteFile(path);
    }

    const updatedData: Partial<MessageNodeData> = {
      ...nodeData,
      fileUrl: undefined,
      filePath: undefined,
      fileName: undefined,
      fileType: undefined,
      audioUrl: undefined,
      audioFile: undefined,
      imageUrl: undefined,
      imageFile: undefined,
      videoUrl: undefined,
      videoFile: undefined,
      documentUrl: undefined,
      documentFile: undefined,
    };

    handleChange('', updatedData);
    toast.success('Arquivo removido');
  };

  const getNodeTitle = () => {
    switch (type) {
      case 'inicio':
      case 'trigger':
        return 'Início';
      case 'message':
        return 'Mensagem';
      case 'menu':
        return 'Menu Interativo';
      case 'condition':
        return 'Condição';
      case 'ia':
        return 'IA';
      case 'randomizador':
        return 'Randomizador';
      case 'end':
        return 'Fim';
      case 'transfer_department':
        return 'Transferir departamento';
      default:
        return 'Configuração';
    }
  };

  const getNodeDescription = () => {
    switch (type) {
      case 'inicio':
      case 'trigger':
        return 'Configure o gatilho inicial do workflow';
      case 'message':
        return 'Configure a mensagem a ser enviada';
      case 'menu':
        return 'Configure o menu interativo com opções numéricas';
      case 'condition':
        return 'Configure a condição para bifurcar o fluxo em Sim/Não';
      case 'ia':
        return 'Configure o processamento de IA';
      case 'randomizador':
        return 'Configure a distribuição aleatória';
      case 'end':
        return 'Nó final do workflow';
      case 'delay':
        return 'Configure o tempo de espera antes de continuar';
      case 'transfer_department':
        return 'Selecione o departamento para onde o lead será transferido';
      default:
        return '';
    }
  };

  return (
    <>
      {/* Overlay customizado e estilos do modal - Tema claro SmartCRM */}
      <style>{`
        [data-radix-dialog-overlay] {
          background-color: rgba(0, 0, 0, 0.5) !important;
        }
        [data-radix-dialog-content] {
          background-color: #ffffff !important;
          border-color: #e5e7eb !important;
          color: #111827 !important;
        }
        /* Garantir que nenhum elemento use cores azuis do tema */
        [data-radix-dialog-content] * {
          --ring: #9b87f5 !important;
        }
        [data-radix-dialog-content] input:focus,
        [data-radix-dialog-content] textarea:focus,
        [data-radix-dialog-content] select:focus {
          --ring-color: #9b87f5 !important;
          border-color: #9b87f5 !important;
          box-shadow: 0 0 0 2px rgba(155, 135, 245, 0.2) !important;
        }
      `}</style>
      <Dialog 
        open={open} 
        onOpenChange={(isOpen) => {
          // Quando o Dialog muda de estado (fechado), sempre chama onClose
          // Isso garante que o estado seja resetado corretamente
          if (!isOpen) {
            onClose();
          }
          // Se isOpen for true, não faz nada - o estado já está controlado pelo WorkflowCanvas
        }}
      >
        <DialogContent 
          className="max-w-2xl !bg-white !border-gray-200 p-0 overflow-hidden rounded-xl shadow-2xl [&>button]:hidden text-gray-900"
        >
          {/* Header */}
          <DialogHeader className="flex flex-row items-center justify-between border-b border-gray-200 p-4">
            <div className="flex items-center gap-3 flex-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 h-8 px-3"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Voltar
              </Button>
              <div className="flex-1">
                <DialogTitle className="text-lg font-semibold !text-gray-900 text-left">
                  {getNodeTitle()}
                </DialogTitle>
                <DialogDescription className="text-sm !text-gray-600 text-left mt-1">
                  {getNodeDescription()}
                </DialogDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              <X className="w-4 h-4" />
            </Button>
          </DialogHeader>

          {/* Body - Scrollável */}
          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            {/* NÓ INÍCIO / TRIGGER */}
            {(type === 'inicio' || type === 'trigger') && (() => {
              const inicioData = data as InicioNodeData;
              const triggerType = inicioData.triggerType || 'message_received';
              const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
              const webhookBaseUrl = supabaseUrl ? `${supabaseUrl}/functions/v1/workflow-webhook-trigger` : 'https://<projeto>.supabase.co/functions/v1/workflow-webhook-trigger';
              
              return (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="triggerType" className="text-gray-900 text-sm font-medium">
                      Tipo de Gatilho
                    </Label>
                    <Select
                      value={triggerType}
                      onValueChange={(value) => handleChange('triggerType', value)}
                    >
                      <SelectTrigger 
                        id="triggerType" 
                        className="mt-2 !bg-white !border-gray-300 !text-gray-900 focus:!ring-[#9b87f5] focus:!border-[#9b87f5]"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="!bg-white !border-gray-200">
                        <SelectItem value="message_received" className="!text-gray-900 hover:!bg-gray-50">Receber Mensagem</SelectItem>
                        <SelectItem value="webhook_external" className="!text-gray-900 hover:!bg-gray-50">Webhook Externo</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-600 mt-2">
                      O workflow inicia quando este evento ocorrer.
                    </p>
                  </div>

                  {/* Configuração de Palavra-chave (Receber Mensagem) */}
                  {triggerType === 'message_received' && (
                    <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div>
                        <Label htmlFor="keyword" className="text-gray-900 text-sm font-medium">
                          Palavra-chave (Opcional)
                        </Label>
                        <Input
                          id="keyword"
                          type="text"
                          value={inicioData.keyword || ''}
                          onChange={(e) => handleChange('keyword', e.target.value)}
                          placeholder="Ex: iniciar, começar, ajuda"
                          className="mt-2 !bg-white !border-gray-300 !text-gray-900 focus:!ring-[#9b87f5] focus:!border-[#9b87f5] placeholder:!text-gray-400"
                        />
                        <p className="text-xs text-gray-600 mt-2">
                          Se configurada, o workflow só inicia quando a mensagem do usuário contiver esta palavra-chave.
                          <br />
                          <strong>Deixe vazio</strong> para iniciar em qualquer mensagem (respeitando regras de 2 horas).
                        </p>
                        <div className="mt-2 p-3 bg-blue-100 rounded border border-blue-300 text-xs text-blue-800">
                          <p className="font-medium mb-1">💡 Como funciona:</p>
                          <ul className="list-disc list-inside space-y-1">
                            <li>Com palavra-chave: workflow só inicia se mensagem contiver a palavra</li>
                            <li>Sem palavra-chave: workflow inicia em qualquer mensagem (se lead novo, conversa fechada, ou última msg há mais de 2h)</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Configuração do Webhook Externo */}
                  {triggerType === 'webhook_external' && (
                    <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div>
                        <Label htmlFor="webhook-path" className="text-gray-900 text-sm font-medium">
                          Path (Nome legível)
                        </Label>
                        <Input
                          id="webhook-path"
                          type="text"
                          value={clientPath}
                          onChange={async (e) => {
                            const inputValue = e.target.value;
                            // Remove leading slash if user types it (we'll add it back when generating finalPath)
                            const cleanClientPath = inputValue.startsWith('/') ? inputValue.slice(1) : inputValue;
                            
                            setClientPath(cleanClientPath);
                            setWebhookPathError(null);

                            // Generate finalPath with secret suffix
                            if (cleanClientPath) {
                              const finalPath = generateSecurePath(cleanClientPath);
                              handleChange('webhookPath', finalPath);

                              // Validar path único se preenchido
                              if (user?.id_cliente) {
                                try {
                                  const { supabase } = await import('@/lib/supabase');
                                  const { data: workflows } = await supabase
                                    .from('workflows')
                                    .select('id, nodes')
                                    .eq('id_cliente', user.id_cliente)
                                    .neq('id', workflowId || '');

                                  // Verificar se algum workflow tem o mesmo finalPath
                                  const pathExists = workflows?.some((w: any) => {
                                    const inicioNode = w.nodes?.find((n: any) => 
                                      (n.type === 'inicio' || n.type === 'trigger') && 
                                      n.data?.triggerType === 'webhook_external' &&
                                      n.data?.webhookPath === finalPath
                                    );
                                    return !!inicioNode;
                                  });

                                  if (pathExists) {
                                    setWebhookPathError('Este path já está em uso por outro workflow');
                                  }
                                } catch (error) {
                                  console.error('Erro ao validar path:', error);
                                }
                              }
                            } else {
                              // Se clientPath estiver vazio, limpar webhookPath
                              handleChange('webhookPath', '');
                            }
                          }}
                          placeholder="campanha-blackfriday"
                          className={cn(
                            "mt-2 !bg-white !border-gray-300 !text-gray-900 focus:!ring-[#9b87f5] focus:!border-[#9b87f5] placeholder:!text-gray-400",
                            webhookPathError && "!border-red-500"
                          )}
                        />
                        {webhookPathError && (
                          <p className="text-xs text-red-600 mt-1">
                            {webhookPathError}
                          </p>
                        )}
                        {inicioData.webhookPath && (
                          <div className="mt-2 flex items-center gap-2">
                            <p className="text-xs text-gray-600 flex-1">
                              URL completa: <code className="bg-gray-200 px-1 py-0.5 rounded text-xs break-all">{webhookBaseUrl}?path={inicioData.webhookPath}</code>
                            </p>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                const fullUrl = `${webhookBaseUrl}?path=${inicioData.webhookPath}`;
                                try {
                                  await navigator.clipboard.writeText(fullUrl);
                                  toast.success('URL copiada para a área de transferência!');
                                } catch (error) {
                                  toast.error('Erro ao copiar URL');
                                }
                              }}
                              className="h-7 px-2 text-xs border-gray-300 hover:bg-gray-100"
                            >
                              <Copy className="w-3 h-3 mr-1" />
                              Copiar
                            </Button>
                          </div>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          Digite um nome legível para o path. O sistema adicionará automaticamente um sufixo secreto para garantir segurança. Exemplo: campanha-blackfriday
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* NÓ MENSAGEM */}
            {type === 'message' && (() => {
              const messageData = data as MessageNodeData;
              const currentType = messageData.messageType || (messageData.message ? 'text' : 'text');
              if (!messageData.messageType && messageData.message) {
                handleChange('messageType', 'text');
              }
              
              const messageTypes = [
                {
                  type: 'text' as const,
                  icon: MessageSquare,
                  title: 'Texto',
                  description: 'Envia uma mensagem de texto simples',
                },
                {
                  type: 'audio' as const,
                  icon: Volume2,
                  title: 'Áudio',
                  description: 'Envia um arquivo de áudio (MP3, OGG, WAV)',
                },
                {
                  type: 'video' as const,
                  icon: ImageIcon,
                  title: 'Vídeo',
                  description: 'Envia um arquivo de vídeo (MP4)',
                },
                {
                  type: 'image' as const,
                  icon: ImageIcon,
                  title: 'Imagem',
                  description: 'Envia uma imagem (JPG, PNG, WEBP)',
                },
                {
                  type: 'document' as const,
                  icon: FileText,
                  title: 'Documento',
                  description: 'Envia um documento (PDF, DOC, DOCX, XLS, XLSX)',
                },
              ];

              return (
                <div className="space-y-5">
                  {/* Seletor de Tipo */}
                  <div>
                    <Label className="text-gray-900 text-sm font-medium mb-3 block">
                      Tipo de Mensagem
                    </Label>
                    <div className="space-y-2">
                      {messageTypes.map((msgType) => {
                        const Icon = msgType.icon;
                        const isSelected = currentType === msgType.type;
                        return (
                          <button
                            key={msgType.type}
                            type="button"
                            onClick={() => handleChange('messageType', msgType.type)}
                            className={cn(
                              "w-full flex items-start gap-3 p-3 rounded-lg border-2 transition-all text-left",
                              isSelected
                                ? "border-[#9b87f5] bg-[#9b87f5]/10"
                                : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                            )}
                          >
                            <div className={cn(
                              "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                              isSelected ? "bg-[#9b87f5] text-white" : "bg-gray-100 text-gray-600"
                            )}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className={cn(
                                "font-medium text-sm",
                                isSelected ? "text-gray-900" : "text-gray-700"
                              )}>
                                {msgType.title}
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5">
                                {msgType.description}
                              </div>
                            </div>
                            {isSelected && (
                              <div className="w-5 h-5 rounded-full bg-[#9b87f5] flex items-center justify-center flex-shrink-0">
                                <div className="w-2 h-2 rounded-full bg-white" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Campos específicos por tipo */}
                  {currentType === 'text' && (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="message" className="text-gray-900 text-sm font-medium">
                          Mensagem
                        </Label>
                        <textarea
                          id="message"
                          value={messageData.message || ''}
                          onChange={(e) => handleMessageChange(e.target.value)}
                          placeholder="Digite a mensagem..."
                          rows={6}
                          className={cn(
                            "w-full rounded-lg !border-gray-300 !bg-gray-50 px-3 py-2 text-sm mt-2 !text-gray-900",
                            "placeholder:!text-gray-400",
                            "focus:outline-none focus:!ring-2 focus:!ring-[#9b87f5] focus:!border-[#9b87f5] focus:!bg-white",
                            "disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                          )}
                        />
                        
                        {messageData.variables && messageData.variables.length > 0 && (
                          <div className="mt-3">
                            <div className="flex items-center gap-2 text-xs text-[#9b87f5] mb-2">
                              <Variable className="w-3 h-3" />
                              <span>Variáveis detectadas:</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {messageData.variables.map((v) => (
                                <span key={v} className="text-xs bg-[#9b87f5]/20 text-[#9b87f5] px-2 py-1 rounded-md">
                                  {v}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <input
                          type="checkbox"
                          id="useTemplate"
                          checked={messageData.useTemplate || false}
                          onChange={(e) => handleChange('useTemplate', e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300 text-[#9b87f5] focus:ring-[#9b87f5] bg-white checked:bg-[#9b87f5]"
                        />
                        <Label htmlFor="useTemplate" className="text-sm text-gray-900 cursor-pointer flex-1">
                          Usar template aprovado pelo WhatsApp
                        </Label>
                      </div>

                      {messageData.useTemplate && (
                        <div>
                          <Label htmlFor="templateName" className="text-gray-900 text-sm font-medium">
                            Nome do Template
                          </Label>
                          <Input
                            id="templateName"
                            type="text"
                            value={messageData.templateName || ''}
                            onChange={(e) => handleChange('templateName', e.target.value)}
                            placeholder="ex: boas_vindas_v1"
                            className="mt-2 !bg-white !border-gray-300 !text-gray-900 focus:!ring-[#9b87f5] focus:!border-[#9b87f5] placeholder:!text-gray-400"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {currentType === 'user_input' && (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="timeout" className="text-gray-900 text-sm font-medium">
                          Timeout (segundos)
                        </Label>
                        <Input
                          id="timeout"
                          type="number"
                          min="0"
                          value={messageData.timeout || 60}
                          onChange={(e) => handleChange('timeout', parseInt(e.target.value) || 60)}
                          placeholder="60"
                          className="mt-2 !bg-white !border-gray-300 !text-gray-900 focus:!ring-[#9b87f5] focus:!border-[#9b87f5] placeholder:!text-gray-400"
                        />
                        <p className="text-xs text-gray-600 mt-1">
                          Tempo máximo de espera pela resposta do contato.
                        </p>
                      </div>
                      <div>
                        <Label htmlFor="validation" className="text-gray-900 text-sm font-medium">
                          Tipo de Validação
                        </Label>
                        <Select
                          value={messageData.validation || 'any'}
                          onValueChange={(value) => handleChange('validation', value)}
                        >
                          <SelectTrigger 
                            id="validation" 
                            className="mt-2 !bg-white !border-gray-300 !text-gray-900 focus:!ring-[#9b87f5] focus:!border-[#9b87f5]"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="!bg-white !border-gray-200">
                            <SelectItem value="any" className="!text-gray-900 hover:!bg-gray-50">Qualquer texto</SelectItem>
                            <SelectItem value="number" className="!text-gray-900 hover:!bg-gray-50">Apenas números</SelectItem>
                            <SelectItem value="email" className="!text-gray-900 hover:!bg-gray-50">E-mail</SelectItem>
                            <SelectItem value="phone" className="!text-gray-900 hover:!bg-gray-50">Telefone</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {currentType === 'delay' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="delayMinutes" className="text-gray-900 text-sm font-medium">
                            Minutos
                          </Label>
                          <Input
                            id="delayMinutes"
                            type="number"
                            min="0"
                            value={messageData.delayMinutes || 0}
                            onChange={(e) => handleChange('delayMinutes', parseInt(e.target.value) || 0)}
                            placeholder="0"
                            className="mt-2 !bg-white !border-gray-300 !text-gray-900 focus:!ring-[#9b87f5] focus:!border-[#9b87f5] placeholder:!text-gray-400"
                          />
                        </div>
                        <div>
                          <Label htmlFor="delaySeconds" className="text-gray-900 text-sm font-medium">
                            Segundos
                          </Label>
                          <Input
                            id="delaySeconds"
                            type="number"
                            min="0"
                            max="59"
                            value={messageData.delaySeconds || 0}
                            onChange={(e) => handleChange('delaySeconds', parseInt(e.target.value) || 0)}
                            placeholder="0"
                            className="mt-2 !bg-white !border-gray-300 !text-gray-900 focus:!ring-[#9b87f5] focus:!border-[#9b87f5] placeholder:!text-gray-400"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-gray-600">
                        O workflow aguardará este tempo antes de prosseguir para o próximo passo.
                      </p>
                    </div>
                  )}

                  {currentType === 'audio' && (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="audioUrl" className="text-gray-900 text-sm font-medium">
                          URL do Áudio (opcional)
                        </Label>
                        <Input
                          id="audioUrl"
                          type="url"
                          value={messageData.audioUrl || ''}
                          onChange={(e) => handleChange('audioUrl', e.target.value)}
                          placeholder="https://exemplo.com/audio.mp3"
                          className="mt-2 !bg-white !border-gray-300 !text-gray-900 focus:!ring-[#9b87f5] focus:!border-[#9b87f5] placeholder:!text-gray-400"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Ou faça upload de um arquivo abaixo
                        </p>
                      </div>

                      {/* Upload de Áudio */}
                      <div>
                        <Label className="text-gray-900 text-sm font-medium block mb-2">
                          Upload de Áudio
                        </Label>
                        <input
                          ref={audioInputRef}
                          type="file"
                          accept="audio/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleFileUpload(file, 'audio', messageData);
                            }
                            // Reset input para permitir selecionar o mesmo arquivo novamente
                            if (audioInputRef.current) {
                              audioInputRef.current.value = '';
                            }
                          }}
                          className="hidden"
                          disabled={uploading.audio}
                        />
                        <label
                          htmlFor="audio-upload"
                          className={cn(
                            "flex items-center justify-center w-full px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
                            uploading.audio
                              ? "opacity-50 cursor-not-allowed border-gray-300 bg-gray-50"
                              : messageData.fileUrl || messageData.audioUrl
                              ? "border-green-400 bg-green-50 hover:border-green-500"
                              : "border-gray-300 bg-white hover:border-[#9b87f5] hover:bg-purple-50"
                          )}
                          onClick={() => !uploading.audio && audioInputRef.current?.click()}
                        >
                          {uploading.audio ? (
                            <div className="flex items-center gap-2 text-gray-600">
                              <Loader2 className="w-5 h-5 animate-spin" />
                              <span>Enviando...</span>
                            </div>
                          ) : messageData.fileUrl || messageData.audioUrl ? (
                            <div className="flex items-center gap-2 text-green-700 w-full">
                              <Check className="w-5 h-5 flex-shrink-0" />
                              <span className="flex-1 truncate">
                                {messageData.fileName || 'Áudio carregado'}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleRemoveFile(messageData);
                                }}
                                className="ml-2 text-red-500 hover:text-red-700 flex-shrink-0"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-gray-600">
                              <Upload className="w-5 h-5" />
                              <span>Selecionar arquivo de áudio</span>
                            </div>
                          )}
                        </label>
                        {messageData.fileUrl && (
                          <audio
                            controls
                            src={messageData.fileUrl}
                            className="w-full mt-3 rounded-lg"
                          />
                        )}
                        <p className="text-xs text-gray-500 mt-2">
                          Máximo 16MB. Formatos: MP3, WAV, OGG, AAC
                        </p>
                      </div>
                    </div>
                  )}

                  {currentType === 'image' && (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="imageUrl" className="text-gray-900 text-sm font-medium">
                          URL da Imagem (opcional)
                        </Label>
                        <Input
                          id="imageUrl"
                          type="url"
                          value={messageData.imageUrl || ''}
                          onChange={(e) => handleChange('imageUrl', e.target.value)}
                          placeholder="https://exemplo.com/imagem.jpg"
                          className="mt-2 !bg-white !border-gray-300 !text-gray-900 focus:!ring-[#9b87f5] focus:!border-[#9b87f5] placeholder:!text-gray-400"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Ou faça upload de uma imagem abaixo
                        </p>
                      </div>

                      <div>
                        <Label htmlFor="imageCaption" className="text-gray-900 text-sm font-medium">
                          Legenda (opcional)
                        </Label>
                        <Textarea
                          id="imageCaption"
                          value={messageData.message || ''}
                          onChange={(e) => handleMessageChange(e.target.value)}
                          placeholder="Digite a legenda da imagem..."
                          rows={3}
                          className="mt-2 !bg-white !border-gray-300 !text-gray-900 focus:!ring-[#9b87f5] focus:!border-[#9b87f5] placeholder:!text-gray-400"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Legenda que será enviada junto com a imagem
                        </p>
                      </div>

                      {/* Upload de Imagem */}
                      <div>
                        <Label className="text-gray-900 text-sm font-medium block mb-2">
                          Upload de Imagem
                        </Label>
                        <input
                          ref={imageInputRef}
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleFileUpload(file, 'image', messageData);
                            }
                            if (imageInputRef.current) {
                              imageInputRef.current.value = '';
                            }
                          }}
                          className="hidden"
                          disabled={uploading.image}
                        />
                        <label
                          htmlFor="image-upload"
                          className={cn(
                            "flex items-center justify-center w-full px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
                            uploading.image
                              ? "opacity-50 cursor-not-allowed border-gray-300 bg-gray-50"
                              : messageData.imageUrl || messageData.imageFile || messageData.fileUrl
                              ? "border-green-400 bg-green-50 hover:border-green-500"
                              : "border-gray-300 bg-white hover:border-[#9b87f5] hover:bg-purple-50"
                          )}
                          onClick={() => !uploading.image && imageInputRef.current?.click()}
                        >
                          {uploading.image ? (
                            <div className="flex items-center gap-2 text-gray-600">
                              <Loader2 className="w-5 h-5 animate-spin" />
                              <span>Enviando...</span>
                            </div>
                          ) : messageData.imageUrl || messageData.imageFile || messageData.fileUrl ? (
                            <div className="flex items-center gap-2 text-green-700 w-full">
                              <Check className="w-5 h-5 flex-shrink-0" />
                              <span className="flex-1 truncate">
                                {messageData.fileName || 'Imagem carregada'}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleRemoveFile(messageData);
                                }}
                                className="ml-2 text-red-500 hover:text-red-700 flex-shrink-0"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-gray-600">
                              <Upload className="w-5 h-5" />
                              <span>Selecionar imagem (JPG, PNG, WEBP)</span>
                            </div>
                          )}
                        </label>
                        {(messageData.imageUrl || messageData.imageFile || messageData.fileUrl) && (
                          <div className="mt-3">
                            <img
                              src={messageData.imageUrl || messageData.fileUrl || (messageData.imageFile ? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/workflow-assets/${messageData.imageFile}` : '')}
                              alt="Preview"
                              className="w-full max-h-48 object-contain rounded-lg border border-gray-200"
                            />
                          </div>
                        )}
                        <p className="text-xs text-gray-500 mt-2">
                          Máximo 5MB. Formatos: JPG, PNG, WEBP
                        </p>
                      </div>
                    </div>
                  )}

                  {currentType === 'video' && (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="videoUrl" className="text-gray-900 text-sm font-medium">
                          URL do Vídeo (opcional)
                        </Label>
                        <Input
                          id="videoUrl"
                          type="url"
                          value={messageData.videoUrl || ''}
                          onChange={(e) => handleChange('videoUrl', e.target.value)}
                          placeholder="https://exemplo.com/video.mp4"
                          className="mt-2 !bg-white !border-gray-300 !text-gray-900 focus:!ring-[#9b87f5] focus:!border-[#9b87f5] placeholder:!text-gray-400"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Ou faça upload de um vídeo abaixo
                        </p>
                      </div>

                      <div>
                        <Label htmlFor="videoCaption" className="text-gray-900 text-sm font-medium">
                          Legenda (opcional)
                        </Label>
                        <Textarea
                          id="videoCaption"
                          value={messageData.message || ''}
                          onChange={(e) => handleMessageChange(e.target.value)}
                          placeholder="Digite a legenda do vídeo..."
                          rows={3}
                          className="mt-2 !bg-white !border-gray-300 !text-gray-900 focus:!ring-[#9b87f5] focus:!border-[#9b87f5] placeholder:!text-gray-400"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Legenda que será enviada junto com o vídeo
                        </p>
                      </div>

                      {/* Upload de Vídeo */}
                      <div>
                        <Label className="text-gray-900 text-sm font-medium block mb-2">
                          Upload de Vídeo
                        </Label>
                        <input
                          ref={videoInputRef}
                          type="file"
                          accept="video/mp4,video/mpeg"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleFileUpload(file, 'video', messageData);
                            }
                            if (videoInputRef.current) {
                              videoInputRef.current.value = '';
                            }
                          }}
                          className="hidden"
                          disabled={uploading.video}
                        />
                        <label
                          htmlFor="video-upload"
                          className={cn(
                            "flex items-center justify-center w-full px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
                            uploading.video
                              ? "opacity-50 cursor-not-allowed border-gray-300 bg-gray-50"
                              : messageData.videoUrl || messageData.videoFile || messageData.fileUrl
                              ? "border-green-400 bg-green-50 hover:border-green-500"
                              : "border-gray-300 bg-white hover:border-[#9b87f5] hover:bg-purple-50"
                          )}
                          onClick={() => !uploading.video && videoInputRef.current?.click()}
                        >
                          {uploading.video ? (
                            <div className="flex items-center gap-2 text-gray-600">
                              <Loader2 className="w-5 h-5 animate-spin" />
                              <span>Enviando...</span>
                            </div>
                          ) : messageData.videoUrl || messageData.videoFile || messageData.fileUrl ? (
                            <div className="flex items-center gap-2 text-green-700 w-full">
                              <Check className="w-5 h-5 flex-shrink-0" />
                              <span className="flex-1 truncate">
                                {messageData.fileName || 'Vídeo carregado'}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleRemoveFile(messageData);
                                }}
                                className="ml-2 text-red-500 hover:text-red-700 flex-shrink-0"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-gray-600">
                              <Upload className="w-5 h-5" />
                              <span>Selecionar vídeo (MP4)</span>
                            </div>
                          )}
                        </label>
                        <p className="text-xs text-gray-500 mt-2">
                          Máximo 50MB. Formato: MP4
                        </p>
                      </div>
                    </div>
                  )}

                  {currentType === 'document' && (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="documentUrl" className="text-gray-900 text-sm font-medium">
                          URL do Documento (opcional)
                        </Label>
                        <Input
                          id="documentUrl"
                          type="url"
                          value={messageData.documentUrl || ''}
                          onChange={(e) => handleChange('documentUrl', e.target.value)}
                          placeholder="https://exemplo.com/documento.pdf"
                          className="mt-2 !bg-white !border-gray-300 !text-gray-900 focus:!ring-[#9b87f5] focus:!border-[#9b87f5] placeholder:!text-gray-400"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Ou faça upload de um documento abaixo
                        </p>
                      </div>

                      <div>
                        <Label htmlFor="documentName" className="text-gray-900 text-sm font-medium">
                          Nome do Documento (opcional)
                        </Label>
                        <Input
                          id="documentName"
                          type="text"
                          value={messageData.fileName || ''}
                          onChange={(e) => handleChange('fileName', e.target.value)}
                          placeholder="ex: Catalogo_2024.pdf"
                          className="mt-2 !bg-white !border-gray-300 !text-gray-900 focus:!ring-[#9b87f5] focus:!border-[#9b87f5] placeholder:!text-gray-400"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Nome que será exibido para o documento
                        </p>
                      </div>

                      {/* Upload de Documento */}
                      <div>
                        <Label className="text-gray-900 text-sm font-medium block mb-2">
                          Upload de Documento
                        </Label>
                        <input
                          ref={documentInputRef}
                          type="file"
                          accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleFileUpload(file, 'document', messageData);
                            }
                            if (documentInputRef.current) {
                              documentInputRef.current.value = '';
                            }
                          }}
                          className="hidden"
                          disabled={uploading.document}
                        />
                        <label
                          htmlFor="document-upload"
                          className={cn(
                            "flex items-center justify-center w-full px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
                            uploading.document
                              ? "opacity-50 cursor-not-allowed border-gray-300 bg-gray-50"
                              : messageData.documentUrl || messageData.documentFile || messageData.fileUrl
                              ? "border-green-400 bg-green-50 hover:border-green-500"
                              : "border-gray-300 bg-white hover:border-[#9b87f5] hover:bg-purple-50"
                          )}
                          onClick={() => !uploading.document && documentInputRef.current?.click()}
                        >
                          {uploading.document ? (
                            <div className="flex items-center gap-2 text-gray-600">
                              <Loader2 className="w-5 h-5 animate-spin" />
                              <span>Enviando...</span>
                            </div>
                          ) : messageData.documentUrl || messageData.documentFile || messageData.fileUrl ? (
                            <div className="flex items-center gap-2 text-green-700 w-full">
                              <Check className="w-5 h-5 flex-shrink-0" />
                              <span className="flex-1 truncate">
                                {messageData.fileName || 'Documento carregado'}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleRemoveFile(messageData);
                                }}
                                className="ml-2 text-red-500 hover:text-red-700 flex-shrink-0"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-gray-600">
                              <Upload className="w-5 h-5" />
                              <span>Selecionar documento (PDF, DOC, DOCX, XLS, XLSX)</span>
                            </div>
                          )}
                        </label>
                        <p className="text-xs text-gray-500 mt-2">
                          Máximo 10MB. Formatos: PDF, DOC, DOCX, XLS, XLSX
                        </p>
                      </div>
                    </div>
                  )}

                  {currentType === 'file' && (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="fileType" className="text-gray-900 text-sm font-medium">
                          Tipo de Arquivo
                        </Label>
                        <Select
                          value={messageData.fileType || 'pdf'}
                          onValueChange={(value) => handleChange('fileType', value)}
                        >
                          <SelectTrigger 
                            id="fileType" 
                            className="mt-2 !bg-white !border-gray-300 !text-gray-900 focus:!ring-[#9b87f5] focus:!border-[#9b87f5]"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="!bg-white !border-gray-200">
                            <SelectItem value="pdf" className="!text-gray-900 hover:!bg-gray-50">PDF</SelectItem>
                            <SelectItem value="image" className="!text-gray-900 hover:!bg-gray-50">Imagem</SelectItem>
                            <SelectItem value="document" className="!text-gray-900 hover:!bg-gray-50">Documento</SelectItem>
                            <SelectItem value="other" className="!text-gray-900 hover:!bg-gray-50">Outro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="fileUrl" className="text-gray-900 text-sm font-medium">
                          URL do Arquivo (opcional)
                        </Label>
                        <Input
                          id="fileUrl"
                          type="url"
                          value={messageData.fileUrl || ''}
                          onChange={(e) => handleChange('fileUrl', e.target.value)}
                          placeholder="https://exemplo.com/arquivo.pdf"
                          className="mt-2 !bg-white !border-gray-300 !text-gray-900 focus:!ring-[#9b87f5] focus:!border-[#9b87f5] placeholder:!text-gray-400"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Ou faça upload de um arquivo abaixo
                        </p>
                      </div>

                      {/* Upload de Arquivo ou Imagem */}
                      <div>
                        <Label className="text-gray-900 text-sm font-medium block mb-2">
                          {messageData.fileType === 'image' ? 'Upload de Imagem' : 'Upload de Arquivo'}
                        </Label>
                        <input
                          ref={messageData.fileType === 'image' ? imageInputRef : fileInputRef}
                          type="file"
                          accept={
                            messageData.fileType === 'image'
                              ? 'image/jpeg,image/jpg,image/png,image/webp,image/gif'
                              : 'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/csv'
                          }
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const category = messageData.fileType === 'image' ? 'image' : 'file';
                              handleFileUpload(file, category, messageData);
                            }
                            const ref = messageData.fileType === 'image' ? imageInputRef : fileInputRef;
                            if (ref.current) {
                              ref.current.value = '';
                            }
                          }}
                          className="hidden"
                          disabled={uploading.file || uploading.image}
                        />
                        <label
                          htmlFor={messageData.fileType === 'image' ? 'image-upload' : 'file-upload'}
                          className={cn(
                            "flex items-center justify-center w-full px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
                            (uploading.file || uploading.image)
                              ? "opacity-50 cursor-not-allowed border-gray-300 bg-gray-50"
                              : messageData.fileUrl
                              ? "border-green-400 bg-green-50 hover:border-green-500"
                              : "border-gray-300 bg-white hover:border-[#9b87f5] hover:bg-purple-50"
                          )}
                          onClick={() => {
                            const isUploading = uploading.file || uploading.image;
                            if (!isUploading) {
                              const ref = messageData.fileType === 'image' ? imageInputRef : fileInputRef;
                              ref.current?.click();
                            }
                          }}
                        >
                          {(uploading.file || uploading.image) ? (
                            <div className="flex items-center gap-2 text-gray-600">
                              <Loader2 className="w-5 h-5 animate-spin" />
                              <span>Enviando...</span>
                            </div>
                          ) : messageData.fileUrl ? (
                            <div className="flex items-center gap-2 text-green-700 w-full">
                              <Check className="w-5 h-5 flex-shrink-0" />
                              <span className="flex-1 truncate">
                                {messageData.fileName || 'Arquivo carregado'}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleRemoveFile(messageData);
                                }}
                                className="ml-2 text-red-500 hover:text-red-700 flex-shrink-0"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-gray-600">
                              <Upload className="w-5 h-5" />
                              <span>
                                {messageData.fileType === 'image'
                                  ? 'Selecionar imagem (JPG, PNG, WEBP, GIF)'
                                  : 'Selecionar arquivo (PDF, DOC, TXT)'}
                              </span>
                            </div>
                          )}
                        </label>
                        {messageData.fileUrl && messageData.fileType === 'image' && (
                          <div className="mt-3">
                            <img
                              src={messageData.fileUrl}
                              alt="Preview"
                              className="w-full max-h-48 object-contain rounded-lg border border-gray-200"
                            />
                          </div>
                        )}
                        <p className="text-xs text-gray-500 mt-2">
                          {messageData.fileType === 'image'
                            ? 'Máximo 10MB. Formatos: JPG, PNG, WEBP, GIF'
                            : 'Máximo 50MB. Formatos: PDF, DOC, DOCX, TXT, CSV'}
                        </p>
                      </div>
                    </div>
                  )}

                  {currentType === 'url' && (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="dynamicUrl" className="text-gray-900 text-sm font-medium">
                          URL Dinâmica
                        </Label>
                        <Input
                          id="dynamicUrl"
                          type="text"
                          value={messageData.dynamicUrl || ''}
                          onChange={(e) => handleChange('dynamicUrl', e.target.value)}
                          placeholder="https://exemplo.com/arquivo/{{id}}"
                          className="mt-2 !bg-white !border-gray-300 !text-gray-900 focus:!ring-[#9b87f5] focus:!border-[#9b87f5] placeholder:!text-gray-400"
                        />
                        <p className="text-xs text-gray-600 mt-1">
                          Use variáveis como {'{{id}}'} para tornar a URL dinâmica.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Seção de Variáveis Disponíveis */}
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Variáveis disponíveis</h4>
                    <ul className="space-y-1.5 text-xs text-gray-600">
                      <li><code className="bg-[#9b87f5]/20 text-[#9b87f5] px-1.5 py-0.5 rounded">{'{{nome}}'}</code> - Nome do lead</li>
                      <li><code className="bg-[#9b87f5]/20 text-[#9b87f5] px-1.5 py-0.5 rounded">{'{{telefone}}'}</code> - Número do WhatsApp</li>
                      <li><code className="bg-[#9b87f5]/20 text-[#9b87f5] px-1.5 py-0.5 rounded">{'{{etapa}}'}</code> - Etapa atual do funil</li>
                      <li><code className="bg-[#9b87f5]/20 text-[#9b87f5] px-1.5 py-0.5 rounded">{'{{vendedor}}'}</code> - Nome do vendedor</li>
                    </ul>
                  </div>
                </div>
              );
            })()}

            {/* NÓ IA */}
            {type === 'ia' && (() => {
              const iaData = data as IaNodeData;
              const modoContinuo = iaData.modoContinuo !== false; // padrão true
              return (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="systemPrompt" className="text-gray-900 text-sm font-medium">
                      Prompt do Sistema
                    </Label>
                    <Textarea
                      id="systemPrompt"
                      value={iaData.systemPrompt || ''}
                      onChange={(e) => handleChange('systemPrompt', e.target.value)}
                      placeholder="Você é um assistente virtual especializado em atendimento ao cliente..."
                      rows={8}
                      className="mt-2 !bg-white !border-gray-300 !text-gray-900 focus:!ring-[#9b87f5] focus:!border-[#9b87f5] placeholder:!text-gray-400"
                    />
                    <p className="text-xs text-gray-600 mt-2">
                      Variáveis disponíveis: {'{'}nome{'}'}, {'{'}mensagem_usuario{'}'}, {'{'}historico{'}'}, {'{'}dados_lead{'}'}
                    </p>
                  </div>

                  {/* Toggle: Modo conversa contínua */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex-1 mr-3">
                      <Label className="text-gray-900 text-sm font-medium cursor-pointer">
                        Modo conversa contínua
                      </Label>
                      <p className="text-xs text-gray-600 mt-0.5">
                        Quando desligado, a IA responde apenas uma vez e encerra o atendimento automaticamente.
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={modoContinuo}
                      onClick={() => handleChange('modoContinuo', !modoContinuo)}
                      className={cn(
                        'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#9b87f5] focus:ring-offset-2',
                        modoContinuo ? 'bg-[#9b87f5]' : 'bg-gray-300'
                      )}
                    >
                      <span
                        className={cn(
                          'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                          modoContinuo ? 'translate-x-5' : 'translate-x-0'
                        )}
                      />
                    </button>
                  </div>

                  {/* Campo: Palavra de encerramento */}
                  <div>
                    <Label htmlFor="palavraEncerramento" className="text-gray-900 text-sm font-medium">
                      Palavra de encerramento
                    </Label>
                    <Input
                      id="palavraEncerramento"
                      value={iaData.palavraEncerramento || ''}
                      onChange={(e) => handleChange('palavraEncerramento', e.target.value)}
                      placeholder="ex: humano, sair"
                      className="mt-2 !bg-white !border-gray-300 !text-gray-900 focus:!ring-[#9b87f5] focus:!border-[#9b87f5] placeholder:!text-gray-400"
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      Quando o cliente digitar essa palavra, a IA para e o atendimento é transferido para humano.
                    </p>
                  </div>

                  <p className="text-xs text-gray-600">
                    A resposta da IA será enviada automaticamente para o lead e salva em lastOutput.
                  </p>
                </div>
              );
            })()}

            {/* NÓ RANDOMIZADOR */}
            {type === 'randomizador' && (
              <div className="space-y-4">
                <div>
                  <Label className="text-gray-900 text-sm font-medium">Distribuição A/B</Label>
                  <p className="text-xs text-gray-600 mt-1 mb-4">
                    Configure os percentuais de distribuição para cada caminho. A soma deve ser 100%.
                  </p>
                  <div className="space-y-3">
                    {((data as RandomizadorNodeData).splits || [
                      { id: '1', label: 'Caminho A', percentage: 50 },
                      { id: '2', label: 'Caminho B', percentage: 50 },
                    ]).map((split, index) => (
                      <div key={split.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex-1">
                          <Label htmlFor={`split-label-${split.id}`} className="text-xs text-gray-900">
                            Nome do Caminho
                          </Label>
                          <Input
                            id={`split-label-${split.id}`}
                            type="text"
                            value={split.label}
                            onChange={(e) => {
                              const newSplits = [...((data as RandomizadorNodeData).splits || [])];
                              newSplits[index].label = e.target.value;
                              handleChange('splits', newSplits);
                            }}
                            className="mt-1 mb-2 !bg-white !border-gray-300 !text-gray-900 focus:!ring-[#9b87f5] focus:!border-[#9b87f5] placeholder:!text-gray-400"
                            placeholder="ex: Caminho A"
                          />
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`split-${split.id}`} className="text-xs text-gray-900">
                              Percentual
                            </Label>
                            <Input
                              id={`split-${split.id}`}
                              type="number"
                              min="0"
                              max="100"
                              value={split.percentage}
                              onChange={(e) => {
                                const newSplits = [...((data as RandomizadorNodeData).splits || [])];
                                newSplits[index].percentage = parseInt(e.target.value) || 0;
                                handleChange('splits', newSplits);
                              }}
                              className="w-20 !bg-white !border-gray-300 !text-gray-900 focus:!ring-[#9b87f5] focus:!border-[#9b87f5]"
                            />
                            <span className="text-sm text-gray-600">%</span>
                          </div>
                        </div>
                        {((data as RandomizadorNodeData).splits || []).length > 2 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const newSplits = ((data as RandomizadorNodeData).splits || []).filter((_, i) => i !== index);
                              handleChange('splits', newSplits);
                            }}
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-gray-100"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const currentSplits = (data as RandomizadorNodeData).splits || [];
                      const newSplit = {
                        id: `split-${Date.now()}`,
                        label: `Caminho ${String.fromCharCode(65 + currentSplits.length)}`,
                        percentage: 0,
                      };
                      handleChange('splits', [...currentSplits, newSplit]);
                    }}
                    className="w-full mt-2 bg-white border-gray-300 text-gray-900 hover:bg-gray-50"
                  >
                    + Adicionar Caminho
                  </Button>
                </div>
              </div>
            )}

            {/* NÓ CONDIÇÃO (IF) - Simplificado */}
            {type === 'condition' && (() => {
              const ifData = data as IfNodeData;
              
              const operators = [
                { value: 'contains', label: 'Contém' },
                { value: 'equals', label: 'Igual a' },
                { value: 'starts_with', label: 'Começa com' },
                { value: 'ends_with', label: 'Termina com' },
              ] as const;

              return (
                <div className="space-y-5">
                  <div>
                    <Label htmlFor="if-operator" className="text-gray-900 text-sm font-medium">
                      Condição
                    </Label>
                    <Select
                      value={ifData.operator || 'contains'}
                      onValueChange={(value) => handleChange('operator', value)}
                    >
                      <SelectTrigger 
                        id="if-operator" 
                        className="mt-2 !bg-white !border-gray-300 !text-gray-900 focus:!ring-[#9b87f5] focus:!border-[#9b87f5]"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="!bg-white !border-gray-200">
                        {operators.map((op) => (
                          <SelectItem
                            key={op.value}
                            value={op.value}
                            className="!text-gray-900 hover:!bg-gray-50"
                          >
                            {op.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="if-value" className="text-gray-900 text-sm font-medium">
                      Valor
                    </Label>
                    <Input
                      id="if-value"
                      type="text"
                      value={String(ifData.value || '')}
                      onChange={(e) => handleChange('value', e.target.value)}
                      placeholder='Ex: "sim", "1", "quero"'
                      className="mt-2 !bg-white !border-gray-300 !text-gray-900 focus:!ring-[#9b87f5] focus:!border-[#9b87f5] placeholder:!text-gray-400"
                    />
                  </div>

                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs text-gray-600">
                    <p className="font-medium text-gray-800 mb-2">Exemplos de uso:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Usuário digitou "sim" → Condição: <strong>Contém</strong> → Valor: <strong>sim</strong></li>
                      <li>Usuário escolheu opção "1" → Condição: <strong>Igual a</strong> → Valor: <strong>1</strong></li>
                      <li>Usuário quer cancelar → Condição: <strong>Contém</strong> → Valor: <strong>cancel</strong></li>
                    </ul>
                  </div>

                  <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex-1">
                      <p className="text-xs font-medium text-green-900">Saídas:</p>
                      <p className="text-xs text-green-700 mt-1">
                        <strong>Sim</strong> - quando a condição for verdadeira<br/>
                        <strong>Não</strong> - quando a condição for falsa
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* NÓ MENU INTERATIVO */}
            {type === 'menu' && (() => {
              const menuData = data as MenuNodeData;
              const options = menuData.options || [
                { id: '1', label: 'Suporte' },
                { id: '2', label: 'Vendas' },
                { id: '3', label: 'Outros' },
              ];
              
              if (!menuData.options || menuData.options.length === 0) {
                handleChange('options', options);
              }

              return (
                <div className="space-y-5">
                  <div>
                    <Label htmlFor="menu-message" className="text-gray-900 text-sm font-medium">
                      Mensagem do Menu
                    </Label>
                    <Textarea
                      id="menu-message"
                      value={menuData.message || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        const variables = extractVariables(value);
                        handleChange('message', value);
                        handleChange('variables', variables);
                      }}
                      placeholder="Digite a mensagem do menu com as opções..."
                      rows={6}
                      className={cn(
                        "w-full rounded-lg !border-gray-300 !bg-gray-50 px-3 py-2 text-sm mt-2 !text-gray-900",
                        "placeholder:!text-gray-400",
                        "focus:outline-none focus:!ring-2 focus:!ring-[#9b87f5] focus:!border-[#9b87f5] focus:!bg-white",
                        "disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                      )}
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      Exemplo: "Olá! Escolha uma opção:\n1 - Suporte\n2 - Vendas\n3 - Outros"
                    </p>
                    
                    {menuData.variables && menuData.variables.length > 0 && (
                      <div className="mt-3">
                        <div className="flex items-center gap-2 text-xs text-[#9b87f5] mb-2">
                          <Variable className="w-3 h-3" />
                          <span>Variáveis detectadas:</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {menuData.variables.map((v) => (
                            <span key={v} className="text-xs bg-[#9b87f5]/20 text-[#9b87f5] px-2 py-1 rounded-md">
                              {v}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <Label className="text-gray-900 text-sm font-medium mb-3 block">
                      Opções do Menu
                    </Label>
                    <div className="space-y-3">
                      {options.map((option, index) => (
                        <div key={option.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900 w-6">
                                {option.id}.
                              </span>
                              <Input
                                type="text"
                                value={option.label}
                                onChange={(e) => {
                                  const newOptions = [...options];
                                  newOptions[index].label = e.target.value;
                                  handleChange('options', newOptions);
                                }}
                                placeholder="Label da opção"
                                className="!bg-white !border-gray-300 !text-gray-900 focus:!ring-[#9b87f5] focus:!border-[#9b87f5] placeholder:!text-gray-400"
                              />
                            </div>
                          </div>
                          {options.length > 1 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                const newOptions = options.filter((_, i) => i !== index);
                                // Reindexar IDs
                                const reindexed = newOptions.map((opt, i) => ({
                                  ...opt,
                                  id: String(i + 1),
                                }));
                                handleChange('options', reindexed);
                              }}
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-gray-100"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newOption = {
                          id: String(options.length + 1),
                          label: `Opção ${options.length + 1}`,
                        };
                        handleChange('options', [...options, newOption]);
                      }}
                      className="w-full mt-3 bg-white border-gray-300 text-gray-900 hover:bg-gray-50"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Opção
                    </Button>
                  </div>

                  {/* Seção de Variáveis Disponíveis */}
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Variáveis disponíveis</h4>
                    <ul className="space-y-1.5 text-xs text-gray-600">
                      <li><code className="bg-[#9b87f5]/20 text-[#9b87f5] px-1.5 py-0.5 rounded">{'{{nome}}'}</code> - Nome do lead</li>
                      <li><code className="bg-[#9b87f5]/20 text-[#9b87f5] px-1.5 py-0.5 rounded">{'{{telefone}}'}</code> - Número do WhatsApp</li>
                      <li><code className="bg-[#9b87f5]/20 text-[#9b87f5] px-1.5 py-0.5 rounded">{'{{etapa}}'}</code> - Etapa atual do funil</li>
                      <li><code className="bg-[#9b87f5]/20 text-[#9b87f5] px-1.5 py-0.5 rounded">{'{{vendedor}}'}</code> - Nome do vendedor</li>
                    </ul>
                  </div>
                </div>
              );
            })()}

            {/* NÓ FIM */}
            {type === 'end' && (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                  <Flag className="w-8 h-8 text-red-600" />
                </div>
                <p className="text-gray-900 font-medium mb-2">Fim do Fluxo</p>
                <p className="text-sm text-gray-600">
                  Este nó encerra a execução do workflow. Não requer configuração adicional.
                </p>
              </div>
            )}

            {/* NÓ DELAY */}
            {type === 'delay' && (() => {
              const delayData = data as DelayNodeData;
              return (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="duration" className="text-gray-900 text-sm font-medium">
                      Duração
                    </Label>
                    <Input
                      id="duration"
                      type="number"
                      min="1"
                      value={delayData.duration || 0}
                      onChange={(e) => handleChange('duration', parseInt(e.target.value) || 0)}
                      placeholder="30"
                      className="mt-2 !bg-white !border-gray-300 !text-gray-900 focus:!ring-[#9b87f5] focus:!border-[#9b87f5] placeholder:!text-gray-400"
                    />
                  </div>
                  <div>
                    <Label htmlFor="unit" className="text-gray-900 text-sm font-medium">
                      Unidade
                    </Label>
                    <Select
                      value={delayData.unit || 'minutes'}
                      onValueChange={(value) => handleChange('unit', value)}
                    >
                      <SelectTrigger 
                        id="unit" 
                        className="mt-2 !bg-white !border-gray-300 !text-gray-900 focus:!ring-[#9b87f5] focus:!border-[#9b87f5]"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="!bg-white !border-gray-200">
                        <SelectItem value="seconds" className="!text-gray-900 hover:!bg-gray-50">Segundos</SelectItem>
                        <SelectItem value="minutes" className="!text-gray-900 hover:!bg-gray-50">Minutos</SelectItem>
                        <SelectItem value="hours" className="!text-gray-900 hover:!bg-gray-50">Horas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-gray-600">
                    O workflow aguardará este tempo. Se o usuário responder antes, cancela o timer e continua.
                  </p>
                </div>
              );
            })()}

            {/* NÓ TRANSFERIR DEPARTAMENTO */}
            {type === 'transfer_department' && (() => {
              const transferData = data as TransferDepartmentNodeData;
              const rawId = transferData.id_departamento;
              const selectValue = rawId != null && rawId !== '' ? String(Number(rawId)) : '__none__';
              const handleDeptChange = (value: string) => {
                if (value === '__none__') {
                  handleChange('id_departamento', null);
                  return;
                }
                const num = Number(value);
                if (!Number.isNaN(num)) handleChange('id_departamento', num);
              };
              return (
                <div className="space-y-4">
                  <div>
                    <Label className="text-gray-900 text-sm font-medium">Departamento de destino</Label>
                    <Select
                      value={selectValue}
                      onValueChange={handleDeptChange}
                    >
                      <SelectTrigger className="mt-2 !bg-white !border-gray-300 !text-gray-900 focus:!ring-[#9b87f5] focus:!border-[#9b87f5]">
                        <SelectValue placeholder="Selecione um departamento" />
                      </SelectTrigger>
                      <SelectContent className="!bg-white !border-gray-200">
                        <SelectItem value="__none__" className="!text-gray-900 hover:!bg-gray-50">Nenhum</SelectItem>
                        {departamentos.map((dep) => (
                          <SelectItem key={dep.id} value={String(dep.id)} className="!text-gray-900 hover:!bg-gray-50">
                            {dep.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-gray-600">
                    O lead será transferido para este departamento. Ao chegar no nó Fim, o campo chatbot será definido como desativado.
                  </p>
                </div>
              );
            })()}

            {/* FALLBACK - Se nenhum tipo for reconhecido */}
            {!['inicio', 'trigger', 'message', 'menu', 'condition', 'ia', 'randomizador', 'end', 'delay', 'transfer_department'].includes(type || '') && (
              <div className="text-center py-8 border-t border-gray-200 mt-6 pt-6">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-gray-600" />
                </div>
                <p className="text-gray-900 font-medium mb-2">Tipo de nó não reconhecido</p>
                <p className="text-sm text-gray-600 mb-4">
                  Tipo: <code className="bg-gray-200 px-2 py-1 rounded">{type || 'undefined'}</code>
                </p>
                <p className="text-xs text-gray-500 mb-2">
                  ID: {id}
                </p>
                <pre className="text-xs text-left bg-gray-50 p-4 rounded mt-2 overflow-auto max-h-40">
                  {JSON.stringify(data, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Footer com botão de salvar */}
          <div className="border-t border-gray-200 p-4 flex justify-end">
            <Button
              onClick={onClose}
              className="bg-[#9b87f5] hover:bg-[#8b77e5] text-white px-6"
            >
              <Save className="w-4 h-4 mr-2" />
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
