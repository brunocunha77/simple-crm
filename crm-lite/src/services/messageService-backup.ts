import { API_BASE_URL } from '@/config';
import { supabase } from '@/lib/supabase';

interface SendMessageParams {
  number: string;
  text: string;
}

// Função para buscar o departamento do lead pelo telefone
async function getDepartamentoLead(telefone: string): Promise<number | null> {
  try {
    const { data: lead, error } = await supabase
      .from('leads')
      .select('id_departamento')
      .eq('telefone', telefone)
      .single();
    
    if (error) {
      void 0;
      return null;
    }
    
    return lead?.id_departamento || null;
  } catch (error) {
    console.error('Erro ao buscar departamento do lead:', error);
    return null;
  }
}

// Função para obter o chip correto baseado no departamento do lead
async function getChipCorretoParaLead(telefone: string): Promise<string | null> {
  try {
    void 0;
    
    // 1. Consulta o lead
    const idDepartamento = await getDepartamentoLead(telefone);
    void 0;
    
    // 2. Se não há departamento, usar instance_name padrão
    if (!idDepartamento) {
      void 0;
      return await getInstanceNamePadrao();
    }
    
    // 3. Consulta o departamento
    const { data: departamento, error: departamentoError } = await supabase
      .from('departamento')
      .select('instance_name_chip_associado')
      .eq('id', idDepartamento)
      .single();
    
    if (departamentoError || !departamento) {
      void 0;
      return await getInstanceNamePadrao();
    }
    
    // 4. Se o departamento tem chip associado, usar esse chip
    if (departamento.instance_name_chip_associado) {
      void 0;
      return departamento.instance_name_chip_associado;
    }
    
    // 5. Se não tem chip associado, usar instance_name padrão
    void 0;
    return await getInstanceNamePadrao();
    
  } catch (error) {
    console.error('Erro ao obter chip correto para lead:', error);
    return await getInstanceNamePadrao();
  }
}

// Função para obter o instance_name padrão do cliente
async function getInstanceNamePadrao(): Promise<string | null> {
  try {
    // Obter o usuário atual para buscar informações do cliente
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Usuário não autenticado');
    }
    
    // Primeiro, verificar se o usuário é um atendente/gestor
    const { data: atendenteData, error: atendenteError } = await supabase
      .from('atendentes')
      .select('id_cliente')
      .eq('email', user.email)
      .single();

    let idCliente: number;

    if (atendenteData) {
      idCliente = atendenteData.id_cliente;
    } else {
      // Usuário é cliente, buscar diretamente
      const { data: clientInfo, error: clientError } = await supabase
        .from('clientes_info')
        .select('id')
        .eq('email', user.email)
        .single();
        
      if (clientError || !clientInfo) {
        throw new Error('Cliente não encontrado');
      }
      
      idCliente = clientInfo.id;
    }
    
    // Buscar instance_name padrão
    const { data: clienteInfo, error: clienteError } = await supabase
      .from('clientes_info')
      .select('instance_name')
      .eq('id', idCliente)
      .single();
    
    if (clienteError || !clienteInfo?.instance_name) {
      console.error('❌ Erro ao buscar instance_name padrão:', clienteError);
      throw new Error('Instance_name padrão não encontrado');
    }
    
    void 0;
    return clienteInfo.instance_name;
    
  } catch (error) {
    console.error('Erro ao obter instance_name padrão:', error);
    throw error;
  }
}


// Função para obter o chip padrão do cliente (fallback)
async function getChipPadraoCliente(): Promise<string | null> {
  try {
    // Obter o usuário atual para buscar informações do cliente
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Usuário não autenticado');
    }
    
    void 0;
    
    // Primeiro, verificar se o usuário é um atendente/gestor
    const { data: atendenteData, error: atendenteError } = await supabase
      .from('atendentes')
      .select('id_cliente')
      .eq('email', user.email)
      .single();

    if (atendenteData) {
      // Usuário é atendente/gestor, buscar informações do cliente
      void 0;
      
      const { data: clientInfo, error: clientError } = await supabase
        .from('clientes_info')
        .select('instance_name')
        .eq('id', atendenteData.id_cliente)
        .single();
        
      if (clientError || !clientInfo?.instance_name) {
        console.error(`❌ Erro ao buscar instância do cliente:`, clientError);
        throw new Error('Instância do WhatsApp não encontrada para o cliente associado');
      }
      
      void 0;
      return clientInfo.instance_name;
    }

    // Usuário é cliente, buscar diretamente na tabela clientes_info
    void 0;
    
    // Buscar todos os registros com este email e pegar o mais antigo (ID menor)
    const { data: clientesInfo, error: clientError } = await supabase
      .from('clientes_info')
      .select('instance_name')
      .eq('email', user.email)
      .order('id', { ascending: true })
      .limit(1);
    
    if (clientError) {
      console.error('❌ Erro ao buscar dados do cliente:', clientError);
      throw new Error('Erro ao buscar informações do cliente');
    }
    
    if (!clientesInfo || clientesInfo.length === 0) {
      console.error('❌ Nenhum cliente encontrado para o email:', user.email);
      throw new Error('Cliente não encontrado');
    }
    
    const clientInfo = clientesInfo[0];
    
    if (!clientInfo?.instance_name) {
      console.error('❌ Instance_name não configurado para o cliente');
      throw new Error('Chip padrão não configurado para este cliente');
    }
    
    void 0;
    return clientInfo.instance_name;
  } catch (error) {
    console.error('Erro ao obter chip padrão:', error);
    throw new Error('Chip padrão não configurado para este cliente');
  }
}

