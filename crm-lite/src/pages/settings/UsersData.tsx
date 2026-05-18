
import React, { useEffect, useState } from 'react';
import { atendentesService, Atendente } from '@/services/atendentesService';
import { departamentosService, Departamento } from '@/services/departamentosService';
import { useAuth } from '@/contexts/auth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function UsersData() {
  const { user } = useAuth();
  const [atendentes, setAtendentes] = useState<Atendente[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [tipoUsuario, setTipoUsuario] = useState<'Gestor' | 'Atendente'>('Gestor');
  const [departamentosSelecionados, setDepartamentosSelecionados] = useState<string[]>([]);
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [loadingDepartamentos, setLoadingDepartamentos] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [idCliente, setIdCliente] = useState<number | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);

  // Buscar id_cliente do usuário logado
  useEffect(() => {
    async function fetchCliente() {
      if (user?.id_cliente) {
        const cliente = await import('@/services/clientesService').then(m => m.clientesService.getClienteByIdCliente(user.id_cliente));
        setIdCliente(cliente?.id || null);
      }
    }
    fetchCliente();
  }, [user]);

  // Listar atendentes
  useEffect(() => {
    if (!idCliente) return;
    setLoading(true);
    atendentesService.listByCliente(idCliente)
      .then(setAtendentes)
      .catch(() => toast.error('Erro ao buscar usuários'))
      .finally(() => setLoading(false));
  }, [idCliente]);

  // Buscar departamentos
  useEffect(() => {
    if (!idCliente) return;
    setLoadingDepartamentos(true);
    departamentosService.listar(idCliente)
      .then(setDepartamentos)
      .catch(() => toast.error('Erro ao carregar departamentos'))
      .finally(() => setLoadingDepartamentos(false));
  }, [idCliente]);

  // Função para verificar e-mail em tempo real
  const checkEmailInRealTime = async (emailToCheck: string) => {
    if (!emailToCheck || emailToCheck.length < 3) {
      setEmailError(null);
      return;
    }

    setCheckingEmail(true);
    try {
      const emailCheck = await atendentesService.checkEmailExists(emailToCheck);
      if (emailCheck.exists) {
        const tableName = emailCheck.table === 'clientes_info' ? 'cliente' : 'atendente';
        setEmailError(`Este e-mail já está registrado em outra conta de ${tableName}.`);
      } else {
        setEmailError(null);
      }
    } catch (error) {
      console.error('Erro ao verificar e-mail:', error);
      setEmailError(null);
    } finally {
      setCheckingEmail(false);
    }
  };

  // ✅ NOVA LÓGICA: Função otimizada para recarregar a lista de atendentes
  const reloadAtendentes = async (retryCount = 0) => {
    if (!idCliente) return;
    
    try {
      // Pequeno delay apenas na primeira tentativa para garantir que o webhook tenha processado
      if (retryCount === 0) {
        await new Promise(resolve => setTimeout(resolve, 800));
      }
      
      const lista = await atendentesService.listByCliente(idCliente);
      setAtendentes(lista);
      void 0;
    } catch (error) {
      console.error('❌ Erro ao atualizar lista:', error);
      
      // Tentar novamente até 2 vezes (reduzido de 3 para 2)
      if (retryCount < 2) {
        void 0;
        setTimeout(() => reloadAtendentes(retryCount + 1), 1500);
      } else {
        console.error('❌ Falha ao atualizar lista após 2 tentativas');
        toast.error('Erro ao atualizar lista de usuários. Recarregue a página se necessário.');
      }
    }
  };

  // Função para limpar formulário
  const clearForm = () => {
    setNome('');
    setEmail('');
    setSenha('');
    setTipoUsuario('Gestor');
    setDepartamentosSelecionados([]);
    setEmailError(null);
    setCheckingEmail(false);
  };

  // Função para abrir modal
  const openModal = () => {
    clearForm();
    setShowModal(true);
  };

  // Função para fechar modal
  const closeModal = () => {
    setShowModal(false);
    clearForm();
  };

  // Adicionar novo atendente
  async function handleAdd() {
    if (!nome || !email || !senha || !idCliente) return;
    
    // Validar departamentos selecionados para atendente
    if (tipoUsuario === 'Atendente' && departamentosSelecionados.length === 0) {
      toast.error('Selecione pelo menos um departamento para o atendente');
      return;
    }
    
    setSaving(true);
    try {
      const novoAtendente = await atendentesService.createAtendente({ 
        nome, 
        email, 
        senha, 
        id_cliente: idCliente,
        tipo: tipoUsuario,
        departamentos: tipoUsuario === 'Atendente' ? departamentosSelecionados : []
      });
      
      toast.success('Usuário criado com sucesso!');
      closeModal();
      
      // ✅ NOVA LÓGICA: Atualização imediata da lista sem F5
      // Recarregar a lista imediatamente após criar o atendente
      await reloadAtendentes();
      
    } catch (e: any) {
      // Tratamento específico para e-mail duplicado
      if (e?.message?.includes('já está registrado')) {
        toast.error(e.message);
      } else {
        toast.error('Erro ao criar usuário: ' + (e?.message || 'Erro desconhecido'));
      }
    } finally {
      setSaving(false);
    }
  }

  // Remover atendente
  async function handleRemove(id: number, email: string) {
    setRemovingId(id);
    try {
      await atendentesService.removeAtendente(id, email);
      toast.success('Usuário removido!');
      setAtendentes(atendentes.filter(a => a.id !== id));
    } catch (e: any) {
      toast.error('Erro ao remover usuário: ' + (e?.message || ''));
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="w-full p-6">
      <Card className="p-4 mb-6">
        <div className="flex justify-between items-center mb-4">
          <span className="font-semibold text-lg">Atendentes cadastrados</span>
          <Button onClick={openModal} className="bg-primary-600 text-white">+ Novo Usuário</Button>
        </div>
        {loading ? (
          <div className="text-center text-gray-500">Carregando...</div>
        ) : atendentes.length === 0 ? (
          <div className="text-left text-gray-500 px-4 py-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <span className="font-medium text-gray-700">Nenhum usuário cadastrado</span>
            </div>
            <p className="text-sm text-gray-500 ml-11">
              Clique em "Novo Usuário" para adicionar o primeiro atendente ao sistema.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2 text-left">Nome</th>
                  <th className="p-2 text-left">E-mail</th>
                  <th className="p-2 text-left">Tipo</th>
                  <th className="p-2 text-left">Departamentos</th>
                  <th className="p-2 text-left">Criado em</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {atendentes.map(a => (
                  <tr key={a.id} className="border-b">
                    <td className="p-2">{a.nome}</td>
                    <td className="p-2">{a.email}</td>
                    <td className="p-2">{a.tipo_usuario}</td>
                    <td className="p-2">
                      {a.tipo_usuario === 'Atendente' ? (
                        (() => {
                          const depsIds = [
                            a.id_departamento,
                            a.id_departamento_2,
                            a.id_departamento_3
                          ].filter(id => id != null);
                          
                          if (depsIds.length === 0) {
                            return <span className="text-xs text-gray-400">Nenhum departamento</span>;
                          }
                          
                          const depsNomes = depsIds
                            .map(id => {
                              const dep = departamentos.find(d => d.id === id);
                              return dep ? dep.nome : `ID: ${id}`;
                            })
                            .filter(nome => nome);
                          
                          return (
                            <span className="text-xs text-gray-600">
                              {depsNomes.join(', ') || 'Departamentos não encontrados'}
                            </span>
                          );
                        })()
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="p-2">{new Date(a.created_at).toLocaleString('pt-BR')}</td>
                    <td className="p-2">
                      <Button variant="destructive" size="sm" onClick={() => handleRemove(a.id, a.email)} disabled={removingId === a.id}>
                        {removingId === a.id ? 'Removendo...' : 'Remover'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
      </div>
        )}
      </Card>
      {/* Modal de novo usuário */}
      <Dialog open={showModal} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Input placeholder="Nome" value={nome} onChange={e => setNome(e.target.value)} />
            <Input placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} type="email" onBlur={() => checkEmailInRealTime(email)} />
            {checkingEmail && (
              <p className="text-blue-500 text-sm">Verificando e-mail...</p>
            )}
            {emailError && (
              <p className="text-red-500 text-sm">{emailError}</p>
            )}
            <Input placeholder="Senha" value={senha} onChange={e => setSenha(e.target.value)} type="password" />
            
            {/* Tipo de Usuário */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de Usuário</label>
              <Select value={tipoUsuario} onValueChange={(value: 'Gestor' | 'Atendente') => setTipoUsuario(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Gestor">Gestor</SelectItem>
                  <SelectItem value="Atendente">Atendente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Seleção de Departamentos (apenas para Atendente) */}
            {tipoUsuario === 'Atendente' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Departamentos de Acesso (máximo 3)</label>
                {loadingDepartamentos ? (
                  <p className="text-sm text-gray-500">Carregando departamentos...</p>
                ) : departamentos.length === 0 ? (
                  <p className="text-sm text-red-500">Nenhum departamento disponível</p>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-2">
                    {departamentos.map((departamento) => (
                      <label key={departamento.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={departamentosSelecionados.includes(departamento.id.toString())}
                          disabled={!departamentosSelecionados.includes(departamento.id.toString()) && departamentosSelecionados.length >= 3}
                          onChange={(e) => {
                            if (e.target.checked) {
                              if (departamentosSelecionados.length < 3) {
                                setDepartamentosSelecionados([...departamentosSelecionados, departamento.id.toString()]);
                              } else {
                                toast.error('Você pode selecionar no máximo 3 departamentos');
                              }
                            } else {
                              setDepartamentosSelecionados(departamentosSelecionados.filter(id => id !== departamento.id.toString()));
                            }
                          }}
                          className="rounded"
                        />
                        <span className="text-sm">{departamento.nome}</span>
                      </label>
                    ))}
                  </div>
                )}
                {departamentosSelecionados.length > 0 && (
                  <p className="text-xs text-gray-500">
                    {departamentosSelecionados.length} de 3 departamento(s) selecionado(s)
                  </p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              onClick={handleAdd} 
              disabled={
                saving || 
                !nome || 
                !email || 
                !senha || 
                !!emailError || 
                (tipoUsuario === 'Atendente' && departamentosSelecionados.length === 0)
              } 
              className="bg-primary-600 text-white"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
            <Button variant="secondary" onClick={closeModal} disabled={saving}>Cancelar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
