import { supabase } from "@/lib/supabase";
import { API_BASE_URL, API_KEY } from '../config';

interface CreateInstanceParams {
  phoneNumber: string;
  userId?: string;
  email?: string;
  instanceName?: string;
}

interface CreateInstanceResponse {
  instance: {
    instanceName: string;
    instanceId: string;
    status: string;
  };
  hash: {
    apikey: string;
  };
  settings: {
    reject_call: boolean;
    msg_call: string;
    groups_ignore: boolean;
    always_online: boolean;
    read_messages: boolean;
    read_status: boolean;
    sync_full_history: boolean;
  };
  qrCode?: string;
}

export interface ConnectionStateResponse {
  instance: {
    id: string;
    name: string;
    instanceName: string;
    state: string;
    ownerJid?: string;
    token?: string;
  };
}

interface WebhookResponse {
  webhook: {
    instanceName: string;
    webhook: {
      url: string;
      events: string[];
      enabled: boolean;
    }
  }
}

interface NumberCheckResponse {
  isInUse: boolean;
  instanceName?: string;
}

const createConsistentInstanceName = async (params: CreateInstanceParams): Promise<string> => {
  if (params.instanceName) {
    // console.log("Usando nome de instância fornecido:", params.instanceName);
    return params.instanceName;
  }
  
  if (params.email) {
    const { data: clientInfo, error } = await supabase
      .from('clientes_info')
      .select('id, name')
      .eq('email', params.email)
      .single();

    if (!error && clientInfo) {
      const sanitizedName = clientInfo.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .substring(0, 10);
      
      const instanceName = `smartcrm_${clientInfo.id}_${sanitizedName}`;
      // console.log("Nome da instância gerado:", instanceName);
      return instanceName;
    }
    
    // console.warn("Fallback: usando email para nome da instância");
    const sanitizedEmail = params.email
      .replace(/@/g, '_at_')
      .replace(/\./g, '_dot_')
      .replace(/[^a-zA-Z0-9_]/g, '')
      .substring(0, 20 - 8);
    
    return `smartcrm_${sanitizedEmail}`;
  }
  
  const instanceName = `smartcrm_${params.userId?.replace(/-/g, '') || ''}`;
  // console.log("Nome da instância gerado:", instanceName);
  return instanceName;
};

