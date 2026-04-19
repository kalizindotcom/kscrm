import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FireButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  intensity?: "low" | "medium" | "high";
  children?: React.ReactNode;
}

const FireButton = React.forwardRef<HTMLButtonElement, FireButtonProps>(
  ({ label, intensity = "medium", className, onClick, disabled, children, ...props }, ref) => {
    const [isExploding, setIsExploding] = useState(false);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled) return;
      setIsExploding(true);
      if (onClick) onClick(e);
      // Explosion effect lasts 800ms
      setTimeout(() => setIsExploding(false), 800);
    };

    // Background gradient based on intensity
    const getBgGradient = () => {
      if (disabled) return "from-zinc-400 to-zinc-500 opacity-50";
      if (intensity === "low") return "from-blue-400 to-blue-500 shadow-blue-500/20";
      if (intensity === "high") return "from-primary via-blue-400 to-blue-600 shadow-primary/40";
      return "from-blue-500 to-primary shadow-blue-600/30";
    };

    return (
      <div className="relative group w-full">
        <Button
          ref={ref}
          disabled={disabled}
          onClick={handleClick}
          className={cn(
            "w-full h-12 relative overflow-hidden transition-all duration-300 font-bold text-white uppercase tracking-wider text-xs",
            "bg-gradient-to-r border-none shadow-lg",
            getBgGradient(),
            !disabled && "hover:shadow-xl active:scale-95",
            className
          )}
          {...props}
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            {children || label}
          </span>
          
          {/* Explosion overlay effect */}
          {isExploding && (
            <div className="absolute inset-0 bg-white/40 animate-ping pointer-events-none z-20" />
          )}
          
          {/* Subtle moving shine effect */}
          {!disabled && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite] pointer-events-none" />
          )}
        </Button>
      </div>
    );
  }
);

FireButton.displayName = "FireButton";

export { FireButton };