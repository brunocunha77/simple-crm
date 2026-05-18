import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Smartphone, RefreshCw, CheckCircle, Building2, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { departamentosService, Departamento } from "@/services/departamentosService";
import { useAuth } from "@/contexts/auth";
import { useUserType } from "@/hooks/useUserType";

import {
  createUAZAPIInstance,
  connectUAZAPIInstanceAndGetQRCode,
  getUAZAPIInstanceStatus,
  configureUAZAPIWebhook,
  CreateInstanceParams
} from "@/services/uazapiService";

interface WhatsAppConnectUAZAPIProps {
  email?: string;
  id?: string;
  instanceName?: string;
  chipNumber?: 1 | 2;
}

export default function WhatsAppConnectUAZAPI({
  email: emailProp,
  id: userIdProp,
  instanceName,
  chipNumber: chipNumberProp,
}: WhatsAppConnectUAZAPIProps) {
  const { user } = useAuth();
  const { userType } = useUserType();
  const isGestor = userType === 'Gestor';

  const chipNum = chipNumberProp ?? 1;

  // Configuração dinâmica dos campos do banco baseada no número do chip.
  // Para o chip 2, instance_id_2 também armazena o token UAZAPI (padrão idêntico ao chip 1).
  // Evitamos campos opcionais como uazapi_token_2 / sender_number_2 que podem não existir ainda.
  const dbConfig = chipNum === 2
    ? {
        tokenField: 'instance_id_2',        // token = instance_id_2 (como chip1 usa instance_id)
        instanceIdField: 'instance_id_2',
        instanceNameField: 'instance_name_2',
        senderNumberField: null as string | null, // campo pode não existir; deixamos null
        deptField: 'id_departamento_chip_2',
        otherDeptField: 'id_departamento_chip_1',
        instancePrefix: 'smartcrm_2',
        chipLabel: 'Chip 2',
        selectFields: 'instance_id_2, instance_name_2, id_departamento_chip_2, id_departamento_chip_1, atendimento_ia, atendimento_humano, id_chatbot',
      }
    : {
        tokenField: 'instance_id',
        instanceIdField: 'instance_id',
        instanceNameField: 'instance_name',
        senderNumberField: 'sender_number' as string | null,
        deptField: 'id_departamento_chip_1',
        otherDeptField: 'id_departamento_chip_2',
        instancePrefix: 'smartcrm',
        chipLabel: 'Chip 1',
        selectFields: 'instance_id, instance_name, sender_number, id_departamento_chip_1, id_departamento_chip_2, atendimento_ia, atendimento_humano, id_chatbot',
      };

  const creatingRef = useRef<boolean>(false);

  const [status, setStatus] =
    useState<"idle" | "creating" | "qr" | "connected" | "error">("idle");

  const [qrCode, setQrCode] = useState<string | null>(null);
  const [instanceToken, setInstanceToken] = useState<string | null>(null);
  const [instanceNameCreated, setInstanceNameCreated] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(emailProp || null);
  const [senderNumber, setSenderNumber] = useState<string | null>(null);
  const [checkingStatus, setCheckingStatus] = useState<boolean>(false);

  // Estados para departamento deste chip e do outro (para desabilitar sobreposição)
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [loadingDepartamentos, setLoadingDepartamentos] = useState(false);
  const [thisChipDept, setThisChipDept] = useState<string | null>(null);
  const [thisChipDeptNome, setThisChipDeptNome] = useState<string | null>(null);
  const [otherChipDept, setOtherChipDept] = useState<string | null>(null);

  type FirstAttendance = "human" | "ai";
  const [firstAttendance, setFirstAttendance] = useState<FirstAttendance>("human");
  const [selectedChatbotId, setSelectedChatbotId] = useState<string | number | null>(null);
  const [availableChatbots, setAvailableChatbots] = useState<Array<{ id: string | number; nome: string; em_uso: boolean }>>([]);
  const [loadingChatbots, setLoadingChatbots] = useState<boolean>(false);

  /**
   * 🔐 Buscar email do Supabase se não foi passado como prop
   */
  useEffect(() => {
    const fetchUserEmail = async () => {
      if (emailProp) {
        setEmail(emailProp);
        return;
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          setEmail(user.email);
        } else {
          setStatus("error");
        }
      } catch (error) {
        console.error("❌ Erro ao buscar email do Supabase:", error);
        setStatus("error");
      }
    };

    fetchUserEmail();
  }, [emailProp]);

  // Buscar departamentos disponíveis
  const fetchDepartamentos = async () => {
    if (!user?.id_cliente) return;
    
    try {
      setLoadingDepartamentos(true);
      const departamentosData = await departamentosService.listar(user.id_cliente);
      
      const departamentosCriadosPeloUsuario = departamentosData.filter(dep => dep.nome !== 'Atendimento');
      
      let departamentosFiltrados: Departamento[] = [];
      
      if (departamentosCriadosPeloUsuario.length === 0) {
        const atendimento = departamentosData.find(dep => dep.nome === 'Atendimento');
        departamentosFiltrados = atendimento ? [atendimento] : [];
      } else {
        departamentosFiltrados = departamentosData;
      }
      
      const departamentosComAssociados = [...departamentosFiltrados];
      
      // Garantir que o departamento deste chip sempre apareça
      if (thisChipDept) {
        const dep = departamentosData.find(dep => dep.id.toString() === thisChipDept);
        if (dep && !departamentosComAssociados.find(d => d.id === dep.id)) {
          departamentosComAssociados.push(dep);
        }
      }
      
      setDepartamentos(departamentosComAssociados);
    } catch (error) {
      console.error('Erro ao buscar departamentos:', error);
      toast.error('Erro ao carregar departamentos');
    } finally {
      setLoadingDepartamentos(false);
    }
  };

  // Buscar nome do departamento pelo ID
  const fetchDepartamentoNome = async (departamentoId: string) => {
    if (!departamentoId) return null;
    
    try {
      const { data, error } = await supabase
        .from('departamento')
        .select('nome')
        .eq('id', departamentoId)
        .maybeSingle();
      
      if (error) return null;
      return data?.nome || null;
    } catch (error) {
      return null;
    }
  };

  const hasDepartamentos = departamentos.length > 0;

  const needsDepartamentoSelection = () => {
    if (!hasDepartamentos) return true;
    if (!instanceToken) return !thisChipDept;
    if (instanceToken && !thisChipDept) return true;
    return false;
  };

  const shouldShowDepartamentoSection = () => hasDepartamentos || !hasDepartamentos;

  // Função para selecionar departamento deste chip
  const handleSelectDepartamento = async (departamentoId: string) => {
    if (!departamentoId || departamentoId === '') return;
    if (!email) {
      toast.error('Email não disponível. Tente novamente.');
      return;
    }

    try {
      const updateData: any = {};
      updateData[dbConfig.deptField] = departamentoId;

      setThisChipDept(departamentoId);
      const nome = await fetchDepartamentoNome(departamentoId);
      setThisChipDeptNome(nome);

      const { error } = await supabase
        .from('clientes_info')
        .update(updateData)
        .eq('email', email);

      if (error) {
        console.error('Erro ao atualizar departamento do chip:', error);
        toast.error('Erro ao salvar departamento');
      } else {
        toast.success(`Departamento associado ao ${dbConfig.chipLabel}`);
      }
    } catch (error) {
      console.error('Erro ao selecionar departamento:', error);
      toast.error('Erro ao selecionar departamento');
    }
  };

  /**
   * 🔍 Verificar instância existente ao carregar o componente
   */
  useEffect(() => {
    const checkExistingInstance = async () => {
      if (!email) return;

      try {
        const { data: clientInfo, error: clientInfoError } = await supabase
          .from('clientes_info')
          .select(dbConfig.selectFields)
          .eq('email', email)
          .single();

        if (!clientInfoError && clientInfo) {
          const token = (clientInfo as any)[dbConfig.tokenField] || null;
          const instName = (clientInfo as any)[dbConfig.instanceNameField] || null;
          const senderNum = dbConfig.senderNumberField ? ((clientInfo as any)[dbConfig.senderNumberField] || null) : null;
          const thisDept = (clientInfo as any)[dbConfig.deptField] || null;
          const otherDept = (clientInfo as any)[dbConfig.otherDeptField] || null;

          if (instName) {
            if (token && token.length > 20) {
              setInstanceToken(token);
            } else {
              setInstanceToken(null);
            }
            setInstanceNameCreated(instName);
            setSenderNumber(senderNum);
            setThisChipDept(thisDept);
            setOtherChipDept(otherDept);

            if (thisDept) {
              const nome = await fetchDepartamentoNome(thisDept);
              setThisChipDeptNome(nome);
            }

            // Carregar configurações de atendimento (somente no chip 1 para não duplicar)
            if (chipNum === 1) {
              if (clientInfo.atendimento_ia === true) {
                setFirstAttendance("ai");
              } else {
                setFirstAttendance("human");
              }
              if (clientInfo.id_chatbot) {
                setSelectedChatbotId(String(clientInfo.id_chatbot));
              }
            }

            // Verificar status imediatamente
            if (token && token.length > 20) {
              try {
                setCheckingStatus(true);
                const statusResp = await getUAZAPIInstanceStatus(token);
                const instanceStatus = statusResp?.status;
                const isConnected =
                  instanceStatus === "connected" ||
                  statusResp?.connected === true ||
                  statusResp?.loggedIn === true;

                if (isConnected) {
                  setStatus("connected");
                  setQrCode(null);

                  const phoneNumber = (statusResp as any)?.instance?.phone ||
                    (statusResp as any)?.instance?.number ||
                    (statusResp as any)?.instance?.ownerJid?.split('@')[0] ||
                    null;

                  if (phoneNumber && email && dbConfig.senderNumberField) {
                    try {
                      const snUpdate: any = {};
                      snUpdate[dbConfig.senderNumberField] = phoneNumber;
                      await supabase
                        .from('clientes_info')
                        .update(snUpdate)
                        .eq('email', email);
                      setSenderNumber(phoneNumber);
                    } catch (dbError) {
                      console.error("Erro ao atualizar número:", dbError);
                    }
                  }
                } else {
                  const isDisconnected = instanceStatus === "disconnected";
                  if (isDisconnected) setStatus("idle");
                }
              } catch (statusError) {
                console.error("Erro ao verificar status inicial:", statusError);
                setStatus("idle");
              } finally {
                setCheckingStatus(false);
              }
            } else {
              setStatus("idle");
            }
          } else {
            setStatus("idle");
          }
        } else {
          setStatus("idle");
        }
      } catch (error) {
        console.error("❌ Erro ao verificar instância existente:", error);
        setStatus("idle");
      }
    };

    if (email) {
      checkExistingInstance();
    }
  }, [email, user?.id_cliente]);

  // Carregar departamentos quando mudar o chip associado
  useEffect(() => {
    if (user?.id_cliente) {
      fetchDepartamentos();
    }
  }, [user?.id_cliente, thisChipDept]);

  /**
   * 🔄 Verificar status da conexão
   */
  const checkConnectionStatus = useCallback(async () => {
    if (!instanceToken || instanceToken.length <= 20) return;

    try {
      setCheckingStatus(true);
      const statusResp = await getUAZAPIInstanceStatus(instanceToken);

      const instanceStatus = statusResp?.status || (statusResp as any)?.instance?.status;
      const isConnected =
        instanceStatus === "connected" ||
        statusResp?.connected === true ||
        statusResp?.loggedIn === true ||
        (statusResp as any)?.instance?.status === "connected";

      if (isConnected) {
        setStatus((prevStatus) => {
          const phoneNumber = (statusResp as any)?.instance?.phone ||
            (statusResp as any)?.instance?.number ||
            (statusResp as any)?.instance?.ownerJid?.split('@')[0] ||
            null;

          if (phoneNumber && email && dbConfig.senderNumberField) {
            const snUpdate: any = {};
            snUpdate[dbConfig.senderNumberField] = phoneNumber;
            supabase
              .from('clientes_info')
              .update(snUpdate)
              .eq('email', email)
              .then(() => {
                setSenderNumber(phoneNumber);
              });
          }

          setQrCode(null);
          return "connected";
        });
      } else {
        const isDisconnected = instanceStatus === "disconnected" || statusResp?.connected === false;
        if (isDisconnected) {
          setStatus((prevStatus) => {
            if (prevStatus === "connected") return "idle";
            return prevStatus;
          });
        }
      }
    } catch (err) {
      console.error("❌ Erro ao verificar status:", err);
    } finally {
      setCheckingStatus(false);
    }
  }, [instanceToken, email]);

  /**
   * 🔄 Polling contínuo de status
   */
  useEffect(() => {
    if (!instanceToken || !email) return;

    checkConnectionStatus();

    const STATUS_CHECK_INTERVAL = 30000;
    const statusInterval = setInterval(() => {
      checkConnectionStatus();
    }, STATUS_CHECK_INTERVAL);

    return () => clearInterval(statusInterval);
  }, [instanceToken, email, checkConnectionStatus]);

  /**
   * 📋 Buscar chatbots disponíveis
   */
  const fetchAvailableChatbots = async () => {
    if (loadingChatbots) return;

    setLoadingChatbots(true);
    try {
      const { data: chatbots, error } = await supabase
        .from('prompts_oficial')
        .select('id, nome, em_uso')
        .eq('status', true)
        .eq('id_usuario', user?.id);

      if (error) {
        console.error('Erro ao buscar chatbots:', error);
        toast.error('Erro ao buscar chatbots disponíveis');
        return;
      }

      if (chatbots && chatbots.length > 0) {
        const mappedChatbots = chatbots.map(chatbot => ({
          id: chatbot.id,
          nome: chatbot.nome || 'Sem nome',
          em_uso: chatbot.em_uso === true || chatbot.em_uso === 'true'
        }));

        setAvailableChatbots(mappedChatbots);

        const chatbotEmUso = mappedChatbots.find(chatbot => chatbot.em_uso);
        if (chatbotEmUso) setSelectedChatbotId(chatbotEmUso.id);
      } else {
        setAvailableChatbots([]);
      }
    } catch (error) {
      console.error('Erro ao buscar chatbots:', error);
      toast.error('Erro ao carregar lista de chatbots');
    } finally {
      setLoadingChatbots(false);
    }
  };

  useEffect(() => {
    if (firstAttendance === "ai" && status === "connected" && user?.id) {
      fetchAvailableChatbots();
    }
  }, [firstAttendance, status, user?.id]);

  /**
   * ✅ Atualizar chatbot como "em uso"
   */
  const updateChatbotAsInUse = async (chatbotId: string | number) => {
    try {
      toast.info('Ativando chatbot...');

      const { error: resetError } = await supabase
        .from('prompts_oficial')
        .update({ em_uso: false })
        .eq('id_usuario', user?.id);

      if (resetError) {
        toast.error('Erro ao preparar ativação do chatbot');
        return;
      }

      const { data, error } = await supabase
        .from('prompts_oficial')
        .update({ em_uso: true })
        .eq('id', chatbotId)
        .select('nome');

      if (error) {
        toast.error('Erro ao ativar chatbot');
        return;
      }

      const { error: clientError } = await supabase
        .from('clientes_info')
        .update({
          id_chatbot: chatbotId,
          atendimento_ia: true,
          atendimento_humano: false
        })
        .eq('email', email);

      if (clientError) {
        toast.error('Erro ao salvar preferências');
        return;
      }

      setFirstAttendance("ai");

      const botName = data?.[0]?.nome || 'Selecionado';
      toast.success(`Chatbot "${botName}" ativado com sucesso`);

      setAvailableChatbots(prev =>
        prev.map(bot => ({
          ...bot,
          em_uso: bot.id === chatbotId
        }))
      );
    } catch (err) {
      console.error('Erro inesperado ao ativar chatbot:', err);
      toast.error('Erro ao ativar chatbot');
    }
  };

  const handleChatbotChange = async (chatbotId: string | number) => {
    const isUUID = typeof chatbotId === 'string' && chatbotId.includes('-');
    const id = isUUID ? chatbotId : (typeof chatbotId === 'string' ? parseInt(chatbotId) : chatbotId);

    if ((isUUID && typeof id === 'string') || (!isUUID && !isNaN(id as number) && (id as number) > 0)) {
      setSelectedChatbotId(id);
      await updateChatbotAsInUse(id);
    } else {
      toast.error('ID de chatbot inválido');
    }
  };

  const handleFirstAttendanceChange = async (value: "human" | "ai") => {
    setFirstAttendance(value);

    if (value === "human") setSelectedChatbotId(null);

    const { error } = await supabase
      .from("clientes_info")
      .update({
        atendimento_humano: value === "human",
        atendimento_ia: value === "ai",
        id_chatbot: value === "human" ? null : selectedChatbotId,
      })
      .eq("email", email);

    if (error) {
      toast.error("Erro ao salvar preferência de atendimento");
    }
  };

  const initInstance = async () => {
    if (creatingRef.current) return;
    if (!email) return;

    if (needsDepartamentoSelection()) {
      toast.error("Selecione um departamento antes de conectar o WhatsApp");
      return;
    }

    creatingRef.current = true;
    setStatus("creating");

    try {
      // ── 1. Consulta instance_id (token) e instance_name no banco ──
      const { data: clientInfo } = await supabase
        .from("clientes_info")
        .select(`${dbConfig.instanceIdField}, ${dbConfig.instanceNameField}`)
        .eq("email", email)
        .single();

      let token: string | null = (clientInfo as any)?.[dbConfig.instanceIdField] || null;
      let instanceNameFinal: string | null = (clientInfo as any)?.[dbConfig.instanceNameField] || null;

      // ── 2. Decide: reutilizar ou criar ──
      if (token && instanceNameFinal) {
        // Instância já existe no banco — apenas reconecta
        void 0;
        setInstanceToken(token);
        setInstanceNameCreated(instanceNameFinal);
      } else {
        // Sem instância registrada — cria nova na UAZAPI
        void 0;

        const instance = await createUAZAPIInstance({
          email,
          id: userIdProp,
          instancePrefix: dbConfig.instancePrefix,
        });

        token = instance.token;
        instanceNameFinal = instance.instanceName;

        setInstanceToken(token);
        setInstanceNameCreated(instanceNameFinal);

        // Salva instance_id e instance_name no banco
        const saveData: any = {};
        saveData[dbConfig.instanceIdField] = token;
        saveData[dbConfig.instanceNameField] = instanceNameFinal;

        const { error: saveError } = await supabase
          .from("clientes_info")
          .update(saveData)
          .eq("email", email);

        if (saveError) {
          console.error("❌ Erro ao salvar instância no banco:", saveError);
        } else {
          void 0;
        }

        // Configura webhook na nova instância
        await configureUAZAPIWebhook(token).catch((e) =>
          console.error("❌ Erro ao configurar webhook:", e)
        );
      }

      // ── 3. Gera QR Code ──
      try {
        const connectResp = await connectUAZAPIInstanceAndGetQRCode(token!);
        setQrCode(connectResp?.qrcode || connectResp?.instance?.qrcode || null);
        setStatus("qr");
      } catch (qrError) {
        const is401 =
          qrError instanceof Error &&
          (qrError.message.includes("401") || qrError.message.includes("Invalid token"));

        if (is401 && instanceNameFinal) {
          // Token no banco está inválido — a instância foi removida da UAZAPI.
          // Limpa os campos e cria uma nova instância.
          void 0;

          // Limpa dados antigos do banco
          const clearData: any = {};
          clearData[dbConfig.instanceIdField] = null;
          clearData[dbConfig.instanceNameField] = null;
          await supabase.from("clientes_info").update(clearData).eq("email", email).catch(() => {});

          // Cria nova instância
          const newInstance = await createUAZAPIInstance({
            email,
            id: userIdProp,
            instancePrefix: dbConfig.instancePrefix,
          });

          const newToken = newInstance.token;
          const newName = newInstance.instanceName;

          setInstanceToken(newToken);
          setInstanceNameCreated(newName);

          // Salva nova instância no banco
          const newSaveData: any = {};
          newSaveData[dbConfig.instanceIdField] = newToken;
          newSaveData[dbConfig.instanceNameField] = newName;
          await supabase.from("clientes_info").update(newSaveData).eq("email", email).catch(() => {});

          // Configura webhook
          await configureUAZAPIWebhook(newToken).catch((e) =>
            console.error("❌ Erro ao configurar webhook (nova instância):", e)
          );

          // Gera QR com a nova instância
          const newConnectResp = await connectUAZAPIInstanceAndGetQRCode(newToken);
          setQrCode(newConnectResp?.qrcode || newConnectResp?.instance?.qrcode || null);
          setStatus("qr");
        } else {
          console.error("❌ Erro ao gerar QR Code:", qrError);
          setStatus("error");
        }
      }
    } catch (err) {
      console.error("❌ Erro ao inicializar instância:", err);
      setStatus("error");
    } finally {
      creatingRef.current = false;
    }
  };

  /**
   * 🟡 Polling de status real (durante QR)
   */
  useEffect(() => {
    if (!instanceToken) return;
    if (status !== "qr" && status !== "creating") return;

    const interval = setInterval(async () => {
      try {
        const statusResp = await getUAZAPIInstanceStatus(instanceToken);

        const instanceStatus = statusResp?.status;
        const isConnected =
          instanceStatus === "connected" ||
          statusResp?.connected === true ||
          statusResp?.loggedIn === true ||
          (statusResp as any)?.instance?.status === "connected";

        if (isConnected) {
          try {
            await configureUAZAPIWebhook(instanceToken);
          } catch (webhookError) {
            console.error("❌ Erro ao configurar webhook:", webhookError);
          }

          type UazapiStatusResp = {
            status?: string;
            connected?: boolean;
            loggedIn?: boolean;
            instance?: {
              phone?: string | number | null;
              number?: string | number | null;
              ownerJid?: string | null;
              status?: string;
              qrcode?: string | null;
            };
          };

          const statusResp2 = (await getUAZAPIInstanceStatus(instanceToken)) as UazapiStatusResp;

          const phoneNumberRaw =
            statusResp2?.instance?.phone ??
            statusResp2?.instance?.number ??
            statusResp2?.instance?.ownerJid?.split("@")?.[0] ??
            null;

          const phoneNumber = phoneNumberRaw != null ? String(phoneNumberRaw) : null;

          if (phoneNumber && email && dbConfig.senderNumberField) {
            try {
              const snUpdate: any = {};
              snUpdate[dbConfig.senderNumberField] = phoneNumber;
              await supabase
                .from("clientes_info")
                .update(snUpdate)
                .eq("email", email);
              setSenderNumber(phoneNumber);
            } catch (dbError) {
              console.error("❌ Erro ao atualizar número do telefone:", dbError);
            }
          }

          setStatus("connected");
          setQrCode(null);
          clearInterval(interval);
          setTimeout(() => checkConnectionStatus(), 1000);
          return;
        }
      } catch (err) {
        console.error("Erro ao verificar status:", err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [instanceToken, status]);

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Conectar WhatsApp — {dbConfig.chipLabel}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {status === "connected" ? (
              <div className="bg-green-50 border border-green-200 rounded-md p-4 flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-green-700 font-medium">WhatsApp conectado</p>
                  <p className="text-green-600 text-sm">{senderNumber ? `Número: ${senderNumber}` : 'Número conectado'}</p>
                </div>
                {!isGestor && (
                  <div className="ml-auto">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        if (!instanceToken) return;
                        try {
                          setStatus("creating");
                          const connectResp = await connectUAZAPIInstanceAndGetQRCode(instanceToken);
                          setQrCode(
                            connectResp?.qrcode ||
                            connectResp?.instance?.qrcode ||
                            null
                          );
                          setStatus("qr");
                        } catch (err) {
                          console.error("Erro ao gerar novo QR Code:", err);
                          setStatus("error");
                        }
                      }}
                      className="text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
                    >
                      Reconectar
                    </Button>
                  </div>
                )}
              </div>
            ) : status === "qr" || status === "creating" ? (
              <>
                {status === "creating" && (
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-4 flex items-center">
                    <div className="flex-1">
                      <p className="text-blue-700 font-medium">Conectando WhatsApp</p>
                      <p className="text-blue-600 text-sm">Escaneie o QR Code abaixo com seu celular</p>
                    </div>
                    <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />
                  </div>
                )}
                {qrCode && status === "qr" && (
                  <div className="flex justify-center py-4">
                    <div className="bg-white p-4 rounded-lg shadow">
                      <img
                        src={qrCode}
                        alt={`QR Code UAZAPI ${dbConfig.chipLabel}`}
                        className="w-[280px] h-[280px]"
                      />
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-md p-4 flex items-center">
                <AlertCircle className="h-5 w-5 text-amber-500 mr-3" />
                <div className="flex-1">
                  <p className="text-amber-700 font-medium">WhatsApp desconectado</p>
                  <p className="text-amber-600 text-sm">Conecte seu WhatsApp para começar</p>
                </div>
              </div>
            )}

            {/* Seção de departamento deste chip */}
            {shouldShowDepartamentoSection() && !isGestor && (
              <div className="pt-4 space-y-3">
                {!hasDepartamentos ? (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Building2 className="h-4 w-4 text-red-600" />
                      <p className="text-red-700 font-medium text-sm">Nenhum Departamento Encontrado</p>
                    </div>
                    <p className="text-red-600 text-xs mb-3">
                      É necessário criar pelo menos um departamento antes de conectar o WhatsApp.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open('/departamentos', '_blank')}
                      className="w-full"
                    >
                      Criar Departamento
                    </Button>
                  </div>
                ) : (
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Building2 className="h-4 w-4 text-blue-600" />
                      <p className="text-blue-700 font-medium text-sm">{dbConfig.chipLabel}</p>
                      {thisChipDept && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                          ✓ Departamento Ativo
                        </span>
                      )}
                    </div>
                    <p className="text-blue-600 text-xs mb-3">
                      {thisChipDept
                        ? `Departamento associado ao ${dbConfig.chipLabel}: ${thisChipDeptNome || `Departamento ${thisChipDept}`}`
                        : `Selecione um departamento para associar ao ${dbConfig.chipLabel}`
                      }
                    </p>
                    <Select
                      value={thisChipDept || ""}
                      onValueChange={(value) => {
                        if (value === "create") {
                          window.open('/departamentos', '_blank');
                        } else {
                          handleSelectDepartamento(value);
                        }
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue>
                          {thisChipDept
                            ? thisChipDeptNome || `Departamento ${thisChipDept}`
                            : "Selecione um departamento"
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {departamentos.map((departamento) => (
                          <SelectItem
                            key={departamento.id}
                            value={departamento.id.toString()}
                            disabled={otherChipDept === departamento.id.toString()}
                          >
                            {departamento.nome}
                            {otherChipDept === departamento.id.toString() && ` (Em uso no ${chipNum === 2 ? 'Chip 1' : 'Chip 2'})`}
                          </SelectItem>
                        ))}
                        <SelectItem value="create" className="text-blue-600 font-medium">
                          + Criar novo departamento
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            {/* Dropdown para seleção do primeiro atendimento (apenas Chip 1) */}
            {chipNum === 1 && status === "connected" && (
              <div className="pt-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Selecionar primeiro atendimento
                </label>
                <Select
                  value={firstAttendance}
                  onValueChange={handleFirstAttendanceChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione o tipo de primeiro atendimento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="human">Atendimento humano</SelectItem>
                    {/* <SelectItem value="ai">Atendimento por IA</SelectItem> */}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Seletor de chatbot (apenas Chip 1) */}
            {chipNum === 1 && status === "connected" && firstAttendance === "ai" && (
              <div className="pt-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Selecionar chatbot para atendimento
                </label>

                {loadingChatbots ? (
                  <div className="flex items-center space-x-2 py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Carregando chatbots...</span>
                  </div>
                ) : availableChatbots.length === 0 ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-md p-2 text-sm">
                    <p className="text-amber-700">Nenhum chatbot ativo disponível.</p>
                    <p className="text-amber-600">Ative algum chatbot na seção de Chatbots.</p>
                  </div>
                ) : (
                  <>
                    <Select
                      value={selectedChatbotId ? String(selectedChatbotId) : undefined}
                      onValueChange={handleChatbotChange}
                    >
                      <SelectTrigger className="w-full hover:border-green-500 focus:ring-green-500">
                        <SelectValue placeholder="Selecione um chatbot" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableChatbots.map((chatbot) => (
                          <SelectItem
                            key={String(chatbot.id)}
                            value={String(chatbot.id)}
                            className={chatbot.em_uso ? "font-bold text-green-600" : ""}
                          >
                            {chatbot.nome} {chatbot.em_uso && " ✓"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {availableChatbots.length === 1 && (
                      <div className="text-xs text-gray-500 mt-1">Apenas um chatbot disponível para seleção.</div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Botões de ação */}
            <div className="pt-4 flex justify-between">
              {!isGestor && ((status !== "connected" && !qrCode) || needsDepartamentoSelection()) && (
                <Button
                  variant="default"
                  onClick={initInstance}
                  disabled={status === "creating" || !email || needsDepartamentoSelection()}
                  className="w-full"
                >
                  {status === "creating" ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Carregando...
                    </>
                  ) : needsDepartamentoSelection() ? (
                    <>
                      <Building2 className="h-4 w-4 mr-2" />
                      {status === "connected" ? 'Selecione Departamento para Continuar' : 'Selecione um Departamento'}
                    </>
                  ) : (
                    <>
                      <Smartphone className="h-4 w-4 mr-2" />
                      Conectar WhatsApp
                    </>
                  )}
                </Button>
              )}

              {!isGestor && status !== "connected" && qrCode && (
                <Button
                  variant="outline"
                  onClick={async () => {
                    if (!instanceToken) return;
                    try {
                      setStatus("creating");
                      const connectResp = await connectUAZAPIInstanceAndGetQRCode(instanceToken);
                      setQrCode(
                        connectResp?.qrcode ||
                        connectResp?.instance?.qrcode ||
                        null
                      );
                      setStatus("qr");
                    } catch (err) {
                      console.error("Erro ao atualizar QR Code:", err);
                      setStatus("error");
                    }
                  }}
                  disabled={status === "creating"}
                  className="w-full"
                >
                  {status === "creating" ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Carregando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Novo QR Code
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