export const checkNumberInUse = async (phoneNumber: string): Promise<NumberCheckResponse> => {
  try {
    // console.log("Verificando se o número já está em uso:", phoneNumber);
    
    const response = await fetch(`${API_BASE_URL}/instance/fetchInstances`, {
      method: 'GET',
      headers: {
        'apikey': API_KEY
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      // console.error('Erro ao buscar instâncias:', errorText);
      throw new Error(`Erro ao buscar instâncias: ${response.status} - ${errorText}`);
    }

    const instances = await response.json();
    // console.log('Instâncias encontradas:', instances);

    for (const instance of Array.isArray(instances) ? instances : [instances]) {
      if (instance.ownerJid && instance.ownerJid.split('@')[0] === phoneNumber) {
        const state = await getConnectionState(instance.instanceName);
        if (state.instance.state === 'open') {
          // console.log('Número já está em uso na instância:', instance.instanceName);
          return {
            isInUse: true,
            instanceName: instance.instanceName
          };
        }
      }
    }

    // console.log('Número não está em uso');
    return { isInUse: false };
  } catch (error) {
    // console.error('Erro ao verificar número em uso:', error);
    throw error;
  }
};

export const createWhatsAppInstance = async (params: CreateInstanceParams): Promise<CreateInstanceResponse> => {
  try {
    const numberCheck = await checkNumberInUse(params.phoneNumber);
    if (numberCheck.isInUse) {
      throw new Error('NUMBER_IN_USE');
    }

    const instanceName = await createConsistentInstanceName(params);
    
    // console.log(`Criando/verificando instância do WhatsApp: ${instanceName}`);
    
    try {
      const existingState = await getConnectionState(instanceName);
      // console.log("Instância já existe:", existingState);
      
      if (existingState.instance.ownerJid) {
        const existingNumber = existingState.instance.ownerJid.split('@')[0];
        if (existingNumber === params.phoneNumber) {
          throw new Error('NUMBER_IN_USE');
        }
      }

      const existingInstance = {
        instance: {
          instanceName: instanceName,
          instanceId: existingState.instance.id,
          status: existingState.instance.state
        },
        hash: {
          apikey: API_KEY
        },
        settings: {
          reject_call: false,
          msg_call: "",
          groups_ignore: true,
          always_online: true,
          read_messages: true,
          read_status: false,
          sync_full_history: false
        }
      };

      try {
        const qrCode = await getQRCode(instanceName);
        return {
          ...existingInstance,
          qrCode
        };
      } catch (error) {
        // console.log("Não foi possível obter QR code para instância existente:", error);
        return existingInstance;
      }
    } catch (error) {
      if (error.message === 'NUMBER_IN_USE') {
        throw error;
      }
      // console.log("Instância não existe, criando nova:", error);
    }
    
    const requestBody = {
 	
        instanceName,
        token: API_KEY,
        qrcode: true,
        integration: "WHATSAPP-BAILEYS",
        reject_call: true,
        groupsIgnore: true,
        webhook : {
          enabled: true,
          events: [
            'MESSAGES_UPSERT','MESSAGES_SET', 'SEND_MESSAGE'
          ],
          url: 'https://webhook.dev.usesmartcrm.com/webhook/testeagentesupa',
          byEvents: false,
          base64: true},
         webhookByEvents: true,
         webhookBase64: true
    };
    
    // console.log("Enviando requisição:", JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(`${API_BASE_URL}/instance/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': API_KEY
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      // console.error('Erro detalhado da API:', errorText);
      throw new Error(`Erro ao criar instância: ${response.status} - ${errorText}`);
    }

    const instanceData = await response.json();
    // console.log('Instância criada com sucesso - Dados completos:', JSON.stringify(instanceData, null, 2));
    
    let qrCodeData = null;
    try {
      qrCodeData = await getQRCode(instanceData.instance.instanceName);
      // console.log('QR Code obtido com sucesso');
    } catch (error) {
      // console.error('Erro ao obter QR Code inicial:', error);
    }
    
    return {
      ...instanceData,
      qrCode: qrCodeData
    };
  } catch (error) {
    // console.error('Erro ao criar instância:', error);
    throw error;
  }
};

export const getConnectionState = async (instanceName: string): Promise<ConnectionStateResponse> => {
  // console.log("Verificando estado da conexão para a instância:", instanceName);
  
  try {
    const response = await fetch(`${API_BASE_URL}/instance/connectionState/${instanceName}`, {
    method: "GET",
    headers: {
        "apikey": API_KEY
      }
    });

    // console.log("Resposta da API:", {
    //   status: response.status,
    //   statusText: response.statusText,
    //   headers: Object.fromEntries(response.headers.entries())
    // });

    if (!response.ok) {
      const errorText = await response.text();
      // console.error("Erro detalhado da API:", errorText);
      throw new Error(`Erro ao verificar estado da conexão: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // console.log("Dados completos do estado da conexão:", JSON.stringify(data, null, 2));
    
    return data;
  } catch (error) {
    // console.error("Erro ao verificar estado da conexão:", error);
    throw error;
  }
};

export const getNewQRCode = async (instanceName: string): Promise<string> => {
  try {
    // console.log(`Obtendo novo QR Code para a instância: ${instanceName}`);
    return await getQRCode(instanceName);
  } catch (error) {
    // console.error('Erro ao obter novo QR Code:', error);
    throw error;
  }
};

export const getQRCode = async (instanceName: string): Promise<string> => {
  try {
    // console.log("Buscando QR Code para a instância:", instanceName);
    const response = await fetch(`${API_BASE_URL}/instance/connect/${instanceName}`, {
      method: 'GET',
      headers: {
        'apikey': API_KEY
      }
    });

    // console.log("Resposta do QR Code:", {
    //   status: response.status,
    //   statusText: response.statusText,
    //   headers: Object.fromEntries(response.headers.entries())
    // });

    if (!response.ok) {
      const errorText = await response.text();
      // console.error("Erro detalhado do QR Code:", errorText);
      
      if (response.status === 503) {
        throw new Error("Serviço temporariamente indisponível. Por favor, tente novamente em alguns minutos.");
      }
      
      throw new Error(`Erro ao buscar QR Code: ${response.status} - ${errorText}`);
    }

    const contentType = response.headers.get('content-type');
    // console.log("Content-Type da resposta:", contentType);

    if (!contentType?.includes('application/json')) {
      const text = await response.text();
      // console.error("Resposta não é JSON:", text);
      throw new Error("Serviço temporariamente indisponível. Por favor, tente novamente em alguns minutos.");
    }

    const data = await response.json();
    // console.log("Dados do QR Code:", data);
    
    if (!data.code) {
      throw new Error("Código QR não encontrado na resposta");
    }

    return data.code;
  } catch (error) {
    // console.error("Erro ao buscar QR Code:", error);
    if (error instanceof Error && error.message.includes("indisponível")) {
      throw error;
    }
    throw new Error("Serviço temporariamente indisponível. Por favor, tente novamente em alguns minutos.");
  }
};

export const setWebhook = async (instanceName: string): Promise<WebhookResponse> => {
  // console.log(`Configurando webhook para a instância ${instanceName}`);
  
  try {
    const webhookUrl = "https://webhook.dev.usesmartcrm.com/webhook/testeagentesupa";
    
    const events = [
      'MESSAGES_UPSERT'
    ];
    
    const requestBody = {
      webhook: {
        url: webhookUrl,
        events: events,
        enabled: true
      },
      webhook_by_events: true,
      webhook_base64: true
    };
    
    // console.log("Enviando requisição de webhook:", JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(`${API_BASE_URL}/webhook/set/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': API_KEY
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      // console.error('Erro ao configurar webhook:', errorText);
      throw new Error(`Erro ao configurar webhook: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    // console.log('Webhook configurado com sucesso - dados completos:', JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    // console.error('Erro ao configurar webhook:', error);
    throw error;
  }
};

export const checkAndSetWebhook = async (instanceName: string): Promise<boolean> => {
  try {
    const connectionState = await getConnectionState(instanceName);
    // console.log("Estado da conexão para configurar webhook:", connectionState);
    
    if (connectionState.instance?.state === 'open') {
      // console.log("Instância está conectada, configurando webhook...");
      
      await setWebhook(instanceName);
      // console.log("Webhook configurado com sucesso para instância conectada");
      return true;
    } else {
      // console.log("Instância não está conectada, webhook não será configurado");
      return false;
    }
  } catch (error) {
    // console.error("Erro ao verificar conexão e configurar webhook:", error);
    return false;
  }
};