// Função auxiliar para buscar informações da instância WhatsApp
async function getWhatsAppInstanceInfo(userEmail: string) {
  // Primeiro, verificar se o usuário é um atendente/gestor
  const { data: atendenteData, error: atendenteError } = await supabase
    .from('atendentes')
    .select('id_cliente')
    .eq('email', userEmail)
    .single();

  if (atendenteData) {
    // Usuário é atendente/gestor, buscar informações do cliente
    void 0;
    
    const { data: clientInfo, error: clientError } = await supabase
      .from('clientes_info')
      .select('instance_name, apikey')
      .eq('id', atendenteData.id_cliente)
      .single();
      
    if (clientError || !clientInfo?.instance_name) {
      console.error(`❌ [${userEmail}] Erro ao buscar instância do cliente:`, clientError);
      throw new Error('Instância do WhatsApp não encontrada para o cliente associado');
    }
    
    return clientInfo;
  }

  // Usuário é cliente, buscar diretamente na tabela clientes_info
  void 0;
  
  const { data: clientInfo, error: clientError } = await supabase
    .from('clientes_info')
    .select('instance_name, apikey')
    .eq('email', userEmail)
    .single();
    
  if (clientError || !clientInfo?.instance_name) {
    console.error(`❌ [${userEmail}] Erro ao buscar instância:`, clientError);
    throw new Error('Instância do WhatsApp não encontrada para este usuário');
  }
  
  return clientInfo;
}

export async function sendMessage(number: string, text: string) {
  // ID único para rastrear esta requisição
  const requestId = `API_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    void 0;
    void 0;
    void 0;
    
    // Obter o usuário atual
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error(`❌ [${requestId}] Usuário não autenticado`);
      throw new Error('Usuário não autenticado');
    }
    
    void 0;
    
    // Obter o chip correto baseado no departamento do lead
    void 0;
    const instanceName = await getChipCorretoParaLead(number);
    void 0;
    
    // Buscar informações da instância WhatsApp
    void 0;
    const clientInfo = await getWhatsAppInstanceInfo(user.email);
    
    void 0;
    
    // Preparar dados da requisição
    // const apiUrl = `${API_BASE_URL}/message/sendText/${instanceName}`;
    // const requestHeaders = {
    //   'Content-Type': 'application/json',
    //   'apikey': clientInfo.apikey || '429683C4C977415CAAFCCE10F7D57E11'
    // };
    // const requestBody = {
    //   number,
    //   text
    // };
    
    // console.log(`🌐 [${requestId}] URL da Evolution API:`, apiUrl);
    // console.log(`🔑 [${requestId}] API Key:`, clientInfo.apikey ? '***' : 'Usando padrão');
    // console.log(`📤 [${requestId}] Enviando requisição...`);
    
    // const response = await fetch(apiUrl, {
    //   method: 'POST',
    //   headers: requestHeaders,
    //   body: JSON.stringify(requestBody)
    // });

    // if (!response.ok) {
    //   console.error(`❌ [${requestId}] Erro HTTP: ${response.status}`);
      
    //   let errorData;
    //   try {
    //     errorData = await response.json();
    //   } catch (parseError) {
    //     errorData = { message: 'Erro desconhecido' };
    //   }
      
    //   throw new Error(`Erro ao enviar mensagem: ${response.status} - ${JSON.stringify(errorData)}`);
    // }

    // const responseData = await response.json();
    
    // console.log(`✅ [${requestId}] Mensagem enviada com sucesso:`, responseData);
    // return responseData;

    // NOVO ENDPOINT: Webhook SmartCRM
    const webhookUrl = 'https://webhook.dev.usesmartcrm.com/webhook/envio_mensagens';
    const webhookPayload = {
      instanceName,
      number,
      text,
      apikey: clientInfo.apikey || '429683C4C977415CAAFCCE10F7D57E11',
      user_id: user.id,
      requestId
    };
    
    void 0;
    void 0;
    void 0;
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(webhookPayload)
    });

    if (!response.ok) {
      console.error(`❌ [${requestId}] Erro HTTP: ${response.status}`);
      
      let errorData;
      try {
        errorData = await response.json();
      } catch (parseError) {
        errorData = { message: 'Erro desconhecido' };
      }
      
      throw new Error(`Erro ao enviar mensagem: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const responseData = await response.json();
    
    void 0;
    return responseData;
    
  } catch (error) {
    console.error(`💥 [${requestId}] ERRO sendMessage:`, error.message);
    throw error;
  }
}

