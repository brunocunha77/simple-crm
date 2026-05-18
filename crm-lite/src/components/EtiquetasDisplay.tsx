import React, { useEffect, useState } from 'react';
import { etiquetasService, Etiqueta } from '@/services/etiquetasService';

interface EtiquetasDisplayProps {
  idEtiquetas: string | null; // String com IDs separados por vírgula
  idCliente: number;
  maxEtiquetas?: number; // Limite de etiquetas a exibir (padrão: 3)
  showTooltip?: boolean; // Se deve mostrar tooltip com nome completo
}

export default function EtiquetasDisplay({ 
  idEtiquetas, 
  idCliente, 
  maxEtiquetas = 3, 
  showTooltip = true 
}: EtiquetasDisplayProps) {
  const [etiquetas, setEtiquetas] = useState<Etiqueta[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!idEtiquetas || !idCliente) {
      setEtiquetas([]);
      return;
    }

    const fetchEtiquetas = async () => {
      setLoading(true);
      try {
        // Converter string de IDs em array
        const ids = idEtiquetas.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
        
        if (ids.length === 0) {
          setEtiquetas([]);
          return;
        }

        // Buscar todas as etiquetas do cliente
        const todasEtiquetas = await etiquetasService.listByCliente(idCliente);
        
        // Filtrar apenas as etiquetas que estão no lead
        const etiquetasDoLead = todasEtiquetas.filter(etiqueta => ids.includes(etiqueta.id));
        
        setEtiquetas(etiquetasDoLead);
      } catch (error) {
        console.error('Erro ao buscar etiquetas:', error);
        setEtiquetas([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEtiquetas();
  }, [idEtiquetas, idCliente]);

  if (loading) {
    return (
      <div className="flex gap-1">
        <div className="w-3 h-3 bg-gray-200 rounded-full animate-pulse"></div>
        <div className="w-3 h-3 bg-gray-200 rounded-full animate-pulse"></div>
        <div className="w-3 h-3 bg-gray-200 rounded-full animate-pulse"></div>
      </div>
    );
  }

  if (etiquetas.length === 0) {
    return null;
  }

  // Limitar o número de etiquetas exibidas
  const etiquetasExibidas = etiquetas.slice(0, maxEtiquetas);
  const etiquetasRestantes = etiquetas.length - maxEtiquetas;

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {etiquetasExibidas.map((etiqueta) => (
        <div
          key={etiqueta.id}
          className={`w-3 h-3 rounded-full border border-white shadow-sm ${
            showTooltip ? 'cursor-help' : ''
          }`}
          style={{ backgroundColor: etiqueta.cor }}
          title={showTooltip ? etiqueta.nome : undefined}
        />
      ))}
      
      {etiquetasRestantes > 0 && (
        <span 
          className="text-xs text-gray-500 font-medium"
          title={`Mais ${etiquetasRestantes} etiqueta${etiquetasRestantes > 1 ? 's' : ''}`}
        >
          +{etiquetasRestantes}
        </span>
      )}
    </div>
  );
} 