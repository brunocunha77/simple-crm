
import { supabase } from "@/lib/supabase";
import { UserData } from "./types";

export async function fetchUserData(userId: string): Promise<UserData> {
  try {
    // Buscar conversas
    const { data: conversations, error: conversationsError } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId);
    
    if (conversationsError) {
      console.error("Erro ao buscar conversas:", conversationsError);
    }
    
    // Buscar oportunidades
    const { data: opportunities, error: opportunitiesError } = await supabase
      .from('opportunities')
      .select('*')
      .eq('user_id', userId);
    
    if (opportunitiesError) {
      console.error("Erro ao buscar oportunidades:", opportunitiesError);
    }
    
    // Buscar clientes
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', userId);
    
    if (clientsError) {
      console.error("Erro ao buscar clientes:", clientsError);
    }
    
    // Buscar leads
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('*')
      .eq('user_id', userId);
    
    if (leadsError) {
      console.error("Erro ao buscar leads:", leadsError);
    }
    
    // Calcular taxa de conversão (exemplo de cálculo simples)
    const conversionRate = leads && leads.length > 0 && opportunities && opportunities.length > 0 
      ? (opportunities.length / leads.length) * 100
      : 0;
    
    // Formatar dados para o padrão do app
    const formattedUserData: UserData = {
      conversations: conversations?.map(conv => ({
        id: conv.id,
        contact: conv.contact,
        lastMessage: conv.last_message
      })) || [],
      opportunities: opportunities?.map(opp => ({
        id: opp.id,
        name: opp.name,
        value: opp.value,
        probability: opp.probability
      })) || [],
      clients: clients?.map(client => ({
        id: client.id,
        name: client.name,
        contracts: client.contracts,
        revenue: client.revenue
      })) || [],
      leads: leads?.map(lead => ({
        id: lead.id,
        name: lead.name,
        stage: lead.stage,
        value: lead.value
      })) || [],
      conversionRate: parseFloat(conversionRate.toFixed(1))
    };
    
    return formattedUserData;
  } catch (error) {
    console.error("Erro ao buscar dados do usuário:", error);
    // Return empty data structure on error
    return {
      conversations: [],
      opportunities: [],
      clients: [],
      leads: [],
      conversionRate: 0
    };
  }
}
