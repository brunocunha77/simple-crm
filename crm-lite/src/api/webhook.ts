/**
 * API para gerar dados a partir de uma URL de site
 * Esta abordagem é compatível com Vite e outros frameworks
 */

/**
 * Função para extrair apenas o nome baseado no domínio da URL
 * sem gerar informações falsas para os outros campos
 */
export async function fetchFromWebhook(websiteUrl: string): Promise<any> {
  try {
    // Formatar a URL para garantir que tenha o protocolo
    const formattedUrl = websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`;
    
    void 0;
    
    // Simulação de delay para dar a sensação de processamento
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Extrair o domínio da URL para personalizar a resposta
    const domain = new URL(formattedUrl).hostname.replace('www.', '');
    const companyName = domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);
    
    void 0;
    void 0;
    
    // Retornar apenas o nome baseado no domínio, deixando outros campos vazios
    const data = {
      name: `Assistente ${companyName}`,
      description: "",
      address: "",
      mainProduct: "",
      prompt: ""
    };
    
    // Retornar os dados
    return data;
  } catch (error) {
    console.error('Erro ao processar a URL:', error);
    throw new Error('Falha ao processar a URL: ' + (error instanceof Error ? error.message : String(error)));
  }
} 