export async function sendAudioMessage(number: string, audioUrl: string, caption: string = '') {
  // ID único para rastrear esta requisição
  const requestId = `AUDIO_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    // 🎯 SEMPRE USAR MP3 PARA COMPATIBILIDADE MÁXIMA
    const fileName = `audio_${Date.now()}.mp3`;
    const mimetype = 'audio/mpeg';
    const formatInfo = { nome: 'MP3 (Universal)', whatsappCompatible: true };
    
    // Log detalhado para debug
    void 0;
    
    // Obter o usuário atual
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error(`❌ [${requestId}] Usuário não autenticado`);
      throw new Error('Usuário não autenticado');
    }
    
    // Obter o chip correto baseado no departamento do lead
    void 0;
    const instanceName = await getChipCorretoParaLead(number);
    void 0;
    
    // Buscar informações da instância WhatsApp
    void 0;
    const clientInfo = await getWhatsAppInstanceInfo(user.email);
    
    // Payload otimizado para WhatsApp - SEMPRE MP3
    const requestBody = {
      number,
      mediatype: 'audio',
      media: audioUrl,
      caption: caption || '',
      fileName: fileName,
      mimetype: mimetype,
      ptt: true  // Push To Talk - mensagem de voz
    };
    
    // Preparar dados da requisição
    const apiUrl = `${API_BASE_URL}/message/sendMedia/${instanceName}`;
    const requestHeaders = {
      'Content-Type': 'application/json',
      'apikey': clientInfo.apikey || '429683C4C977415CAAFCCE10F7D57E11'
    };
    
    void 0;
    void 0;
    void 0;
    
    const response = await fetch(apiUrl, {
        method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      console.error(`❌ [${requestId}] Erro HTTP: ${response.status}`);
      
      let errorData;
      try {
        errorData = await response.json();
      } catch (parseError) {
        errorData = { message: 'Erro desconhecido' };
      }
      
      throw new Error(`Erro ao enviar áudio: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const responseData = await response.json();
    
    void 0;
    return responseData;
    
  } catch (error) {
    console.error(`💥 [${requestId}] ERRO sendAudioMessage:`, error.message);
    throw error;
  }
}

