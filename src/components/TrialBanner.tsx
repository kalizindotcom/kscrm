import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Sparkles, Zap, X, Crown } from 'lucide-react';
import { useAuthStore } from '@/store';
import { cn } from '@/lib/utils';

export function TrialBanner() {
  const { user } = useAuthStore();
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    total: number;
  } | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Verificar se é usuário trial
    if (user?.subscription?.status !== 'trial' || !user?.subscription?.expiresAt) {
      return;
    }

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const expiresAt = new Date(user.subscription.expiresAt).getTime();
      const difference = expiresAt - now;

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 });
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds, total: difference });
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [user]);

  // Não mostrar se não for trial ou se o usuário fechou
  if (!isVisible || user?.subscription?.status !== 'trial' || !timeLeft) {
    return null;
  }

  // Calcular porcentagem de tempo restante (assumindo trial de 72h como máximo)
  const maxTrialMs = 72 * 60 * 60 * 1000; // 72 horas
  const percentage = Math.min((timeLeft.total / maxTrialMs) * 100, 100);

  // Determinar cor baseado no tempo restante
  const getColorClass = () => {
    if (percentage > 50) return 'from-green-500 to-emerald-500';
    if (percentage > 25) return 'from-yellow-500 to-orange-500';
    return 'from-orange-500 to-red-500';
  };

  const getTextColorClass = () => {
    if (percentage > 50) return 'text-green-500';
    if (percentage > 25) return 'text-yellow-500';
    return 'text-orange-500';
  };

  const getBgColorClass = () => {
    if (percentage > 50) return 'bg-green-500/10 border-green-500/30';
    if (percentage > 25) return 'bg-yellow-500/10 border-yellow-500/30';
    return 'bg-orange-500/10 border-orange-500/30';
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="relative overflow-hidden border-b border-primary/20"
      >
        {/* Background gradient animado */}
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 via-yellow-500/5 to-orange-500/5 animate-pulse" />

        {/* Barra de progresso */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted/20">
          <motion.div
            className={cn('h-full bg-gradient-to-r', getColorClass())}
            initial={{ width: '100%' }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        <div className="relative px-4 py-3 flex items-center justify-between gap-4">
          {/* Ícone e Título */}
          <div className="flex items-center gap-3">
            <motion.div
              animate={{
                rotate: [0, 10, -10, 10, 0],
                scale: [1, 1.1, 1, 1.1, 1]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatDelay: 3
              }}
              className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center border-2',
                getBgColorClass()
              )}
            >
              <Sparkles className={cn('w-5 h-5', getTextColorClass())} />
            </motion.div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm">Conta Trial Ativa</h3>
                <span className={cn(
                  'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
                  getBgColorClass()
                )}>
                  Teste Grátis
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Aproveite todos os recursos premium durante o período de teste
              </p>
            </div>
          </div>

          {/* Countdown */}
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2">
              <Clock className={cn('w-4 h-4', getTextColorClass())} />
              <span className="text-xs text-muted-foreground font-medium">Tempo restante:</span>
            </div>

            <div className="flex items-center gap-2">
              {timeLeft.days > 0 && (
                <div className={cn(
                  'flex flex-col items-center justify-center min-w-[50px] h-12 rounded-lg border-2',
                  getBgColorClass()
                )}>
                  <span className={cn('text-xl font-bold leading-none', getTextColorClass())}>
                    {timeLeft.days}
                  </span>
                  <span className="text-[9px] text-muted-foreground uppercase font-semibold mt-0.5">
                    {timeLeft.days === 1 ? 'Dia' : 'Dias'}
                  </span>
                </div>
              )}

              <div className={cn(
                'flex flex-col items-center justify-center min-w-[50px] h-12 rounded-lg border-2',
                getBgColorClass()
              )}>
                <span className={cn('text-xl font-bold leading-none', getTextColorClass())}>
                  {String(timeLeft.hours).padStart(2, '0')}
                </span>
                <span className="text-[9px] text-muted-foreground uppercase font-semibold mt-0.5">
                  Horas
                </span>
              </div>

              <span className={cn('text-2xl font-bold', getTextColorClass())}>:</span>

              <div className={cn(
                'flex flex-col items-center justify-center min-w-[50px] h-12 rounded-lg border-2',
                getBgColorClass()
              )}>
                <span className={cn('text-xl font-bold leading-none', getTextColorClass())}>
                  {String(timeLeft.minutes).padStart(2, '0')}
                </span>
                <span className="text-[9px] text-muted-foreground uppercase font-semibold mt-0.5">
                  Min
                </span>
              </div>

              <span className={cn('text-2xl font-bold', getTextColorClass())}>:</span>

              <div className={cn(
                'flex flex-col items-center justify-center min-w-[50px] h-12 rounded-lg border-2',
                getBgColorClass()
              )}>
                <motion.span
                  key={timeLeft.seconds}
                  initial={{ scale: 1.2, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={cn('text-xl font-bold leading-none', getTextColorClass())}
                >
                  {String(timeLeft.seconds).padStart(2, '0')}
                </motion.span>
                <span className="text-[9px] text-muted-foreground uppercase font-semibold mt-0.5">
                  Seg
                </span>
              </div>
            </div>

            {/* Botão de Upgrade */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative group px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white font-bold text-sm shadow-lg shadow-orange-500/30 transition-all flex items-center gap-2 overflow-hidden"
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-yellow-400/0 via-white/30 to-yellow-400/0"
                animate={{
                  x: ['-100%', '100%'],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  repeatDelay: 1,
                }}
              />
              <Crown className="w-4 h-4 relative z-10" />
              <span className="relative z-10 hidden sm:inline">Adquirir Versão Premium</span>
              <span className="relative z-10 sm:hidden">Upgrade</span>
              <Zap className="w-4 h-4 relative z-10" />
            </motion.button>

            {/* Botão de fechar */}
            <button
              onClick={() => setIsVisible(false)}
              className="p-1.5 rounded-lg hover:bg-primary/10 transition-colors opacity-50 hover:opacity-100"
              title="Ocultar banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
