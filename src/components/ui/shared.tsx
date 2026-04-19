import React from 'react';
import { cn } from '../../lib/utils';

export const Card = ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode, className?: string }) => (
  <div className={cn("bg-card border rounded-xl overflow-hidden shadow-sm", className)} {...props}>
    {children}
  </div>
);

export const CardHeader = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={cn("px-6 py-4 border-b", className)}>{children}</div>
);

export const CardTitle = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <h3 className={cn("font-semibold text-lg leading-none tracking-tight", className)}>{children}</h3>
);

export const CardContent = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={cn("p-6", className)}>{children}</div>
);

export const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'link', size?: 'sm' | 'md' | 'lg' }>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    const variants = {
      primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
      secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
      outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
      ghost: 'hover:bg-accent hover:text-accent-foreground',
      destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
      link: 'text-primary underline-offset-4 hover:underline bg-transparent',
    };
    const sizes = {
      sm: 'h-8 px-3 text-xs',
      md: 'h-10 px-4 py-2',
      lg: 'h-12 px-8 text-lg',
    };
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
);

export const Badge = ({ children, className, variant = 'default' }: { children: React.ReactNode, className?: string, variant?: 'default' | 'success' | 'warning' | 'error' | 'outline' }) => {
  const variants = {
    default: 'bg-primary/10 text-primary border-primary/20',
    success: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    error: 'bg-destructive/10 text-destructive border-destructive/20',
    outline: 'border text-muted-foreground',
  };
  return (
    <span className={cn("inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-bold border rounded-full leading-none whitespace-nowrap gap-1", variants[variant], className)}>
      {children}
    </span>
  );
};
