import JSZip from 'jszip';
import { saveAs } from 'file-saver';

/**
 * Comprime um arquivo em ZIP se ele for maior que o limite especificado
 * @param file Arquivo original
 * @param maxSizeInMB Tamanho máximo em MB antes de comprimir (padrão: 10MB)
 * @returns Promise<File> Arquivo original ou arquivo ZIP comprimido
 */
export async function compressFileIfNeeded(
  file: File, 
  maxSizeInMB: number = 10
): Promise<{ file: File; isCompressed: boolean; originalName: string }> {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  
  // Se o arquivo é menor que o limite, retorna o arquivo original
  if (file.size <= maxSizeInBytes) {
    return {
      file,
      isCompressed: false,
      originalName: file.name
    };
  }

  void 0;

  try {
    // Primeira tentativa: JSZip com configurações robustas
    const result = await createZipFile(file, 'robust');
    return result;

  } catch (error) {
    void 0;
    
    try {
      // Segunda tentativa: JSZip sem compressão
      const result = await createZipFile(file, 'store');
      return result;

    } catch (secondError) {
      console.error('❌ Ambas as tentativas de compressão falharam:', secondError);
      // Em caso de erro, retorna o arquivo original
      return {
        file,
        isCompressed: false,
        originalName: file.name
      };
    }
  }
}

async function createZipFile(file: File, method: 'robust' | 'store'): Promise<{ file: File; isCompressed: boolean; originalName: string }> {
  void 0;
  
  const zip = new JSZip();
  
  // Adicionar o arquivo ao ZIP
  zip.file(file.name, file);
  
  // Configurações otimizadas para criar ZIP válido
  const config = {
    type: 'blob' as const, // Usar blob para máxima compatibilidade
    compression: method === 'robust' ? 'DEFLATE' : 'STORE',
    compressionOptions: method === 'robust' ? { level: 6 } : undefined,
    platform: 'DOS' as const // Compatibilidade máxima
  };

  void 0;

  // Gerar o ZIP como Blob (método correto)
  const zipBlob = await zip.generateAsync(config);

  // Verificar se o ZIP foi criado corretamente
  if (zipBlob.size === 0) {
    throw new Error('Arquivo ZIP criado está vazio');
  }

  // Criar novo arquivo ZIP
  const zipFileName = `${file.name.replace(/\.[^/.]+$/, '')}.zip`;
  const zipFile = new File([zipBlob], zipFileName, {
    type: 'application/zip',
    lastModified: Date.now()
  });

  // Testar se o ZIP é válido tentando lê-lo
  try {
    const testZip = new JSZip();
    await testZip.loadAsync(zipBlob);
    const files = Object.keys(testZip.files);
    if (files.length === 0) {
      throw new Error('ZIP não contém arquivos');
    }
    void 0;
  } catch (validationError) {
    console.error(`❌ Erro na validação do ZIP (${method}):`, validationError);
    throw new Error(`ZIP corrompido: ${validationError instanceof Error ? validationError.message : 'Erro desconhecido'}`);
  }

  const compressionRatio = ((file.size - zipFile.size) / file.size * 100).toFixed(1);
  
  void 0;

  return {
    file: zipFile,
    isCompressed: true,
    originalName: file.name
  };
}

/**
 * Formata o tamanho do arquivo em formato legível
 * @param bytes Tamanho em bytes
 * @returns String formatada (ex: "2.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Verifica se um arquivo precisa ser comprimido
 * @param file Arquivo para verificar
 * @param maxSizeInMB Tamanho máximo em MB (padrão: 10MB)
 * @returns true se precisa comprimir, false caso contrário
 */
export function needsCompression(file: File, maxSizeInMB: number = 10): boolean {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  return file.size > maxSizeInBytes;
}

/**
 * Função de teste para verificar se a compressão está funcionando
 * @param file Arquivo para testar
 * @returns Promise com resultado do teste
 */
export async function testCompression(file: File): Promise<{ success: boolean; error?: string; details?: any }> {
  try {
    void 0;
    
    const result = await compressFileIfNeeded(file, 1); // Força compressão para arquivos > 1MB
    
    if (result.isCompressed) {
      // Testar se o ZIP pode ser lido
      const zip = new JSZip();
      await zip.loadAsync(result.file);
      const files = Object.keys(zip.files);
      
      return {
        success: true,
        details: {
          originalSize: file.size,
          compressedSize: result.file.size,
          filesInZip: files.length,
          compressionRatio: ((file.size - result.file.size) / file.size * 100).toFixed(1) + '%'
        }
      };
    } else {
      return {
        success: true,
        details: {
          message: 'Arquivo não precisou ser comprimido',
          size: file.size
        }
      };
    }
    
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}

/**
 * Função para criar e baixar um ZIP válido (para teste)
 * @param file Arquivo para comprimir
 * @param fileName Nome do arquivo ZIP (opcional)
 */
export async function createAndDownloadZip(file: File, fileName?: string): Promise<void> {
  try {
    void 0;
    
    const zip = new JSZip();
    zip.file(file.name, file);
    
    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
      platform: 'DOS'
    });
    
    const zipFileName = fileName || `${file.name.replace(/\.[^/.]+$/, '')}.zip`;
    
    // Usar saveAs para criar ZIP válido
    saveAs(zipBlob, zipFileName);
    
    void 0;
    
  } catch (error) {
    console.error('❌ Erro ao criar ZIP:', error);
    throw error;
  }
}
