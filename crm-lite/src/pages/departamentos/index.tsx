import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus } from "lucide-react";
import { departamentosService, Departamento } from "@/services/departamentosService";
import { useAuth } from "@/contexts/auth";
import { DepartamentoModal } from "./DepartamentoModal";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Edit, Trash } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { clientesService, ClienteInfo } from "@/services/clientesService";
import { Star, StarOff } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link } from "react-router-dom";
import { chipsService, ChipInfo } from "@/services/chipsService";
import { supabase } from "@/lib/supabase";

export default function DepartamentosPage() {
  const { user } = useAuth();
  const [departamentos, setDepartamentos] = React.useState<Departamento[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [editData, setEditData] = React.useState<Departamento | null>(null);
  const [deletingId, setDeletingId] = React.useState<number | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [idDepartamentoPadrao, setIdDepartamentoPadrao] = React.useState<string | null>(null);
  const [settingPadrao, setSettingPadrao] = React.useState(false);
  const [clienteInfo, setClienteInfo] = React.useState<ClienteInfo | null>(null);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [chipsDisponiveis, setChipsDisponiveis] = React.useState<ChipInfo[]>([]);
  const [loadingChips, setLoadingChips] = React.useState(false);
  const [departamentosConfigurados, setDepartamentosConfigurados] = React.useState<Set<number>>(new Set());

  React.useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    clientesService.getClienteByIdCliente(user.id_cliente)
      .then((cliente) => {
        setClienteInfo(cliente);
        if (cliente?.id) {
                     return Promise.all([
             departamentosService.listar(cliente.id),
             chipsService.getChipsDisponiveis(cliente.id),
             chipsService.getDepartamentosAssociadosChips(cliente.id)
           ]).then(async ([deps, chips, associados]) => {
             // Se não há departamentos, verificar e criar o departamento padrão "Atendimento" se necessário
             if (deps.length === 0) {
               try {
                 // Verificar se já existe um departamento "Atendimento" no banco
                 const { data: deptExistente } = await supabase
                   .from('departamento')
                   .select('*')
                   .eq('id_cliente', cliente.id)
                   .eq('nome', 'Atendimento')
                   .maybeSingle();
                 
                 if (!deptExistente) {
                   // Só cria se realmente não existir
                   const novoDepartamento = await departamentosService.criar({
                     id_cliente: String(cliente.id),
                     nome: 'Atendimento',
                     descricao: ''
                   });
                   deps = [novoDepartamento];
                 } else {
                   // Se já existe, usar o existente
                   deps = [deptExistente];
                 }
               } catch (error) {
                 console.error('Erro ao criar departamento padrão:', error);
               }
             }
             
             // Atualizar departamentos com chips configurados em "Meus Chips"
             const departamentosAtualizados = deps.map(dep => {
               // Se o departamento está configurado em "Meus Chips", definir o chip correto
               if (associados.chip1 === dep.id) {
                 return { ...dep, instance_name_chip_associado: cliente.instance_name };
               }
               if (associados.chip2 === dep.id) {
                 return { ...dep, instance_name_chip_associado: cliente.instance_name_2 };
               }
               return dep;
             });
             
             setDepartamentos(departamentosAtualizados);
             setChipsDisponiveis(chips);
             setIdDepartamentoPadrao(cliente.id_departamento_padrao?.toString() ?? null);
             
             // Identificar departamentos configurados em "Meus Chips"
             const configurados = new Set<number>();
             if (associados.chip1) configurados.add(associados.chip1);
             if (associados.chip2) configurados.add(associados.chip2);
             setDepartamentosConfigurados(configurados);
           });
        } else {
          setDepartamentos([]);
          setChipsDisponiveis([]);
          setIdDepartamentoPadrao(null);
          setDepartamentosConfigurados(new Set());
        }
      })
      .finally(() => setLoading(false));
  }, [user?.id]);

  async function handleSaveDepartamento(data: Omit<Departamento, "id">) {
    setSaving(true);
    try {
      if (!clienteInfo?.id) throw new Error("Cliente não encontrado");
      const novo = await departamentosService.criar({ ...data, id_cliente: String(clienteInfo.id) });
      setDepartamentos((prev) => [...prev, novo]);
      setModalOpen(false);
      toast.success("Departamento criado com sucesso!");
    } catch (e: any) {
      toast.error(e.message || "Erro ao criar departamento");
    } finally {
      setSaving(false);
    }
  }

  async function handleEditDepartamento(data: Omit<Departamento, "id">) {
    if (!editData) return;
    setSaving(true);
    try {
      const atualizado = await departamentosService.editar(editData.id, { ...data, id_cliente: String(clienteInfo?.id ?? "") });
      setDepartamentos((prev) => prev.map(dep => dep.id === editData.id ? atualizado : dep));
      setEditData(null);
      toast.success("Departamento atualizado com sucesso!");
    } catch (e: any) {
      toast.error(e.message || "Erro ao atualizar departamento");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteDepartamento(id: number) {
    setDeleting(true);
    try {
      await departamentosService.excluir(id);
      setDepartamentos((prev) => prev.filter(dep => dep.id !== id));
      setDeletingId(null);
      toast.success("Departamento excluído com sucesso!");
    } catch (e: any) {
      toast.error(e.message || "Erro ao excluir departamento");
    } finally {
      setDeleting(false);
    }
  }

  async function handleSetPadrao(id: string) {
    if (!user?.id) return;
    setSettingPadrao(true);
    try {
      await clientesService.setDepartamentoPadrao(user.id, Number(id));
      setIdDepartamentoPadrao(id);
      toast.success("Departamento definido como padrão!");
    } catch (e: any) {
      toast.error(e.message || "Erro ao definir padrão");
    } finally {
      setSettingPadrao(false);
    }
  }

  async function handleRemoverPadrao() {
    if (!user?.id) return;
    setSettingPadrao(true);
    try {
      await clientesService.setDepartamentoPadrao(user.id, null);
      setIdDepartamentoPadrao(null);
      toast.success("Departamento padrão removido!");
    } catch (e: any) {
      toast.error(e.message || "Erro ao remover padrão");
    } finally {
      setSettingPadrao(false);
    }
  }

  async function handleChipChange(departamentoId: number, instanceName: string | null) {
    setLoadingChips(true);
    try {
      await departamentosService.editar(departamentoId, { 
        instance_name_chip_associado: instanceName 
      });
      
      // Atualizar o departamento na lista local
      setDepartamentos(prev => prev.map(dep => 
        dep.id === departamentoId 
          ? { ...dep, instance_name_chip_associado: instanceName }
          : dep
      ));
      
      toast.success("Chip associado atualizado!");
    } catch (e: any) {
      toast.error(e.message || "Erro ao atualizar chip");
    } finally {
      setLoadingChips(false);
    }
  }

  return (
    <>
      {/* Drawer/Menu lateral para mobile */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Fundo escuro para fechar o menu */}
          <div className="fixed inset-0 bg-black bg-opacity-30" onClick={() => setMenuOpen(false)} />
          {/* Menu lateral */}
          <div className="relative w-64 max-w-full h-full bg-white shadow-lg flex flex-col p-6 animate-slide-in-left">
            <button className="self-end mb-4 p-2 rounded hover:bg-gray-100" onClick={() => setMenuOpen(false)} aria-label="Fechar menu">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <nav className="flex flex-col gap-4">
              <Link to="/" className="text-lg font-medium text-gray-700 hover:text-primary-600" onClick={() => setMenuOpen(false)}>Dashboard</Link>

              <Link to="/conversations" className="text-lg font-medium text-gray-700 hover:text-primary-600" onClick={() => setMenuOpen(false)}>Atendimentos</Link>
              <Link to="/contatos" className="text-lg font-medium text-gray-700 hover:text-primary-600" onClick={() => setMenuOpen(false)}>Contatos</Link>
              <Link to="/chatbots" className="text-lg font-medium text-gray-700 hover:text-primary-600" onClick={() => setMenuOpen(false)}>Chatbots</Link>
              <Link to="/departamentos" className="text-lg font-medium text-gray-700 hover:text-primary-600" onClick={() => setMenuOpen(false)}>Departamentos</Link>
              <Link to="/followup" className="text-lg font-medium text-gray-700 hover:text-primary-600" onClick={() => setMenuOpen(false)}>Followup Automático</Link>
              <Link to="/settings" className="text-lg font-medium text-gray-700 hover:text-primary-600" onClick={() => setMenuOpen(false)}>Configurações</Link>
            </nav>
          </div>
        </div>
      )}
      {/* Topo com botão de menu (apenas mobile) */}
      <div className="flex items-center gap-2 p-4 border-b bg-white md:hidden sticky top-0 z-40">
        <button
          className="p-2 rounded hover:bg-gray-100"
          onClick={() => setMenuOpen(true)}
          aria-label="Abrir menu"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="ml-2 text-2xl font-semibold">Departamentos</span>
      </div>
             <div className="flex flex-col h-screen">
         <div className="flex-1 min-h-0 overflow-y-auto px-6 sm:px-8 lg:px-12">
           <Card className="w-full">
                         <CardHeader className="flex flex-row items-center justify-between pb-4">
               <div className="flex-1">
                 <p className="text-muted-foreground text-sm mt-1">
                   Crie departamentos para organizar o atendimento e transferir seus contatos para o atendente certo.
                 </p>
               </div>
               <Button className="ml-6" variant="default" size="lg" onClick={() => setModalOpen(true)}>
                 <Plus className="h-5 w-5 mr-2" />
                 Novo departamento
               </Button>
             </CardHeader>
                         <CardContent className="px-8">
               <Table>
                                 <TableHeader>
                   <TableRow>
                     <TableHead className="w-1/3">Nome</TableHead>
                     <TableHead className="w-1/3">Descrição</TableHead>
                     <TableHead className="w-1/4 text-center">Chip</TableHead>
                     <TableHead className="w-1/12 text-right">Ações</TableHead>
                   </TableRow>
                 </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4}>Carregando...</TableCell>
                    </TableRow>
                  ) : departamentos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4}>Nenhum departamento cadastrado.</TableCell>
                    </TableRow>
                  ) : (
                    departamentos.map((dep) => (
                      <TableRow key={dep.id}>
                        <TableCell>
                          {dep.nome}
                          {String(idDepartamentoPadrao) === dep.id.toString() && (
                            <span className="ml-2 inline-flex items-center text-yellow-500 font-semibold text-xs">
                              <Star className="h-4 w-4 mr-1" /> Padrão
                            </span>
                          )}
                        </TableCell>
                                                 <TableCell className="text-center">{dep.descricao}</TableCell>
                         <TableCell className="text-center">
                                                     {chipsDisponiveis.length > 0 ? (
                             <Select
                               value={dep.instance_name_chip_associado || "none"}
                               onValueChange={(value) => handleChipChange(dep.id, value === "none" ? null : value)}
                               disabled={loadingChips || departamentosConfigurados.has(dep.id)}
                             >
                               <SelectTrigger className={`w-32 mx-auto ${departamentosConfigurados.has(dep.id) ? 'bg-orange-50 border-orange-200' : ''}`}>
                                 <SelectValue />
                               </SelectTrigger>
                               <SelectContent>
                                 <SelectItem value="none">Nenhum</SelectItem>
                                 {chipsDisponiveis.map((chip) => (
                                   <SelectItem 
                                     key={chip.chipNumber} 
                                     value={chip.instanceName}
                                   >
                                     Chip {chip.chipNumber}
                                     {departamentosConfigurados.has(dep.id) && 
                                       dep.instance_name_chip_associado === chip.instanceName ? 
                                       " (Configurado)" : ""
                                     }
                                   </SelectItem>
                                 ))}
                               </SelectContent>
                             </Select>
                                                     ) : (
                             <span className="text-muted-foreground text-sm text-center block">
                               {dep.instance_name_chip_associado ? (
                                 <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                   Chip {chipsDisponiveis.find(c => c.instanceName === dep.instance_name_chip_associado)?.chipNumber || '?'}
                                   {departamentosConfigurados.has(dep.id) && (
                                     <span className="ml-1 text-xs text-orange-600">(Configurado)</span>
                                   )}
                                 </span>
                               ) : (
                                 departamentosConfigurados.has(dep.id) 
                                   ? "Configurado"
                                   : "Nenhum chip disponível"
                               )}
                             </span>
                           )}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setEditData({ ...dep, id_cliente: String(dep.id_cliente) })}>
                                <Edit className="h-4 w-4 mr-2" /> Editar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {String(idDepartamentoPadrao) === dep.id.toString() ? (
                                <DropdownMenuItem onClick={handleRemoverPadrao} disabled={settingPadrao}>
                                  <StarOff className="h-4 w-4 mr-2" /> Remover padrão
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => handleSetPadrao(dep.id.toString())} disabled={settingPadrao}>
                                  <Star className="h-4 w-4 mr-2 text-yellow-500" /> Tornar padrão
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setDeletingId(dep.id)} className="text-red-600">
                                <Trash className="h-4 w-4 mr-2" /> Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
            <DepartamentoModal
              open={modalOpen}
              onClose={() => setModalOpen(false)}
              onSave={handleSaveDepartamento}
              loading={saving}
              initialData={{ id_cliente: clienteInfo?.id || "" }}
              idCliente={clienteInfo?.id}
            />
            <DepartamentoModal
              open={!!editData}
              onClose={() => setEditData(null)}
              onSave={handleEditDepartamento}
              loading={saving}
              initialData={editData || {}}
              idCliente={clienteInfo?.id}
            />
            {deletingId !== null && (
              <Dialog open onOpenChange={() => setDeletingId(null)}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Excluir departamento</DialogTitle>
                  </DialogHeader>
                  <p>Tem certeza que deseja excluir este departamento? Todos os leads deste departamento ficarão sem departamento.</p>
                  <DialogFooter>
                    <Button variant="ghost" onClick={() => setDeletingId(null)} disabled={deleting}>Cancelar</Button>
                    <Button variant="destructive" onClick={() => handleDeleteDepartamento(deletingId!)} disabled={deleting}>
                      Excluir
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </Card>
        </div>
      </div>
    </>
  );
} 