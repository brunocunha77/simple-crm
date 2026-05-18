import React from "react";
import { Lead } from "@/types/global";
import { Departamento } from "@/services/departamentosService";
import EtiquetasDisplay from "@/components/EtiquetasDisplay";
import {
  Users, BellRing, Paperclip, Bot, User, TrendingUp,
} from "lucide-react";

// Replica a interface local de Contact de Conversations.tsx
export interface Contact {
  id: string;
  name: string;
  lastMessage: string;
  lastMessageTime: string;
  avatar?: string;
  telefone_id: string;
  atendimento_ia?: boolean;
  atendimento_humano?: boolean;
  status_conversa?: string | null;
  lastMessageType?:
    | 'texto' | 'audio' | 'imagem' | 'video'
    | 'documento' | 'documento pdf' | 'documento doc' | 'documento docx'
    | 'documento xls' | 'documento xlsx' | 'documento ppt' | 'documento pptx'
    | 'documento txt'
    | null;
  instance_id?: string;
  is_group?: boolean;
}

interface ContactListItemProps {
  contact: Contact;
  isSelected: boolean;
  isEncerrada: boolean;
  attendance: { ia: boolean; humano: boolean; workflowNome?: string } | undefined;
  lead: Lead | undefined;
  hasUnread: boolean;
  selectionMode: boolean;
  isSelected_checkbox: boolean;
  departamentos: Departamento[];
  user: any;
  formatContactTime: (time: string) => string;
  getAvatarColor: (name: string) => string;
  onClick: () => void;
  onCheckboxClick: (e: React.MouseEvent) => void;
  onContextMenu: () => void;
  onReminderClick: (e: React.MouseEvent, lead: Lead) => void;
}

