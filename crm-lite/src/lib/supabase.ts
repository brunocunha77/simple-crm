import { createClient } from '@supabase/supabase-js';

// Garantir que as variáveis de ambiente estão sendo lidas corretamente
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

// Log mais detalhado para debug
void 0;
void 0;
void 0;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Variáveis de ambiente do Supabase não encontradas:', {
    url: supabaseUrl,
    keyPresent: !!supabaseAnonKey
  });
  throw new Error('Missing Supabase environment variables');
}

// Initialize the Supabase client with more options to handle errors better
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 'smartcrm-auth',
    storage: window.localStorage,
    flowType: 'pkce'
  },
  global: {
    headers: {
      'x-application-name': 'smartcrm',
      'apikey': supabaseAnonKey
    }
  },
  db: {
    schema: 'public'
  }
});

// Log connection status when app starts
void 0;

// Test the connection
supabase.auth.getSession().then(({ data: { session }, error }) => {
  if (error) {
    console.error('Erro ao testar conexão Supabase:', error);
  } else {
    void 0;
    if (session) {
      void 0;
    } else {
      void 0;
    }
  }
});

export type Tables = {
  'agente_conversacional_whatsapp': {
    id: number;
    created_at: string;
    mensagem: string;
    tipo: boolean;
    timestamp: string;
    conversa_id: string;
    instância_Id: string;
    id_mensagem?: string;
    deleted?: boolean;
  };
}