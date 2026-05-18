import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Permitir apenas requisições POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const webhookData = req.body;

    // Validar dados obrigatórios
    if (!webhookData || !webhookData.cliente_id || !webhookData.id_agenda) {
      return res.status(400).json({ error: 'Dados obrigatórios não fornecidos' });
    }

    // Disparar webhook para o endpoint externo
    const response = await fetch('https://webhook.dev.usesmartcrm.com/webhook/planilha-agenda', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SmartCRM-Webhook-Proxy/1.0'
      },
      body: JSON.stringify(webhookData),
      // Timeout de 10 segundos
      signal: AbortSignal.timeout(10000)
    });

    if (response.ok) {
      void 0;
      return res.status(200).json({ 
        success: true, 
        message: 'Webhook disparado com sucesso',
        status: response.status
      });
    } else {
      console.error('❌ Webhook falhou via proxy:', response.status, response.statusText);
      return res.status(response.status).json({ 
        success: false, 
        error: 'Webhook falhou',
        status: response.status,
        statusText: response.statusText
      });
    }

  } catch (error) {
    console.error('❌ Erro no proxy do webhook:', error);
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return res.status(408).json({ 
          success: false, 
          error: 'Timeout na requisição do webhook' 
        });
      }
      
      return res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
    
    return res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    });
  }
}
