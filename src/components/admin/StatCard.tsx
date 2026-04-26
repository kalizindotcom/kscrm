import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { AnimatedCard } from './AnimatedCard';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  delay?: number;
  onClick?: () => void;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  bgColor,
  trend,
  delay = 0,
  onClick,
}: StatCardProps) {
  return (
    <AnimatedCard
      delay={delay}
      className={cn(
        'cursor-pointer transition-all duration-300',
        onClick && 'hover:border-primary'
      )}
      onClick={onClick}
      gradient
    >
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground mb-1">
              {title}
            </p>
            <motion.h3
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: delay + 0.2, duration: 0.5, type: 'spring' }}
              className="text-3xl font-bold tracking-tight"
            >
              {value}
            </motion.h3>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">
                {subtitle}
              </p>
            )}
            {trend && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: delay + 0.3 }}
                className={cn(
                  'inline-flex items-center gap-1 mt-2 text-xs font-semibold',
                  trend.isPositive ? 'text-green-600' : 'text-red-600'
                )}
              >
                <span>{trend.isPositive ? '↑' : '↓'}</span>
                <span>{Math.abs(trend.value)}%</span>
              </motion.div>
            )}
          </div>
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              delay: delay + 0.1,
              duration: 0.6,
              type: 'spring',
              stiffness: 200
            }}
            className={cn('p-3 rounded-xl', bgColor)}
          >
            <Icon className={cn('w-6 h-6', color)} />
          </motion.div>
        </div>
      </div>

      {/* Animated gradient border on hover */}
      <motion.div
        className="absolute inset-0 rounded-2xl opacity-0 pointer-events-none"
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(var(--primary-rgb), 0.1), transparent)',
          backgroundSize: '200% 100%',
        }}
      />
    </AnimatedCard>
  );
}
