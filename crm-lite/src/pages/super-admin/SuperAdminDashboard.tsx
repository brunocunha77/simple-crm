import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Search, 
  Users, 
  Building, 
  Shield, 
  LogOut, 
  Eye, 
  Settings, 
  UserCheck,
  UserX,
  Activity,
  Database,
  BarChart3,
  Loader2,
  Filter,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { superAdminService, Cliente, SuperAdminData } from "@/services/superAdminService";



export default function SuperAdminDashboard() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [filteredClientes, setFilteredClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [superAdminData, setSuperAdminData] = useState<SuperAdminData | null>(null);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [showImpersonateDialog, setShowImpersonateDialog] = useState(false);
  const [estatisticas, setEstatisticas] = useState({
    totalClientes: 0,
    clientesAtivos: 0,
    clientesSuspensos: 0,
    totalUsuarios: 0
  });
  const navigate = useNavigate();

  useEffect(() => {
    // Verificar se é super admin
    const isSuperAdmin = sessionStorage.getItem('isSuperAdmin');
    const superAdminDataStr = sessionStorage.getItem('superAdminData');
    
    if (!isSuperAdmin || !superAdminDataStr) {
      navigate('/super-admin-login');
      return;
    }

    try {
      const data = JSON.parse(superAdminDataStr);
      setSuperAdminData(data);
    } catch (error) {
      console.error('Erro ao parsear dados do super admin:', error);
      navigate('/super-admin-login');
      return;
    }

    fetchClientes();
  }, [navigate]);

  const fetchClientes = async () => {
    try {
      setLoading(true);
      
      // Buscar clientes e estatísticas em paralelo
      const [clientesData, estatisticasData] = await Promise.all([
        superAdminService.getClientes(),
        superAdminService.getEstatisticas()
      ]);
      
      setClientes(clientesData);
      setFilteredClientes(clientesData);
      setEstatisticas(estatisticasData);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const filtered = clientes.filter(cliente =>
      cliente.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (cliente.phone && cliente.phone.includes(searchTerm))
    );
    setFilteredClientes(filtered);
  }, [searchTerm, clientes]);

  // IMPERSONAÇÃO COMPLETAMENTE DESABILITADA
  const handleImpersonate = async (cliente: Cliente) => {
    // setSelectedCliente(cliente);
    // setShowImpersonateDialog(true);
    toast.info('Funcionalidade de impersonação desabilitada');
  };

  // IMPERSONAÇÃO COMPLETAMENTE DESABILITADA
  const confirmImpersonate = async () => {
    // if (!selectedCliente) return;

    // try {
    //   // Obter ID do usuário atual para escopar a chave
    //   const { data: { user } } = await supabase.auth.getUser();
    //   if (!user?.id) {
    //     toast.error('Usuário não autenticado');
    //     return;
    //   }

    //   // Armazenar dados do cliente para impersonação (escopado por usuário)
    //   const impersonationKey = `impersonatedCliente_${user.id}`;
    //   const impersonatingKey = `isImpersonating_${user.id}`;
      
    //   sessionStorage.setItem(impersonationKey, JSON.stringify(selectedCliente));
    //   sessionStorage.setItem(impersonatingKey, 'true');
      
    //   toast.success(`Acessando conta de ${selectedCliente.name}`);
      
    //   // Redirecionar para o dashboard principal
    //   navigate('/');
    // } catch (error) {
    //   console.error('Erro ao acessar conta:', error);
    //   toast.error('Erro ao acessar conta');
    // }
    toast.info('Funcionalidade de impersonação desabilitada');
  };

  // IMPERSONAÇÃO DESABILITADA - EXCLUSIVA PARA SUPER ADMIN
  const handleLogout = async () => {
    try {
      // Limpar dados de impersonação escopados por usuário
      // const { data: { user } } = await supabase.auth.getUser();
      // if (user?.id) {
      //   const impersonationKey = `impersonatedCliente_${user.id}`;
      //   const impersonatingKey = `isImpersonating_${user.id}`;
      //   sessionStorage.removeItem(impersonationKey);
      //   sessionStorage.removeItem(impersonatingKey);
      // }
      
      // Limpar dados do super admin
      sessionStorage.removeItem('isSuperAdmin');
      sessionStorage.removeItem('superAdminData');
      
      // Limpar chaves antigas (para compatibilidade)
      // sessionStorage.removeItem('impersonatedCliente');
      // sessionStorage.removeItem('isImpersonating');
      
      supabase.auth.signOut();
      navigate('/super-admin-login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      // Continuar com logout mesmo se der erro
      supabase.auth.signOut();
      navigate('/super-admin-login');
    }
  };

  const getStatusColor = (atendimentoHumano: boolean | null) => {
    if (atendimentoHumano === true) {
      return 'bg-green-100 text-green-800';
    } else if (atendimentoHumano === false) {
      return 'bg-yellow-100 text-yellow-800';
    } else {
      return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (atendimentoHumano: boolean | null) => {
    if (atendimentoHumano === true) {
      return 'Ativo';
    } else if (atendimentoHumano === false) {
      return 'Suspenso';
    } else {
      return 'N/A';
    }
  };

  const getInstanceColor = (instanceName: string) => {
    if (instanceName?.includes('premium')) {
      return 'bg-purple-100 text-purple-800';
    } else if (instanceName?.includes('pro')) {
      return 'bg-blue-100 text-blue-800';
    } else {
      return 'bg-green-100 text-green-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Shield className="w-8 h-8 text-purple-600" />
                <h1 className="text-2xl font-bold text-gray-900">Super Admin</h1>
              </div>
              <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                {superAdminData?.nome}
              </Badge>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={fetchClientes}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{estatisticas.totalClientes}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clientes Ativos</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{estatisticas.clientesAtivos}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clientes Suspensos</CardTitle>
              <UserX className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{estatisticas.clientesSuspensos}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{estatisticas.totalUsuarios}</div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Gerenciar Clientes</CardTitle>
            <CardDescription>
              Visualize e gerencie todas as contas de clientes do sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Buscar por nome, email ou telefone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Clients Table */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Clientes</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                <span className="ml-2">Carregando clientes...</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Instância</TableHead>
                      <TableHead>Criado em</TableHead>
                                             <TableHead>Ações (Impersonação Desabilitada)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClientes.map((cliente) => (
                      <TableRow key={cliente.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{cliente.name}</div>
                            <div className="text-sm text-gray-500">ID: {cliente.id}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="text-sm">{cliente.email}</div>
                            <div className="text-sm text-gray-500">{cliente.phone || 'N/A'}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(cliente.atendimento_humano)}>
                            {getStatusText(cliente.atendimento_humano)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getInstanceColor(cliente.instance_name)}>
                            {cliente.instance_name || 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {new Date(cliente.created_at).toLocaleDateString('pt-BR')}
                          </div>
                        </TableCell>
                                                 <TableCell>
                           <div className="flex items-center space-x-2">
                             {/* IMPERSONAÇÃO COMPLETAMENTE DESABILITADA */}
                             <Button
                               size="sm"
                               variant="outline"
                               disabled
                               onClick={() => handleImpersonate(cliente)}
                             >
                               <Eye className="w-4 h-4 mr-1" />
                               Acessar (Desabilitado)
                             </Button>
                           </div>
                         </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {filteredClientes.length === 0 && !loading && (
                  <div className="text-center py-8 text-gray-500">
                    Nenhum cliente encontrado
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

             {/* IMPERSONAÇÃO COMPLETAMENTE DESABILITADA */}
       {/* <Dialog open={showImpersonateDialog} onOpenChange={setShowImpersonateDialog}>
         <DialogContent>
           <DialogHeader>
             <DialogTitle>Acessar Conta do Cliente</DialogTitle>
             <DialogDescription>
               Você está prestes a acessar a conta de {selectedCliente?.name}. 
               Esta ação permitirá que você visualize e configure a conta como se fosse o próprio cliente.
             </DialogDescription>
           </DialogHeader>
           
           {selectedCliente && (
             <div className="space-y-4">
               <div className="bg-gray-50 p-4 rounded-lg">
                 <h4 className="font-medium mb-2">Detalhes do Cliente</h4>
                 <div className="space-y-2 text-sm">
                   <div><strong>Nome:</strong> {selectedCliente.name}</div>
                   <div><strong>Email:</strong> {selectedCliente.email}</div>
                   <div><strong>Telefone:</strong> {selectedCliente.phone || 'N/A'}</div>
                   <div><strong>Status:</strong> 
                     <Badge className={`ml-2 ${getStatusColor(selectedCliente.atendimento_humano)}`}>
                       {getStatusText(selectedCliente.atendimento_humano)}
                     </Badge>
                   </div>
                   <div><strong>Instância:</strong> 
                     <Badge className={`ml-2 ${getInstanceColor(selectedCliente.instance_name)}`}>
                       {selectedCliente.instance_name || 'N/A'}
                     </Badge>
                   </div>
                 </div>
               </div>
               
               <div className="flex justify-end space-x-2">
                 <Button
                   variant="outline"
                   onClick={() => setShowImpersonateDialog(false)}
                 >
                   Cancelar
                 </Button>
                 <Button
                   onClick={confirmImpersonate}
                   className="bg-purple-600 hover:bg-purple-700"
                 >
                   <Eye className="w-4 h-4 mr-2" />
                   Acessar Conta
                 </Button>
               </div>
             </div>
           )}
         </DialogContent>
       </Dialog> */}
    </div>
  );
} 