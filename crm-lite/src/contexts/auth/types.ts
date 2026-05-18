import type { Tables } from "@/lib/supabase";

// User type definition
export type User = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  hasConnectedWhatsApp?: boolean;
  id_cliente?: number; // Adicionado para multi-tenant
};

// User data type definition
export type UserData = {
  conversations: {
    id: string;
    contact: string;
    lastMessage: string;
  }[];
  opportunities: {
    id: string;
    name: string;
    value: number;
    probability: number;
  }[];
  clients: {
    id: string;
    name: string;
    contracts: number;
    revenue: number;
  }[];
  leads: {
    id: string;
    name: string;
    stage: string;
    value: number;
  }[];
  conversionRate: number;
  plano_crm?: boolean; // Adicionado para verificar acesso ao plano CRM
};

// Auth context type definition
export type AuthContextType = {
  user: User | null;
  loading: boolean;
  userData: UserData | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, firstName: string, lastName: string, phone: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
  hasConnectedWhatsApp: boolean;
  connectWhatsApp: () => Promise<void>;
  error: string | null;
};

export const emptyUserData: UserData = {
  conversations: [],
  opportunities: [],
  clients: [],
  leads: [],
  conversionRate: 0,
};
