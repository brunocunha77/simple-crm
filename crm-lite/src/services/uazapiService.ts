// UAZAPI Service
// Serviço para integração com a API UAZAPI do WhatsApp

import { supabase } from "@/lib/supabase";

export interface CreateInstanceParams {
  email?: string;
  id?: string;
  instanceName?: string;
  instancePrefix?: string;
}

export interface CreateInstanceResponse {
  token: string;
  instanceName: string;
  qrcode?: string | null;
  instance?: {
    token?: string;
    qrcode?: string;
    name?: string;
  };
}

export interface InstanceStatusResponse {
  status?: string;
  connected?: boolean;
  loggedIn?: boolean;
  instance?: {
    status?: string;
  };
}

export interface QRCodeResponse {
  qrcode?: string;
  instance?: {
    qrcode?: string;
  };
}

// Configuração da API UAZAPI
const UAZAPI_BASE_URL = "https://smartcrm.uazapi.com";
const UAZAPI_ADMIN_TOKEN = "4YyhLKg7eUGhy2vhfzJDbtreK4UJbXNEElCYPS5wQBeADxLcyF";

/**
 * Gera um nome de instância consistente seguindo o padrão da Evolution
 */
const createConsistentInstanceName = async (params: CreateInstanceParams): Promise<string> => {
  if (params.instanceName) {
    return params.instanceName;
  }

  const prefix = params.instancePrefix ?? 'smartcrm';
  
  if (params.email) {
    const { data: clientInfo, error } = await supabase
      .from('clientes_info')
      .select('id, name')
      .eq('email', params.email)
      .maybeSingle();

    if (!error && clientInfo) {
      const sanitizedName = clientInfo.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .substring(0, 10);
      
      const instanceName = `${prefix}_${clientInfo.id}_${sanitizedName}`;
      return instanceName;
    }
    
    const sanitizedEmail = params.email
      .replace(/@/g, '_at_')
      .replace(/\./g, '_dot_')
      .replace(/[^a-zA-Z0-9_]/g, '')
      .substring(0, 20 - (prefix.length + 1));
    
    return `${prefix}_${sanitizedEmail}`;
  }
  
  const instanceName = `${prefix}_${params.id?.replace(/-/g, '') || ''}`;
  return instanceName;
};

/**
 * Cria uma nova instância na UAZAPI
 */