export async function sendImageMessage(number: string, imageUrl: string, caption?: string) {
  // ID único para rastrear esta requisição
  const requestId = `IMAGE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    // Detectar formato da imagem
    let fileName = `image_${Date.now()}`;
    let mimetype = 'image/jpeg'; // padrão
    
    if (imageUrl.includes('.png')) {
      fileName += '.png';
      mimetype = 'image/png';
    } else if (imageUrl.includes('.jpg') || imageUrl.includes('.jpeg')) {
      fileName += '.jpg';
      mimetype = 'image/jpeg';
    } else if (imageUrl.includes('.gif')) {
      fileName += '.gif';
      mimetype = 'image/gif';
    } else if (imageUrl.includes('.webp')) {
      fileName += '.webp';
      mimetype = 'image/webp';
    } else {
      // Fallback
      fileName += '.jpg';
      mimetype = 'image/jpeg';
    }
    
    // Obter o usuário atual
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error(`❌ [${requestId}] Usuário não autenticado`);
      throw new Error('Usuário não autenticado');
    }
    
    // Obter o chip correto baseado no departamento do lead
    void 0;
    const instanceName = await getChipCorretoParaLead(number);
    void 0;
    
    // Buscar informações da instância WhatsApp
    void 0;
    const clientInfo = await getWhatsAppInstanceInfo(user.email);
    
    void 0;
    
    // Preparar dados da requisição
    const apiUrl = `${API_BASE_URL}/message/sendText/${instanceName}`;
    const requestHeaders = {
      'Content-Type': 'application/json',
      'apikey': clientInfo.apikey || '429683C4C977415CAAFCCE10F7D57E11'
    };
    const requestBody = {
      number,
      text
    };
    
    void 0;
    void 0;
    void 0;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      console.error(`❌ [${requestId}] Erro HTTP: ${response.status}`);
      
      let errorData;
      try {
        errorData = await response.json();
      } catch (parseError) {
        errorData = { message: 'Erro desconhecido' };
      }
      
      throw new Error(`Erro ao enviar mensagem: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const responseData = await response.json();
    
    void 0;
    return responseData;
    
    // Buscar informações da instância WhatsApp
    void 0;
    const clientInfo = await getWhatsAppInstanceInfo(user.email);
    
    // Preparar requisição
    const apiUrl = `${API_BASE_URL}/message/sendMedia/${instanceName}`;
    const requestHeaders = {
      'Content-Type': 'application/json',
      'apikey': clientInfo.apikey || '429683C4C977415CAAFCCE10F7D57E11'
    };
    
    const requestBody = {
      number,
      mediatype: 'image',
      media: imageUrl,
      caption: caption || '',
      fileName: fileName,
      mimetype: mimetype
    };
    
    void 0;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      console.error(`❌ [${requestId}] Erro HTTP: ${response.status}`);
      
      let errorData;
      try {
        errorData = await response.json();
      } catch (parseError) {
        errorData = { message: 'Erro desconhecido' };
      }
      
      throw new Error(`Erro ao enviar imagem: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const responseData = await response.json();
    
    void 0;
    return responseData;
    
  } catch (error) {
    console.error(`💥 [${requestId}] ERRO sendImageMessage:`, error.message);
    throw error;
  }
}

export async function sendDocumentMessage(number: string, documentUrl: string, fileName: string, caption: string = '') {
  // ID único para rastrear esta requisição
  const requestId = `DOC_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    // Detectar formato do documento
    let mimetype = 'application/pdf'; // padrão
    
    if (fileName.toLowerCase().endsWith('.pdf')) {
      mimetype = 'application/pdf';
    } else if (fileName.toLowerCase().endsWith('.doc')) {
      mimetype = 'application/msword';
    } else if (fileName.toLowerCase().endsWith('.docx')) {
      mimetype = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    } else if (fileName.toLowerCase().endsWith('.xls')) {
      mimetype = 'application/vnd.ms-excel';
    } else if (fileName.toLowerCase().endsWith('.xlsx')) {
      mimetype = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    } else if (fileName.toLowerCase().endsWith('.ppt')) {
      mimetype = 'application/vnd.ms-powerpoint';
    } else if (fileName.toLowerCase().endsWith('.pptx')) {
      mimetype = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    } else if (fileName.toLowerCase().endsWith('.txt')) {
      mimetype = 'text/plain';
    } else {
      // Fallback
      mimetype = 'application/octet-stream';
    }
    
    // Obter o usuário atual
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error(`❌ [${requestId}] Usuário não autenticado`);
      throw new Error('Usuário não autenticado');
    }
    
    // Obter o chip correto baseado no departamento do lead
    void 0;
    const instanceName = await getChipCorretoParaLead(number);
    void 0;
    
    // Buscar informações da instância WhatsApp
    void 0;
    const clientInfo = await getWhatsAppInstanceInfo(user.email);
    
    void 0;
    
    // Preparar dados da requisição
    const apiUrl = `${API_BASE_URL}/message/sendText/${instanceName}`;
    const requestHeaders = {
      'Content-Type': 'application/json',
      'apikey': clientInfo.apikey || '429683C4C977415CAAFCCE10F7D57E11'
    };
    const requestBody = {
      number,
      text
    };
    
    void 0;
    void 0;
    void 0;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      console.error(`❌ [${requestId}] Erro HTTP: ${response.status}`);
      
      let errorData;
      try {
        errorData = await response.json();
      } catch (parseError) {
        errorData = { message: 'Erro desconhecido' };
      }
      
      throw new Error(`Erro ao enviar mensagem: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const responseData = await response.json();
    
    void 0;
    return responseData;
    
    // Buscar informações da instância WhatsApp
    void 0;
    const clientInfo = await getWhatsAppInstanceInfo(user.email);
    
    // Preparar requisição
    const apiUrl = `${API_BASE_URL}/message/sendMedia/${instanceName}`;
    const requestHeaders = {
      'Content-Type': 'application/json',
      'apikey': clientInfo.apikey || '429683C4C977415CAAFCCE10F7D57E11'
    };
    
    const requestBody = {
      number,
      mediatype: 'document',
      media: documentUrl,
      caption: caption || '',
      fileName: fileName,
      mimetype: mimetype
    };
    
    void 0;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      console.error(`❌ [${requestId}] Erro HTTP: ${response.status}`);
      
      let errorData;
      try {
        errorData = await response.json();
      } catch (parseError) {
        errorData = { message: 'Erro desconhecido' };
      }
      
      throw new Error(`Erro ao enviar documento: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const responseData = await response.json();
    
    void 0;
    return responseData;
    
  } catch (error) {
    console.error(`💥 [${requestId}] ERRO sendDocumentMessage:`, error.message);
    throw error;
  }
}

