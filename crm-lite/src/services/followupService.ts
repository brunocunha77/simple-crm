import { supabase } from '@/lib/supabase';

export type FollowupConfig = {
  id?: number;
  id_cliente: number;
  primeiro_followup_dias: number;
  primeiro_followup_mensagem: string;
  primeiro_followup_status: boolean;
  envio_audio_1: boolean;
  segundo_followup_dias: number;
  segundo_followup_mensagem: string;
  segundo_followup_status: boolean;
  envio_audio_2: boolean;
  terceiro_followup_dias: number;
  terceiro_followup_mensagem: string;
  terceiro_followup_status: boolean;
  envio_audio_3: boolean;
  horario_followup: string;
  status_followup: 'Ativo' | 'Pausado';
};

export const followupService = {
  async getByClientId(id_cliente: number): Promise<FollowupConfig | null> {
    const { data, error } = await supabase
      .from('followup_programado')
      .select('*')
      .eq('id_cliente', id_cliente)
      .single();
    if (error) return null;
    return data as FollowupConfig;
  },

  async upsert(config: FollowupConfig): Promise<FollowupConfig | null> {
    const { data, error } = await supabase
      .from('followup_programado')
      .upsert([config], { onConflict: 'id_cliente' })
      .select()
      .single();
    if (error) throw error;
    return data as FollowupConfig;
  },
}; 