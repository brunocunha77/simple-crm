import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { 
  Users, 
  Plus, 
  Search, 
  UserX, 
  Mail, 
  Phone,
  Calendar,
  Loader2,
  Shield
} from 'lucide-react';
import { toast } from 'sonner';
import { gestorService, GestorInfo, ClienteInfoWithGestores } from '@/services/gestorService';
import { useAuth } from '@/contexts/auth';

interface GestorManagerProps {
  clienteId: string;
  clienteNome?: string;
  onUpdate?: () => void;
}

export function GestorManager({ clienteId, clienteNome, onUpdate }: GestorManagerProps) {
  const { user } = useAuth();
  const [clienteInfo, setClienteInfo] = useState<ClienteInfoWithGestores | null>(null);
  const [usuariosDisponiveis, setUsuariosDisponiveis] = useState<GestorInfo[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingGestor, setIsAddingGestor] = useState(false);
  const [isRemovingGestor, setIsRemovingGestor] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Carregar informações do cliente e gestores
  useEffect(() => {
    carregarDados();
  }, [clienteId]);

  // Carregar usuários disponíveis quando abrir o dialog
  useEffect(() => {
    if (isDialogOpen) {
      carregarUsuariosDisponiveis();
    }
  }, [isDialogOpen, searchTerm]);

  const carregarDados = async () => {
    try {
      setIsLoading(true);
      const dados = await gestorService.buscarClienteComGestores(clienteId);
      setClienteInfo(dados);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar informações do cliente');
    } finally {
      setIsLoading(false);
    }
  };

  const carregarUsuariosDisponiveis = async () => {
    try {
      const usuarios = await gestorService.buscarUsuariosDisponiveis(clienteId, searchTerm);
      setUsuariosDisponiveis(usuarios);
    } catch (error) {
      console.error('Erro ao carregar usuários disponíveis:', error);
      toast.error('Erro ao carregar usuários disponíveis');
    }
  };

  const handleAdicionarGestor = async (gestorId: string) => {
    try {
      setIsAddingGestor(true);
      const sucesso = await gestorService.adicionarGestor(clienteId, gestorId);
      
      if (sucesso) {
        await carregarDados();
        await carregarUsuariosDisponiveis();
        onUpdate?.();
      }
    } catch (error) {
      console.error('Erro ao adicionar gestor:', error);
    } finally {
      setIsAddingGestor(false);
    }
  };

  const handleRemoverGestor = async (gestorId: string) => {
    try {
      setIsRemovingGestor(true);
      const sucesso = await gestorService.removerGestor(clienteId, gestorId);
      
      if (sucesso) {
        await carregarDados();
        onUpdate?.();
      }
    } catch (error) {
      console.error('Erro ao remover gestor:', error);
    } finally {
      setIsRemovingGestor(false);
    }
  };

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR');
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center h-32">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Carregando gestores...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Gestores do Cliente
          </h3>
          <p className="text-sm text-muted-foreground">
            {clienteNome && `Cliente: ${clienteNome}`}
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Gestor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>Adicionar Gestor</DialogTitle>
              <DialogDescription>
                Selecione um usuário para adicionar como gestor deste cliente.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Busca */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar por email ou nome..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Lista de usuários disponíveis */}
              <div className="max-h-60 overflow-y-auto space-y-2">
                {usuariosDisponiveis.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2" />
                    <p>Nenhum usuário disponível encontrado</p>
                  </div>
                ) : (
                  usuariosDisponiveis.map((usuario) => (
                    <div
                      key={usuario.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{usuario.email}</span>
                        </div>
                        {usuario.nome && (
                          <div className="flex items-center space-x-2 mt-1">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">{usuario.nome}</span>
                          </div>
                        )}
                        {usuario.telefone && (
                          <div className="flex items-center space-x-2 mt-1">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">{usuario.telefone}</span>
                          </div>
                        )}
                      </div>
                      
                      <Button
                        size="sm"
                        onClick={() => handleAdicionarGestor(usuario.id)}
                        disabled={isAddingGestor}
                      >
                        {isAddingGestor ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de gestores atuais */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Gestores Atuais ({clienteInfo?.gestores?.length || 0})
          </CardTitle>
          <CardDescription>
            Usuários com acesso completo às funcionalidades do cliente
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!clienteInfo?.gestores || clienteInfo.gestores.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-8 w-8 mx-auto mb-2" />
              <p>Nenhum gestor cadastrado</p>
              <p className="text-sm">Adicione gestores para dar acesso completo às funcionalidades</p>
            </div>
          ) : (
            <div className="space-y-3">
              {clienteInfo.gestores.map((gestor) => (
                <div
                  key={gestor.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <Badge variant="secondary" className="flex items-center">
                        <Shield className="h-3 w-3 mr-1" />
                        Gestor
                      </Badge>
                      {gestor.email === user?.email && (
                        <Badge variant="outline">Você</Badge>
                      )}
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{gestor.email}</span>
                      </div>
                      
                      {gestor.nome && (
                        <div className="flex items-center space-x-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">{gestor.nome}</span>
                        </div>
                      )}
                      
                      {gestor.telefone && (
                        <div className="flex items-center space-x-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">{gestor.telefone}</span>
                        </div>
                      )}
                      
                      {gestor.created_at && (
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            Cadastrado em: {formatarData(gestor.created_at)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={gestor.email === user?.email || isRemovingGestor}
                      >
                        <UserX className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover Gestor</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja remover <strong>{gestor.email}</strong> como gestor deste cliente?
                          <br />
                          <br />
                          Esta ação removerá o acesso completo às funcionalidades do cliente.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleRemoverGestor(gestor.id)}
                          disabled={isRemovingGestor}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          {isRemovingGestor ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <UserX className="h-4 w-4 mr-2" />
                          )}
                          Remover Gestor
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}