export async function createUAZAPIInstance(
  params: CreateInstanceParams
): Promise<CreateInstanceResponse> {
  try {
    // Gera o nome da instância seguindo o padrão da Evolution
    const instanceName = await createConsistentInstanceName(params);

    const requestBody = {
      name: instanceName,
    };

    const response = await fetch(`${UAZAPI_BASE_URL}/instance/create`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'admintoken': UAZAPI_ADMIN_TOKEN,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro ao criar instância UAZAPI: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    void 0;
    
    // A resposta da UAZAPI deve retornar um token
    const token = data.token || data.data?.token || data.instance?.token || "";
    
    if (!token) {
      throw new Error('Token não retornado pela API UAZAPI');
    }
    
    // O instanceName é o nome que foi enviado na requisição
    const responseInstanceName = data.instanceName || data.data?.instanceName || data.instance?.name || data.name || instanceName;
    
    // Verificar se o QR code já vem na resposta
    const qrcodeFromResponse = data.qrcode || data.data?.qrcode || data.instance?.qrcode || data.code || null;
    
    return {
      token: token,
      instanceName: responseInstanceName,
      instance: data.instance || data.data || data,
      qrcode: qrcodeFromResponse, // Incluir QR code se já vier na resposta
    };
  } catch (error) {
    console.error('Erro ao criar instância UAZAPI:', error);
    throw error;
  }
}

/**
 * Conecta a instância e obtém o QR Code
 * Segundo a documentação: 
 * - POST para /instance/connect
 * - Requer o token de autenticação da instância
 * - Não passa o campo "phone" para gerar QR code
 * - Atualiza o status para "connecting"
 */
export async function connectUAZAPIInstanceAndGetQRCode(
  token: string
): Promise<QRCodeResponse> {
  try {
    // POST para /instance/connect
    // Não passa o campo "phone" para gerar QR code (não número)
    // Usa o token da instância como autenticação (não admin token)
    const response = await fetch(`${UAZAPI_BASE_URL}/instance/connect`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'token': token, // Token da instância no header
      },
      body: JSON.stringify({}), // Body vazio - não passa "phone" para gerar QR code
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro ao conectar instância UAZAPI: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    void 0;
    
    return {
      qrcode: data.qrcode || data.data?.qrcode || data.instance?.qrcode || data.code,
      instance: data.instance || data.data || data,
    };
  } catch (error) {
    console.error('Erro ao conectar instância UAZAPI:', error);
    throw error;
  }
}

/**
 * Obtém o status da instância
 * GET /instance/status
 * Retorna: disconnected, connecting, connected
 */
export async function getUAZAPIInstanceStatus(
  token: string
): Promise<InstanceStatusResponse> {
  try {
    const response = await fetch(`${UAZAPI_BASE_URL}/instance/status`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'token': token, // Token da instância no header
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro ao obter status da instância UAZAPI: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    void 0;
    
    // A resposta pode ter status em diferentes lugares
    const instanceStatus = data.status || data.data?.status || data.instance?.status;
    
    return {
      status: instanceStatus,
      connected: instanceStatus === 'connected' || data.connected === true || data.data?.connected === true,
      loggedIn: instanceStatus === 'connected' || data.loggedIn === true || data.data?.loggedIn === true,
      instance: data.instance || data.data || data,
    };
  } catch (error) {
    console.error('Erro ao obter status da instância UAZAPI:', error);
    throw error;
  }
}

/**
 * Configura o webhook da instância
 * Modo simples (recomendado) - gerencia automaticamente um único webhook por instância
 * Endpoint: POST /webhook (não /instance/webhook)
 */
export async function configureUAZAPIWebhook(
  token: string
): Promise<void> {
  void 0;
  void 0;
  void 0;
  
  try {
    // No Vite, variáveis de ambiente devem ser acessadas via import.meta.env
    // Mas como estamos em runtime, vamos usar o valor padrão diretamente
    const webhookUrl = "https://webhook.dev.usesmartcrm.com/webhook/teste";
    void 0;
    
    // Modo simples: não incluir action nem id - cria novo ou atualiza existente automaticamente
    const requestBody = {
      enabled: true,
      url: webhookUrl,
      events: ["messages", "connection"],
      excludeMessages: ["isGroupYes"],
    };

    void 0;
    void 0;
    void 0;

    void 0;
    const response = await fetch(`${UAZAPI_BASE_URL}/webhook`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'token': token, // Token da instância no header
      },
      body: JSON.stringify(requestBody),
    });

    void 0;

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Erro ao configurar webhook UAZAPI: ${response.status} - ${errorText}`);
      throw new Error(`Erro ao configurar webhook UAZAPI: ${response.status} - ${errorText}`);
    } else {
      let responseData;
      try {
        responseData = await response.json();
      } catch (parseError) {
        responseData = await response.text();
      }
      void 0;
    }
  } catch (error) {
    console.error('Erro ao configurar webhook UAZAPI:', error);
    throw error; // Relançar erro para que o chamador saiba que falhou
  }
}

/**
 * Atualiza o instance_id nas tabelas relacionadas quando uma nova instância UAZAPI é criada
 * Atualiza apenas os registros que possuíam a instância anterior (Evolution)
 */
export async function updateInstanceIdInRelatedTables(
  userEmail: string,
  oldInstanceId: string | null,
  newInstanceId: string
): Promise<void> {
  void 0;
  void 0;
  void 0;
  void 0;
  
  try {
    if (!oldInstanceId) {
      void 0;
      return;
    }

    void 0;

    // Obter id_cliente do usuário
    const { data: clientInfo, error: clientError } = await supabase
      .from('clientes_info')
      .select('id')
      .eq('email', userEmail)
      .single();

    if (clientError || !clientInfo) {
      console.error("❌ Erro ao obter id_cliente:", clientError);
      return;
    }

    const idCliente = clientInfo.id;

    // Atualizar tabela leads - apenas registros com instance_id antigo e id_cliente correspondente
    void 0;
    try {
      const { error: leadsError } = await supabase
        .from('leads')
        .update({ instance_id: newInstanceId })
        .eq('instance_id', oldInstanceId)
        .eq('id_cliente', idCliente);

      if (leadsError) {
        console.error("❌ [UPDATE INSTANCE_ID] Erro ao atualizar instance_id na tabela leads:", leadsError);
      } else {
        void 0;
      }
    } catch (leadsError) {
      console.error("❌ [UPDATE INSTANCE_ID] Erro ao atualizar instance_id na tabela leads:", leadsError);
    }

    // Atualizar tabela agente_conversacional_whatsapp - apenas registros com instance_id antigo e id_cliente correspondente
    void 0;
    try {
      const { error: agenteError } = await supabase
        .from('agente_conversacional_whatsapp')
        .update({ instance_id: newInstanceId })
        .eq('instance_id', oldInstanceId)
        .eq('id_cliente', idCliente);

      if (agenteError) {
        console.error("❌ [UPDATE INSTANCE_ID] Erro ao atualizar instance_id na tabela agente_conversacional_whatsapp:", agenteError);
      } else {
        void 0;
      }
    } catch (agenteError) {
      console.error("❌ [UPDATE INSTANCE_ID] Erro ao atualizar instance_id na tabela agente_conversacional_whatsapp:", agenteError);
    }

    // Atualizar tabela prompts_oficial - apenas registros com instance_id antigo e id_cliente correspondente
    void 0;
    try {
      const { error: promptsError } = await supabase
        .from('prompts_oficial')
        .update({ instance_id: newInstanceId })
        .eq('instance_id', oldInstanceId)
        .eq('id_cliente', idCliente);

      if (promptsError) {
        console.error("❌ [UPDATE INSTANCE_ID] Erro ao atualizar instance_id na tabela prompts_oficial:", promptsError);
      } else {
        void 0;
      }
    } catch (promptsError) {
      console.error("❌ [UPDATE INSTANCE_ID] Erro ao atualizar instance_id na tabela prompts_oficial:", promptsError);
    }

    void 0;
  } catch (error) {
    console.error("❌ Erro ao atualizar instance_id nas tabelas relacionadas:", error);
    // Não lança erro para não bloquear o fluxo
  }
}

/**
 * Busca o token de uma instância existente na UAZAPI pelo nome usando o admin token.
 * Útil para recuperar o token quando ele não foi salvo corretamente no banco.
 */
export async function getUAZAPIInstanceTokenByName(
  instanceName: string
): Promise<string | null> {
  try {
    const response = await fetch(`${UAZAPI_BASE_URL}/instance/${instanceName}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'admintoken': UAZAPI_ADMIN_TOKEN,
      },
    });

    if (!response.ok) return null;

    const data = await response.json();
    const token = data.token || data.data?.token || data.instance?.token || null;
    if (token) {
      void 0;
    }
    return token;
  } catch {
    return null;
  }
}