const ContactListItem: React.FC<ContactListItemProps> = ({
  contact,
  isSelected,
  isEncerrada,
  attendance,
  lead,
  hasUnread,
  selectionMode,
  isSelected_checkbox,
  departamentos,
  user,
  formatContactTime,
  getAvatarColor,
  onClick,
  onCheckboxClick,
  onReminderClick,
}) => {
  // Detecção de canal
  const leadCanal = String((lead as any)?.canal || '').toLowerCase().trim();
  const isWhatsappCanal = leadCanal === 'whatsapp';
  const isInstagramCanal = leadCanal === 'instagram' || leadCanal === 'intagram';
  const isGmailCanal = leadCanal === 'gmail';

  // Texto de preview
  const type = contact.lastMessageType;
  let previewText: string;
  if (type === 'audio') previewText = '🎙 Áudio';
  else if (type === 'imagem') previewText = '🖼 Imagem';
  else if (type === 'video') previewText = '🎥 Vídeo';
  else if (type?.startsWith('documento')) previewText = '📄 Documento';
  else {
    const txt = (contact.lastMessage || '').replace(/\n/g, ' ').trim();
    previewText = txt || '—';
  }

  // Score do lead
  const leadScore = (lead as any)?.score_final_qualificacao;
  const shouldShowScore = lead && typeof leadScore === 'number';

  return (
    <button
      className={`w-[370px] px-[14px] py-3 flex items-center gap-3 overflow-hidden transition-colors ${
        isSelected ? 'bg-[#f5f5f9]' : 'hover:bg-gray-50'
      } ${isEncerrada ? 'opacity-60' : ''}`}
      onClick={onClick}
    >
      {/* Checkbox de seleção */}
      {selectionMode && (
        <div
          className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
            isSelected_checkbox ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
          }`}
          onClick={onCheckboxClick}
        >
          {isSelected_checkbox && (
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          )}
        </div>
      )}

      {/* Avatar com badge de canal */}
      <div className="relative flex-shrink-0">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-medium text-white"
          style={{ backgroundColor: getAvatarColor(contact.name) }}
        >
          {contact.name.substring(0, 2).toUpperCase()}
        </div>
        {isWhatsappCanal && (
          <span
            className="absolute -bottom-0.5 -right-0.5 w-[14px] h-[14px] rounded-full border-[1.5px] border-white flex items-center justify-center"
            style={{ backgroundColor: '#25d366' }}
          >
            <svg width="8" height="8" viewBox="0 0 24 24" fill="white">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
            </svg>
          </span>
        )}
        {isInstagramCanal && (
          <span
            className="absolute -bottom-0.5 -right-0.5 w-[14px] h-[14px] rounded-full border-[1.5px] border-white flex items-center justify-center"
            style={{ backgroundColor: '#e1306c' }}
          >
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17.5" cy="6.5" r="1" fill="white" stroke="none" />
            </svg>
          </span>
        )}
        {isGmailCanal && (
          <span
            className="absolute -bottom-0.5 -right-0.5 w-[14px] h-[14px] rounded-full border-[1.5px] border-white flex items-center justify-center"
            style={{ backgroundColor: '#4285f4' }}
          >
            <svg width="8" height="6" viewBox="0 0 20 16" fill="white">
              <path d="M0 0v16h20V0H0zm18 2l-8 6-8-6h16zM2 14V4.5l8 6 8-6V14H2z" />
            </svg>
          </span>
        )}
      </div>

      {/* INFO BLOCK */}
      <div className="flex-1 min-w-0 max-w-full overflow-hidden">
        {/* Linha 1: nome + badges */}
        <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
          <p className="text-[13px] font-medium truncate">{contact.name}</p>

          {contact.is_group && (
            <span
              className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs shrink-0"
              title="Grupo"
            >
              <Users className="h-3 w-3" />
            </span>
          )}

          {lead?.lembrete_ativo && (
            <button
              type="button"
              onClick={(e) => onReminderClick(e, lead)}
              className="inline-flex items-center justify-center rounded-full p-1 text-amber-600 transition hover:bg-amber-100 hover:text-amber-700"
              title="Ver agendamento deste lead"
            >
              <BellRing className="h-4 w-4" />
            </button>
          )}

          {(lead as any)?.anexo && (
            <a
              href={(lead as any).anexo}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center justify-center rounded-full p-1 text-blue-600 transition hover:bg-blue-100 hover:text-blue-700"
              title="Visualizar anexo"
            >
              <Paperclip className="h-4 w-4" />
            </a>
          )}

          {lead?.followup_programado && (
            <span className="ml-1" title="Follow-up automático ativado">
              <span className="text-yellow-500">⏰</span>
            </span>
          )}

          {lead && user?.id_cliente && (
            <EtiquetasDisplay
              idEtiquetas={lead.id_etiquetas}
              idCliente={user.id_cliente}
              maxEtiquetas={2}
              showTooltip={true}
            />
          )}

          {!isEncerrada && (
            <>
              {attendance?.ia ? (
                <span className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs max-w-[120px] truncate" title={attendance.workflowNome || 'IA'}>
                  <Bot className="h-3 w-3 shrink-0" />
                  <span className="truncate">{attendance.workflowNome || 'IA'}</span>
                </span>
              ) : (
                <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                  <User className="h-3 w-3" />
                  Humano
                </span>
              )}
            </>
          )}

          {shouldShowScore && (
            <span
              className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
              style={{
                backgroundColor:
                  leadScore >= 7 ? '#dcfce7' : leadScore >= 4 ? '#fef3c7' : '#fee2e2',
                color:
                  leadScore >= 7 ? '#166534' : leadScore >= 4 ? '#92400e' : '#991b1b',
              }}
              title={`Score de Qualificação: ${leadScore.toFixed(1)}/10`}
            >
              <TrendingUp className="h-3 w-3" />
              {leadScore.toFixed(1)}
            </span>
          )}
        </div>

        {/* Linha 2: preview — DENTRO do info block */}
        <p
          className="text-[12px] text-gray-400 truncate block mt-0.5 text-left"
          style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
        >
          {previewText}
        </p>
      </div>

      {/* META BLOCK — irmão do info block */}
      <div className="flex flex-col items-end flex-shrink-0 gap-1 self-start pt-1">
        <span className="whitespace-nowrap text-[11px] text-gray-400">
          {formatContactTime(contact.lastMessageTime)}
        </span>
        {hasUnread && (
          <span
            className="rounded-full"
            style={{
              minWidth: 18, minHeight: 18,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backgroundColor: '#25d366', color: 'white', fontSize: 10, fontWeight: 600,
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
          </span>
        )}
      </div>
    </button>
  );
};

export default ContactListItem;