export async function sendVideoMessage(number: string, videoUrl: string, caption: string = '') {
  // ID único para rastrear esta requisição
  const requestId = `VIDEO_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  try {
    // Detectar formato do vídeo
    let fileName = `video_${Date.now()}`;
    let mimetype = 'video/mp4'; // padrão

    if (videoUrl.includes('.mp4')) {
      fileName += '.mp4';
      mimetype = 'video/mp4';
    } else if (videoUrl.includes('.mov')) {
      fileName += '.mov';
      mimetype = 'video/quicktime';
    } else if (videoUrl.includes('.webm')) {
      fileName += '.webm';
      mimetype = 'video/webm';
    } else if (videoUrl.includes('.avi')) {
      fileName += '.avi';
      mimetype = 'video/x-msvideo';
    } else if (videoUrl.includes('.mkv')) {
      fileName += '.mkv';
      mimetype = 'video/x-matroska';
    } else {
      // Fallback
      fileName += '.mp4';
      mimetype = 'video/mp4';
    }

    // Obter o usuário atual
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error(`❌ [${requestId}] Usuário não autenticado`);
      throw new Error('Usuário não autenticado');
    }
    
    // Obter o chip correto baseado no departamento do lead
    void 0;
    const instanceName = await getChipCorretoParaLead(number);
    void 0;
    
    // Buscar informações da instância WhatsApp
    void 0;
    const clientInfo = await getWhatsAppInstanceInfo(user.email);
    
    void 0;
    
    // Preparar dados da requisição
    const apiUrl = `${API_BASE_URL}/message/sendText/${instanceName}`;
    const requestHeaders = {
      'Content-Type': 'application/json',
      'apikey': clientInfo.apikey || '429683C4C977415CAAFCCE10F7D57E11'
    };
    const requestBody = {
      number,
      text
    };
    
    void 0;
    void 0;
    void 0;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      console.error(`❌ [${requestId}] Erro HTTP: ${response.status}`);
      
      let errorData;
      try {
        errorData = await response.json();
      } catch (parseError) {
        errorData = { message: 'Erro desconhecido' };
      }
      
      throw new Error(`Erro ao enviar mensagem: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const responseData = await response.json();
    
    void 0;
    return responseData;
    
    // Buscar informações da instância WhatsApp
    void 0;
    const clientInfo = await getWhatsAppInstanceInfo(user.email);
    
    // Preparar requisição
    const apiUrl = `${API_BASE_URL}/message/sendMedia/${instanceName}`;
    const requestHeaders = {
      'Content-Type': 'application/json',
      'apikey': clientInfo.apikey || '429683C4C977415CAAFCCE10F7D57E11'
    };
    const requestBody = {
      number,
      mediatype: 'video',
      media: videoUrl,
      caption: caption || '',
      fileName: fileName,
      mimetype: mimetype
    };
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      console.error(`❌ [${requestId}] Erro HTTP: ${response.status}`);
      
      let errorData;
      try {
        errorData = await response.json();
      } catch (parseError) {
        errorData = { message: 'Erro desconhecido' };
      }
      
      throw new Error(`Erro ao enviar vídeo: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const responseData = await response.json();
    
    void 0;
    return responseData;
    
  } catch (error) {
    console.error(`💥 [${requestId}] ERRO sendVideoMessage:`, error.message);
    throw error;
  }
}

export async function sendMessageWithInstance(instanceName: string, number: string, text: string) {
  const apiUrl = `${API_BASE_URL}/message/sendText/${instanceName}`;
  const requestHeaders = {
    'Content-Type': 'application/json',
    'apikey': '429683C4C977415CAAFCCE10F7D57E11'
  };
  const requestBody = { number, text };
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: requestHeaders,
    body: JSON.stringify(requestBody)
  });
  if (!response.ok) {
    throw new Error('Erro ao enviar mensagem');
  }
  return response.json();
}

// Função para buscar mensagens com paginação e scroll infinito
export async function fetchMessagesWithPagination(
  instanceIds: string[],
  phoneNumber?: string,
  page: number = 0,
  limit: number = 50,
  fromDate?: string
) {
  try {
    let query = supabase
      .from('agente_conversacional_whatsapp')
      .select('*')
      .in('instance_id', instanceIds)
      .order('created_at', { ascending: false });

    // Filtrar por telefone se especificado
    if (phoneNumber) {
      query = query.eq('telefone_id', phoneNumber);
    }

    // Filtrar por data se especificado (para carregar mensagens mais antigas)
    if (fromDate) {
      query = query.lt('created_at', fromDate);
    }

    // Aplicar paginação
    const from = page * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Erro ao buscar mensagens:', error);
      throw new Error(`Erro ao buscar mensagens: ${error.message}`);
    }

    // Inverter a ordem para mostrar as mais antigas primeiro (cronológica)
    const messages = data ? data.reverse() : [];

    return {
      messages,
      hasMore: data && data.length === limit,
      totalCount: count || 0
    };
  } catch (error) {
    console.error('Erro ao buscar mensagens com paginação:', error);
    throw error;
  }
}

// Função para buscar as últimas mensagens de um contato específico
export async function fetchRecentMessages(
  instanceIds: string[],
  phoneNumber: string,
  limit: number = 500
) {
  try {
    const { data, error } = await supabase
      .from('agente_conversacional_whatsapp')
      .select('*')
      .in('instance_id', instanceIds)
      .eq('telefone_id', phoneNumber)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Erro ao buscar mensagens recentes:', error);
      throw new Error(`Erro ao buscar mensagens recentes: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Erro ao buscar mensagens recentes:', error);
    throw error;
  }
}

