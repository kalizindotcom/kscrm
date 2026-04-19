import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface FlameButtonProps {
  label: string;
  onClick?: () => void;
  intensity?: 'low' | 'medium' | 'high';
  className?: string;
  active?: boolean;
  icon?: LucideIcon;
}

export const FlameButton: React.FC<FlameButtonProps> = ({
  label,
  onClick,
  intensity = 'medium',
  className,
  active = false,
  icon: Icon,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const getIntensityParams = () => {
    switch (intensity) {
      case 'low':
        return { 
          flameScale: 0.7, 
          particleCount: 6, 
          gradient: 'from-orange-500/10 via-red-500/5 to-transparent',
          flameOpacity: 0.4 
        };
      case 'high':
        return { 
          flameScale: 1.5, 
          particleCount: 25, 
          gradient: 'from-orange-600/30 via-red-600/20 to-purple-600/20',
          flameOpacity: 0.9
        };
      default:
        return { 
          flameScale: 1.1, 
          particleCount: 15, 
          gradient: 'from-orange-500/20 via-red-600/15 to-purple-600/15',
          flameOpacity: 0.7
        };
    }
  };

  const { flameScale, particleCount, gradient, flameOpacity } = getIntensityParams();
  const hoverScale = isHovered ? 1.4 : 1;
  const finalScale = flameScale * hoverScale;

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "relative flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-500 overflow-hidden group w-full",
        active 
          ? "bg-primary/20 text-primary border border-primary/50 shadow-[0_0_20px_rgba(var(--primary),0.3)]" 
          : "hover:bg-primary/10 text-muted-foreground hover:text-primary border border-transparent hover:border-primary/20",
        className
      )}
    >
      {/* Dynamic Background Gradient */}
      <div 
        className={cn(
          "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 bg-gradient-to-t",
          gradient
        )}
      />

      {/* Flames Container */}
      <div className="absolute inset-x-0 bottom-0 top-0 pointer-events-none overflow-hidden select-none">
        <svg
          viewBox="0 0 100 50"
          className="absolute bottom-[-1px] left-0 w-full h-full transition-opacity duration-500"
          style={{ opacity: isHovered ? 1 : flameOpacity }}
          preserveAspectRatio="none"
        >
          <defs>
            <filter id="flame-blur">
              <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" />
              <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="goo" />
            </filter>
            <linearGradient id="flame-grad-1" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="hsla(200, 100%, 50%, 0.8)" />
              <stop offset="100%" stopColor="hsla(200, 100%, 50%, 0)" />
            </linearGradient>
            <linearGradient id="flame-grad-2" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="hsla(260, 90%, 65%, 0.9)" />
              <stop offset="100%" stopColor="hsla(260, 90%, 65%, 0)" />
            </linearGradient>
            <linearGradient id="flame-grad-3" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#bc13fe" />
              <stop offset="100%" stopColor="#bc13fe00" />
            </linearGradient>
          </defs>
          
          <g filter="url(#flame-blur)" style={{ transformOrigin: 'bottom' }}>
            <g style={{ transform: `scaleY(${finalScale})`, transformOrigin: 'bottom', transition: 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
              {/* Layer 1: Base - Cyan */}
              <path
                className="animate-flame-1"
                d="M0,50 Q10,15 20,50 T40,50 T60,50 T80,50 T100,50 V60 H0 Z"
                fill="url(#flame-grad-1)"
              />
              {/* Layer 2: Middle - Purple */}
              <path
                className="animate-flame-2"
                d="M0,50 Q15,5 30,50 T60,50 T90,50 L100,50 V60 H0 Z"
                fill="url(#flame-grad-2)"
              />
              {/* Layer 3: Top - Neon Purple */}
              <path
                className="animate-flame-3"
                d="M0,50 Q25,-5 50,50 T100,50 V60 H0 Z"
                fill="url(#flame-grad-3)"
              />
            </g>
          </g>
        </svg>

        {/* Sparks / Particles */}
        {Array.from({ length: particleCount }).map((_, i) => (
          <div
            key={i}
            className="absolute bottom-0 w-0.5 h-0.5 bg-primary rounded-full animate-spark"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${0.8 + Math.random() * 1.5}s`,
              opacity: 0.5 + Math.random() * 0.5,
              boxShadow: '0 0 4px hsla(var(--primary), 1)',
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative flex items-center justify-center w-8 h-8 z-10">
        {Icon && <Icon className={cn("w-5 h-5 flex-shrink-0 transition-all duration-500", isHovered && "scale-110 rotate-6 text-primary")} />}
      </div>
      <span className={cn(
        "truncate font-medium z-10 relative ml-1 transition-all duration-300",
        isHovered && "text-primary translate-x-1 font-bold"
      )}>
        {label}
      </span>

      <style>{`
        @keyframes flame-1 {
          0%, 100% { d: path('M0,50 Q10,15 20,50 T40,50 T60,50 T80,50 T100,50 V60 H0 Z'); }
          33% { d: path('M0,50 Q15,25 30,50 T50,50 T70,50 T90,50 T100,50 V60 H0 Z'); }
          66% { d: path('M0,50 Q5,10 15,50 T35,50 T55,50 T75,50 T100,50 V60 H0 Z'); }
        }
        @keyframes flame-2 {
          0%, 100% { d: path('M0,50 Q15,5 30,50 T60,50 T90,50 L100,50 V60 H0 Z'); }
          50% { d: path('M0,50 Q25,15 45,50 T75,50 T100,50 V60 H0 Z'); }
        }
        @keyframes flame-3 {
          0%, 100% { d: path('M0,50 Q25,-5 50,50 T100,50 V60 H0 Z'); }
          50% { d: path('M0,50 Q35,10 65,50 T100,50 V60 H0 Z'); }
        }
        @keyframes spark {
          0% { transform: translateY(0) scale(1); opacity: 1; }
          100% { transform: translateY(-80px) scale(0); opacity: 0; }
        }
        .animate-flame-1 { animation: flame-1 2.2s infinite ease-in-out; }
        .animate-flame-2 { animation: flame-2 2.8s infinite ease-in-out; }
        .animate-flame-3 { animation: flame-3 1.8s infinite ease-in-out; }
        .animate-spark { animation: spark infinite ease-out; }
      `}</style>
    </button>
  );
};
