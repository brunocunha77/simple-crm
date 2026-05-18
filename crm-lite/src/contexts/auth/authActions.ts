import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { User } from "./types";
import { fetchUserData } from "./fetchUserData";

// Função para verificar se o e-mail já existe nas tabelas clientes_info e atendentes
async function checkEmailExists(email: string): Promise<{ exists: boolean; table: string | null }> {
  try {
    // Verificar na tabela clientes_info
    const { data: clienteData } = await supabase
      .from('clientes_info')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (clienteData) {
      return { exists: true, table: 'clientes_info' };
    }

    // Verificar na tabela atendentes
    const { data: atendenteData } = await supabase
      .from('atendentes')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (atendenteData) {
      return { exists: true, table: 'atendentes' };
    }

    return { exists: false, table: null };
  } catch (error) {
    // Se não encontrou em nenhuma tabela, o e-mail está disponível
    return { exists: false, table: null };
  }
}

/** Cria o departamento padrão "Atendimento" para um novo cliente (conta nova). */
async function criarDepartamentoPadraoParaNovoCliente(clienteId: number): Promise<number | null> {
  try {
    // Verificar se já existe um departamento "Atendimento" para este cliente
    const { data: existingDept, error: checkError } = await supabase
      .from('departamento')
      .select('id')
      .eq('id_cliente', clienteId)
      .eq('nome', 'Atendimento')
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Erro ao verificar departamento existente:', checkError);
    }

    // Se já existe, retornar o ID existente
    if (existingDept?.id) {
      return existingDept.id;
    }

    // Criar o departamento padrão "Atendimento"
    const { data: departamento, error: deptError } = await supabase
      .from('departamento')
      .insert({
        id_cliente: clienteId,
        nome: 'Atendimento',
        descricao: ''
      })
      .select('id')
      .single();

    if (deptError || !departamento?.id) {
      console.error('Erro ao criar departamento padrão:', deptError);
      return null;
    }

    return departamento.id;
  } catch (e) {
    console.error('Erro ao criar departamento padrão para novo cliente:', e);
    return null;
  }
}

/** Cria o funil padrão "Funil de Vendas" com etapas para um novo cliente (conta nova). */
async function criarFunilPadraoParaNovoCliente(clienteId: number): Promise<number | null> {
  try {
    const { data: funil, error: funilError } = await supabase
      .from('funis')
      .insert({
        id_cliente: clienteId,
        nome: 'Funil de Vendas',
        funil_padrao: true
      })
      .select('id')
      .single();

    if (funilError || !funil?.id) {
      console.error('Erro ao criar funil padrão:', funilError);
      return null;
    }

    const etapas = [
      { nome: 'Contato Inicial', etapa_de_ganho: false },
      { nome: 'Não Respondeu', etapa_de_ganho: false },
      { nome: 'Reunião Agendada', etapa_de_ganho: false },
      { nome: 'Oportunidade', etapa_de_ganho: false },
      { nome: 'Venda Realizada', etapa_de_ganho: true }
    ];

    const etapasData = etapas.map((e, i) => ({
      id_funil: funil.id,
      id_cliente: clienteId,
      nome: e.nome,
      etapa_de_ganho: e.etapa_de_ganho,
      ordem: i + 1
    }));

    const { error: etapasError } = await supabase
      .from('funis_etapas')
      .insert(etapasData);

    if (etapasError) {
      console.error('Erro ao criar etapas do funil padrão:', etapasError);
      return null;
    }

    const { error: updateError } = await supabase
      .from('clientes_info')
      .update({ id_funil_padrao: funil.id })
      .eq('id', clienteId);

    if (updateError) {
      console.error('Erro ao definir funil padrão em clientes_info:', updateError);
      return funil.id;
    }

    return funil.id;
  } catch (e) {
    console.error('Erro ao criar funil padrão para novo cliente:', e);
    return null;
  }
}

