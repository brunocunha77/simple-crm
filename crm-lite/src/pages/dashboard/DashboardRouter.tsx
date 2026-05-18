import React from 'react';
import { usePlanoPlus } from '@/hooks/usePlanoPlus';
import Dashboard from './Dashboard';
import DashboardPremium from './DashboardPremium';

export default function DashboardRouter() {
  const { isPlanoPlus, loading, error } = usePlanoPlus();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verificando seu plano...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Erro ao carregar</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  // Renderiza o dashboard baseado no plano
  if (isPlanoPlus) {
    return <DashboardPremium />;
  }

  return <Dashboard />;
}
