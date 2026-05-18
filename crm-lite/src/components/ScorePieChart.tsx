import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Lead } from '@/types/global';

export interface ScoreData {
  name: string;
  value: number;
  color: string;
  leads?: Lead[];
}

interface Props {
  data: ScoreData[];
  height?: number;
}

export default function ScorePieChart({ data, height = 300 }: Props) {
  const totalLeads = data.reduce((sum, item) => sum + item.value, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const percentage = totalLeads > 0 ? ((data.value / totalLeads) * 100).toFixed(1) : '0';
      const leads = data.payload.leads || [];
      
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg max-w-sm">
          <div className="mb-3">
            <p className="font-medium text-gray-900">{data.name}</p>
            <p className="text-sm text-gray-600">
              {data.value} leads ({percentage}%)
            </p>
          </div>
          
          {leads.length > 0 && (
            <div className="border-t pt-3">
              <p className="text-xs font-medium text-gray-700 mb-2">Leads nesta categoria:</p>
              <div className="max-h-32 overflow-y-auto">
                {leads.slice(0, 10).map((lead: Lead, index: number) => (
                  <div key={lead.id} className="flex items-center justify-between py-1 text-xs">
                    <span className="text-gray-600 truncate mr-2">
                      {lead.nome || `Lead ${lead.id}`}
                    </span>
                    <span className="text-gray-500 font-mono">
                      {lead.score_final_qualificacao?.toFixed(1) || 'N/A'}
                    </span>
                  </div>
                ))}
                {leads.length > 10 && (
                  <p className="text-xs text-gray-500 mt-1">
                    ... e mais {leads.length - 10} leads
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const CustomLegend = ({ payload }: any) => {
    return (
      <div className="flex flex-wrap justify-center gap-4 mt-4">
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm text-gray-700">
              {entry.value} ({totalLeads > 0 ? ((entry.payload.value / totalLeads) * 100).toFixed(1) : '0'}%)
            </span>
          </div>
        ))}
      </div>
    );
  };

  if (totalLeads === 0) {
    return (
      <div 
        className="flex items-center justify-center rounded-lg border border-gray-200"
        style={{ height: height }}
      >
        <div className="text-center text-gray-500">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-sm">Nenhum lead com nota encontrado</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend content={<CustomLegend />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
