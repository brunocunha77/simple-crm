import { API_BASE_URL } from '@/config';
import { supabase } from '@/lib/supabase';

async function getDepartamentoLead(telefone: string): Promise<number | null> {
  try {
    const { data: lead } = await supabase
      .from('leads')
      .select('id_departamento')
      .eq('telefone', telefone)
      .single();
    return lead?.id_departamento || null;
  } catch {
    return null;
  }
}

async function getInstanceNamePadrao(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');

  const { data: atendente } = await supabase
    .from('atendentes')
    .select('id_cliente')
    .eq('email', user.email)
    .single();

  const idCliente = atendente
    ? atendente.id_cliente
    : (await supabase.from('clientes_info').select('id').eq('email', user.email).single()).data?.id;

  if (!idCliente) throw new Error('Cliente não encontrado');

  const { data: info } = await supabase
    .from('clientes_info')
    .select('instance_name')
    .eq('id', idCliente)
    .single();

  if (!info?.instance_name) throw new Error('Instance_name padrão não encontrado');
  return info.instance_name;
}

async function getChipCorretoParaLead(telefone: string): Promise<string | null> {
  try {
    const idDepartamento = await getDepartamentoLead(telefone);
    if (!idDepartamento) return getInstanceNamePadrao();

    const { data: dept } = await supabase
      .from('departamento')
      .select('instance_name_chip_associado')
      .eq('id', idDepartamento)
      .single();

    return dept?.instance_name_chip_associado || getInstanceNamePadrao();
  } catch {
    return getInstanceNamePadrao();
  }
}

async function getWhatsAppInstanceInfo(userEmail: string) {
  const { data: atendente } = await supabase
    .from('atendentes')
    .select('id_cliente')
    .eq('email', userEmail)
    .single();

  const idCliente = atendente
    ? atendente.id_cliente
    : (await supabase.from('clientes_info').select('id').eq('email', userEmail).single()).data?.id;

  const { data: info, error } = await supabase
    .from('clientes_info')
    .select('instance_name, apikey')
    .eq('id', idCliente)
    .single();

  if (error || !info?.instance_name) throw new Error('Instância do WhatsApp não encontrada');
  return info;
}

export async function sendMessage(number: string, text: string, idCliente?: number) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');

  const instanceName = await getChipCorretoParaLead(number);
  const clientInfo = await getWhatsAppInstanceInfo(user.email);

  const response = await fetch('https://webhook.dev.usesmartcrm.com/webhook/envio_mensagens', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instanceName,
      number,
      text,
      apikey: clientInfo.apikey || '429683C4C977415CAAFCCE10F7D57E11',
      user_id: user.id,
    }),
  });

  if (!response.ok) throw new Error(`Erro ao enviar mensagem: ${response.status}`);
  return response.json();
}

export async function sendAudioMessage(number: string, audioUrl: string, caption = '') {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');

  const instanceName = await getChipCorretoParaLead(number);
  const clientInfo = await getWhatsAppInstanceInfo(user.email);

  const response = await fetch(`${API_BASE_URL}/message/sendMedia/${instanceName}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: clientInfo.apikey || '' },
    body: JSON.stringify({
      number,
      mediatype: 'audio',
      media: audioUrl,
      caption,
      fileName: `audio_${Date.now()}.mp3`,
      mimetype: 'audio/mpeg',
      ptt: true,
    }),
  });

  if (!response.ok) throw new Error(`Erro ao enviar áudio: ${response.status}`);
  return response.json();
}

export async function sendImageMessage(number: string, imageUrl: string, caption?: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');

  const instanceName = await getChipCorretoParaLead(number);
  const clientInfo = await getWhatsAppInstanceInfo(user.email);

  let fileName = `image_${Date.now()}.jpg`;
  let mimetype = 'image/jpeg';
  if (imageUrl.includes('.png')) { fileName = fileName.replace('.jpg', '.png'); mimetype = 'image/png'; }
  else if (imageUrl.includes('.webp')) { fileName = fileName.replace('.jpg', '.webp'); mimetype = 'image/webp'; }

  const response = await fetch(`${API_BASE_URL}/message/sendMedia/${instanceName}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: clientInfo.apikey || '' },
    body: JSON.stringify({ number, mediatype: 'image', media: imageUrl, caption: caption || '', fileName, mimetype }),
  });

  if (!response.ok) throw new Error(`Erro ao enviar imagem: ${response.status}`);
  return response.json();
}

