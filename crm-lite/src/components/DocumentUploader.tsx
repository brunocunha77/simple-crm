import React, { useState, useRef } from 'react';
import { X, Send, FileText, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DocumentUploaderProps {
  onSendDocument: (documentFile: File) => Promise<void>;
  onCancel: () => void;
}

export const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  onSendDocument,
  onCancel
}) => {
  const [selectedDocument, setSelectedDocument] = useState<File | null>(null);
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo (documentos permitidos)
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'application/octet-stream'
    ];

    if (!allowedTypes.includes(file.type)) {
      alert('Por favor, selecione apenas arquivos de documento (PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT)');
      return;
    }

    // Validar tamanho (máx 100MB para WhatsApp)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      alert('Arquivo muito grande! Máximo permitido: 100MB');
      return;
    }

    setSelectedDocument(file);
  };

  const handleSend = async () => {
    if (!selectedDocument) return;

    setIsSending(true);
    try {
      await onSendDocument(selectedDocument);
      handleCancel();
    } catch (error) {
      console.error('Erro ao enviar documento:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleCancel = () => {
    setSelectedDocument(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onCancel();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return '📄';
      case 'doc':
      case 'docx':
        return '📝';
      case 'xls':
      case 'xlsx':
        return '📊';
      case 'ppt':
      case 'pptx':
        return '📈';
      case 'txt':
        return '📃';
      default:
        return '📎';
    }
  };

  // Se não tem documento selecionado, mostrar seletor
  if (!selectedDocument) {
    return (
      <div className="flex items-center space-x-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
          onChange={handleFileSelect}
          className="hidden"
        />
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2"
        >
          <Upload className="h-4 w-4" />
          Selecionar Documento
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="text-gray-600"
        >
          Cancelar
        </Button>
      </div>
    );
  }

  // Se tem documento selecionado, mostrar preview e botões
  return (
    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border">
      <div className="flex items-center space-x-3 flex-1">
        <div className="text-2xl">
          {getFileIcon(selectedDocument.name)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {selectedDocument.name}
          </p>
          <p className="text-xs text-gray-500">
            {formatFileSize(selectedDocument.size)}
          </p>
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <Button
          size="sm"
          onClick={handleSend}
          disabled={isSending}
          className="flex items-center gap-2"
        >
          {isSending ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          {isSending ? 'Enviando...' : 'Enviar'}
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCancel}
          disabled={isSending}
          className="text-gray-600"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}; 