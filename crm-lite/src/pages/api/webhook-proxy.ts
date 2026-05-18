import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Responder a requisições OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Permitir apenas requisições POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const webhookData = req.body;

    // Validar dados obrigatórios
    if (!webhookData || !webhookData.cliente_id || !webhookData.id_agenda) {
      return res.status(400).json({ 
        success: false,
        error: 'Dados obrigatórios não fornecidos',
        required: ['cliente_id', 'id_agenda'],
        received: Object.keys(webhookData || {})
      });
    }

    void 0;
    void 0;

    // Disparar webhook para o endpoint externo
    const response = await fetch('https://webhook.dev.usesmartcrm.com/webhook/planilha-agenda', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SmartCRM-Webhook-Proxy/1.0'
      },
      body: JSON.stringify(webhookData),
      // Timeout de 15 segundos
      signal: AbortSignal.timeout(15000)
    });

    if (response.ok) {
      void 0;
      return res.status(200).json({ 
        success: true, 
        message: 'Webhook disparado com sucesso via proxy',
        status: response.status,
        timestamp: new Date().toISOString()
      });
    } else {
      console.error('❌ Proxy: Webhook falhou:', response.status, response.statusText);
      
      // Tentar ler detalhes do erro
      let errorDetails = '';
      try {
        errorDetails = await response.text();
      } catch (e) {
        errorDetails = 'Não foi possível ler detalhes do erro';
      }
      
      return res.status(response.status).json({ 
        success: false, 
        error: 'Webhook falhou',
        status: response.status,
        statusText: response.statusText,
        details: errorDetails,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('❌ Proxy: Erro interno:', error);
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return res.status(408).json({ 
          success: false, 
          error: 'Timeout na requisição do webhook (15s)',
          timestamp: new Date().toISOString()
        });
      }
      
      return res.status(500).json({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
    
    return res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor',
      timestamp: new Date().toISOString()
    });
  }
}
