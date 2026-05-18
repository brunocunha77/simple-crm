import { useTema } from '@/hooks/useTema';

/**
 * Componente para mostrar informações do tema (apenas para debug)
 * Pode ser removido em produção
 */
export const TemaDebug = () => {
  const { tema, hasTemaPersonalizado, loading } = useTema();

  // Só mostrar em desenvolvimento
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  if (loading) {
    return (
      <div className="fixed bottom-4 right-4 bg-gray-800 text-white p-2 rounded text-xs">
        🎨 Carregando tema...
      </div>
    );
  }

  if (!hasTemaPersonalizado) {
    return (
      <div className="fixed bottom-4 right-4 bg-gray-800 text-white p-2 rounded text-xs">
        🎨 Tema padrão
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-gray-800 text-white p-2 rounded text-xs max-w-xs">
      <div className="font-bold mb-1">🎨 Tema Personalizado</div>
      <div>Cliente: {tema?.id_cliente}</div>
      <div className="flex items-center gap-2 mt-1">
        <div 
          className="w-4 h-4 rounded border" 
          style={{ backgroundColor: tema?.cor_primaria }}
          title="Cor Primária"
        />
        <div 
          className="w-4 h-4 rounded border" 
          style={{ backgroundColor: tema?.cor_secundaria }}
          title="Cor Secundária"
        />
        <div 
          className="w-4 h-4 rounded border" 
          style={{ backgroundColor: tema?.cor_texto }}
          title="Cor do Texto"
        />
      </div>
      <div className="text-xs mt-1">Fonte: {tema?.fonte}</div>
    </div>
  );
};
