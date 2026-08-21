import React from 'react';

interface MarqsLogoProps {
  className?: string;
  size?: number;
  glow?: boolean;
}

export const MarqsLogo: React.FC<MarqsLogoProps> = ({ 
  className = '', 
  size = 18,
  glow = false 
}) => {
  return (
    <span 
      className={`inline-flex items-center justify-center shrink-0 ${glow ? 'filter drop-shadow-[0_0_8px_rgba(255,230,0,0.6)]' : ''} ${className}`}
      style={{ width: size, height: Math.round(size * 1.6) }}
    >
      <img 
        src="/marqs-logo.svg" 
        alt="Marq's Logo" 
        className="w-full h-full object-contain select-none pointer-events-none"
        loading="eager"
      />
    </span>
  );
};

export default MarqsLogo;
