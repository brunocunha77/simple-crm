import React, { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth';
import { toast } from 'sonner';
import { AlertTriangle, Plus, MoreVertical, X, Upload } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import dayjs from 'dayjs';
import { Users, Megaphone } from 'lucide-react';
import GruposDisparo from '@/pages/GruposDisparo';

interface GrupoDisparo {
  id: number;
  nome_grupo: string;
}

interface CampanhaDisparo {
  id: number;
  id_grupo: number;
  nome_campanha: string;
  mensagem: string;
  intervalo_sec: number;
  data_envio: string;
  hora_envio: string;
  status: string;
  grupo_nome: string;
  instance_name: string;
}

/**
 * Alteração 2026-04-11 — Integração de Templates WhatsApp no Disparo em Massa
 *
 * O que foi adicionado:
 *   - Interface ApprovedTemplate: tipagem dos templates aprovados buscados de whatsapp_templates
 *   - Estado tipoCampanha ('texto' | 'template'): controla o modo do formulário
 *   - Estado templatesAprovados: lista de templates APPROVED do cliente
 *   - Estado templateSelecionado: template escolhido no mode 'template'
 *   - useEffect fetchTemplatesAprovados: busca templates APPROVED filtrados por id_cliente
 *   - Select "Tipo de Campanha" no início do formulário (default: 'texto')
 *   - Quando tipoCampanha === 'template': oculta Mensagem e Upload; mostra select de templates + preview do body
 *   - handleSubmit: inclui tipo_campanha, template_name, template_language quando modo template;
 *     não envia url_arquivo/tipo_arquivo nesse modo; mensagem fica vazia
 *   - Colunas novas necessárias na tabela disparo: tipo_campanha, template_name, template_language
 *
 * Nada foi alterado no fluxo de 'Mensagem de Texto'.
 */
interface ApprovedTemplate {
  name: string;
  category: string;
  language: string;
  content_json: { components: Array<{ type: string; text?: string }> };
}

export function DisparoMassaContent() {
  const { user } = useAuth();
  const [grupos, setGrupos] = useState<GrupoDisparo[]>([]);
  const [idGrupo, setIdGrupo] = useState<string>('');
  const [nomeCampanha, setNomeCampanha] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [intervalo, setIntervalo] = useState('15');
  const [dataEnvio, setDataEnvio] = useState('');
  const [horaEnvio, setHoraEnvio] = useState('');
  const [loading, setLoading] = useState(false);
  const [campanhas, setCampanhas] = useState<CampanhaDisparo[]>([]);
  const [clienteId, setClienteId] = useState<number|null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [excluirModalOpen, setExcluirModalOpen] = useState(false);
  const [campanhaParaExcluir, setCampanhaParaExcluir] = useState<CampanhaDisparo | null>(null);
  
  // Estado para arquivo anexado
  const [arquivoAnexo, setArquivoAnexo] = useState<File | null>(null);
  const [uploadingArquivo, setUploadingArquivo] = useState(false);

  // ── Tipo de campanha e templates WhatsApp ──────────────────────────────────
  const [tipoCampanha, setTipoCampanha] = useState<'texto' | 'template'>('texto');
  const [templatesAprovados, setTemplatesAprovados] = useState<ApprovedTemplate[]>([]);
  const [templateSelecionado, setTemplateSelecionado] = useState<ApprovedTemplate | null>(null);

  // Buscar id_cliente e grupos do cliente logado
  useEffect(() => {
    const fetchClienteEGrupos = async () => {
      if (!user?.email) return;
      const { data: clienteInfo } = await supabase
        .from('clientes_info')
        .select('id')
        .eq('email', user.email)  // ✅ Usar email em vez de user_id_auth
        .single();
      if (!clienteInfo) return;
      setClienteId(clienteInfo.id);
      const { data: gruposData } = await supabase
        .from('grupos_disparo')
        .select('id, nome_grupo')
        .eq('id_cliente', clienteInfo.id)
        .order('nome_grupo');
      if (gruposData) setGrupos(gruposData);
    };
    fetchClienteEGrupos();
  }, [user]);

  // Buscar campanhas do cliente logado
  useEffect(() => {
    const fetchCampanhas = async () => {
      if (!clienteId) return;
      const { data: campanhasData, error } = await supabase
        .from('disparo')
        .select('id, id_grupo, nome_campanha, mensagem, intervalo_sec, data_envio, hora_envio, status, grupos_disparo (nome_grupo), instance_name')
        .eq('id_cliente', clienteId)
        .order('id', { ascending: false });
      if (error) {
        console.error('Erro ao buscar campanhas:', error);
        return;
      }
      const campanhasComGrupo = (campanhasData || []).map((c: any) => ({
        ...c,
        grupo_nome: c.grupos_disparo?.nome_grupo || '',
      }));
      setCampanhas(campanhasComGrupo);
    };
    fetchCampanhas();
  }, [clienteId, loading]);

  // Buscar templates APPROVED do cliente para o select de template
  useEffect(() => {
    const fetchTemplatesAprovados = async () => {
      if (!clienteId) return;
      const { data } = await supabase
        .from('whatsapp_templates')
        .select('name, category, language, content_json')
        .eq('id_cliente', clienteId)
        .eq('status', 'APPROVED')
        .order('name');
      if (data) setTemplatesAprovados(data);
    };
    fetchTemplatesAprovados();
  }, [clienteId]);

  // Atualizar status para 'executado' se data/hora já passou
  useEffect(() => {
    if (!campanhas.length) return;
    const now = dayjs();
    campanhas.forEach(async (camp) => {
      if (camp.status !== 'executado') {
        const dataHora = dayjs(`${camp.data_envio}T${camp.hora_envio}`);
        if (dataHora.isValid() && now.isAfter(dataHora)) {
          // Atualizar no Supabase
          await supabase
            .from('disparo')
            .update({ status: 'executado' })
            .eq('id', camp.id);
          // Atualizar no front
          setCampanhas((prev) => prev.map((c) => c.id === camp.id ? { ...c, status: 'executado' } : c));
        }
      }
    });
    // Opcional: rodar a cada 1 minuto
    const interval = setInterval(() => {
      campanhas.forEach(async (camp) => {
        if (camp.status !== 'executado') {
          const dataHora = dayjs(`${camp.data_envio}T${camp.hora_envio}`);
          if (dataHora.isValid() && dayjs().isAfter(dataHora)) {
            await supabase
              .from('disparo')
              .update({ status: 'executado' })
              .eq('id', camp.id);
            setCampanhas((prev) => prev.map((c) => c.id === camp.id ? { ...c, status: 'executado' } : c));
          }
        }
      });
    }, 60000);
    return () => clearInterval(interval);
  }, [campanhas]);

  // Função para fazer upload do arquivo
  const handleUploadArquivo = async (): Promise<{ url: string; tipo: string } | null> => {
    if (!arquivoAnexo || !clienteId) return null;

    setUploadingArquivo(true);
    try {
      // Validar tipo de arquivo
      const fileName = arquivoAnexo.name.toLowerCase();
      const isImage = fileName.match(/\.(jpg|jpeg|png|gif|webp)$/);
      const isVideo = fileName.match(/\.(mp4|avi|mov|wmv|flv|webm)$/);
      const isPdf = fileName.match(/\.pdf$/);

      if (!isImage && !isVideo && !isPdf) {
        throw new Error('Formato de arquivo não suportado. Use imagens (JPG, PNG, GIF, WebP), vídeos (MP4, AVI, MOV, etc.) ou PDF.');
      }

      // Determinar tipo do arquivo
      let tipoArquivo = 'Documento'; // Padrão para PDF e outros documentos
      if (isImage) {
        tipoArquivo = 'Imagem';
      } else if (isVideo) {
        tipoArquivo = 'Video';
      }

      // Validar tamanho para PDF (10MB)
      if (isPdf && arquivoAnexo.size > 10 * 1024 * 1024) {
        throw new Error('O arquivo PDF deve ter no máximo 10MB.');
      }

      // Gerar nome do arquivo no formato: id_cliente_hora_data.extensão
      // Exemplo: 38_1637_25122025.pdf (id 38, hora 16:37, dia 25/12/2025)
      const agora = new Date();
      const dia = agora.getDate().toString().padStart(2, '0');
      const mes = (agora.getMonth() + 1).toString().padStart(2, '0');
      const ano = agora.getFullYear().toString(); // Ano completo com 4 dígitos
      const hora = agora.getHours().toString().padStart(2, '0');
      const minuto = agora.getMinutes().toString().padStart(2, '0');
      
      const extensao = arquivoAnexo.name.split('.').pop()?.toLowerCase() || '';
      const nomeArquivo = `${clienteId}_${hora}${minuto}_${dia}${mes}${ano}.${extensao}`;

      // Fazer upload para o bucket arquivos_disparo
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('arquivos_disparo')
        .upload(nomeArquivo, arquivoAnexo, {
          contentType: arquivoAnexo.type,
          upsert: false,
          cacheControl: '3600'
        });

      if (uploadError) {
        throw new Error(`Erro ao fazer upload do arquivo: ${uploadError.message}`);
      }

      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from('arquivos_disparo')
        .getPublicUrl(uploadData.path);

      return { url: urlData.publicUrl, tipo: tipoArquivo };
    } catch (err: any) {
      toast.error(err.message || 'Erro ao fazer upload do arquivo');
      return null;
    } finally {
      setUploadingArquivo(false);
    }
  };

  // Submeter formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!user) throw new Error('Usuário não autenticado');
      if (!clienteId) throw new Error('Cliente não encontrado');

      // Validação específica por tipo de campanha
      if (tipoCampanha === 'template' && !templateSelecionado) {
        toast.error('Selecione um template WhatsApp para continuar.');
        setLoading(false);
        return;
      }
      if (tipoCampanha === 'texto' && !mensagem.trim()) {
        toast.error('Digite a mensagem da campanha.');
        setLoading(false);
        return;
      }

      // Upload de arquivo apenas para campanhas de texto
      let urlArquivo: string | null = null;
      let tipoArquivo: string | null = null;
      if (tipoCampanha === 'texto' && arquivoAnexo) {
        const uploadResult = await handleUploadArquivo();
        if (!uploadResult) {
          setLoading(false);
          return; // Erro já foi exibido no handleUploadArquivo
        }
        urlArquivo = uploadResult.url;
        tipoArquivo = uploadResult.tipo;
      }

      // Buscar instance_name do cliente
      const { data: clienteInfo } = await supabase
        .from('clientes_info')
        .select('instance_name')
        .eq('id', clienteId)
        .single();
      if (!clienteInfo) throw new Error('Cliente não encontrado');

      // Inserir na tabela disparo
      // Colunas tipo_campanha, template_name, template_language adicionadas ao schema
      const insertData: any = {
        id_cliente: clienteId,
        id_grupo: Number(idGrupo),
        nome_campanha: nomeCampanha,
        mensagem: tipoCampanha === 'template' ? '' : mensagem,
        intervalo_sec: Number(intervalo),
        data_envio: dataEnvio,
        hora_envio: horaEnvio,
        status: 'programado',
        instance_name: clienteInfo.instance_name,
        tipo_campanha: tipoCampanha,
      };

      if (tipoCampanha === 'template' && templateSelecionado) {
        insertData.template_name     = templateSelecionado.name;
        insertData.template_language = templateSelecionado.language;
      }

      if (tipoCampanha === 'texto' && urlArquivo) {
        insertData.url_arquivo = urlArquivo;
      }

      if (tipoCampanha === 'texto' && tipoArquivo) {
        insertData.tipo_arquivo = tipoArquivo;
      }

      const { error } = await supabase
        .from('disparo')
        .insert(insertData);
      
      if (error) throw error;
      toast.success('Campanha criada com sucesso!');
      setIdGrupo('');
      setNomeCampanha('');
      setMensagem('');
      setIntervalo('15');
      setDataEnvio('');
      setHoraEnvio('');
      setArquivoAnexo(null);
      setTipoCampanha('texto');
      setTemplateSelecionado(null);
      setModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar campanha');
    } finally {
      setLoading(false);
    }
  };

  // Função para excluir campanha
  const handleExcluirCampanha = async () => {
    if (!campanhaParaExcluir) return;
    setEnviando(true);
    try {
      const { error } = await supabase
        .from('disparo')
        .delete()
        .eq('id', campanhaParaExcluir.id);
      if (error) throw error;
      toast.success('Campanha excluída com sucesso!');
      setExcluirModalOpen(false);
      setCampanhaParaExcluir(null);
      // Remover do front imediatamente
      setCampanhas((prev) => prev.filter((c) => c.id !== campanhaParaExcluir.id));
    } catch (err: any) {
      toast.error(err.message || 'Erro ao excluir campanha');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="w-full p-4 sm:p-6 mt-4 sm:mt-6">
      {/* Alerta de risco */}
      <div className="mb-6">
        <div className="flex items-start gap-3 bg-red-100 border border-red-300 rounded-lg p-4">
          <AlertTriangle className="text-red-500 mt-1 flex-shrink-0" />
          <div className="text-red-700 text-sm">
            <strong>Aviso importante:</strong> a funcionalidade de campanha (envio em massa) deve ser utilizada com cautela, pois o envio exagerado ou o envio para audiências não qualificadas pode causar banimento do chip, uma vez que as pessoas podem denunciar spam. Sempre tente enviar via chips alternativos já "quentes", para audiências qualificadas, com bom intervalo entre as mensagens, e com variações de versões. Seguindo as boas práticas você poderá fazer suas campanhas com segurança.
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Campanhas criadas</h3>
        <Button onClick={() => setModalOpen(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Criar campanha
        </Button>
      </div>
      {/* Lista de campanhas */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full text-sm ">
          <thead>
            <tr className="bg-gray-50 text-gray-700">
              <th className="py-2 px-3 text-left font-semibold">Nome</th>
              <th className="py-2 px-3 text-left font-semibold">Grupo</th>
              <th className="py-2 px-3 text-left font-semibold">Data/Hora</th>
              <th className="py-2 px-3 text-left font-semibold">Status</th>
              <th className="py-2 px-3 text-left font-semibold">Ação</th>
            </tr>
          </thead>
          <tbody>
            {campanhas.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center text-gray-400 py-8">
                  Nenhuma campanha cadastrada
                </td>
              </tr>
            ) : (
              campanhas.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="py-2 px-2 sm:px-3 font-medium break-words max-w-[120px] sm:max-w-none">{c.nome_campanha}</td>
                  <td className="py-2 px-2 sm:px-3 break-words max-w-[100px] sm:max-w-none">{c.grupo_nome || '-'}</td>
                  <td className="py-2 px-2 sm:px-3 whitespace-nowrap">{c.data_envio} {c.hora_envio}</td>
                  <td className="py-2 px-2 sm:px-3 capitalize whitespace-nowrap">{c.status}</td>
                  <td className="py-2 px-2 sm:px-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-8 w-8">
                          <MoreVertical className="w-5 h-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setCampanhaParaExcluir(c); setExcluirModalOpen(true); }} className="text-red-600">
                          Excluir campanha
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {/* Modal de criação de campanha */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md w-full sm:w-auto max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Campanha de Disparo</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Tipo de Campanha — determina se o disparo usa mensagem de texto ou template WhatsApp */}
            <div>
              <label className="block mb-1 font-medium">Tipo de Campanha</label>
              <Select
                value={tipoCampanha}
                onValueChange={(v) => {
                  setTipoCampanha(v as 'texto' | 'template');
                  setTemplateSelecionado(null);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="texto">Mensagem de Texto</SelectItem>
                  <SelectItem value="template">API Oficial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block mb-1 font-medium">Grupo de Disparo</label>
              <Select value={idGrupo} onValueChange={setIdGrupo} required>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione um grupo" />
                </SelectTrigger>
                <SelectContent>
                  {grupos.length === 0 && <div className="px-3 py-2 text-gray-400">Nenhum grupo encontrado</div>}
                  {grupos.map((grupo) => (
                    <SelectItem key={grupo.id} value={grupo.id.toString()}>
                      {grupo.nome_grupo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block mb-1 font-medium">Nome da Campanha</label>
              <Input value={nomeCampanha} onChange={e => setNomeCampanha(e.target.value)} required />
            </div>
            {/* Mensagem de texto — visível apenas quando tipoCampanha === 'texto' */}
            {tipoCampanha === 'texto' && (
              <div>
                <label className="block mb-1 font-medium">Mensagem</label>
                <Textarea
                  value={mensagem}
                  onChange={e => setMensagem(e.target.value)}
                  placeholder={`Ex: Olá, {{nome}}!\nTemos uma oferta para você.\nResponda para saber mais.`}
                  rows={4}
                />
                <span className="text-xs text-gray-500 block mt-1">
                  Para personalizar com o nome do contato, utilize <b>&#123;&#123;nome&#125;&#125;</b> no texto da mensagem.<br />
                  Você pode usar quebras de linha normalmente.
                </span>
              </div>
            )}

            {/* Seleção de template — visível apenas quando tipoCampanha === 'template' */}
            {tipoCampanha === 'template' && (
              <div className="space-y-3">
                <div>
                  <label className="block mb-1 font-medium">API Oficial</label>
                  {templatesAprovados.length === 0 ? (
                    <p className="text-sm text-gray-400 rounded-lg border border-dashed border-gray-200 p-3">
                      Nenhum template aprovado encontrado. Acesse{' '}
                      <span className="font-medium text-primary-600">Templates WhatsApp</span>{' '}
                      no menu para criar e aguardar aprovação da Meta.
                    </p>
                  ) : (
                    <Select
                      value={templateSelecionado?.name ?? ''}
                      onValueChange={(nome) => {
                        const tpl = templatesAprovados.find(t => t.name === nome) ?? null;
                        setTemplateSelecionado(tpl);
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione um template..." />
                      </SelectTrigger>
                      <SelectContent>
                        {templatesAprovados.map((tpl) => (
                          <SelectItem key={tpl.name} value={tpl.name}>
                            {tpl.name}{' '}
                            <span className="text-gray-400 text-xs">
                              ({tpl.category} · {tpl.language})
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Preview do body do template selecionado */}
                {templateSelecionado && (() => {
                  const bodyText = templateSelecionado.content_json.components
                    .find(c => c.type === 'BODY')?.text ?? '';
                  return bodyText ? (
                    <div className="rounded-lg border border-primary-200 bg-primary-50 p-3">
                      <p className="text-xs font-medium text-primary-600 mb-1 uppercase tracking-wide">
                        Prévia do corpo da mensagem
                      </p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{bodyText}</p>
                    </div>
                  ) : null;
                })()}
              </div>
            )}
            <div>
              <label className="block mb-1 font-medium">Intervalo entre mensagens (segundos)</label>
              <Input
                type="number"
                min={15}
                value={intervalo}
                onChange={e => setIntervalo(Math.max(15, Number(e.target.value)).toString())}
                required
              />
              <span className="text-xs text-gray-500 block mt-1">
                O intervalo mínimo é de 15 segundos entre mensagens. Essa é uma medida de segurança para evitar o bloqueio do chip.
              </span>
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block mb-1 font-medium">Data de Envio</label>
                <Input
                  type="date"
                  value={dataEnvio}
                  onChange={e => setDataEnvio(e.target.value)}
                  required
                />
              </div>
              <div className="flex-1">
                <label className="block mb-1 font-medium">Hora de Envio (Brasília)</label>
                <Input
                  type="time"
                  value={horaEnvio}
                  onChange={e => setHoraEnvio(e.target.value)}
                  required
                  step={60}
                />
              </div>
            </div>
            {/* Upload de arquivo — visível apenas para campanhas de texto */}
            {tipoCampanha === 'texto' && <div>
              <label className="block mb-1 font-medium">Anexar Arquivo (Opcional)</label>
              <div className="space-y-2">
                {!arquivoAnexo ? (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                    <Input
                      type="file"
                      accept="image/*,video/*,.pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          // Validar tipo
                          const fileName = file.name.toLowerCase();
                          const isImage = fileName.match(/\.(jpg|jpeg|png|gif|webp)$/);
                          const isVideo = fileName.match(/\.(mp4|avi|mov|wmv|flv|webm)$/);
                          const isPdf = fileName.match(/\.pdf$/);

                          if (!isImage && !isVideo && !isPdf) {
                            toast.error('Formato não suportado. Use imagens, vídeos ou PDF.');
                            e.target.value = '';
                            return;
                          }

                          // Validar tamanho para PDF
                          if (isPdf && file.size > 10 * 1024 * 1024) {
                            toast.error('O arquivo PDF deve ter no máximo 10MB.');
                            e.target.value = '';
                            return;
                          }

                          setArquivoAnexo(file);
                        }
                      }}
                      className="hidden"
                      id="arquivo-input"
                    />
                    <label
                      htmlFor="arquivo-input"
                      className="cursor-pointer flex flex-col items-center justify-center"
                    >
                      <Upload className="w-8 h-8 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-600">
                        Clique para selecionar imagem, vídeo ou PDF
                      </span>
                      <span className="text-xs text-gray-400 mt-1">
                        PDF: máximo 10MB
                      </span>
                    </label>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex-shrink-0">
                        {arquivoAnexo.name.toLowerCase().match(/\.pdf$/) ? (
                          <div className="w-10 h-10 bg-red-100 rounded flex items-center justify-center">
                            <span className="text-red-600 font-bold text-sm">PDF</span>
                          </div>
                        ) : arquivoAnexo.name.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/) ? (
                          <div className="w-10 h-10 bg-blue-100 rounded flex items-center justify-center">
                            <span className="text-blue-600 text-xl">📷</span>
                          </div>
                        ) : (
                          <div className="w-10 h-10 bg-purple-100 rounded flex items-center justify-center">
                            <span className="text-purple-600 text-xl">🎥</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {arquivoAnexo.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {(arquivoAnexo.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setArquivoAnexo(null)}
                      className="flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
              <span className="text-xs text-gray-500 block mt-1">
                Você pode anexar apenas um arquivo por campanha (imagem, vídeo ou PDF). PDF limitado a 10MB.
              </span>
            </div>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Salvando...' : 'Criar Campanha'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de exclusão */}
      <Dialog open={excluirModalOpen} onOpenChange={setExcluirModalOpen}>
        <DialogContent className="max-w-md w-full sm:w-auto">
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
          </DialogHeader>
          <div className="mb-4">
            Tem certeza que deseja excluir esta campanha?<br />
            <span className="text-sm text-gray-500">Esta ação não poderá ser desfeita.</span>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setExcluirModalOpen(false)} disabled={enviando}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleExcluirCampanha} disabled={enviando} variant="destructive">
              {enviando ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function DisparoMassa() {
  const [activeSection, setActiveSection] = useState<'grupos' | 'disparo'>('grupos');

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 items-start">
          {/* Coluna de submenu fixado, alinhado com o conteúdo principal */}
          <div className="sticky top-4 self-start mt-4 sm:mt-6">
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant={activeSection === 'grupos' ? 'default' : 'outline'}
                className="justify-start gap-2"
                onClick={() => setActiveSection('grupos')}
              >
                <Users className="h-4 w-4" />
                Grupos de disparo
              </Button>
              <Button
                type="button"
                variant={activeSection === 'disparo' ? 'default' : 'outline'}
                className="justify-start gap-2"
                onClick={() => setActiveSection('disparo')}
              >
                <Megaphone className="h-4 w-4" />
                Disparo em Massa
              </Button>
            </div>
          </div>

          {/* min-w-0 evita overflow do grid; overflow-x-auto restringe scroll horizontal à direita */}
          <div className="min-w-0 overflow-x-auto">
            {activeSection === 'grupos' ? <GruposDisparo /> : <DisparoMassaContent />}
          </div>
        </div>
      </div>
    </div>
  );
}