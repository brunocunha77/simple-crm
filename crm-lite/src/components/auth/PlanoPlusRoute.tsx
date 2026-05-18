import React from 'react';
import { usePlanoPlus } from '@/hooks/usePlanoPlus';
import { Navigate } from 'react-router-dom';

interface PlanoPlusRouteProps {
  children: React.ReactNode;
  fallbackPath?: string;
}

export const PlanoPlusRoute: React.FC<PlanoPlusRouteProps> = ({ 
  children, 
  fallbackPath = '/' 
}) => {
  const { isPlanoPlus, loading } = usePlanoPlus();

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

  if (!isPlanoPlus) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
};
