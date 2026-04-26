import { motion } from 'framer-motion';
import { Sparkles, Clock, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '@/store';

export function TrialBanner() {
  const { user } = useAuthStore();

  // Verificar se o usuário está em trial
  const isTrialUser = user?.subscription?.status === 'trial' || user?.email?.includes('trial');

  if (!isTrialUser) return null;

  const expiresAt = user?.subscription?.expiresAt;
  const expiresDate = expiresAt ? new Date(expiresAt) : null;
  const now = new Date();
  const hoursLeft = expiresDate ? Math.max(0, Math.floor((expiresDate.getTime() - now.getTime()) / (1000 * 60 * 60))) : 0;
  const minutesLeft = expiresDate ? Math.max(0, Math.floor(((expiresDate.getTime() - now.getTime()) % (1000 * 60 * 60)) / (1000 * 60))) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden"
    >
      {/* Gradiente animado de fundo */}
      <motion.div
        animate={{
          backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'linear',
        }}
        className="absolute inset-0 bg-gradient-to-r from-orange-500 via-yellow-500 via-orange-400 to-orange-500 bg-[length:200%_100%]"
        style={{
          backgroundSize: '200% 100%',
        }}
      />

      {/* Overlay com padrão */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      {/* Conteúdo */}
      <div className="relative px-6 py-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            {/* Ícone animado */}
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center"
            >
              <Sparkles className="w-6 h-6 text-white" />
            </motion.div>

            {/* Texto */}
            <div className="text-white">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-xl font-bold tracking-tight">
                  MODO TRIAL ATIVO
                </h3>
                <motion.div
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <AlertTriangle className="w-5 h-5" />
                </motion.div>
              </div>
              <p className="text-white/90 text-sm font-medium">
                Você está testando o sistema com acesso temporário
              </p>
            </div>
          </div>

          {/* Contador de tempo */}
          <div className="flex items-center gap-3">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/30">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-white" />
                <div className="text-white">
                  <div className="text-xs font-medium opacity-90">Tempo Restante</div>
                  <div className="text-lg font-bold tabular-nums">
                    {hoursLeft > 0 ? (
                      `${hoursLeft}h ${minutesLeft}min`
                    ) : minutesLeft > 0 ? (
                      `${minutesLeft} minutos`
                    ) : (
                      'Expirando...'
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Botão de upgrade */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-white text-orange-600 px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-shadow"
            >
              Fazer Upgrade
            </motion.button>
          </div>
        </div>
      </div>

      {/* Barra de progresso */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
        <motion.div
          initial={{ width: '100%' }}
          animate={{ width: `${(hoursLeft / 72) * 100}%` }}
          className="h-full bg-white"
          transition={{ duration: 0.5 }}
        />
      </div>
    </motion.div>
  );
}
