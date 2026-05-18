import { Stage, Lead, ColorOption } from "./types";

// Estágios iniciais
export const initialStages: Stage[] = [
  { id: 'leads', name: 'Leads', color: '#4F46E5' },
  { id: 'viu-nao-respondeu', name: 'Viu e não respondeu', color: '#8B5CF6' },
  { id: 'conversa-em-andamento', name: 'Conversa em andamento', color: '#3B82F6' },
  { id: 'parou-de-responder', name: 'Parou de responder', color: '#EC4899' },
  { id: 'oportunidade', name: 'Oportunidade', color: '#F59E0B' },
  { id: 'ganho', name: 'Ganho', color: '#16a34a' },
  { id: 'perdido', name: 'Perdido', color: '#dc2626' }
];

export const initialLeads: Lead[] = [
  {
    id: 'lead-1',
    name: 'Lead 1',
    company: 'Empresa 1',
    email: 'lead1@empresa1.com',
    phone: '(00) 00000-0000',
    value: 'R$ 0',
    probability: 0,
    stage: 'novo',
    lastContact: 'Nenhum contato',
    avatar: '/placeholder.svg'
  },
  {
    id: 'lead-2',
    name: 'Lead 2',
    company: 'Empresa 2',
    email: 'lead2@empresa2.com',
    phone: '(00) 00000-0000',
    value: 'R$ 0',
    probability: 0,
    stage: 'novo',
    lastContact: 'Nenhum contato',
    avatar: '/placeholder.svg'
  },
  {
    id: 'lead-3',
    name: 'Lead 3',
    company: 'Empresa 3',
    email: 'lead3@empresa3.com',
    phone: '(00) 00000-0000',
    value: 'R$ 0',
    probability: 0,
    stage: 'novo',
    lastContact: 'Nenhum contato',
    avatar: '/placeholder.svg'
  }
];

// Cores disponíveis para os estágios
export const availableColors: ColorOption[] = [
  { name: 'Índigo', value: '#4F46E5' },
  { name: 'Verde', value: '#10B981' },
  { name: 'Âmbar', value: '#F59E0B' },
  { name: 'Rosa', value: '#EC4899' },
  { name: 'Roxo', value: '#8B5CF6' },
  { name: 'Azul', value: '#3B82F6' }
];