// Function to sign in a user
export async function signInUser(
  email: string, 
  password: string,
  onSuccess: () => void,
  setLoading: (loading: boolean) => void,
  setError: (error: string | null) => void
): Promise<void> {
  try {
    setLoading(true);
    setError(null);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      console.error("Erro no login:", error);
      let errorMessage = "Erro ao realizar login";
      
      // Tratar mensagens de erro específicas
      if (error.message.includes("Invalid login credentials")) {
        errorMessage = "Credenciais inválidas. Verifique seu email e senha.";
      } else if (error.message.includes("Email not confirmed")) {
        errorMessage = "Email não confirmado. Verifique sua caixa de entrada.";
      }
      
      setError(errorMessage);
      throw error;
    }
    
    if (data.user) {
      void 0;
      toast.success("Login realizado com sucesso!");
      onSuccess();
    }
  } catch (error: any) {
    console.error("Erro no login:", error);
    setError(error.message || "Erro ao realizar login");
    throw error;
  } finally {
    setLoading(false);
  }
}

// Function to sign up a new user
export async function signUpUser(
  email: string, 
  password: string, 
  firstName: string, 
  lastName: string,
  phone: string,
  onSuccess: () => void,
  setLoading: (loading: boolean) => void,
  setError: (error: string | null) => void
): Promise<void> {
  void 0;
  try {
    setLoading(true);
    setError(null);
    
    // Verificar se o e-mail já existe nas tabelas clientes_info e atendentes
    void 0;
    const emailCheck = await checkEmailExists(email);
    
    if (emailCheck.exists) {
      const tableName = emailCheck.table === 'clientes_info' ? 'cliente' : 'atendente';
      const errorMessage = `Este e-mail já está vinculado a uma conta de ${tableName}.`;
      console.error("E-mail já existe:", emailCheck);
      setError(errorMessage);
      throw new Error(errorMessage);
    }
    
    // Simplificar o processo de signup sem redirecionar para evitar problemas
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          has_connected_whatsapp: false
        }
      }
    });
    
    void 0;
    
    if (error) {
      console.error("Erro no cadastro:", error);
      let errorMessage = "Erro ao realizar cadastro";
      
      if (error.message.includes("User already registered")) {
        errorMessage = "Este email já está cadastrado.";
      } else if (error.message.includes("Password should be")) {
        errorMessage = "A senha deve ter pelo menos 6 caracteres.";
      } else if (error.message.includes("Database error")) {
        errorMessage = "Erro de conexão com o banco de dados. Tente novamente mais tarde.";
      } else if (error.message.includes("Failed to fetch") || error.message.includes("network")) {
        errorMessage = "Erro de conexão. Verifique sua internet e tente novamente.";
      }
      
      setError(errorMessage);
      throw error;
    }
    
    if (data && data.user) {
      void 0;
      
      // Criar registro na tabela clientes_info
      void 0;
      
      const userData = {
        user_id_auth: data.user.id,
        email: data.user.email,
        name: `${firstName} ${lastName}`.trim(),
        phone: phone,
        created_at: new Date().toISOString(),
        trial: true
      };
      
      // Primeiro, inserir o registro na tabela clientes_info
      const { data: clienteData, error: clientesError } = await supabase
        .from('clientes_info')
        .upsert(userData, {
          onConflict: 'email'
        })
        .select()
        .single();

      if (clientesError) {
        console.error("Erro ao criar registro em clientes_info:", clientesError);
        // Tentar novamente com insert simples
        try {
          void 0;
          const { data: insertData, error: insertError } = await supabase
            .from('clientes_info')
            .insert(userData)
            .select()
            .single();
            
          if (insertError) {
            console.error("Falha na segunda tentativa de criar registro:", insertError);
          } else {
            void 0;
            if (insertData?.id) {
              await criarFunilPadraoParaNovoCliente(insertData.id);
              await criarDepartamentoPadraoParaNovoCliente(insertData.id);
              await supabase.auth.updateUser({
                data: { id_cliente: insertData.id }
              });
              void 0;
            }
          }
        } catch (retryError) {
          console.error("Erro na segunda tentativa:", retryError);
        }
      } else {
        void 0;
        if (clienteData?.id) {
          await criarFunilPadraoParaNovoCliente(clienteData.id);
          await criarDepartamentoPadraoParaNovoCliente(clienteData.id);
          await supabase.auth.updateUser({
            data: { id_cliente: clienteData.id }
          });
          void 0;
        }
      }

      toast.success("Cadastro realizado com sucesso! Verifique seu email para confirmar sua conta.");
      
      // Give user time to see the success message before redirecting
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } else {
      // Supabase retorna user=null quando o email já existe mas não foi confirmado
      const msg = "Este email já foi cadastrado. Verifique sua caixa de entrada para confirmar sua conta.";
      setError(msg);
      throw new Error(msg);
    }
  } catch (error: any) {
    console.error("Erro no cadastro:", error);
    // Tratamento específico para erros de conexão
    if (error.message?.includes("Failed to fetch") || 
        error.name === "AuthRetryableFetchError" || 
        error.message?.includes("NetworkError")) {
      setError("Falha na conexão com o servidor. Verifique sua internet e tente novamente.");
    } else {
      setError(error.message || "Erro ao realizar cadastro");
    }
    throw error;
  } finally {
    setLoading(false);
  }
}

