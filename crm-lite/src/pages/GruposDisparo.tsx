import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MoreVertical, Users, Tag } from "lucide-react";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabase";
import { leadsService } from "@/services/leadsService";
import { etiquetasService, Etiqueta } from "@/services/etiquetasService";
import { useAuth } from "@/contexts/auth";
import { Menu } from '@headlessui/react';
import { Eye, Trash2 } from 'lucide-react';

export default function GruposDisparo() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [nomeGrupo, setNomeGrupo] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{
    total: number;
    novos: number;
    duplicados: number;
    inseridos: number;
  } | null>(null);
  const [grupos, setGrupos] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [grupoSelecionado, setGrupoSelecionado] = useState<any | null>(null);
  const [showContatosModal, setShowContatosModal] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  
  // Estados para criar grupo a partir de contatos
  const [showCriarContatosModal, setShowCriarContatosModal] = useState(false);
  const [etiquetas, setEtiquetas] = useState<Etiqueta[]>([]);
  const [selectedEtiqueta, setSelectedEtiqueta] = useState<string>('all');
  const [contatosFiltrados, setContatosFiltrados] = useState<any[]>([]);
  const [loadingContatos, setLoadingContatos] = useState(false);
  const [nomeGrupoContatos, setNomeGrupoContatos] = useState("");
  const [criandoGrupo, setCriandoGrupo] = useState(false);

  function normalizePhone(phone: string | null | undefined) {
    if (!phone) return "";
    return phone.replace(/\D/g, "");
  }

  async function getIdCliente() {
    try {
      if (!user?.email) {
        console.error('Email do usuário não encontrado');
        return null;
      }
      
      const { data, error } = await supabase
        .from('clientes_info')
        .select('id')
        .eq('email', user.email)  // ✅ Usar email em vez de user_id_auth
        .single();
        
      if (error) {
        console.error('Erro ao buscar id_cliente:', error);
        return null;
      }
      
      if (!data?.id) {
        console.error('id_cliente não encontrado para o usuário');
        return null;
      }
      
      return data.id;
    } catch (error) {
      console.error('Erro na função getIdCliente:', error);
      return null;
    }
  }

  // Buscar etiquetas do cliente
  const fetchEtiquetas = async () => {
    if (!user?.id_cliente) return;
    
    try {
      const etiquetasData = await etiquetasService.listByCliente(user.id_cliente);
      setEtiquetas(etiquetasData);
    } catch (error) {
      console.error('Erro ao buscar etiquetas:', error);
    }
  };

  // Função para obter os nomes das etiquetas de um contato
  const getEtiquetasContato = (idEtiquetas: string | null) => {
    if (!idEtiquetas) return [];
    
    const ids = idEtiquetas.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
    return etiquetas.filter(etiqueta => ids.includes(etiqueta.id));
  };

  // Buscar contatos filtrados por etiqueta
  const fetchContatosPorEtiqueta = async () => {
    if (!user?.id_cliente) {
      void 0;
      return;
    }
    
    setLoadingContatos(true);
    try {
      let query = supabase
        .from('leads')
        .select('id, nome, telefone, id_etiquetas')
        .eq('id_cliente', user.id_cliente);

      const { data, error } = await query;
      
      if (error) {
        console.error('Erro ao buscar contatos:', error);
        throw error;
      }

      // Filtrar contatos baseado na etiqueta selecionada
      let contatosFiltrados = data || [];
      if (selectedEtiqueta !== 'all') {
        contatosFiltrados = contatosFiltrados.filter(contato => {
          if (!contato.id_etiquetas) return false;
          
          try {
            const ids = contato.id_etiquetas.split(',').map((id: string) => id.trim());
            return ids.includes(selectedEtiqueta);
          } catch (splitError) {
            void 0;
            return false;
          }
        });
      }

      setContatosFiltrados(contatosFiltrados);
    } catch (error) {
      console.error('Erro ao buscar contatos:', error);
      setContatosFiltrados([]);
    } finally {
      setLoadingContatos(false);
    }
  };

  // Criar grupo a partir dos contatos filtrados
  const handleCriarGrupoContatos = async () => {
    if (!nomeGrupoContatos.trim()) {
      alert("Informe o nome do grupo.");
      return;
    }
    
    if (contatosFiltrados.length === 0) {
      alert("Nenhum contato encontrado com os filtros selecionados.");
      return;
    }

    setCriandoGrupo(true);
    try {
      const id_cliente = await getIdCliente();
      
      if (!id_cliente) {
        alert("Não foi possível identificar o cliente. Tente fazer login novamente.");
        return;
      }
      
      // Preparar lista de contatos no formato esperado
      const listaContatos = contatosFiltrados
        .map(contato => {
          const telefone = normalizePhone(contato.telefone);
          if (!telefone || telefone.length === 0) {
            void 0;
            return null;
          }
          return {
            nome: contato.nome || 'Sem nome',
            telefone: telefone
          };
        })
        .filter(contato => contato !== null) as { nome: string; telefone: string }[];
      
      if (listaContatos.length === 0) {
        alert("Nenhum contato válido encontrado para criar o grupo.");
        return;
      }

      // Criar o grupo
      const { data: grupoCriado, error: errorGrupo } = await supabase
        .from('grupos_disparo')
        .insert([{
          id_cliente,
          nome_grupo: nomeGrupoContatos,
          qtd_contatos: contatosFiltrados.length,
          lista_contatos: listaContatos,
        }])
        .select()
        .single();

      if (errorGrupo) {
        throw errorGrupo;
      }

      // Atualizar lista de grupos
      const { data: gruposAtualizados } = await supabase
        .from('grupos_disparo')
        .select('*')
        .eq('id_cliente', id_cliente)
        .order('id', { ascending: false });
      
      setGrupos(gruposAtualizados || []);
      
      // Limpar modal
      setShowCriarContatosModal(false);
      setNomeGrupoContatos("");
      setSelectedEtiqueta('all');
      setContatosFiltrados([]);
      
      alert(`Grupo "${nomeGrupoContatos}" criado com sucesso com ${contatosFiltrados.length} contatos!`);
    } catch (error: any) {
      console.error('Erro ao criar grupo:', error);
      alert('Erro ao criar grupo: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setCriandoGrupo(false);
    }
  };

  // Buscar grupos do Supabase ao carregar a página
  useEffect(() => {
    async function fetchGrupos() {
      setLoading(true);
      try {
        const id_cliente = await getIdCliente();
        
        if (!id_cliente) {
          void 0;
          setGrupos([]);
          return;
        }
        
        const { data, error } = await supabase
          .from('grupos_disparo')
          .select('*')
          .eq('id_cliente', id_cliente)
          .order('id', { ascending: false });
          
        if (error) {
          console.error('Erro ao buscar grupos:', error);
          setGrupos([]);
        } else {
          setGrupos(data || []);
        }
      } catch (error) {
        console.error('Erro na função fetchGrupos:', error);
        setGrupos([]);
      } finally {
        setLoading(false);
      }
    }
    fetchGrupos();
    // eslint-disable-next-line
  }, [user]);

  // Buscar etiquetas quando o componente carregar
  useEffect(() => {
    fetchEtiquetas();
  }, [user?.id_cliente]);

  // Buscar contatos quando a etiqueta selecionada mudar
  useEffect(() => {
    if (showCriarContatosModal) {
      fetchContatosPorEtiqueta();
    }
  }, [selectedEtiqueta, showCriarContatosModal]);

  // Função para processar o arquivo e salvar no Supabase
  const handleImport = async () => {
    setError("");
    setSuccess("");
    if (!nomeGrupo.trim()) {
      setError("Informe o nome do grupo.");
      return;
    }
    if (!file) {
      setError("Selecione um arquivo XLSX ou CSV.");
      return;
    }
    setImporting(true);
    try {
      const id_cliente = await getIdCliente();
      
      // Verificar se o id_cliente é válido
      if (!id_cliente) {
        setError("Não foi possível identificar o cliente. Tente fazer login novamente.");
        setImporting(false);
        return;
      }
      
      // Verificar se o arquivo é válido
      if (!file || file.size === 0) {
        setError("Arquivo inválido ou vazio.");
        setImporting(false);
        return;
      }
      
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      
      // Verificar se o workbook tem sheets
      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        setError("Arquivo não contém planilhas válidas.");
        setImporting(false);
        return;
      }
      
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!sheet) {
        setError("Não foi possível ler a primeira planilha do arquivo.");
        setImporting(false);
        return;
      }
      
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      
      // Verificar se há dados na planilha
      if (!rows || rows.length < 2) {
        setError("Planilha deve ter pelo menos uma linha de cabeçalho e uma linha de dados.");
        setImporting(false);
        return;
      }
      const contatos = rows
        .slice(1)
        .map((row: any) => {
          // Verificar se a linha tem pelo menos 2 colunas
          if (!row || row.length < 2) {
            return null;
          }
          
          const nome = row[0] ? String(row[0]).trim() : "";
          const telefone = row[1] ? normalizePhone(String(row[1])) : "";
          
          // Verificar se nome e telefone são válidos
          if (!nome || nome.length === 0 || !telefone || telefone.length === 0) {
            return null;
          }
          
          return { nome, telefone };
        })
        .filter(c => c !== null) as { nome: string; telefone: string }[];
        
      if (contatos.length === 0) {
        setError("Nenhum contato válido encontrado na planilha. Verifique se as colunas Nome e Telefone estão preenchidas corretamente.");
        setImporting(false);
        return;
      }
      // Buscar contatos já existentes para este id_cliente
      const { data: contatosExistentes } = await supabase
        .from('leads')
        .select('telefone')
        .eq('id_cliente', id_cliente);
      const telefonesExistentes = (contatosExistentes || [])
        .map((c: any) => normalizePhone(c.telefone))
        .filter(telefone => telefone && telefone.length > 0);
      
      // Filtrar contatos novos (não duplicados para este id_cliente)
      const contatosNovos = contatos.filter(c => !telefonesExistentes.includes(c.telefone));
      const contatosDuplicados = contatos.filter(c => telefonesExistentes.includes(c.telefone));
      
      // Atualizar progresso da importação
      setImportProgress({
        total: contatos.length,
        novos: contatosNovos.length,
        duplicados: contatosDuplicados.length,
        inseridos: 0
      });
      
      void 0;
      void 0;
      void 0;
      
      // Inserir novos leads para este id_cliente usando upsert para ignorar duplicatas
      if (contatosNovos.length > 0) {
        const leadsToInsert = contatosNovos.map(c => ({
          id_cliente,
          nome: c.nome,
          telefone: c.telefone,
          status: 'Novo',
          score_qualificacao: 0,
          probabilidade_final_fechamento: 0,
          tempo_resposta: '',
          data_criacao: new Date().toISOString(),
          data_ultimo_status: new Date().toISOString(),
          nome_instancia: '',
        }));
        
        // Usar upsert com onConflict para ignorar duplicatas automaticamente
        const { error: leadsError } = await supabase
          .from('leads')
          .upsert(leadsToInsert, { 
            onConflict: 'id_cliente,telefone',  // Campo único que define duplicata
            ignoreDuplicates: true  // Ignora duplicatas automaticamente
          });
        
        if (leadsError) {
          console.error('Erro ao inserir leads:', leadsError);
          
          // Se o erro for de constraint, tentar inserção individual para identificar problemas
          if (leadsError.message.includes('duplicate key') || leadsError.message.includes('unique constraint')) {
            void 0;
            
            let inseridosComSucesso = 0;
            let errosIndividuais = 0;
            
            for (const lead of leadsToInsert) {
              try {
                const { error: individualError } = await supabase
                  .from('leads')
                  .insert([lead]);
                
                if (individualError) {
                  if (individualError.message.includes('duplicate key') || individualError.message.includes('unique constraint')) {
                    void 0;
                  } else {
                    console.error(`❌ Erro ao inserir contato individual:`, individualError);
                    errosIndividuais++;
                  }
                } else {
                  inseridosComSucesso++;
                  // Atualizar progresso
                  setImportProgress(prev => prev ? { ...prev, inseridos: inseridosComSucesso } : null);
                }
              } catch (individualError) {
                console.error(`❌ Erro ao inserir contato individual:`, individualError);
                errosIndividuais++;
              }
            }
            
            void 0;
            void 0;
            
            if (inseridosComSucesso === 0) {
              setError("Não foi possível inserir nenhum contato. Verifique se há problemas com os dados.");
              setImporting(false);
              setImportProgress(null);
              return;
            }
            
            // Atualizar progresso final
            setImportProgress(prev => prev ? { ...prev, inseridos: inseridosComSucesso } : null);
          } else {
            setError("Erro ao salvar contatos no banco de dados: " + leadsError.message);
            setImporting(false);
            setImportProgress(null);
            return;
          }
        } else {
          // Sucesso com upsert - todos os contatos foram inseridos
          setImportProgress(prev => prev ? { ...prev, inseridos: contatosNovos.length } : null);
        }
      }
      
      // Preparar mensagem de sucesso com detalhes
      let mensagemSucesso = `Grupo importado com sucesso!`;
      if (contatosNovos.length > 0) {
        mensagemSucesso += ` ${contatosNovos.length} contatos novos foram adicionados.`;
      }
      if (contatosDuplicados.length > 0) {
        mensagemSucesso += ` ${contatosDuplicados.length} contatos duplicados foram ignorados.`;
      }
      
      // Verificar se o nome do grupo é válido
      if (!nomeGrupo.trim()) {
        setError("Nome do grupo é obrigatório.");
        setImporting(false);
        return;
      }
      
      const { data: grupoCriado, error: errorGrupo } = await supabase.from('grupos_disparo').insert([
        {
          id_cliente,
          nome_grupo: nomeGrupo.trim(),
          qtd_contatos: contatos.length,
          lista_contatos: contatos,
        }
      ]).select().single();
      
      if (errorGrupo) {
        console.error('Erro ao criar grupo:', errorGrupo);
        setError("Erro ao salvar grupo: " + errorGrupo.message);
        setImporting(false);
        return;
      }
      
      if (!grupoCriado) {
        setError("Erro ao criar grupo: grupo não foi criado.");
        setImporting(false);
        return;
      }
      // Atualizar lista de grupos (busca novamente)
      const { data: gruposAtualizados } = await supabase
        .from('grupos_disparo')
        .select('*')
        .eq('id_cliente', id_cliente)
        .order('id', { ascending: false });
      setGrupos(gruposAtualizados || []);
      setSuccess(mensagemSucesso);
      setOpen(false);
      setNomeGrupo("");
      setFile(null);
      setImportProgress(null); // Limpar progresso
    } catch (e: any) {
      console.error('Erro completo na importação:', e);
      const errorMessage = e?.message || e?.toString() || 'Erro desconhecido';
      setError("Erro ao processar o arquivo ou salvar no Supabase: " + errorMessage);
      setImportProgress(null); // Limpar progresso em caso de erro
    } finally {
      setImporting(false);
    }
  };

  // Filtrar grupos pelo nome
  const gruposFiltrados = grupos.filter(g =>
    (g.nome_grupo || "").toLowerCase().includes(search.toLowerCase())
  );

  // Excluir grupo
  async function handleExcluirGrupo(grupoId: number) {
    if (!window.confirm('Tem certeza que deseja excluir este grupo?')) return;
    
    setExcluindo(true);
    try {
      const { error: deleteError } = await supabase
        .from('grupos_disparo')
        .delete()
        .eq('id', grupoId);
        
      if (deleteError) {
        console.error('Erro ao excluir grupo:', deleteError);
        alert('Erro ao excluir grupo: ' + deleteError.message);
        return;
      }
      
      // Atualizar lista
      const id_cliente = await getIdCliente();
      
      if (!id_cliente) {
        void 0;
        return;
      }
      
      const { data, error: fetchError } = await supabase
        .from('grupos_disparo')
        .select('*')
        .eq('id_cliente', id_cliente)
        .order('id', { ascending: false });
        
      if (fetchError) {
        console.error('Erro ao buscar grupos atualizados:', fetchError);
        setGrupos([]);
      } else {
        setGrupos(data || []);
      }
    } catch (e: any) {
      console.error('Erro na função handleExcluirGrupo:', e);
      alert('Erro ao excluir grupo: ' + (e?.message || 'Erro desconhecido'));
    } finally {
      setExcluindo(false);
    }
  }

  return (
    <div className="w-full p-4 sm:p-6 mt-4 sm:mt-6">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between pb-2 gap-4">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-2xl mb-2">Grupos</CardTitle>
            <div className="flex flex-row items-center gap-2 text-gray-500 text-sm mb-4 whitespace-nowrap overflow-x-auto">
              <span>Importe grupos em planilhas para criar campanhas</span>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 items-stretch sm:items-center w-full sm:w-auto min-w-0">
            <input
              type="text"
              placeholder="Buscar grupo..."
              className="border rounded px-3 py-2 text-sm w-full sm:w-64 max-w-full"
              value={search}
              onChange={e => setSearch(e.target.value)}
              disabled={loading}
              style={{ minWidth: 180 }}
            />
            <div className="flex flex-row flex-wrap gap-2 w-full sm:w-auto min-w-0">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                  <Button className="bg-green-600 hover:bg-green-700 text-white font-semibold flex items-center gap-2 w-full sm:w-auto">
                  <span className="text-lg">⏎</span>
                  Importar novo grupo
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Importar novo grupo</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Nome do grupo"
                    className="w-full border rounded px-3 py-2"
                    value={nomeGrupo}
                    onChange={e => setNomeGrupo(e.target.value)}
                    disabled={importing}
                  />
                  <input
                    type="file"
                    accept=".xlsx,.csv"
                    className="w-full"
                    onChange={e => setFile(e.target.files?.[0] || null)}
                    disabled={importing}
                  />
                  {error && <div className="text-red-600 text-sm">{error}</div>}
                  {success && <div className="text-green-600 text-sm">{success}</div>}
                  
                  {/* Progresso da importação */}
                  {importProgress && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-medium text-blue-900 mb-2">📊 Progresso da Importação</h4>
                      <div className="space-y-2 text-sm text-blue-800">
                        <div className="flex justify-between">
                          <span>Total de contatos na planilha:</span>
                          <span className="font-semibold">{importProgress.total}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Contatos novos:</span>
                          <span className="font-semibold text-green-600">{importProgress.novos}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Contatos duplicados (ignorados):</span>
                          <span className="font-semibold text-orange-600">{importProgress.duplicados}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Contatos inseridos com sucesso:</span>
                          <span className="font-semibold text-blue-600">{importProgress.inseridos}</span>
                        </div>
                      </div>
                      
                      {/* Barra de progresso */}
                      {importProgress.novos > 0 && (
                        <div className="mt-3">
                          <div className="w-full bg-blue-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ 
                                width: `${Math.round((importProgress.inseridos / importProgress.novos) * 100)}%` 
                              }}
                            ></div>
                          </div>
                          <div className="text-xs text-blue-600 mt-1 text-center">
                            {Math.round((importProgress.inseridos / importProgress.novos) * 100)}% concluído
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button onClick={handleImport} disabled={importing} className="bg-green-600 hover:bg-green-700 text-white">
                    {importing ? "Importando..." : "Importar"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
              <Dialog open={showCriarContatosModal} onOpenChange={setShowCriarContatosModal}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="border-blue-600 text-blue-600 hover:bg-blue-50 font-semibold flex items-center gap-2 w-full sm:w-auto max-w-full"
                    onClick={() => {
                      setShowCriarContatosModal(true);
                      setSelectedEtiqueta('all');
                      setContatosFiltrados([]);
                    }}
                  >
                    <Users className="w-4 h-4" />
                    Criar a partir de contatos
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Criar grupo a partir de contatos</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    {/* Nome do grupo */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nome do grupo
                      </label>
                      <input
                        type="text"
                        placeholder="Digite o nome do grupo"
                        className="w-full border rounded px-3 py-2"
                        value={nomeGrupoContatos}
                        onChange={e => setNomeGrupoContatos(e.target.value)}
                        disabled={criandoGrupo}
                      />
                    </div>
                    
                    {/* Filtro por etiqueta */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Filtrar por etiqueta
                      </label>
                      <Select
                        value={selectedEtiqueta}
                        onValueChange={setSelectedEtiqueta}
                        disabled={criandoGrupo}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione uma etiqueta" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos os contatos</SelectItem>
                          {etiquetas.map((etiqueta) => (
                            <SelectItem key={etiqueta.id} value={etiqueta.id.toString()}>
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded-full border border-gray-300"
                                  style={{ backgroundColor: etiqueta.cor }}
                                />
                                {etiqueta.nome}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Lista de contatos filtrados */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Contatos encontrados ({contatosFiltrados.length})
                      </label>
                      <div className="border rounded max-h-60 overflow-y-auto">
                        {loadingContatos ? (
                          <div className="p-4 text-center text-gray-500">
                            Carregando contatos...
                          </div>
                        ) : contatosFiltrados.length === 0 ? (
                          <div className="p-4 text-center text-gray-500">
                            {selectedEtiqueta === 'all' 
                              ? 'Nenhum contato encontrado' 
                              : 'Nenhum contato encontrado com esta etiqueta'
                            }
                          </div>
                        ) : (
                          <table className="min-w-full text-sm">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="py-2 px-3 text-left font-medium text-gray-700">Nome</th>
                                <th className="py-2 px-3 text-left font-medium text-gray-700">Telefone</th>
                                <th className="py-2 px-3 text-left font-medium text-gray-700">Etiquetas</th>
                              </tr>
                            </thead>
                            <tbody>
                              {contatosFiltrados.map((contato, index) => {
                                const etiquetasContato = getEtiquetasContato(contato.id_etiquetas);
                                return (
                                  <tr key={contato.id || index} className="border-b last:border-0">
                                    <td className="py-2 px-3">{contato.nome}</td>
                                    <td className="py-2 px-3">{contato.telefone}</td>
                                    <td className="py-2 px-3">
                                      <div className="flex flex-wrap gap-1">
                                        {etiquetasContato.map((etiqueta) => (
                                          <Badge 
                                            key={etiqueta.id} 
                                            variant="secondary" 
                                            className="text-xs"
                                            style={{ backgroundColor: etiqueta.cor + '20', color: etiqueta.cor, border: `1px solid ${etiqueta.cor}` }}
                                          >
                                            {etiqueta.nome}
                                          </Badge>
                                        ))}
                                        {etiquetasContato.length === 0 && (
                                          <span className="text-gray-400 text-xs">Sem etiquetas</span>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button 
                      onClick={handleCriarGrupoContatos} 
                      disabled={criandoGrupo || contatosFiltrados.length === 0}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {criandoGrupo ? "Criando..." : `Criar grupo (${contatosFiltrados.length} contatos)`}
                    </Button>
                    <Button 
                      variant="secondary" 
                      onClick={() => setShowCriarContatosModal(false)}
                      disabled={criandoGrupo}
                    >
                      Cancelar
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto max-h-[60vh]">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-gray-600 border-b">
                  <th className="py-2 px-3 text-left font-semibold">Criação</th>
                  <th className="py-2 px-3 text-left font-semibold">Nome</th>
                  <th className="py-2 px-3 text-left font-semibold">Quantidade de contatos</th>
                  <th className="py-2 px-3 text-left font-semibold">Variáveis</th>
                  <th className="py-2 px-3 text-left font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="text-center py-8 text-gray-400">Carregando grupos...</td></tr>
                ) : gruposFiltrados.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-8 text-gray-400">Nenhum grupo encontrado</td></tr>
                ) : (
                  gruposFiltrados.map((item, idx) => (
                    <tr key={item.id || idx} className="border-b last:border-0">
                      <td className="py-2 px-3 whitespace-nowrap">{item.created_at ? new Date(item.created_at).toLocaleString() : '-'}</td>
                      <td className="py-2 px-3 whitespace-nowrap">{item.nome_grupo || '-'}</td>
                      <td className="py-2 px-3 whitespace-nowrap">{item.qtd_contatos || (item.lista_contatos ? item.lista_contatos.length : '-')}</td>
                      <td className="py-2 px-3 whitespace-nowrap">telefone | nome</td>
                      <td className="py-2 px-3 text-center">
                        <Menu as="div" className="relative inline-block text-left">
                          <Menu.Button as={Button} variant="ghost" size="icon" className="text-gray-500 hover:text-primary-600">
                            <MoreVertical className="w-5 h-5" />
                          </Menu.Button>
                          <Menu.Items className="absolute right-0 mt-2 w-40 bg-white border rounded shadow-lg z-50">
                            <Menu.Item>
                              {({ active }) => (
                                <button
                                  className={`flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 ${active ? 'bg-gray-100' : ''}`}
                                  onClick={() => handleExcluirGrupo(item.id)}
                                  disabled={excluindo}
                                >
                                  <Trash2 className="w-4 h-4" /> Excluir grupo
                                </button>
                              )}
                            </Menu.Item>
                          </Menu.Items>
                        </Menu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* Modal de contatos */}
          <Dialog open={showContatosModal} onOpenChange={setShowContatosModal}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Contatos do grupo</DialogTitle>
              </DialogHeader>
              <div className="max-h-[50vh] overflow-y-auto">
                {grupoSelecionado && grupoSelecionado.lista_contatos && grupoSelecionado.lista_contatos.length > 0 ? (
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-gray-600 border-b">
                        <th className="py-2 px-3 text-left font-semibold">Nome</th>
                        <th className="py-2 px-3 text-left font-semibold">Telefone</th>
                      </tr>
                    </thead>
                    <tbody>
                      {grupoSelecionado.lista_contatos.map((c: any, i: number) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="py-2 px-3 whitespace-nowrap">{c.nome}</td>
                          <td className="py-2 px-3 whitespace-nowrap">{c.telefone}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-gray-500 text-center py-8">Nenhum contato neste grupo.</div>
                )}
              </div>
              <DialogFooter>
                <Button onClick={() => setShowContatosModal(false)} variant="secondary">Fechar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          {/* Paginação fake */}
          <div className="flex items-center justify-end mt-4 text-xs text-gray-500 gap-2">
            Linhas por página: <span className="font-medium">{gruposFiltrados.length}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 