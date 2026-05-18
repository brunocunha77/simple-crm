import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, AlertCircle, Zap } from "lucide-react";
import { toast } from "sonner";

interface WhatsAppConnectMetaProps {
  email?: string;
  id?: string;
}

declare global {
  interface Window {
    FB: {
      init: (params: object) => void;
      login: (
        callback: (response: { authResponse?: { code?: string } }) => void,
        params: object
      ) => void;
    };
    fbAsyncInit: () => void;
  }
}

export default function WhatsAppConnectMeta({ email }: WhatsAppConnectMetaProps) {
  const [status, setStatus] = useState<"idle" | "connecting" | "connected" | "error">("idle");
  const [sdkReady, setSdkReady] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [idCliente, setIdCliente] = useState<number | null>(null);

  useEffect(() => {
    if (!document.getElementById("facebook-jssdk")) {
      window.fbAsyncInit = function () {
        window.FB.init({
          appId: "767483022321276",
          autoLogAppEvents: true,
          xfbml: true,
          version: "v21.0",
        });
        setSdkReady(true);
      };

      const script = document.createElement("script");
      script.id = "facebook-jssdk";
      script.src = "https://connect.facebook.net/en_US/sdk.js";
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    } else {
      setSdkReady(true);
    }

    const checkConnection = async () => {
      if (!email) return;

      const { data: clienteData } = await supabase
        .from("clientes_info")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (!clienteData?.id) return;
      setIdCliente(clienteData.id);

      const { data: metaConn } = await supabase
        .from("meta_connections")
        .select("access_token, needs_reauth")
        .eq("id_cliente", clienteData.id)
        .maybeSingle();

      if (!metaConn?.access_token || metaConn.needs_reauth) return;

      const { data: waNumber } = await supabase
        .from("wa_numbers")
        .select("display_phone_number, phone_number_id")
        .eq("id_cliente", clienteData.id)
        .maybeSingle();

      if (waNumber?.display_phone_number) {
        setPhoneNumber(waNumber.display_phone_number);
        setStatus("connected");
      }
    };

    checkConnection();
  }, [email]);

  const handleConnect = () => {
    if (!sdkReady) return;

    setStatus("connecting");

    let waba_id: string | undefined;
    let phone_number_id: string | undefined;

    const messageListener = (event: MessageEvent) => {
      if (
        typeof event.data === "object" &&
        event.data?.type === "WA_EMBEDDED_SIGNUP" &&
        event.data?.event === "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING"
      ) {
        waba_id = event.data?.data?.waba_id;
        phone_number_id = event.data?.data?.phone_number_id;
      }
    };

    window.addEventListener("message", messageListener);

    window.FB.login(
      (response) => {
        window.removeEventListener("message", messageListener);

        if (!response.authResponse?.code) {
          setStatus("idle");
          return;
        }

        const code = response.authResponse.code;

        const waitForEmbeddedIds = (attempts: number) => {
          // Alguns fluxos retornam phone_number_id antes de waba_id; não bloquear auth por isso.
          if (waba_id || phone_number_id || attempts <= 0) {
            supabase.functions
              .invoke("meta-auth", {
                body: { code, waba_id, phone_number_id, id_cliente: idCliente },
              })
              .then(({ data, error }) => {
                // supabase.functions.invoke pode retornar data como string quando a Edge Function
                // não inclui Content-Type: application/json no header — tentamos fazer parse.
                let payload: { ok?: boolean; phone_number_id?: string; waba_id?: string } | null = null;

                if (data && typeof data === "object") {
                  payload = data;
                } else if (typeof data === "string") {
                  try {
                    payload = JSON.parse(data);
                  } catch {
                    payload = null;
                  }
                }

                // Log para debug: mostrar o que chegou de fato
                void 0;

                if (payload?.ok !== true) {
                  console.error("[meta-auth] falha na conexão:", { error, data, payload });
                  setStatus("error");
                  toast.error("Erro ao autenticar com a Meta");
                  return;
                }

                setStatus("connected");
                toast.success("WhatsApp conectado com sucesso!");

                if (idCliente) {
                  supabase
                    .from("wa_numbers")
                    .select("display_phone_number")
                    .eq("id_cliente", idCliente)
                    .maybeSingle()
                    .then(({ data: waNum }) => {
                      if (waNum?.display_phone_number) {
                        setPhoneNumber(waNum.display_phone_number);
                      }
                    });
                }
              });
          } else {
            setTimeout(() => waitForEmbeddedIds(attempts - 1), 200);
          }
        };

        waitForEmbeddedIds(10);
      },
      {
        config_id: "1160333859508239",
        response_type: "code",
        override_default_response_type: true,
        extras: {
          setup: {},
          featureType: "whatsapp_business_app_onboarding",
          sessionInfoVersion: 2,
        },
      }
    );
  };

  const handleDisconnect = async () => {
    if (!idCliente) return;
    await supabase
      .from("meta_connections")
      .update({ needs_reauth: true })
      .eq("id_cliente", idCliente);
    setStatus("idle");
    setPhoneNumber(null);
    toast.success("WhatsApp desconectado");
  };

  return (
    <div className="space-y-4">
      {status === "idle" && (
        <>
          <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
            <span className="text-sm text-amber-700">WhatsApp Oficial desconectado</span>
          </div>
          <Button
            className="bg-purple-600 hover:bg-purple-700 text-white gap-2"
            disabled={!sdkReady}
            onClick={handleConnect}
          >
            <Zap className="h-4 w-4" />
            {sdkReady ? "Conectar via Facebook" : "Carregando SDK..."}
          </Button>
        </>
      )}

      {status === "connecting" && (
        <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
          <Loader2 className="h-5 w-5 text-blue-500 animate-spin shrink-0" />
          <span className="text-sm text-blue-700">Conectando...</span>
        </div>
      )}

      {status === "connected" && (
        <>
          <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-3">
            <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
            <span className="text-sm text-green-700">
              WhatsApp Oficial conectado{phoneNumber ? `: ${phoneNumber}` : ""}
            </span>
          </div>
          <Button variant="outline" onClick={handleDisconnect}>
            Desconectar
          </Button>
        </>
      )}

      {status === "error" && (
        <>
          <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-3">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
            <span className="text-sm text-red-700">Erro na conexão</span>
          </div>
          <Button
            className="bg-purple-600 hover:bg-purple-700 text-white gap-2"
            disabled={!sdkReady}
            onClick={handleConnect}
          >
            <Zap className="h-4 w-4" />
            Tentar novamente
          </Button>
        </>
      )}
    </div>
  );
}
