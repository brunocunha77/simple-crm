import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Image as ImageIcon, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImageUploaderProps {
  onSendImage: (imageFile: File) => Promise<void>;
  onCancel: () => void;
  initialImageFile?: File | null;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  onSendImage,
  onCancel,
  initialImageFile
}) => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialImageFile) {
      setSelectedImage(initialImageFile);

      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(initialImageFile);
    }
  }, [initialImageFile]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione apenas arquivos de imagem');
      return;
    }

    // Validar tamanho (máx 16MB para WhatsApp)
    const maxSize = 16 * 1024 * 1024; // 16MB
    if (file.size > maxSize) {
      alert('Arquivo muito grande! Máximo permitido: 16MB');
      return;
    }

    setSelectedImage(file);
    
    // Criar preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSend = async () => {
    if (!selectedImage) return;

    setIsSending(true);
    try {
      await onSendImage(selectedImage);
      handleCancel();
    } catch (error) {
      console.error('Erro ao enviar imagem:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleCancel = () => {
    setSelectedImage(null);
    setPreviewUrl('');
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

  // Se não tem imagem selecionada, mostrar seletor
  if (!selectedImage) {
    return (
      <div className="flex items-center space-x-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2"
        >
          <Upload className="h-4 w-4" />
          Selecionar Imagem
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

  // Se tem imagem selecionada, mostrar preview
  return (
    <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-blue-600" />
          <div>
            <p className="text-sm font-medium text-blue-700">
              {selectedImage.name}
            </p>
            <p className="text-xs text-blue-600">
              {formatFileSize(selectedImage.size)}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCancel}
          className="text-gray-600 hover:bg-gray-100 rounded-full p-1"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Preview da imagem */}
      <div className="mb-4 flex justify-center">
        <div className="relative max-w-sm">
          <img
            src={previewUrl}
            alt="Preview"
            className="rounded-lg max-h-64 object-contain border border-gray-200"
          />
        </div>
      </div>

      {/* Botões de ação */}
      <div className="flex justify-between items-center">
        <span className="text-sm text-blue-600">
          ⚡ Clique em enviar para compartilhar esta imagem
        </span>
        
        <Button
          onClick={handleSend}
          disabled={isSending}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
        >
          {isSending ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              <span>Enviando...</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Send className="h-4 w-4" />
              <span>Enviar Imagem</span>
            </div>
          )}
        </Button>
      </div>
    </div>
  );
}; 