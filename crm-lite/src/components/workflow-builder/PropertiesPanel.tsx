import { Node } from '@xyflow/react';
import { X, Variable, AlertCircle } from 'lucide-react';
import { TriggerNodeData, MessageNodeData } from '@/types/workflow';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PropertiesPanelProps {
  selectedNode: Node | null;
  onUpdate: (nodeId: string, data: any) => void;
  onClose: () => void;
}

export function PropertiesPanel({ selectedNode, onUpdate, onClose }: PropertiesPanelProps) {
  if (!selectedNode) {
    return (
      <div className="w-80 bg-sidebar border-l border-sidebar-border p-6">
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">Selecione um nó para editar suas propriedades</p>
        </div>
      </div>
    );
  }

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

  return (
    <div className="w-80 bg-sidebar border-l border-sidebar-border flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        <div>
          <h3 className="text-sidebar-foreground font-semibold">Propriedades</h3>
          <span className="text-xs text-muted-foreground uppercase tracking-wider">{type}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* TRIGGER */}
        {type === 'trigger' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Tipo de Gatilho
              </label>
              <Select
                value={(data as TriggerNodeData).triggerType || 'new_lead'}
                onValueChange={(value) => handleChange('triggerType', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new_lead">Novo Lead</SelectItem>
                  <SelectItem value="message_received">Mensagem Recebida</SelectItem>
                  <SelectItem value="status_changed">Status Alterado</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-2">
                O workflow inicia quando este evento ocorrer.
              </p>
            </div>
          </div>
        )}

        {/* MESSAGE */}
        {type === 'message' && (
          <div className="space-y-5">
            {/* Mensagem */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Mensagem
              </label>
              <textarea
                value={(data as MessageNodeData).message || ''}
                onChange={(e) => handleMessageChange(e.target.value)}
                placeholder="Digite a mensagem..."
                rows={6}
                className={cn(
                  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
                  "ring-offset-background placeholder:text-muted-foreground",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  "disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                )}
              />
              
              {/* Variáveis detectadas */}
              {(data as MessageNodeData).variables && (data as MessageNodeData).variables!.length > 0 && (
                <div className="mt-3">
                  <div className="flex items-center gap-2 text-xs text-primary mb-2">
                    <Variable className="w-3 h-3" />
                    <span>Variáveis detectadas:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(data as MessageNodeData).variables!.map((v) => (
                      <span key={v} className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-md">
                        {v}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Template */}
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-border">
              <input
                type="checkbox"
                id="useTemplate"
                checked={(data as MessageNodeData).useTemplate || false}
                onChange={(e) => handleChange('useTemplate', e.target.checked)}
                className="w-4 h-4 rounded border-input text-primary focus:ring-primary bg-background"
              />
              <label htmlFor="useTemplate" className="text-sm text-foreground cursor-pointer flex-1">
                Usar template aprovado pelo WhatsApp
              </label>
            </div>

            {(data as MessageNodeData).useTemplate && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Nome do Template
                </label>
                <Input
                  type="text"
                  value={(data as MessageNodeData).templateName || ''}
                  onChange={(e) => handleChange('templateName', e.target.value)}
                  placeholder="ex: boas_vindas_v1"
                />
              </div>
            )}

            {/* Dicas de variáveis */}
            <div className="p-4 bg-muted/50 rounded-lg border border-border">
              <h4 className="text-sm font-medium text-foreground mb-2">Variáveis disponíveis</h4>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                <li><code className="bg-muted px-1.5 py-0.5 rounded text-primary">{'{{nome}}'}</code> - Nome do lead</li>
                <li><code className="bg-muted px-1.5 py-0.5 rounded text-primary">{'{{telefone}}'}</code> - Número do WhatsApp</li>
                <li><code className="bg-muted px-1.5 py-0.5 rounded text-primary">{'{{etapa}}'}</code> - Etapa atual do funil</li>
                <li><code className="bg-muted px-1.5 py-0.5 rounded text-primary">{'{{vendedor}}'}</code> - Nome do vendedor</li>
              </ul>
            </div>
          </div>
        )}

        {/* END */}
        {type === 'end' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <p className="text-foreground font-medium mb-2">Fim do Fluxo</p>
            <p className="text-sm text-muted-foreground">
              Este nó encerra a execução do workflow. Não requer configuração adicional.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}