// Função para configurar subscription em tempo real para mensagens
export function setupMessagesSubscription(
  instanceIds: string[],
  onNewMessage: (message: any) => void,
  onError?: (error: any) => void
) {
  try {
    // Criar canal único para evitar duplicações
    const channelName = `messages_${instanceIds.join('_')}_${Date.now()}`;
    
    const subscription = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'agente_conversacional_whatsapp',
          filter: `instance_id=in.(${instanceIds.map(id => `"${id}"`).join(',')})`
        },
        (payload) => {
          void 0;
          onNewMessage(payload.new);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'agente_conversacional_whatsapp',
          filter: `instance_id=in.(${instanceIds.map(id => `"${id}"`).join(',')})`
        },
        (payload) => {
          void 0;
          onNewMessage(payload.new);
        }
      )
      .subscribe((status) => {
        void 0;
        if (status === 'CHANNEL_ERROR' && onError) {
          onError(new Error('Erro na subscription de mensagens'));
        }
      });

    return subscription;
  } catch (error) {
    console.error('Erro ao configurar subscription de mensagens:', error);
    if (onError) onError(error);
    return null;
  }
}

// Função para remover subscription
export function removeMessagesSubscription(subscription: any) {
  if (subscription) {
    try {
      supabase.removeChannel(subscription);
      void 0;
    } catch (error) {
      console.error('Erro ao remover subscription:', error);
    }
  }
}

// Função para marcar mensagens como lidas
export async function markMessagesAsRead(phoneNumber: string, instanceIds: string[]) {
  try {
    const { error } = await supabase
      .from('agente_conversacional_whatsapp')
      .update({ foi_lida: true })
      .eq('telefone_id', phoneNumber)
      .in('instance_id', instanceIds)
      .eq('tipo', false) // Apenas mensagens recebidas
      .eq('foi_lida', false); // Apenas mensagens não lidas

    if (error) {
      console.error('Erro ao marcar mensagens como lidas:', error);
      throw new Error(`Erro ao marcar mensagens como lidas: ${error.message}`);
    }

    return true;
  } catch (error) {
    console.error('Erro ao marcar mensagens como lidas:', error);
    throw error;
  }
}

// Função para buscar estatísticas de mensagens não lidas
export async function getUnreadMessageCounts(instanceIds: string[]) {
  try {
    // Buscar todas as mensagens não lidas
    const { data, error } = await supabase
      .from('agente_conversacional_whatsapp')
      .select('telefone_id')
      .in('instance_id', instanceIds)
      .eq('tipo', false) // Apenas mensagens recebidas
      .eq('foi_lida', false); // Apenas mensagens não lidas

    if (error) {
      console.error('Erro ao buscar contagem de mensagens não lidas:', error);
      throw new Error(`Erro ao buscar contagem de mensagens não lidas: ${error.message}`);
    }

    // Contar mensagens por telefone
    const unreadCounts: Record<string, number> = {};
    data?.forEach(item => {
      unreadCounts[item.telefone_id] = (unreadCounts[item.telefone_id] || 0) + 1;
    });

    return unreadCounts;
  } catch (error) {
    console.error('Erro ao buscar contagem de mensagens não lidas:', error);
    throw error;
  }
}
    throw error;

  }

}



