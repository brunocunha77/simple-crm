import React, { useEffect, useState } from 'react';
import { etiquetasService, Etiqueta } from '@/services/etiquetasService';

interface EtiquetasDebugProps {
  idEtiquetas: string | null;
  idCliente: number;
  leadId: number;
}

export default function EtiquetasDebug({ 
  idEtiquetas, 
  idCliente, 
  leadId 
}: EtiquetasDebugProps) {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!idEtiquetas || !idCliente) {
      setDebugInfo(null);
      return;
    }

    const fetchDebugInfo = async () => {
      setLoading(true);
      try {
        // Converter string de IDs em array
        const ids = idEtiquetas
          .split(',')
          .map(id => id.trim())
          .filter(id => id !== '')
          .map(id => parseInt(id))
          .filter(id => !isNaN(id));

        // Buscar todas as etiquetas do cliente
        const todasEtiquetas = await etiquetasService.listByCliente(idCliente);
        
        // Filtrar etiquetas do lead
        const etiquetasDoLead = todasEtiquetas.filter(etiqueta => ids.includes(etiqueta.id));
        
        // IDs não encontrados
        const idsNaoEncontrados = ids.filter(id => !todasEtiquetas.find(e => e.id === id));

        setDebugInfo({
          leadId,
          idCliente,
          stringOriginal: idEtiquetas,
          idsExtraidos: ids,
          totalEtiquetasDisponiveis: todasEtiquetas.length,
          etiquetasDoLead: etiquetasDoLead.map(e => ({ id: e.id, nome: e.nome, cor: e.cor })),
          idsNaoEncontrados,
          todasEtiquetas: todasEtiquetas.map(e => ({ id: e.id, nome: e.nome, cliente: e.id_cliente }))
        });
      } catch (error) {
        console.error('Erro ao buscar informações de debug:', error);
        setDebugInfo({ error: error.message });
      } finally {
        setLoading(false);
      }
    };

    fetchDebugInfo();
  }, [idEtiquetas, idCliente, leadId]);

  if (loading) {
    return <div className="text-xs text-gray-500">Carregando debug...</div>;
  }

  if (!debugInfo) {
    return <div className="text-xs text-gray-500">Sem informações de debug</div>;
  }

  if (debugInfo.error) {
    return <div className="text-xs text-red-500">Erro: {debugInfo.error}</div>;
  }

  return (
    <div className="text-xs bg-gray-100 p-2 rounded border">
      <div className="font-semibold mb-2">Debug Etiquetas - Lead {debugInfo.leadId}</div>
      
      <div className="space-y-1">
        <div><strong>String original:</strong> "{debugInfo.stringOriginal}"</div>
        <div><strong>IDs extraídos:</strong> [{debugInfo.idsExtraidos.join(', ')}]</div>
        <div><strong>Total etiquetas disponíveis:</strong> {debugInfo.totalEtiquetasDisponiveis}</div>
        <div><strong>Etiquetas encontradas:</strong> {debugInfo.etiquetasDoLead.length}</div>
        
        {debugInfo.etiquetasDoLead.length > 0 && (
          <div>
            <strong>Etiquetas do lead:</strong>
            <ul className="ml-2">
              {debugInfo.etiquetasDoLead.map((etiqueta: any) => (
                <li key={etiqueta.id}>
                  ID: {etiqueta.id}, Nome: "{etiqueta.nome}", Cor: {etiqueta.cor}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {debugInfo.idsNaoEncontrados.length > 0 && (
          <div className="text-red-600">
            <strong>IDs não encontrados:</strong> [{debugInfo.idsNaoEncontrados.join(', ')}]
          </div>
        )}
        
        <details className="mt-2">
          <summary className="cursor-pointer font-semibold">Todas as etiquetas disponíveis</summary>
          <ul className="ml-2 mt-1 max-h-32 overflow-y-auto">
            {debugInfo.todasEtiquetas.map((etiqueta: any) => (
              <li key={etiqueta.id} className="text-xs">
                ID: {etiqueta.id}, Nome: "{etiqueta.nome}", Cliente: {etiqueta.cliente || 'null'}
              </li>
            ))}
          </ul>
        </details>
      </div>
    </div>
  );
}





















