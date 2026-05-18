import React, { memo } from 'react';
import { Lead } from '@/types/global';

interface LeadCardProps {
  lead: Lead;
  onClick: (lead: Lead) => void;
  onContextMenu?: (lead: Lead) => void;
}

export const LeadCard = memo<LeadCardProps>(({ lead, onClick, onContextMenu }) => {
  return (
    <div
      className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100"
      onClick={() => onClick(lead)}
      onContextMenu={(e) => {
        e.preventDefault();
        onContextMenu?.(lead);
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-gray-900 truncate">
            {lead.nome}
          </h4>
          <p className="text-xs text-gray-500 truncate">
            {lead.telefone}
          </p>
          {lead.email && (
            <p className="text-xs text-gray-400 truncate">
              {lead.email}
            </p>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {lead.score_final_qualificacao && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {lead.score_final_qualificacao}%
            </span>
          )}
          {lead.followup_programado && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              Follow-up
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

LeadCard.displayName = 'LeadCard';