export async function sendDocumentMessage(number: string, documentUrl: string, fileName: string, caption: string = '') {

  // ID único para rastrear esta requisição

  const requestId = `DOC_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  

  try {

    // Detectar formato do documento

    let mimetype = 'application/pdf'; // padrão

    

    if (fileName.toLowerCase().endsWith('.pdf')) {

      mimetype = 'application/pdf';

    } else if (fileName.toLowerCase().endsWith('.doc')) {

      mimetype = 'application/msword';

    } else if (fileName.toLowerCase().endsWith('.docx')) {

      mimetype = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    } else if (fileName.toLowerCase().endsWith('.xls')) {

      mimetype = 'application/vnd.ms-excel';

    } else if (fileName.toLowerCase().endsWith('.xlsx')) {

      mimetype = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    } else if (fileName.toLowerCase().endsWith('.ppt')) {

      mimetype = 'application/vnd.ms-powerpoint';

    } else if (fileName.toLowerCase().endsWith('.pptx')) {

      mimetype = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

    } else if (fileName.toLowerCase().endsWith('.txt')) {

      mimetype = 'text/plain';

    } else {

      // Fallback

      mimetype = 'application/octet-stream';

    }

    

    // Obter o usuário atual

    const { data: { user } } = await supabase.auth.getUser();

    

    if (!user) {

      console.error(`❌ [${requestId}] Usuário não autenticado`);

      throw new Error('Usuário não autenticado');

    }

    

    // Obter o chip padrão do cliente (relação com departamentos desabilitada)

    void 0;

    const instanceName = await getChipPadraoCliente();

    void 0;

    

    // Buscar informações da instância WhatsApp

    void 0;

    const clientInfo = await getWhatsAppInstanceInfo(user.email);

    

    // Preparar requisição

    const apiUrl = `${API_BASE_URL}/message/sendMedia/${instanceName}`;

    const requestHeaders = {

      'Content-Type': 'application/json',

      'apikey': clientInfo.apikey || '429683C4C977415CAAFCCE10F7D57E11'

    };

    

    const requestBody = {

      number,

      mediatype: 'document',

      media: documentUrl,

      caption: caption || '',

      fileName: fileName,

      mimetype: mimetype

    };

    

    void 0;

    

    const response = await fetch(apiUrl, {

      method: 'POST',

      headers: requestHeaders,

      body: JSON.stringify(requestBody)

    });



    if (!response.ok) {

      console.error(`❌ [${requestId}] Erro HTTP: ${response.status}`);

      

      let errorData;

      try {

        errorData = await response.json();

      } catch (parseError) {

        errorData = { message: 'Erro desconhecido' };

      }

      

      throw new Error(`Erro ao enviar documento: ${response.status} - ${JSON.stringify(errorData)}`);

    }



    const responseData = await response.json();

    

    void 0;

    return responseData;

    

  } catch (error) {

    console.error(`💥 [${requestId}] ERRO sendDocumentMessage:`, error.message);

    throw error;

  }

}



export async function sendVideoMessage(number: string, videoUrl: string, caption: string = '') {

  // ID único para rastrear esta requisição

  const requestId = `VIDEO_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {

    // Detectar formato do vídeo

    let fileName = `video_${Date.now()}`;

    let mimetype = 'video/mp4'; // padrão



    if (videoUrl.includes('.mp4')) {

      fileName += '.mp4';

      mimetype = 'video/mp4';

    } else if (videoUrl.includes('.mov')) {

      fileName += '.mov';

      mimetype = 'video/quicktime';

    } else if (videoUrl.includes('.webm')) {

      fileName += '.webm';

      mimetype = 'video/webm';

    } else if (videoUrl.includes('.avi')) {

      fileName += '.avi';

      mimetype = 'video/x-msvideo';

    } else if (videoUrl.includes('.mkv')) {

      fileName += '.mkv';

      mimetype = 'video/x-matroska';

    } else {

      // Fallback

      fileName += '.mp4';

      mimetype = 'video/mp4';

    }



    // Obter o usuário atual

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {

      console.error(`❌ [${requestId}] Usuário não autenticado`);

      throw new Error('Usuário não autenticado');

    }

    

    // Obter o chip padrão do cliente (relação com departamentos desabilitada)

    void 0;

    const instanceName = await getChipPadraoCliente();

    void 0;

    

    // Buscar informações da instância WhatsApp

    void 0;

    const clientInfo = await getWhatsAppInstanceInfo(user.email);

    

    // Preparar requisição

    const apiUrl = `${API_BASE_URL}/message/sendMedia/${instanceName}`;

    const requestHeaders = {

      'Content-Type': 'application/json',

      'apikey': clientInfo.apikey || '429683C4C977415CAAFCCE10F7D57E11'

    };

    const requestBody = {

      number,

      mediatype: 'video',

      media: videoUrl,

      caption: caption || '',

      fileName: fileName,

      mimetype: mimetype

    };

    const response = await fetch(apiUrl, {

      method: 'POST',

      headers: requestHeaders,

      body: JSON.stringify(requestBody)

    });



    if (!response.ok) {

      console.error(`❌ [${requestId}] Erro HTTP: ${response.status}`);

      

      let errorData;

      try {

        errorData = await response.json();

      } catch (parseError) {

        errorData = { message: 'Erro desconhecido' };

      }

      

      throw new Error(`Erro ao enviar vídeo: ${response.status} - ${JSON.stringify(errorData)}`);

    }



    const responseData = await response.json();

    

    void 0;

    return responseData;

    

  } catch (error) {

    console.error(`💥 [${requestId}] ERRO sendVideoMessage:`, error.message);

    throw error;

  }

}



export async function sendMessageWithInstance(instanceName: string, number: string, text: string) {

  const apiUrl = `${API_BASE_URL}/message/sendText/${instanceName}`;

  const requestHeaders = {

    'Content-Type': 'application/json',

    'apikey': '429683C4C977415CAAFCCE10F7D57E11'

  };

  const requestBody = { number, text };

  const response = await fetch(apiUrl, {

    method: 'POST',

    headers: requestHeaders,

    body: JSON.stringify(requestBody)

  });

  if (!response.ok) {

    throw new Error('Erro ao enviar mensagem');

  }

  return response.json();

}



// Função para buscar mensagens com paginação e scroll infinito

