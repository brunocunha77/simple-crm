import { supabase } from '@/lib/supabase';

export interface UploadResult {
  path: string;
  url: string;
  error?: string;
}

export class StorageService {
  /**
   * Upload de arquivo para Supabase Storage
   * Organiza por: {id_cliente}/workflows/{workflow_id}/{node_id}/{timestamp}.{ext}
   */
  async uploadWorkflowFile(
    file: File,
    idCliente: number | string,
    workflowId: string,
    nodeId: string
  ): Promise<UploadResult> {
    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'bin';
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const fileName = `${timestamp}-${randomSuffix}.${fileExt}`;
      const filePath = `${idCliente}/workflows/${workflowId}/${nodeId}/${fileName}`;

      // Upload para Supabase Storage
      const { data, error } = await supabase.storage
        .from('workflow-assets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false, // Não sobrescrever - criar novo arquivo
        });

      if (error) {
        console.error('Erro no upload:', error);
        throw new Error(error.message || 'Falha ao fazer upload do arquivo');
      }

      // Gerar URL pública (assumindo bucket público)
      // Se o bucket for privado, usar getPublicUrl com signed URL ou criar signed URL
      const { data: { publicUrl } } = supabase.storage
        .from('workflow-assets')
        .getPublicUrl(filePath);

      return {
        path: filePath,
        url: publicUrl,
      };
    } catch (error: any) {
      console.error('StorageService.uploadWorkflowFile error:', error);
      return {
        path: '',
        url: '',
        error: error.message || 'Erro desconhecido ao fazer upload',
      };
    }
  }

  /**
   * Deletar arquivo do storage
   */
  async deleteFile(filePath: string): Promise<void> {
    if (!filePath) return;

    try {
      const { error } = await supabase.storage
        .from('workflow-assets')
        .remove([filePath]);

      if (error) {
        console.error('Erro ao deletar arquivo:', error);
        // Não lançar erro - apenas logar, pois pode ser que o arquivo já não exista
      }
    } catch (error) {
      console.error('StorageService.deleteFile error:', error);
    }
  }

  /**
   * Validar tipo e tamanho do arquivo
   */
  validateFile(
    file: File,
    allowedTypes: string[],
    maxSizeMB: number
  ): string | null {
    // Verificar tipo MIME
    if (!allowedTypes.includes(file.type)) {
      return `Tipo de arquivo não permitido. Formatos aceitos: ${allowedTypes
        .map((t) => t.split('/')[1])
        .join(', ')}`;
    }

    // Verificar tamanho
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return `Arquivo muito grande. Tamanho máximo: ${maxSizeMB}MB (arquivo: ${(file.size / 1024 / 1024).toFixed(2)}MB)`;
    }

    return null;
  }

  /**
   * Obter tipos MIME permitidos por categoria
   */
  getAllowedTypes(category: 'audio' | 'file' | 'image' | 'video' | 'document'): string[] {
    switch (category) {
      case 'audio':
        return [
          'audio/mpeg',
          'audio/mp3',
          'audio/wav',
          'audio/wave',
          'audio/ogg',
          'audio/webm',
          'audio/aac',
        ];
      case 'file':
        return [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/plain',
          'text/csv',
        ];
      case 'image':
        return [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/webp',
          'image/gif',
        ];
      case 'video':
        return [
          'video/mp4',
          'video/mpeg',
          'video/quicktime',
        ];
      case 'document':
        return [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ];
      default:
        return [];
    }
  }

  /**
   * Obter tamanho máximo por categoria
   */
  getMaxSizeMB(category: 'audio' | 'file' | 'image' | 'video' | 'document'): number {
    switch (category) {
      case 'audio':
        return 16; // 16MB para áudio
      case 'file':
        return 50; // 50MB para documentos genéricos
      case 'image':
        return 5; // 5MB para imagens
      case 'video':
        return 50; // 50MB para vídeos
      case 'document':
        return 10; // 10MB para documentos
      default:
        return 50;
    }
  }
}

export const storageService = new StorageService();
