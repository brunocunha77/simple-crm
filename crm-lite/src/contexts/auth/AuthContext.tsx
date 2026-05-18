import React, { createContext, useContext, useEffect, useState } from "react";
import { usePostHog } from "@posthog/react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { AuthContextType, User, UserData, emptyUserData } from "./types";
import { fetchUserData } from "./fetchUserData";
import { signInUser, signUpUser, connectWhatsAppForUser, signOutUser } from "./authActions";

// Create the AuthContext
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getFullName = (firstName?: string, lastName?: string) => {
  return [firstName, lastName].filter(Boolean).join(" ").trim();
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const posthog = usePostHog();

  // IMPERSONAÇÃO DESABILITADA - EXCLUSIVA PARA SUPER ADMIN
  // Função para escopar a chave de impersonação por usuário
  // const getImpersonationKey = (userId: string) => `impersonatedCliente_${userId}`;
  // const getImpersonatingKey = (userId: string) => `isImpersonating_${userId}`;
  
  // Função para limpar dados de impersonação
  // const clearImpersonation = (userId: string) => {
  //   const impersonationKey = getImpersonationKey(userId);
  //   const impersonatingKey = getImpersonatingKey(userId);
  //   sessionStorage.removeItem(impersonationKey);
  //   sessionStorage.removeItem(impersonatingKey);
  //   console.log('AuthContext: Impersonação limpa para usuário:', userId);
  // };

  // Verificar se está em modo de impersonação para o usuário atual
  // const getImpersonationStatus = (userId: string) => {
  //   if (!userId) return { isImpersonating: false, impersonatedCliente: null };
  //   
  //   try {
  //     const impersonationKey = getImpersonationKey(userId);
  //     const impersonatingKey = getImpersonatingKey(userId);
  //     const isImpersonating = sessionStorage.getItem(impersonatingKey) === 'true';
  //     const impersonatedClienteStr = sessionStorage.getItem(impersonationKey);
  //     
  //     if (!isImpersonating || !impersonatedClienteStr) {
  //       return { isImpersonating: false, impersonatedCliente: null };
  //     }
  //     
  //     const impersonatedCliente = JSON.parse(impersonatedClienteStr);
  //     return { isImpersonating, impersonatedCliente };
  //   } catch (error) {
  //     console.error('AuthContext: Erro ao verificar status de impersonação:', error);
  //     clearImpersonation(userId);
  //     return { isImpersonating: false, impersonatedCliente: null };
  //   }
  // };

  // Verifica se tem usuário salvo na sessão do Supabase ao carregar a página
  useEffect(() => {
    void 0;
    const initSession = async () => {
      setLoading(true);
      try {
        void 0;
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("AuthProvider: Erro ao recuperar sessão", error);
          setError("Erro ao recuperar sessão");
          return;
        }
        
        if (data.session?.user) {
          const { user: supabaseUser } = data.session;
          const userMetadata = supabaseUser.user_metadata || {};
          
          void 0;
          
          let id_cliente = userMetadata.id_cliente || userMetadata?.raw_user_meta_data?.id_cliente || null;
          
          // IMPERSONAÇÃO DESABILITADA - EXCLUSIVA PARA SUPER ADMIN
          // Verificar status de impersonação para este usuário
          // const impersonationStatus = getImpersonationStatus(supabaseUser.id);
          
          // Se está em modo de impersonação, usar o ID do cliente impersonado
          // if (impersonationStatus.isImpersonating && impersonationStatus.impersonatedCliente) {
          //   id_cliente = impersonationStatus.impersonatedCliente.id;
          //   console.log("AuthProvider: Modo impersonação ativo, usando id_cliente:", id_cliente);
          //   
          //   // Carregar dados completos do cliente impersonado
          //   try {
          //     const { data: clienteCompleto, error: clienteError } = await supabase
          //       .from('clientes_info')
          //       .select('*')
          //       .eq('id', impersonationStatus.impersonatedCliente.id)
          //       .single();
          //     
          //     if (clienteError) {
          //       console.error("AuthProvider: Erro ao buscar dados completos do cliente:", clienteError);
          //     } else if (clienteCompleto) {
          //       console.log("AuthProvider: Dados completos do cliente carregados:", clienteCompleto);
          //       
          //       // Atualizar o user_metadata com os dados do cliente impersonado
          //       await supabase.auth.updateUser({
          //         data: { 
          //           id_cliente: clienteCompleto.id,
          //           impersonated_client_data: clienteCompleto
          //         }
          //       });
          //     }
          //   } catch (error) {
          //     console.error("AuthProvider: Erro ao carregar dados do cliente impersonado:", error);
          //   }
          // } else {
            // Se não tem id_cliente, tentar buscar na tabela clientes_info
            if (!id_cliente && supabaseUser.email) {
              try {
                // Buscar todos os registros com este email e pegar o mais antigo (ID menor)
                const { data: clientesInfo } = await supabase
                  .from('clientes_info')
                  .select('id')
                  .eq('email', supabaseUser.email)
                  .order('id', { ascending: true })
                  .limit(1);
                
                if (clientesInfo && clientesInfo.length > 0) {
                  const clienteInfo = clientesInfo[0];
                  // Atualizar o user_metadata com o id_cliente correto
                  await supabase.auth.updateUser({
                    data: { id_cliente: clienteInfo.id }
                  });
                  id_cliente = clienteInfo.id;
                  void 0;
                }
              } catch (error) {
                void 0;
              }
            }
          // }
          
          const userProfile: User = {
            id: supabaseUser.id,
            email: supabaseUser.email || '',
            firstName: userMetadata.first_name || '',
            lastName: userMetadata.last_name || '',
            hasConnectedWhatsApp: userMetadata.has_connected_whatsapp || false,
            id_cliente: id_cliente, // Multi-tenant
          };
          
          setUser(userProfile);
          
          // Se tiver WhatsApp conectado, carregar os dados
          if (userMetadata.has_connected_whatsapp) {
            try {
              const userData = await fetchUserData(supabaseUser.id);
              setUserData(userData);
            } catch (fetchError) {
              console.error("Erro ao buscar dados do usuário:", fetchError);
            }
          }
        } else {
          void 0;
          setUser(null);
          setUserData(null);
        }
      } catch (error) {
        console.error("AuthProvider: Erro ao inicializar sessão", error);
        setError("Erro ao inicializar sessão");
      } finally {
        setLoading(false);
      }
    };
    
    // Configurar listener para mudanças de autenticação
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      void 0;
      
      if (event === 'SIGNED_IN' && session?.user) {
        const { user: supabaseUser } = session;
        const userMetadata = supabaseUser.user_metadata || {};
        
        let id_cliente = userMetadata.id_cliente || userMetadata?.raw_user_meta_data?.id_cliente || null;
        
        // IMPERSONAÇÃO DESABILITADA - EXCLUSIVA PARA SUPER ADMIN
        // Verificar status de impersonação para este usuário
        // const impersonationStatus = getImpersonationStatus(supabaseUser.id);
        
        // Se está em modo de impersonação, usar o ID do cliente impersonado
        // if (impersonationStatus.isImpersonating && impersonationStatus.impersonatedCliente) {
        //   id_cliente = impersonationStatus.impersonatedCliente.id;
        //   console.log("AuthProvider: Modo impersonação ativo, usando id_cliente:", id_cliente);
        //   
        //   // Carregar dados completos do cliente impersonado
        //   try {
        //     const { data: clienteCompleto, error: clienteError } = await supabase
        //       .from('clientes_info')
        //       .select('*')
        //       .eq('id', impersonationStatus.impersonatedCliente.id)
        //       .single();
        //     
        //     if (clienteError) {
        //       console.error("AuthProvider: Erro ao buscar dados completos do cliente:", clienteError);
        //     } else if (clienteCompleto) {
        //       console.log("AuthProvider: Dados completos do cliente carregados:", clienteCompleto);
        //       
        //       // Atualizar o user_metadata com os dados do cliente impersonado
        //       await supabase.auth.updateUser({
        //         data: { 
        //           id_cliente: clienteCompleto.id,
        //           impersonated_client_data: clienteCompleto
        //         }
        //       });
        //     }
        //   } catch (error) {
        //     console.error("AuthProvider: Erro ao carregar dados do cliente impersonado:", error);
        //   }
        // }
        
        // Se não tem id_cliente, tentar buscar na tabela clientes_info
        if (!id_cliente && supabaseUser.email) {
          try {
            // Buscar todos os registros com este email e pegar o mais antigo (ID menor)
            const { data: clientesInfo } = await supabase
              .from('clientes_info')
              .select('id')
              .eq('email', supabaseUser.email)
              .order('id', { ascending: true })
              .limit(1);
            
            if (clientesInfo && clientesInfo.length > 0) {
              const clienteInfo = clientesInfo[0];
              // Atualizar o user_metadata com o id_cliente correto
              await supabase.auth.updateUser({
                data: { id_cliente: clienteInfo.id }
              });
              id_cliente = clienteInfo.id;
              void 0;
            }
          } catch (error) {
            void 0;
          }
        }
        
        const userProfile: User = {
          id: supabaseUser.id,
          email: supabaseUser.email || '',
          firstName: userMetadata.first_name || '',
          lastName: userMetadata.last_name || '',
          hasConnectedWhatsApp: userMetadata.has_connected_whatsapp || false,
          id_cliente: id_cliente,
        };
        
        setUser(userProfile);
        
        if (userMetadata.has_connected_whatsapp) {
          try {
            const userData = await fetchUserData(supabaseUser.id);
            setUserData(userData);
          } catch (fetchError) {
            console.error("Erro ao buscar dados do usuário:", fetchError);
          }
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setUserData(null);
        // Limpar dados de impersonação ao fazer logout
        if (session?.user?.id) {
          // clearImpersonation(session.user.id); // IMPERSONAÇÃO DESABILITADA - EXCLUSIVA PARA SUPER ADMIN
        }
      }
    });

    initSession();

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []); // Removed isImpersonating and impersonatedClienteStr from dependency array

  useEffect(() => {
    if (!posthog) {
      return;
    }

    if (user) {
      let cancelled = false;
      const baseName = getFullName(user.firstName, user.lastName);

      posthog.identify(user.id, {
        name: baseName || user.email,
        $name: baseName || user.email,
        email: user.email,
        $email: user.email,
        first_name: user.firstName,
        last_name: user.lastName,
        id_cliente: user.id_cliente,
        has_connected_whatsapp: user.hasConnectedWhatsApp,
      });

      const enrichPostHogProfile = async () => {
        if (!user.id_cliente) {
          return;
        }

        const [{ data: clienteData }, { data: atendenteData }] = await Promise.all([
          supabase
            .from("clientes_info")
            .select("id, name, email, phone, plano_starter, plano_pro, plano_plus, plano_agentes, plano_crm, trial")
            .eq("id", user.id_cliente)
            .maybeSingle(),
          supabase
            .from("atendentes")
            .select("nome, tipo_usuario")
            .eq("email", user.email)
            .eq("id_cliente", user.id_cliente)
            .maybeSingle(),
        ]);

        if (cancelled) {
          return;
        }

        const userName = atendenteData?.nome || clienteData?.name || baseName || user.email;
        const userType = atendenteData?.tipo_usuario || (clienteData?.email === user.email ? "Admin" : "Gestor");
        const clientName = clienteData?.name || clienteData?.email || `Cliente ${user.id_cliente}`;

        posthog.identify(user.id, {
          name: userName,
          $name: userName,
          email: user.email,
          $email: user.email,
          id_cliente: user.id_cliente,
          client_name: clientName,
          client_email: clienteData?.email,
          client_phone: clienteData?.phone,
          user_type: userType,
          plano_starter: clienteData?.plano_starter || false,
          plano_pro: clienteData?.plano_pro || false,
          plano_plus: clienteData?.plano_plus || false,
          plano_agentes: clienteData?.plano_agentes || false,
          plano_crm: clienteData?.plano_crm || false,
          trial: clienteData?.trial || false,
          has_connected_whatsapp: user.hasConnectedWhatsApp,
        });

        posthog.group("cliente", String(user.id_cliente), {
          name: clientName,
          email: clienteData?.email,
          phone: clienteData?.phone,
          plano_starter: clienteData?.plano_starter || false,
          plano_pro: clienteData?.plano_pro || false,
          plano_plus: clienteData?.plano_plus || false,
          plano_agentes: clienteData?.plano_agentes || false,
          plano_crm: clienteData?.plano_crm || false,
          trial: clienteData?.trial || false,
        });
      };

      enrichPostHogProfile().catch((error) => {
        console.error("Erro ao enriquecer perfil no PostHog:", error);
      });

      return () => {
        cancelled = true;
      };
    }

    if (!loading) {
      posthog.reset();
    }
  }, [posthog, user, loading]);

  // Wrapper functions for auth actions que usam o estado do componente
  const signIn = async (email: string, password: string) => {
    return signInUser(email, password, () => navigate("/"), setLoading, setError);
  };

  const signUp = async (email: string, password: string, firstName: string, lastName: string, phone: string) => {
    return signUpUser(email, password, firstName, lastName, phone, () => navigate("/login"), setLoading, setError);
  };

  const connectWhatsApp = async () => {
    return connectWhatsAppForUser(user, setUser, setLoading, setUserData, setError);
  };

  const signOut = async () => {
    // Limpar dados de impersonação antes do logout
    if (user?.id) {
      // clearImpersonation(user.id); // IMPERSONAÇÃO DESABILITADA - EXCLUSIVA PARA SUPER ADMIN
    }
    return signOutUser(setUser, setUserData, setError, () => navigate("/login"));
  };

  // Use value object to prevent unnecessary renders
  const contextValue = {
    user,
    userData,
    loading,
    signIn,
    signUp,
    signOut,
    connectWhatsApp,
    isAuthenticated: !!user,
    hasConnectedWhatsApp: user?.hasConnectedWhatsApp || false,
    error,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
}