// Function to connect WhatsApp
export async function connectWhatsAppForUser(
  user: User | null,
  setUser: (user: User | null) => void,
  setLoading: (loading: boolean) => void,
  setUserData: (userData: any) => void,
  setError: (error: string | null) => void
): Promise<void> {
  try {
    setLoading(true);
    setError(null);
    
    if (user) {
      // Atualizar metadados do usuário em vez de usar uma tabela separada
      const { error } = await supabase.auth.updateUser({
        data: { has_connected_whatsapp: true }
      });
      
      if (error) {
        setError("Erro ao conectar WhatsApp");
        toast.error("Ocorreu um erro inesperado. Tente novamente mais tarde.");
        throw error;
      }
      
      const updatedUser = {
        ...user,
        hasConnectedWhatsApp: true
      };
      
      setUser(updatedUser);
      
      // Buscar dados do usuário após conectar WhatsApp
      const userData = await fetchUserData(updatedUser.id);
      setUserData(userData);
      
      toast.success("WhatsApp conectado com sucesso!");
    }
  } catch (error) {
    console.error("Erro ao conectar WhatsApp:", error);
    setError("Erro ao conectar WhatsApp");
    toast.error("Ocorreu um erro inesperado. Tente novamente mais tarde.");
  } finally {
    setLoading(false);
  }
}

// Function to sign out
export async function signOutUser(
  setUser: (user: User | null) => void,
  setUserData: (userData: any) => void,
  setError: (error: string | null) => void,
  onSuccess: () => void
): Promise<void> {
  try {
    setError(null);
    
    // IMPERSONAÇÃO DESABILITADA - EXCLUSIVA PARA SUPER ADMIN
    // Limpar dados de impersonação do sessionStorage
    // const currentUserId = supabase.auth.getUser().then(({ data }) => data.user?.id);
    // if (currentUserId) {
    //   const impersonationKey = `impersonatedCliente_${currentUserId}`;
    //   const impersonatingKey = `isImpersonating_${currentUserId}`;
    //   sessionStorage.removeItem(impersonationKey);
    //   sessionStorage.removeItem(impersonatingKey);
    //   console.log('authActions: Impersonação limpa durante logout');
    // }
    
    // Logout do Supabase
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      setError("Erro ao fazer logout");
      throw error;
    }
    
    setUser(null);
    setUserData(null);
    toast.success("Logout realizado com sucesso!");
    onSuccess();
  } catch (error) {
    console.error("Erro ao fazer logout:", error);
    setError("Erro ao fazer logout");
  }
}
