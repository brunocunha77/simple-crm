import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/auth";
import { clientesService, ClienteInfo } from "@/services/clientesService";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Pencil, Save, X, KeyRound } from "lucide-react";

export default function Settings() {
  const { user } = useAuth();

  const [clientInfo, setClientInfo] = useState<ClienteInfo | null>(null);
  const [loadingClient, setLoadingClient] = useState(true);

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);

  useEffect(() => {
    const fetchClientInfo = async () => {
      if (!user?.id_cliente) {
        setClientInfo(null);
        setLoadingClient(false);
        return;
      }

      setLoadingClient(true);
      try {
        const info = await clientesService.getClienteByIdCliente(user.id_cliente);
        setClientInfo(info);
        setEditName(info?.name || "");
        setEditPhone(info?.phone || "");
      } catch (e) {
        console.error("Erro ao buscar clientes_info:", e);
        toast.error("Erro ao carregar dados do perfil");
      } finally {
        setLoadingClient(false);
      }
    };

    fetchClientInfo();
  }, [user?.id_cliente]);

  const currentPlanLabel = useMemo(() => {
    if (!clientInfo) return null;
    if (clientInfo.trial) return "Trial";
    if (clientInfo.plano_plus) return "Plus";
    if (clientInfo.plano_pro) return "Pro";
    if (clientInfo.plano_starter) return "Start";
    if (clientInfo.plano_agentes) return "Agentes";
    return "Premium";
  }, [clientInfo]);

  const handleStartEdit = () => {
    setEditName(clientInfo?.name || "");
    setEditPhone(clientInfo?.phone || "");
    setIsEditingProfile(true);
  };

  const handleCancelEdit = () => {
    setEditName(clientInfo?.name || "");
    setEditPhone(clientInfo?.phone || "");
    setIsEditingProfile(false);
  };

  const handleSaveProfile = async () => {
    if (!user?.id_cliente) return;

    setSavingProfile(true);
    try {
      const ok = await clientesService.updateClienteProfileByIdCliente(user.id_cliente, {
        name: editName.trim(),
        phone: editPhone.trim(),
      });

      if (!ok) {
        toast.error("Não foi possível salvar as alterações");
        return;
      }

      const refreshed = await clientesService.getClienteByIdCliente(user.id_cliente);
      setClientInfo(refreshed);
      setIsEditingProfile(false);
      toast.success("Perfil atualizado com sucesso");
    } catch (e) {
      console.error("Erro ao salvar perfil:", e);
      toast.error("Erro ao salvar perfil");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!user?.email) return;

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      toast.error("Preencha todos os campos de senha");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("A nova senha deve ter pelo menos 6 caracteres");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast.error("A confirmação da senha não confere");
      return;
    }

    setUpdatingPassword(true);
    try {
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (reauthError) {
        toast.error("Senha atual incorreta");
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) {
        console.error("Erro ao atualizar senha:", updateError);
        toast.error(updateError.message || "Erro ao atualizar senha");
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      toast.success("Senha atualizada com sucesso");
    } catch (e) {
      console.error("Erro inesperado ao atualizar senha:", e);
      toast.error("Erro ao atualizar senha");
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleOpenChargeSimples = async () => {
    if (!clientInfo?.charge_on) {
      window.open("https://app.chargesimples.com.br", "_blank");
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-sso-token`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session?.access_token}`,
          },
        }
      );

      const { url, error } = await response.json();
      if (error) throw new Error(error);

      window.open(url, "_blank");
    } catch (err) {
      toast.error("Erro ao acessar Charge Simples");
      window.open("https://app.chargesimples.com.br", "_blank");
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-2xl mx-auto space-y-6">
            <>
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <CardTitle className="text-lg">Meu Perfil</CardTitle>
                        </div>
                        {!loadingClient && (
                          <div className="flex items-center gap-2">
                            {currentPlanLabel && (
                              <Badge variant={clientInfo?.trial ? "secondary" : "default"}>
                                Plano: {currentPlanLabel}
                              </Badge>
                            )}
                            {canShowUpgrade && (
                              <Link to="/plans">
                                <Button size="sm" className="gap-2">
                                  Upgrade <ArrowRight className="h-4 w-4" />
                                </Button>
                              </Link>
                            )}
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {loadingClient ? (
                        <div className="text-sm text-gray-500">Carregando...</div>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="text-sm text-gray-500">Nome</div>
                              {!isEditingProfile ? (
                                <div className="text-base font-medium text-gray-900">
                                  {clientInfo?.name || `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "—"}
                                </div>
                              ) : (
                                <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                              )}
                            </div>
                            {!isEditingProfile ? (
                              <Button type="button" variant="outline" size="sm" className="gap-2" onClick={handleStartEdit}>
                                <Pencil className="h-4 w-4" />
                                Editar
                              </Button>
                            ) : (
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  className="gap-2"
                                  onClick={handleSaveProfile}
                                  disabled={savingProfile}
                                >
                                  <Save className="h-4 w-4" />
                                  {savingProfile ? "Salvando..." : "Salvar"}
                                </Button>
                                <Button type="button" variant="outline" size="sm" className="gap-2" onClick={handleCancelEdit} disabled={savingProfile}>
                                  <X className="h-4 w-4" />
                                  Cancelar
                                </Button>
                              </div>
                            )}
                          </div>

                          <div>
                            <div className="text-sm text-gray-500">E-mail</div>
                            <div className="text-base font-medium text-gray-900">{clientInfo?.email || user?.email || "—"}</div>
                            <div className="text-xs text-gray-500 mt-1">O e-mail não pode ser editado.</div>
                          </div>

                          <div>
                            <div className="text-sm text-gray-500">Telefone</div>
                            {!isEditingProfile ? (
                              <div className="text-base font-medium text-gray-900">{clientInfo?.phone || "—"}</div>
                            ) : (
                              <Input
                                value={editPhone}
                                onChange={(e) => setEditPhone(e.target.value)}
                                placeholder="(00) 00000-0000"
                              />
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">Redefinir senha</CardTitle>
                          <CardDescription>Informe sua senha atual e a nova senha</CardDescription>
                        </div>
                        <KeyRound className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <div className="text-sm text-gray-600">Senha atual</div>
                          <Input
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="••••••••"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="text-sm text-gray-600">Nova senha</div>
                          <Input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="••••••••"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="text-sm text-gray-600">Confirmar nova senha</div>
                          <Input
                            type="password"
                            value={confirmNewPassword}
                            onChange={(e) => setConfirmNewPassword(e.target.value)}
                            placeholder="••••••••"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <Button onClick={handleUpdatePassword} disabled={updatingPassword}>
                          {updatingPassword ? "Atualizando..." : "Atualizar senha"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
            </>
          </div>
        </div>
      </div>
    </>
  );
}