/**
 * Busca os instance_ids (tokens) dos dois chips para um usuário.
 * Resolve corretamente para atendentes/gestores (via id_cliente) e para admins (via email).
 */
async function getClientChipTokens(userEmail: string): Promise<{
  clienteId: number | null;
  chip1: string | null;
  chip2: string | null;
}> {
  // Atendente / gestor?
  const { data: atendenteData, error: atendenteError } = await supabase
    .from('atendentes')
    .select('id_cliente')
    .eq('email', userEmail)
    .maybeSingle();

  if (atendenteData && !atendenteError) {
    const { data: ci } = await supabase
      .from('clientes_info')
      .select('id, instance_id, instance_id_2')
      .eq('id', atendenteData.id_cliente)
      .single();
    return {
      clienteId: ci?.id ?? null,
      chip1: ci?.instance_id || null,
      chip2: ci?.instance_id_2 || null,
    };
  }

  // Admin / cliente direto
  const { data: rows } = await supabase
    .from('clientes_info')
    .select('id, instance_id, instance_id_2')
    .eq('email', userEmail)
    .order('id', { ascending: true })
    .limit(1);

  const row = rows?.[0];
  return {
    clienteId: row?.id ?? null,
    chip1: row?.instance_id || null,
    chip2: row?.instance_id_2 || null,
  };
}

/**
 * Retorna o token (instance_id) correto para envio com base no instance_id do lead.
 *
 * Lógica:
 *  1. Busca o instance_id do lead pelo número de telefone.
 *  2. Se corresponde ao instance_id  (Chip 1) → usa Chip 1.
 *  3. Se corresponde ao instance_id_2 (Chip 2) → usa Chip 2.
 *  4. Se não encontrar correspondência      → padrão Chip 1.
 */
