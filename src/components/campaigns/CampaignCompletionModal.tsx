import React from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  AlertCircle,
  Trophy,
  TrendingUp,
  Users,
  Ban,
  PauseCircle,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface CampaignCompletionStats {
  status: 'completed' | 'cancelled' | 'paused' | 'failed';
  sent: number;
  failed: number;
  skipped: number;
  total: number;
  durationMs: number;
  startedAt: string | null;
  finishedAt: string | null;
}

interface CampaignCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onViewDetails?: () => void;
  onRestart?: () => void;
  campaignName: string;
  stats: CampaignCompletionStats | null;
  failedTargets?: { phone: string; name?: string | null; error?: string | null }[];
}

function formatDuration(ms: number): string {
  if (!ms || ms <= 0) return '—';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

const STATUS_META: Record<
  CampaignCompletionStats['status'],
  { title: string; color: string; bg: string; ring: string; Icon: any; headline: string }
> = {
  completed: {
    title: 'Campanha Concluída',
    headline: 'DISPARO FINALIZADO',
    color: 'text-emerald-400',
    bg: 'from-emerald-500/20 via-emerald-500/5 to-transparent',
    ring: 'shadow-[0_0_40px_rgba(16,185,129,0.35)] border-emerald-500/30',
    Icon: Trophy,
  },
  cancelled: {
    title: 'Campanha Cancelada',
    headline: 'DISPARO INTERROMPIDO',
    color: 'text-amber-400',
    bg: 'from-amber-500/20 via-amber-500/5 to-transparent',
    ring: 'shadow-[0_0_40px_rgba(245,158,11,0.25)] border-amber-500/30',
    Icon: Ban,
  },
  paused: {
    title: 'Campanha Pausada',
    headline: 'DISPARO PAUSADO',
    color: 'text-blue-400',
    bg: 'from-blue-500/20 via-blue-500/5 to-transparent',
    ring: 'shadow-[0_0_40px_rgba(59,130,246,0.25)] border-blue-500/30',
    Icon: PauseCircle,
  },
  failed: {
    title: 'Campanha Falhou',
    headline: 'ERRO NO DISPARO',
    color: 'text-rose-400',
    bg: 'from-rose-500/20 via-rose-500/5 to-transparent',
    ring: 'shadow-[0_0_40px_rgba(244,63,94,0.3)] border-rose-500/30',
    Icon: AlertCircle,
  },
};

export const CampaignCompletionModal: React.FC<CampaignCompletionModalProps> = ({
  isOpen,
  onClose,
  onViewDetails,
  onRestart,
  campaignName,
  stats,
  failedTargets = [],
}) => {
  if (!stats) return null;

  const meta = STATUS_META[stats.status];
  const { Icon } = meta;
  const successRate = stats.total > 0 ? Math.round((stats.sent / stats.total) * 100) : 0;
  const avgPerMsgMs = stats.sent > 0 && stats.durationMs > 0 ? Math.round(stats.durationMs / stats.sent) : 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[640px] bg-slate-950 border-slate-800 text-white overflow-hidden p-0 gap-0">
        <div className={cn('absolute inset-0 bg-gradient-to-br pointer-events-none', meta.bg)} />
        <div className="relative p-6 pb-2">
          <DialogHeader>
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  'relative h-14 w-14 shrink-0 rounded-2xl bg-slate-900/80 border flex items-center justify-center',
                  meta.ring,
                )}
              >
                <Icon className={cn('h-7 w-7', meta.color)} />
                {stats.status === 'completed' && (
                  <span className="absolute inset-0 rounded-2xl animate-ping bg-emerald-500/10" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className={cn('text-[10px] uppercase font-black tracking-widest', meta.color)}>
                  {meta.headline}
                </p>
                <DialogTitle className="text-2xl font-black italic tracking-tighter mt-0.5">
                  {meta.title}
                </DialogTitle>
                <DialogDescription className="text-slate-400 font-medium truncate">
                  {campaignName}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="relative z-10 p-6 pt-4 space-y-5">
          {/* Success-rate hero */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex items-center gap-5">
            <div className="relative h-24 w-24 shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="44" className="stroke-slate-800" strokeWidth="8" fill="none" />
                <circle
                  cx="50"
                  cy="50"
                  r="44"
                  className={cn('transition-all duration-700', meta.color)}
                  strokeWidth="8"
                  strokeLinecap="round"
                  fill="none"
                  stroke="currentColor"
                  strokeDasharray={`${2 * Math.PI * 44}`}
                  strokeDashoffset={`${2 * Math.PI * 44 * (1 - successRate / 100)}`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black italic tracking-tighter">{successRate}%</span>
                <span className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">Sucesso</span>
              </div>
            </div>
            <div className="flex-1 min-w-0 grid grid-cols-2 gap-3">
              <Stat icon={CheckCircle2} label="Enviados" value={stats.sent} tone="emerald" />
              <Stat icon={XCircle} label="Falharam" value={stats.failed} tone="rose" />
              <Stat icon={Users} label="Total" value={stats.total} tone="slate" />
              <Stat icon={Clock} label="Duração" value={formatDuration(stats.durationMs)} tone="blue" />
            </div>
          </div>

          {/* Extra metrics */}
          <div className="grid grid-cols-3 gap-3 text-xs">
            <MiniStat
              label="Tempo médio/msg"
              value={avgPerMsgMs > 0 ? `${(avgPerMsgMs / 1000).toFixed(1)}s` : '—'}
              Icon={TrendingUp}
            />
            <MiniStat
              label="Ignorados"
              value={stats.skipped.toLocaleString('pt-BR')}
              Icon={AlertCircle}
            />
            <MiniStat
              label="Iniciada"
              value={
                stats.startedAt
                  ? new Date(stats.startedAt).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '—'
              }
              Icon={Send}
            />
          </div>

          {/* Failed list */}
          {failedTargets.length > 0 && (
            <div className="bg-rose-500/5 border border-rose-500/20 rounded-2xl overflow-hidden">
              <div className="px-4 py-2 border-b border-rose-500/20 flex items-center justify-between">
                <span className="text-[10px] uppercase font-black tracking-widest text-rose-400 flex items-center gap-1.5">
                  <XCircle className="w-3 h-3" />
                  Falhas ({failedTargets.length})
                </span>
              </div>
              <div className="max-h-40 overflow-y-auto divide-y divide-rose-500/10">
                {failedTargets.slice(0, 50).map((t, i) => (
                  <div key={i} className="px-4 py-2 flex items-start gap-3 text-xs">
                    <div className="min-w-0 flex-1">
                      <p className="font-mono font-bold truncate">{t.phone}</p>
                      {t.name && <p className="text-slate-400 truncate">{t.name}</p>}
                    </div>
                    <p className="text-rose-300/80 text-[10px] max-w-[55%] truncate">
                      {t.error ?? 'Erro desconhecido'}
                    </p>
                  </div>
                ))}
                {failedTargets.length > 50 && (
                  <p className="px-4 py-2 text-[10px] text-slate-500 italic">
                    + {failedTargets.length - 50} mais — veja no histórico.
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            {onRestart && (
              <Button
                variant="outline"
                onClick={onRestart}
                className="flex-1 border-slate-700 hover:bg-slate-900 h-11 font-bold uppercase tracking-wider text-xs"
              >
                <Send className="w-4 h-4 mr-2" /> Disparar Novamente
              </Button>
            )}
            {onViewDetails && (
              <Button
                variant="outline"
                onClick={onViewDetails}
                className="flex-1 border-slate-700 hover:bg-slate-900 h-11 font-bold uppercase tracking-wider text-xs"
              >
                Ver no Histórico
              </Button>
            )}
            <Button
              onClick={onClose}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-black italic tracking-tighter h-11 shadow-[0_0_20px_rgba(37,99,235,0.4)]"
            >
              FECHAR
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const TONE: Record<string, string> = {
  emerald: 'text-emerald-400',
  rose: 'text-rose-400',
  slate: 'text-slate-300',
  blue: 'text-blue-400',
};

const Stat: React.FC<{ icon: any; label: string; value: number | string; tone: keyof typeof TONE }> = ({
  icon: Icon,
  label,
  value,
  tone,
}) => (
  <div>
    <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500 flex items-center gap-1">
      <Icon className="w-3 h-3" /> {label}
    </p>
    <p className={cn('text-xl font-black italic tracking-tighter', TONE[tone])}>
      {typeof value === 'number' ? value.toLocaleString('pt-BR') : value}
    </p>
  </div>
);

const MiniStat: React.FC<{ label: string; value: string; Icon: any }> = ({ label, value, Icon }) => (
  <div className="bg-slate-900/40 border border-slate-800 rounded-xl px-3 py-2">
    <p className="text-[9px] uppercase font-bold tracking-widest text-slate-500 flex items-center gap-1">
      <Icon className="w-3 h-3" /> {label}
    </p>
    <p className="text-sm font-bold mt-0.5">{value}</p>
  </div>
);
