import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Apenas permitir requisições GET e POST
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Endpoint de destino
    const targetUrl = 'https://webhook.dev.usesmartcrm.com/webhook-test/prompts-personalizados';
    
    // Extrair os parâmetros da consulta ou do corpo
    const url = req.query.url || (req.body && req.body.url) || '';
    const name = req.query.name || (req.body && req.body.name) || null;
    const description = req.query.description || (req.body && req.body.description) || null;
    const address = req.query.address || (req.body && req.body.address) || null;
    const mainProduct = req.query.mainProduct || (req.body && req.body.mainProduct) || null;
    const prompt = req.query.prompt || (req.body && req.body.prompt) || null;
    
    void 0;
    
    // Verificar se a URL foi fornecida
    if (!url) {
      return res.status(400).json({ error: 'URL é obrigatória' });
    }
    
    // Construir a URL de destino com os parâmetros (para GET)
    let finalUrl = targetUrl;
    if (req.method === 'GET') {
      const params = new URLSearchParams();
      params.append('url', url.toString());
      params.append('name', name === null ? 'null' : name.toString());
      params.append('description', description === null ? 'null' : description.toString());
      params.append('address', address === null ? 'null' : address.toString());
      params.append('mainProduct', mainProduct === null ? 'null' : mainProduct.toString());
      params.append('prompt', prompt === null ? 'null' : prompt.toString());
      
      finalUrl = `${targetUrl}?${params.toString()}`;
    }
    
    // Configurar os headers para a requisição
    const headers: Record<string, string> = {
      'Accept': 'application/json'
    };
    
    if (req.method === 'POST') {
      headers['Content-Type'] = 'application/json';
    }
    
    // Fazer a requisição para o endpoint original
    const fetchOptions: RequestInit = {
      method: req.method,
      headers: headers,
    };
    
    // Adicionar o corpo para requisições POST
    if (req.method === 'POST') {
      fetchOptions.body = JSON.stringify({
        url: url,
        name: name,
        description: description,
        address: address,
        mainProduct: mainProduct,
        prompt: prompt
      });
    }
    
    void 0;
    const response = await fetch(req.method === 'GET' ? finalUrl : targetUrl, fetchOptions);
    
    // Ler o corpo da resposta como texto
    const responseText = await response.text();
    void 0;
    
    // Tentar converter a resposta para JSON
    let responseData;
    try {
      responseData = responseText ? JSON.parse(responseText) : {};
    } catch (error) {
      console.error('Erro ao fazer parse do JSON:', error);
      responseData = { error: 'Formato de resposta inválido', rawResponse: responseText };
    }
    
    // Se a resposta estiver vazia, enviar dados fictícios para teste
    if (!responseText || Object.keys(responseData).length === 0) {
      void 0;
      responseData = {
        name: "Chatbot Genérico",
        description: "Assistente virtual para responder dúvidas dos clientes",
        address: "Endereço não disponível",
        mainProduct: "Serviço de atendimento",
        prompt: "Você é um assistente virtual criado para responder perguntas sobre nossos serviços."
      };
    }
    
    // Retornar os dados obtidos
    return res.status(response.status).json(responseData);
  } catch (error) {
    console.error('Erro ao processar proxy webhook:', error);
    return res.status(500).json({ error: 'Erro ao processar requisição', details: error.message });
  }
} 