export async function getUAZAPIInstanceToken(
  userEmail: string,
  phoneNumber?: string
): Promise<string | null> {
  try {
    const { clienteId, chip1, chip2 } = await getClientChipTokens(userEmail);

    if (!chip1) {
      void 0;
      return null;
    }

    // Sem número de destino → Chip 1 por padrão
    if (!phoneNumber) return chip1;

    // Normaliza o número para lookup no banco (suporta grupos @g.us e números comuns)
    try {
      const isGroup = phoneNumber.includes('@g.us');
      const digits = phoneNumber.replace('@s.whatsapp.net', '').replace(/\D/g, '');
      const com55  = digits.startsWith('55') ? digits : `55${digits}`;
      const sem55  = digits.startsWith('55') ? digits.slice(2) : digits;

      const variantes = Array.from(new Set([
        ...(isGroup ? [phoneNumber] : []),
        digits, com55, sem55,
      ].filter(Boolean)));

      let query = supabase.from('leads').select('instance_id').in('telefone', variantes);
      if (clienteId) query = query.eq('id_cliente', clienteId) as any;
      const { data: leadData } = await query.limit(1);
      const leadInstanceId = leadData?.[0]?.instance_id || null;

      if (leadInstanceId) {
        if (leadInstanceId === chip1) {
          void 0;
          return chip1;
        }
        if (chip2 && leadInstanceId === chip2) {
          void 0;
          return chip2;
        }
      }
    } catch (lookupErr) {
      void 0;
    }

    // Padrão: Chip 1
    void 0;
    return chip1;
  } catch (error) {
    console.error('[UAZAPI] Erro ao obter token:', error);
    return null;
  }
}

export interface SendTextMessageParams {
  number: string;
  text: string;
  linkPreview?: boolean;
  linkPreviewTitle?: string;
  linkPreviewDescription?: string;
  linkPreviewImage?: string;
  linkPreviewLarge?: boolean;
  replyid?: string;
  mentions?: string;
  readchat?: boolean;
  readmessages?: boolean;
  delay?: number;
  forward?: boolean;
  track_source?: string;
  track_id?: string;
}

export interface SendMediaMessageParams {
  number: string;
  type: 'image' | 'video' | 'document' | 'audio' | 'myaudio' | 'ptt' | 'ptv' | 'sticker';
  file: string; // URL ou base64
  text?: string;
  docName?: string;
  thumbnail?: string;
  mimetype?: string;
  replyid?: string;
  mentions?: string;
  readchat?: boolean;
  readmessages?: boolean;
  delay?: number;
  forward?: boolean;
  track_source?: string;
  track_id?: string;
}

/**
 * Salva o token da UAZAPI no registro do cliente
 * Mantém compatibilidade legada atualizando também instance_id, se desejado.
 */
async function saveUAZAPIToken(userEmail: string, token: string, instanceName?: string | null): Promise<void> {
  const update: Record<string, any> = { uazapi_token: token };
  if (instanceName) update.instance_name = instanceName;
  // Opcional: manter compat com legado
  update.instance_id = token;
  await supabase.from('clientes_info').update(update).eq('email', userEmail);
}

/**
 * Envia uma mensagem de texto via UAZAPI
 */
