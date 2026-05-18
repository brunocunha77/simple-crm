import React from 'react';
import { useTema } from '@/hooks/useTema';

interface LogoPersonalizadaProps {
  className?: string;
  alt?: string;
  fallbackSrc?: string;
}

/**
 * Componente para exibir logo personalizada baseada no tema
 */
export const LogoPersonalizada: React.FC<LogoPersonalizadaProps> = ({ 
  className = "h-10", 
  alt = "Logo",
  fallbackSrc = "/lovable-uploads/14b51735-5bca-4815-8a9a-30f309cc5b38.png"
}) => {
  const { tema, hasTemaPersonalizado } = useTema();

  // Se tem tema personalizado e logo_url, usar a logo personalizada
  if (hasTemaPersonalizado && tema?.logo_url) {
    return (
      <img 
        src={tema.logo_url} 
        alt={alt} 
        className={`${className} w-full object-contain`}
        onError={(e) => {
          // Fallback para logo padrão em caso de erro
          const target = e.target as HTMLImageElement;
          target.src = fallbackSrc;
        }}
      />
    );
  }

  // Usar logo padrão
  return (
    <img 
      src={fallbackSrc} 
      alt={alt} 
      className={`${className} w-full object-contain`}
    />
  );
};
