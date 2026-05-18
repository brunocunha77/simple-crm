import { supabase } from '@/lib/supabase';

export interface DocumentoCatalogo {
  id?: number;
  id_cliente: number;
  url_arquivo: string;
  tipo: string;
  status: 'Pendente' | 'Processando' | 'Concluído' | 'Erro';
  link?: string;
  created_at?: string;
  updated_at?: string;
}

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
  documento?: DocumentoCatalogo;
}

export class DocumentosCatalogoService {
  private static readonly BUCKET_NAME = 'documentos_catalogo';

  /**
   * Upload de arquivo para o bucket e inserção na tabela
   */
  static async uploadArquivo(
    file: File,
    idCliente: number,
    link?: string
  ): Promise<UploadResult> {
    try {
      void 0;
      
      // 1. Determinar tipo do arquivo baseado na extensão
      const tipo = this.getFileType(file.name);
      if (!tipo) {
        return {
          success: false,
          error: 'Tipo de arquivo não suportado. Use XML, XLS, XLSX, CSV, PDF ou DOC'
        };
      }

      // 2. Gerar nome único para o arquivo
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 15);
      const fileName = `${idCliente}_${timestamp}_${randomId}_${file.name}`;
      const filePath = `${idCliente}/${fileName}`;

      // 3. Upload para o bucket do Supabase
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('❌ Erro no upload para bucket:', uploadError);
        return {
          success: false,
          error: `Erro no upload: ${uploadError.message}`
        };
      }

      // 4. Obter URL pública do arquivo
      const { data: urlData } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // 5. Inserir registro na tabela documentos_catalogo
      const documento: Omit<DocumentoCatalogo, 'id'> = {
        id_cliente: idCliente,
        url_arquivo: publicUrl,
        tipo: tipo,
        status: 'Pendente',
        link: link || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: insertData, error: insertError } = await supabase
        .from('documentos_catalogo')
        .insert(documento)
        .select()
        .single();

      if (insertError) {
        console.error('❌ Erro ao inserir na tabela:', insertError);
        
        // Se falhar na inserção, tentar remover o arquivo do bucket
        await supabase.storage
          .from(this.BUCKET_NAME)
          .remove([filePath]);
        
        return {
          success: false,
          error: `Erro ao salvar dados: ${insertError.message}`
        };
      }

      void 0;

      return {
        success: true,
        url: publicUrl,
        documento: insertData as DocumentoCatalogo
      };

    } catch (error) {
      console.error('❌ Erro inesperado no upload:', error);
      return {
        success: false,
        error: `Erro inesperado: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Adicionar website/URL para o catálogo
   */
  static async adicionarWebsite(
    url: string,
    idCliente: number
  ): Promise<UploadResult> {
    try {
      void 0;

      const documento: Omit<DocumentoCatalogo, 'id'> = {
        id_cliente: idCliente,
        url_arquivo: '', // Vazio para websites
        tipo: 'website',
        status: 'Pendente',
        link: url,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: insertData, error: insertError } = await supabase
        .from('documentos_catalogo')
        .insert(documento)
        .select()
        .single();

      if (insertError) {
        console.error('❌ Erro ao inserir website:', insertError);
        return {
          success: false,
          error: `Erro ao salvar website: ${insertError.message}`
        };
      }

      void 0;

      return {
        success: true,
        documento: insertData as DocumentoCatalogo
      };

    } catch (error) {
      console.error('❌ Erro inesperado ao adicionar website:', error);
      return {
        success: false,
        error: `Erro inesperado: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Listar documentos de um cliente
   */
  static async listarDocumentosCliente(idCliente: number): Promise<DocumentoCatalogo[]> {
    try {
      const { data, error } = await supabase
        .from('documentos_catalogo')
        .select('*')
        .eq('id_cliente', idCliente)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erro ao listar documentos:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('❌ Erro inesperado ao listar documentos:', error);
      return [];
    }
  }

  /**
   * Atualizar status de um documento
   */
  static async atualizarStatus(
    id: number,
    status: DocumentoCatalogo['status']
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('documentos_catalogo')
        .update({ 
          status: status,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        console.error('❌ Erro ao atualizar status:', error);
        return false;
      }

      void 0;
      return true;
    } catch (error) {
      console.error('❌ Erro inesperado ao atualizar status:', error);
      return false;
    }
  }

  /**
   * Remover documento (arquivo + registro)
   */
  static async removerDocumento(id: number): Promise<boolean> {
    try {
      // 1. Buscar documento para obter informações
      const { data: documento, error: fetchError } = await supabase
        .from('documentos_catalogo')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !documento) {
        console.error('❌ Documento não encontrado:', fetchError);
        return false;
      }

      // 2. Se for arquivo (não website), remover do bucket
      if (documento.tipo !== 'website' && documento.url_arquivo) {
        // Extrair caminho do arquivo da URL
        const urlParts = documento.url_arquivo.split('/');
        const filePath = urlParts.slice(-2).join('/'); // id_cliente/filename
        
        const { error: removeError } = await supabase.storage
          .from(this.BUCKET_NAME)
          .remove([filePath]);

        if (removeError) {
          void 0;
          // Continua mesmo se falhar no bucket
        }
      }

      // 3. Remover registro da tabela
      const { error: deleteError } = await supabase
        .from('documentos_catalogo')
        .delete()
        .eq('id', id);

      if (deleteError) {
        console.error('❌ Erro ao remover registro:', deleteError);
        return false;
      }

      void 0;
      return true;

    } catch (error) {
      console.error('❌ Erro inesperado ao remover documento:', error);
      return false;
    }
  }

  /**
   * Determinar tipo do arquivo baseado na extensão
   */
  private static getFileType(fileName: string): string | null {
    const extension = fileName.toLowerCase().split('.').pop();
    
    const supportedTypes: Record<string, string> = {
      'xml': 'xml',
      'xls': 'xls',
      'xlsx': 'xlsx',
      'csv': 'csv',
      'pdf': 'pdf',
      'doc': 'doc',
      'docx': 'docx',
      'txt': 'txt'
    };

    return extension ? supportedTypes[extension] || null : null;
  }

  /**
   * Verificar se o bucket existe e criar se necessário
   */
  static async verificarBucket(): Promise<boolean> {
    try {
      const { data: buckets, error } = await supabase.storage.listBuckets();
      
      if (error) {
        console.error('❌ Erro ao listar buckets:', error);
        return false;
      }

      const bucketExists = buckets.some(bucket => bucket.name === this.BUCKET_NAME);
      
      if (!bucketExists) {
        void 0;
        const { error: createError } = await supabase.storage.createBucket(this.BUCKET_NAME, {
          public: true,
          allowedMimeTypes: [
            'application/xml',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/csv',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain'
          ],
          fileSizeLimit: 10485760 // 10MB
        });

        if (createError) {
          console.error('❌ Erro ao criar bucket:', createError);
          return false;
        }

        void 0;
      }

      return true;
    } catch (error) {
      console.error('❌ Erro ao verificar bucket:', error);
      return false;
    }
  }
}