export async function fetchMessagesWithPagination(

  instanceIds: string[],

  phoneNumber?: string,

  page: number = 0,

  limit: number = 50,

  fromDate?: string

) {

  try {

    let query = supabase

      .from('agente_conversacional_whatsapp')

      .select('*')

      .in('instance_id', instanceIds)

      .order('created_at', { ascending: false });



    // Filtrar por telefone se especificado

    if (phoneNumber) {

      query = query.eq('telefone_id', phoneNumber);

    }



    // Filtrar por data se especificado (para carregar mensagens mais antigas)

    if (fromDate) {

      query = query.lt('created_at', fromDate);

    }



    // Aplicar paginação

    const from = page * limit;

    const to = from + limit - 1;

    query = query.range(from, to);



    const { data, error, count } = await query;



    if (error) {

      console.error('Erro ao buscar mensagens:', error);

      throw new Error(`Erro ao buscar mensagens: ${error.message}`);

    }



    // Inverter a ordem para mostrar as mais antigas primeiro (cronológica)

    const messages = data ? data.reverse() : [];



    return {

      messages,

      hasMore: data && data.length === limit,

      totalCount: count || 0

    };

  } catch (error) {

    console.error('Erro ao buscar mensagens com paginação:', error);

    throw error;

  }

}



// Função para buscar as últimas mensagens de um contato específico

export async function fetchRecentMessages(

  instanceIds: string[],

  phoneNumber: string,

  limit: number = 500

) {

  try {

    const { data, error } = await supabase

      .from('agente_conversacional_whatsapp')

      .select('*')

      .in('instance_id', instanceIds)

      .eq('telefone_id', phoneNumber)

      .order('created_at', { ascending: true })

      .limit(limit);



    if (error) {

      console.error('Erro ao buscar mensagens recentes:', error);

      throw new Error(`Erro ao buscar mensagens recentes: ${error.message}`);

    }



    return data || [];

  } catch (error) {

    console.error('Erro ao buscar mensagens recentes:', error);

    throw error;

  }

}



// Função para configurar subscription em tempo real para mensagens

export function setupMessagesSubscription(

  instanceIds: string[],

  onNewMessage: (message: any) => void,

  onError?: (error: any) => void

) {

  try {

    // Criar canal único para evitar duplicações

    const channelName = `messages_${instanceIds.join('_')}_${Date.now()}`;

    

    const subscription = supabase

      .channel(channelName)

      .on(

        'postgres_changes',

        {

          event: 'INSERT',

          schema: 'public',

          table: 'agente_conversacional_whatsapp',

          filter: `instance_id=in.(${instanceIds.map(id => `"${id}"`).join(',')})`

        },

        (payload) => {

          void 0;

          onNewMessage(payload.new);

        }

      )

      .on(

        'postgres_changes',

        {

          event: 'UPDATE',

          schema: 'public',

          table: 'agente_conversacional_whatsapp',

          filter: `instance_id=in.(${instanceIds.map(id => `"${id}"`).join(',')})`

        },

        (payload) => {

          void 0;

          onNewMessage(payload.new);

        }

      )

      .subscribe((status) => {

        void 0;

        if (status === 'CHANNEL_ERROR' && onError) {

          onError(new Error('Erro na subscription de mensagens'));

        }

      });



    return subscription;

  } catch (error) {

    console.error('Erro ao configurar subscription de mensagens:', error);

    if (onError) onError(error);

    return null;

  }

}



// Função para remover subscription

export function removeMessagesSubscription(subscription: any) {

  if (subscription) {

    try {

      supabase.removeChannel(subscription);

      void 0;

    } catch (error) {

      console.error('Erro ao remover subscription:', error);

    }

  }

}



// Função para marcar mensagens como lidas

export async function markMessagesAsRead(phoneNumber: string, instanceIds: string[]) {

  try {

    const { error } = await supabase

      .from('agente_conversacional_whatsapp')

      .update({ foi_lida: true })

      .eq('telefone_id', phoneNumber)

      .in('instance_id', instanceIds)

      .eq('tipo', false) // Apenas mensagens recebidas

      .eq('foi_lida', false); // Apenas mensagens não lidas



    if (error) {

      console.error('Erro ao marcar mensagens como lidas:', error);

      throw new Error(`Erro ao marcar mensagens como lidas: ${error.message}`);

    }



    return true;

  } catch (error) {

    console.error('Erro ao marcar mensagens como lidas:', error);

    throw error;

  }

}



// Função para buscar estatísticas de mensagens não lidas

export async function getUnreadMessageCounts(instanceIds: string[]) {

  try {

    // Buscar todas as mensagens não lidas

    const { data, error } = await supabase

      .from('agente_conversacional_whatsapp')

      .select('telefone_id')

      .in('instance_id', instanceIds)

      .eq('tipo', false) // Apenas mensagens recebidas

      .eq('foi_lida', false); // Apenas mensagens não lidas



    if (error) {

      console.error('Erro ao buscar contagem de mensagens não lidas:', error);

      throw new Error(`Erro ao buscar contagem de mensagens não lidas: ${error.message}`);

    }



    // Contar mensagens por telefone

    const unreadCounts: Record<string, number> = {};

    data?.forEach(item => {

      unreadCounts[item.telefone_id] = (unreadCounts[item.telefone_id] || 0) + 1;

    });



    return unreadCounts;

  } catch (error) {

    console.error('Erro ao buscar contagem de mensagens não lidas:', error);

    throw error;

  }

}
