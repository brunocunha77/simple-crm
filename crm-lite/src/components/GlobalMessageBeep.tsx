import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth";
import { clientesService } from "@/services/clientesService";

const GlobalMessageBeep: React.FC = () => {
  const { user } = useAuth();
  const [instanceIds, setInstanceIds] = useState<string[]>([]);

  // Buscar instance_ids do cliente logado
  useEffect(() => {
    let isMounted = true;

    const fetchInstanceIds = async () => {
      try {
        if (!user?.id_cliente) {
          if (isMounted) {
            setInstanceIds([]);
          }
          return;
        }

        const info = await clientesService.getClienteByIdCliente(user.id_cliente);
        if (!isMounted || !info) return;

        const ids = [info.instance_id, info.instance_id_2].filter(Boolean) as string[];
        setInstanceIds(ids);
      } catch {
        if (isMounted) {
          setInstanceIds([]);
        }
      }
    };

    fetchInstanceIds();

    return () => {
      isMounted = false;
    };
  }, [user?.id_cliente]);

  // Subscription global para novas mensagens recebidas (tipo === false)
  useEffect(() => {
    if (!instanceIds.length) return;

    let subscription: any = null;
    let removeMessagesSubscription: ((sub: any) => void) | null = null;

    import("@/services/messageService")
      .then(({ setupMessagesSubscription, removeMessagesSubscription: removeSub }) => {
        removeMessagesSubscription = removeSub;

        subscription = setupMessagesSubscription(
          instanceIds,
          (newMsg: any) => {
            try {
              // Apenas mensagens recebidas
              if (!newMsg || newMsg.tipo !== false) return;

              const audio = new Audio("/beep.mp3");
              audio.play().catch(() => {
                // Se o navegador bloquear, apenas ignoramos
              });
            } catch {
              // Nunca quebrar a aplicação por causa do beep
            }
          },
          (error: any) => {
            console.error("[GLOBAL BEEP] Erro na subscription de mensagens:", error);
          }
        );
      })
      .catch((error) => {
        console.error("[GLOBAL BEEP] Erro ao importar serviço de mensagens:", error);
      });

    return () => {
      if (subscription && removeMessagesSubscription) {
        removeMessagesSubscription(subscription);
      }
    };
  }, [instanceIds.join("|")]);

  // Componente não renderiza nada visualmente
  return null;
};

export default GlobalMessageBeep;