export async function sendUAZAPITextMessage(
  params: SendTextMessageParams,
  userEmail?: string
): Promise<any> {
  // Obter o token da instância, considerando qual chip o lead usa
  let token: string | null;
  let resolvedEmail: string | null = null;
  if (userEmail) {
    resolvedEmail = userEmail;
    token = await getUAZAPIInstanceToken(userEmail, params.number);
  } else {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Usuário não autenticado');
    }
    resolvedEmail = user.email!;
    token = await getUAZAPIInstanceToken(user.email!, params.number);
  }

  // Se não tem token UAZAPI configurado, lançar erro (será tratado pelo Promise.allSettled)
  if (!token) {
    throw new Error('Token UAZAPI não configurado');
  }

  const requestBody: any = {
    number: params.number,
    text: params.text,
  };

  // Adicionar campos opcionais
  if (params.linkPreview !== undefined) requestBody.linkPreview = params.linkPreview;
  if (params.linkPreviewTitle) requestBody.linkPreviewTitle = params.linkPreviewTitle;
  if (params.linkPreviewDescription) requestBody.linkPreviewDescription = params.linkPreviewDescription;
  if (params.linkPreviewImage) requestBody.linkPreviewImage = params.linkPreviewImage;
  if (params.linkPreviewLarge !== undefined) requestBody.linkPreviewLarge = params.linkPreviewLarge;
  if (params.replyid) requestBody.replyid = params.replyid;
  if (params.mentions) requestBody.mentions = params.mentions;
  if (params.readchat !== undefined) requestBody.readchat = params.readchat;
  if (params.readmessages !== undefined) requestBody.readmessages = params.readmessages;
  if (params.delay !== undefined) requestBody.delay = params.delay;
  if (params.forward !== undefined) requestBody.forward = params.forward;
  if (params.track_source) requestBody.track_source = params.track_source;
  if (params.track_id) requestBody.track_id = params.track_id;

  // Função interna para efetuar envio
  const doSend = async (tk: string) => {
    const resp = await fetch(`${UAZAPI_BASE_URL}/send/text`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'token': tk,
      },
      body: JSON.stringify(requestBody),
    });
    return resp;
  };

  // Primeira tentativa
  let response = await doSend(token);

  // Fallback: se falhar, tenta pelo Chip 2 (sem criar nova instância)
  if (!response.ok && resolvedEmail) {
    try {
      const { chip2 } = await getClientChipTokens(resolvedEmail);
      if (chip2 && chip2 !== token) {
        void 0;
        response = await doSend(chip2);
      }
    } catch {
      // mantém a resposta original para o erro abaixo
    }
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro ao enviar mensagem de texto UAZAPI: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data;
}

/**
 * Envia uma mensagem de mídia via UAZAPI
 */
export async function sendUAZAPIMediaMessage(
  params: SendMediaMessageParams,
  userEmail?: string
): Promise<any> {
  // Obter o token da instância, considerando qual chip o lead usa
  let token: string | null;
  let resolvedEmail: string | null = null;
  if (userEmail) {
    resolvedEmail = userEmail;
    token = await getUAZAPIInstanceToken(userEmail, params.number);
  } else {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Usuário não autenticado');
    }
    resolvedEmail = user.email!;
    token = await getUAZAPIInstanceToken(user.email!, params.number);
  }

  // Se não tem token UAZAPI configurado, lançar erro (será tratado pelo Promise.allSettled)
  if (!token) {
    throw new Error('Token UAZAPI não configurado');
  }

  const requestBody: any = {
    number: params.number,
    type: params.type,
    file: params.file,
  };

  // Adicionar campos opcionais
  if (params.text) requestBody.text = params.text;
  if (params.docName) requestBody.docName = params.docName;
  if (params.thumbnail) requestBody.thumbnail = params.thumbnail;
  if (params.mimetype) requestBody.mimetype = params.mimetype;
  if (params.replyid) requestBody.replyid = params.replyid;
  if (params.mentions) requestBody.mentions = params.mentions;
  if (params.readchat !== undefined) requestBody.readchat = params.readchat;
  if (params.readmessages !== undefined) requestBody.readmessages = params.readmessages;
  if (params.delay !== undefined) requestBody.delay = params.delay;
  if (params.forward !== undefined) requestBody.forward = params.forward;
  if (params.track_source) requestBody.track_source = params.track_source;
  if (params.track_id) requestBody.track_id = params.track_id;

  const doSend = async (tk: string) => {
    const resp = await fetch(`${UAZAPI_BASE_URL}/send/media`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'token': tk,
      },
      body: JSON.stringify(requestBody),
    });
    return resp;
  };

  let response = await doSend(token);

  // Fallback: se falhar, tenta pelo Chip 2 (sem criar nova instância)
  if (!response.ok && resolvedEmail) {
    try {
      const { chip2 } = await getClientChipTokens(resolvedEmail);
      if (chip2 && chip2 !== token) {
        void 0;
        response = await doSend(chip2);
      }
    } catch {
      // mantém a resposta original para o erro abaixo
    }
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro ao enviar mídia UAZAPI: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data;
}