export async function sendDocumentMessage(number: string, documentUrl: string, fileName: string, caption = '') {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');

  const instanceName = await getChipCorretoParaLead(number);
  const clientInfo = await getWhatsAppInstanceInfo(user.email);

  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const mimeMap: Record<string, string> = {
    pdf: 'application/pdf', doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    txt: 'text/plain',
  };
  const mimetype = mimeMap[ext] || 'application/octet-stream';

  const response = await fetch(`${API_BASE_URL}/message/sendMedia/${instanceName}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: clientInfo.apikey || '' },
    body: JSON.stringify({ number, mediatype: 'document', media: documentUrl, caption, fileName, mimetype }),
  });

  if (!response.ok) throw new Error(`Erro ao enviar documento: ${response.status}`);
  return response.json();
}

export async function sendVideoMessage(number: string, videoUrl: string, caption = '') {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');

  const instanceName = await getChipCorretoParaLead(number);
  const clientInfo = await getWhatsAppInstanceInfo(user.email);

  let fileName = `video_${Date.now()}.mp4`;
  let mimetype = 'video/mp4';
  if (videoUrl.includes('.mov')) { fileName = fileName.replace('.mp4', '.mov'); mimetype = 'video/quicktime'; }
  else if (videoUrl.includes('.webm')) { fileName = fileName.replace('.mp4', '.webm'); mimetype = 'video/webm'; }

  const response = await fetch(`${API_BASE_URL}/message/sendMedia/${instanceName}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: clientInfo.apikey || '' },
    body: JSON.stringify({ number, mediatype: 'video', media: videoUrl, caption, fileName, mimetype }),
  });

  if (!response.ok) throw new Error(`Erro ao enviar vídeo: ${response.status}`);
  return response.json();
}

export async function sendMessageWithInstance(instanceName: string, number: string, text: string) {
  const response = await fetch(`${API_BASE_URL}/message/sendText/${instanceName}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: '429683C4C977415CAAFCCE10F7D57E11' },
    body: JSON.stringify({ number, text }),
  });
  if (!response.ok) throw new Error('Erro ao enviar mensagem');
  return response.json();
}

export async function fetchMessagesWithPagination(
  instanceIds: string[],
  phoneNumber?: string,
  page = 0,
  limit = 50,
  fromDate?: string
) {
  let query = supabase
    .from('agente_conversacional_whatsapp')
    .select('*')
    .in('instance_id', instanceIds)
    .order('created_at', { ascending: false });

  if (phoneNumber) query = query.eq('telefone_id', phoneNumber);
  if (fromDate) query = query.lt('created_at', fromDate);

  const from = page * limit;
  query = query.range(from, from + limit - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(`Erro ao buscar mensagens: ${error.message}`);

  return {
    messages: data ? data.reverse() : [],
    hasMore: data?.length === limit,
    totalCount: count || 0,
  };
}

export async function fetchRecentMessages(instanceIds: string[], phoneNumber: string, limit = 500) {
  const { data, error } = await supabase
    .from('agente_conversacional_whatsapp')
    .select('*')
    .in('instance_id', instanceIds)
    .eq('telefone_id', phoneNumber)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) throw new Error(`Erro ao buscar mensagens recentes: ${error.message}`);
  return data || [];
}

export function setupMessagesSubscription(
  instanceIds: string[],
  onNewMessage: (message: any) => void,
  onError?: (error: any) => void
) {
  try {
    const channelName = `messages_${instanceIds.join('_')}_${Date.now()}`;
    const filterExpr = `instance_id=in.(${instanceIds.map(id => `"${id}"`).join(',')})`;

    return supabase
      .channel(channelName)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'agente_conversacional_whatsapp', filter: filterExpr }, p => onNewMessage(p.new))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'agente_conversacional_whatsapp', filter: filterExpr }, p => onNewMessage(p.new))
      .subscribe(status => {
        if (status === 'CHANNEL_ERROR' && onError) onError(new Error('Erro na subscription de mensagens'));
      });
  } catch (error) {
    if (onError) onError(error);
    return null;
  }
}

export function removeMessagesSubscription(subscription: any) {
  if (subscription) {
    try { supabase.removeChannel(subscription); } catch { /* ignorar */ }
  }
}

export async function markMessagesAsRead(phoneNumber: string, instanceIds: string[]) {
  const { error } = await supabase
    .from('agente_conversacional_whatsapp')
    .update({ foi_lida: true })
    .eq('telefone_id', phoneNumber)
    .in('instance_id', instanceIds)
    .eq('tipo', false)
    .eq('foi_lida', false);

  if (error) throw new Error(`Erro ao marcar mensagens como lidas: ${error.message}`);
  return true;
}

export async function getUnreadMessageCounts(instanceIds: string[]) {
  const { data, error } = await supabase
    .from('agente_conversacional_whatsapp')
    .select('telefone_id')
    .in('instance_id', instanceIds)
    .eq('tipo', false)
    .eq('foi_lida', false);

  if (error) throw new Error(`Erro ao buscar mensagens não lidas: ${error.message}`);

  const counts: Record<string, number> = {};
  data?.forEach(item => { counts[item.telefone_id] = (counts[item.telefone_id] || 0) + 1; });
  return counts;
}
