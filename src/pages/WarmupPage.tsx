import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Flame, Plus, Play, Pause, Square, Trash2, BarChart2, RefreshCw,
  CheckCircle2, AlertCircle, Loader2, X, ChevronDown, ChevronUp,
  Mic, Image, Users, MessageSquare, Zap, Calendar, Settings2,
  Activity, TrendingUp, Shield, Radio, Volume2,
} from 'lucide-react';
import { Card, CardContent, Button, Badge } from '../components/ui/shared';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { toast } from 'sonner';
import {
  warmupService, type WarmupPlan, type WarmupStats,
  type WarmupPlanPayload, type WarmupMessage, type WarmupLog,
} from '../services/warmupService';
import { sessionService } from '../services/sessionService';
import { getSocket } from '../services/wsClient';
import { cn } from '../lib/utils';

// ─── Chip Health Gauge ───────────────────────────────────────────────────────

function ChipHealthGauge({ health, size = 100 }: { health: number; size?: number }) {
  const r = (size / 2) - 10;
  const circ = 2 * Math.PI * r;
  const offset = circ - (health / 100) * circ;
  const color = health >= 80 ? '#22c55e' : health >= 60 ? '#eab308' : health >= 40 ? '#f97316' : '#ef4444';
  const label = health >= 80 ? 'Excelente' : health >= 60 ? 'Bom' : health >= 40 ? 'Moderado' : 'Baixo';
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" style={{ filter: `drop-shadow(0 0 6px ${color}40)` }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
          <circle
            cx={size/2} cy={size/2} r={r} fill="none"
            stroke={color} strokeWidth="8"
            strokeDasharray={circ} strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1.2s ease, stroke 0.5s ease' }}
          />
        </svg>
        <div className="absolute text-center">
          <div className="font-bold leading-none" style={{ color, fontSize: size * 0.2 }}>{health}%</div>
          <div className="text-muted-foreground" style={{ fontSize: size * 0.1 }}>saúde</div>
        </div>
      </div>
      <span className="text-xs font-medium" style={{ color }}>{label}</span>
    </div>
  );
}

// ─── Animated counter ────────────────────────────────────────────────────────

function AnimCounter({ value, className }: { value: number; className?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const diff = value - display;
    if (diff === 0) return;
    const step = Math.ceil(Math.abs(diff) / 20);
    const t = setInterval(() => {
      setDisplay((p) => {
        const next = diff > 0 ? Math.min(p + step, value) : Math.max(p - step, value);
        if (next === value) clearInterval(t);
        return next;
      });
    }, 30);
    return () => clearInterval(t);
  }, [value]);
  return <span className={className}>{display}</span>;
}

// ─── Live Chat Bubbles ────────────────────────────────────────────────────────

interface Bubble {
  id: string;
  fromId: string;
  fromName: string;
  message: string;
  status: 'sent' | 'failed';
  mediaType: 'text' | 'image' | 'audio';
  timestamp: string;
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-3 py-2">
      {[0, 0.2, 0.4].map((d, i) => (
        <span
          key={i}
          className="w-2 h-2 rounded-full bg-primary/60"
          style={{ animation: `bounce 0.9s ${d}s infinite` }}
        />
      ))}
    </div>
  );
}

function ChatBubble({ bubble, isLeft, sessionInitial }: { bubble: Bubble; isLeft: boolean; sessionInitial: string }) {
  const mediaIcon = bubble.mediaType === 'image' ? '🖼️ ' : bubble.mediaType === 'audio' ? '🎤 ' : '';
  return (
    <div
      className={cn('flex items-end gap-2 mb-2', isLeft ? 'flex-row' : 'flex-row-reverse')}
      style={{ animation: 'slideInBubble 0.35s ease-out' }}
    >
      <div
        className={cn('w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 text-white',
          isLeft ? 'bg-primary' : 'bg-secondary')}
        style={{ boxShadow: `0 0 8px ${isLeft ? 'hsl(var(--primary)/0.4)' : 'hsl(var(--secondary)/0.4)'}` }}
      >
        {sessionInitial}
      </div>
      <div className={cn(
        'max-w-[72%] px-3 py-2 rounded-2xl text-sm leading-relaxed',
        isLeft
          ? 'bg-primary/15 border border-primary/20 rounded-bl-sm text-left'
          : 'bg-secondary/15 border border-secondary/20 rounded-br-sm text-right',
        bubble.status === 'failed' && 'opacity-60 border-red-500/40 bg-red-500/10',
      )}>
        <span>{mediaIcon}{bubble.message}</span>
        <div className={cn('text-[10px] mt-0.5 opacity-50', isLeft ? 'text-left' : 'text-right')}>
          {new Date(bubble.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          {bubble.status === 'failed' && ' ⚠️'}
        </div>
      </div>
    </div>
  );
}

function LiveChatFeed({ planId, sessions }: { planId: string; sessions: string[] }) {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [typing, setTyping] = useState(false);
  const [loadedSessions, setLoadedSessions] = useState<Record<string, string>>({});
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load initial recent logs
  useEffect(() => {
    warmupService.logs(planId, 1, 20).then((res) => {
      if (!res?.items?.length) return;
      const initial: Bubble[] = [...res.items].reverse().map((log: WarmupLog) => ({
        id: log.id,
        fromId: log.fromSession,
        fromName: log.fromSession.slice(-4),
        message: log.message,
        status: log.status,
        mediaType: (log.mediaType ?? 'text') as 'text' | 'image' | 'audio',
        timestamp: log.sentAt,
      }));
      setBubbles(initial);
    }).catch((err) => console.warn('[LiveChatFeed] failed to load logs:', err));
  }, [planId]);

  // Listen for live messages
  useEffect(() => {
    const socket = getSocket();
    const handleMsg = (data: WarmupMessage) => {
      if (data.planId !== planId) return;
      setTyping(false);
      setBubbles((prev) => {
        const next = [...prev, {
          id: `${Date.now()}-${Math.random()}`,
          fromId: data.fromId,
          fromName: data.fromName,
          message: data.message,
          status: data.status,
          mediaType: data.mediaType,
          timestamp: data.timestamp,
        }];
        return next.slice(-20);
      });
      setLoadedSessions((prev) => ({ ...prev, [data.fromId]: data.fromName, [data.toId]: data.toName }));
    };
    const handleProgress = (data: any) => {
      if (data.planId !== planId) return;
      if (data.status === 'running' && !data.waiting) {
        setTyping(true);
        setTimeout(() => setTyping(false), 3000);
      }
    };
    socket.on('warmup.message', handleMsg);
    socket.on('warmup.progress', handleProgress);
    return () => { socket.off('warmup.message', handleMsg); socket.off('warmup.progress', handleProgress); };
  }, [planId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [bubbles, typing]);

  const getInitial = (id: string, name: string) =>
    (loadedSessions[id] ?? name ?? id).charAt(0).toUpperCase();

  const firstSessionId = sessions[0];

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-3 py-2 custom-scrollbar space-y-0.5">
        {bubbles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
            <Radio className="w-8 h-8 opacity-30 animate-pulse" />
            <p className="text-xs">Aguardando mensagens...</p>
          </div>
        ) : (
          bubbles.map((b) => (
            <ChatBubble
              key={b.id}
              bubble={b}
              isLeft={b.fromId === firstSessionId}
              sessionInitial={getInitial(b.fromId, b.fromName)}
            />
          ))
        )}
        {typing && (
          <div className="flex items-end gap-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-xs text-white">...</div>
            <div className="bg-secondary/15 border border-secondary/20 rounded-2xl rounded-bl-sm">
              <TypingDots />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

// ─── Session Health Bar ───────────────────────────────────────────────────────

function SessionHealthBar({ session, chipHealth }: {
  session: { id: string; name: string; phoneNumber?: string | null; status: string };
  chipHealth: number;
}) {
  const connected = session.status === 'connected';
  const barColor = chipHealth >= 80 ? 'bg-green-500' : chipHealth >= 60 ? 'bg-yellow-500' : chipHealth >= 40 ? 'bg-orange-500' : 'bg-red-500';
  return (
    <div className="bg-primary/5 border border-primary/10 rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={cn('w-2 h-2 rounded-full', connected ? 'bg-green-500' : 'bg-red-500')}
            style={connected ? { boxShadow: '0 0 6px #22c55e' } : undefined} />
          <span className="text-sm font-medium truncate max-w-[120px]">{session.name}</span>
        </div>
        <span className="text-xs text-muted-foreground">{session.phoneNumber ?? '—'}</span>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Saúde do chip</span>
          <span className="font-medium">{chipHealth}%</span>
        </div>
        <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-1000', barColor)}
            style={{ width: `${chipHealth}%`, boxShadow: chipHealth >= 60 ? `0 0 8px ${barColor.replace('bg-', '')}` : undefined }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground/60">
          <span>Risco de ban</span>
          <span>{100 - chipHealth}%</span>
        </div>
      </div>
    </div>
  );
}

// ─── Plan Card ────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; color: string; glow: string }> = {
  idle:      { label: 'Parado',    color: 'text-muted-foreground', glow: '' },
  running:   { label: 'Ativo',     color: 'text-green-400',        glow: '#22c55e' },
  paused:    { label: 'Pausado',   color: 'text-yellow-400',       glow: '#eab308' },
  completed: { label: 'Concluído', color: 'text-blue-400',         glow: '#60a5fa' },
};

function PlanCard({ plan, onStart, onPause, onStop, onDelete, actionLoading, onEdit }: {
  plan: WarmupPlan;
  onStart: () => void; onPause: () => void; onStop: () => void;
  onDelete: () => void; onEdit: () => void; actionLoading: boolean;
}) {
  const [stats, setStats] = useState<WarmupStats | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const loadStats = useCallback(() => {
    warmupService.stats(plan.id).then(setStats).catch(() => undefined);
  }, [plan.id]);

  useEffect(() => { loadStats(); }, [loadStats]);

  useEffect(() => {
    const socket = getSocket();
    const handler = (data: any) => { if (data.planId === plan.id) loadStats(); };
    socket.on('warmup.progress', handler);
    return () => socket.off('warmup.progress', handler);
  }, [plan.id, loadStats]);

  const cfg = STATUS_CFG[plan.status] ?? STATUS_CFG.idle;
  const isRunning = plan.status === 'running';
  const isPaused = plan.status === 'paused';
  const isIdle = plan.status === 'idle';

  const quota = (() => {
    if (plan.durationDays <= 1) return plan.maxMsgsPerDay;
    const prog = Math.min(plan.currentDay, plan.durationDays) / plan.durationDays;
    return Math.round(plan.startMsgsPerDay + (plan.maxMsgsPerDay - plan.startMsgsPerDay) * prog);
  })();

  return (
    <Card
      className="border-primary/20 bg-card/60 backdrop-blur-sm overflow-hidden transition-all duration-300"
      style={isRunning ? { boxShadow: '0 0 30px rgba(var(--primary),0.08), 0 0 0 1px hsl(var(--primary)/0.2)' } : undefined}
    >
      {/* Animated top bar */}
      {isRunning && (
        <div className="h-0.5 bg-gradient-to-r from-primary via-secondary to-primary"
          style={{ animation: 'shimmer 2s linear infinite', backgroundSize: '200% 100%' }} />
      )}

      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-primary/10">
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn('p-2 rounded-xl', isRunning ? 'bg-green-500/10' : 'bg-primary/10')}>
              <Flame className={cn('w-5 h-5', cfg.color, isRunning && 'animate-pulse')}
                style={isRunning ? { filter: `drop-shadow(0 0 6px ${cfg.glow})` } : undefined} />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-base truncate">{plan.name}</h3>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn('text-xs font-medium', cfg.color)}>{cfg.label}</span>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">Dia {plan.currentDay}/{plan.durationDays}</span>
                {plan.useGroup && <Badge className="text-[10px] py-0 h-4 bg-purple-500/20 text-purple-300 border-purple-500/30">Grupo</Badge>}
                {plan.mediaEnabled && <Badge className="text-[10px] py-0 h-4 bg-blue-500/20 text-blue-300 border-blue-500/30">Mídia</Badge>}
                {plan.audioEnabled && <Badge className="text-[10px] py-0 h-4 bg-orange-500/20 text-orange-300 border-orange-500/30">Áudio</Badge>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {(isIdle || isPaused) && (
              <Button size="sm" variant="outline" className="h-8 px-2.5 border-green-500/40 text-green-400 hover:bg-green-500/10" onClick={onStart} disabled={actionLoading}>
                <Play className="w-3.5 h-3.5" />
              </Button>
            )}
            {isRunning && (
              <Button size="sm" variant="outline" className="h-8 px-2.5 border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10" onClick={onPause} disabled={actionLoading}>
                <Pause className="w-3.5 h-3.5" />
              </Button>
            )}
            {(isRunning || isPaused) && (
              <Button size="sm" variant="outline" className="h-8 px-2.5 border-red-500/40 text-red-400 hover:bg-red-500/10" onClick={onStop} disabled={actionLoading}>
                <Square className="w-3.5 h-3.5" />
              </Button>
            )}
            <Button size="sm" variant="outline" className="h-8 px-2.5" onClick={onEdit} disabled={actionLoading}>
              <Settings2 className="w-3.5 h-3.5" />
            </Button>
            <Button size="sm" variant="outline" className="h-8 px-2.5" onClick={() => setShowLogs(true)}>
              <BarChart2 className="w-3.5 h-3.5" />
            </Button>
            {isIdle && (
              <Button size="sm" variant="outline" className="h-8 px-2.5 border-red-500/30 text-red-400 hover:bg-red-500/10" onClick={onDelete} disabled={actionLoading}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
            <button onClick={() => setExpanded(!expanded)} className="p-1.5 rounded-lg hover:bg-primary/10 transition-colors">
              {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>
          </div>
        </div>

        {expanded && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
            {/* Left: Stats + Health */}
            <div className="p-5 space-y-4 border-r border-primary/10">
              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Total', value: stats?.total ?? 0, color: 'text-primary', icon: TrendingUp },
                  { label: 'Hoje', value: stats?.todayCount ?? 0, color: 'text-green-400', icon: Zap },
                  { label: 'Falhas', value: stats?.failed ?? 0, color: 'text-red-400', icon: AlertCircle },
                ].map(({ label, value, color, icon: Icon }) => (
                  <div key={label} className="bg-primary/5 rounded-xl p-3 text-center border border-primary/10">
                    <Icon className={cn('w-4 h-4 mx-auto mb-1', color)} />
                    <AnimCounter value={value} className={cn('text-xl font-bold', color)} />
                    <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                  </div>
                ))}
              </div>

              {/* Day progress */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progresso do plano</span>
                  <span>{stats?.progress ?? 0}%</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-1000"
                    style={{ width: `${stats?.progress ?? 0}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground/60">
                  <span>Dia {plan.currentDay}</span>
                  <span>{quota} msgs hoje</span>
                  <span>Dia {plan.durationDays}</span>
                </div>
              </div>

              {/* Chip health gauge */}
              <div className="flex items-center justify-center gap-6">
                <ChipHealthGauge health={stats?.chipHealth ?? 5} size={110} />
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-green-400" />
                    <span className="text-muted-foreground text-xs">Proteção</span>
                    <span className="font-bold text-green-400 text-xs">{stats?.chipHealth ?? 5}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400" />
                    <span className="text-muted-foreground text-xs">Risco ban</span>
                    <span className="font-bold text-red-400 text-xs">{100 - (stats?.chipHealth ?? 5)}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-400" />
                    <span className="text-muted-foreground text-xs">Config</span>
                    <span className="text-xs text-muted-foreground">{plan.intervalMin}–{plan.intervalMax}s</span>
                  </div>
                </div>
              </div>

              {/* Session health bars */}
              {stats?.sessions && stats.sessions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Sessões</p>
                  {stats.sessions.map((s) => (
                    <SessionHealthBar key={s.id} session={s} chipHealth={stats.chipHealth} />
                  ))}
                </div>
              )}
            </div>

            {/* Right: Live Chat */}
            <div className="flex flex-col" style={{ minHeight: 340 }}>
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-primary/10 bg-primary/5">
                <div className={cn('w-2 h-2 rounded-full', isRunning ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground/30')}
                  style={isRunning ? { boxShadow: '0 0 6px #22c55e' } : undefined} />
                <span className="text-xs font-medium text-muted-foreground">
                  {isRunning ? 'Chat ao vivo' : 'Histórico de mensagens'}
                </span>
                {plan.useGroup && <Badge className="text-[10px] py-0 h-4 ml-auto bg-purple-500/20 text-purple-300 border-purple-500/30"><Users className="w-2.5 h-2.5 mr-1" />Grupo</Badge>}
              </div>
              <div className="flex-1 overflow-hidden">
                <LiveChatFeed planId={plan.id} sessions={plan.sessionIds} />
              </div>
            </div>
          </div>
        )}
      </CardContent>

      {showLogs && <LogsModal plan={plan} onClose={() => setShowLogs(false)} />}
    </Card>
  );
}

// ─── Logs Modal ───────────────────────────────────────────────────────────────

function LogsModal({ plan, onClose }: { plan: WarmupPlan; onClose: () => void }) {
  const [data, setData] = useState<any>({ items: [], total: 0, dailyStats: [] });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    try { const d = await warmupService.logs(plan.id, p, 20); setData(d); setPage(p); }
    finally { setLoading(false); }
  }, [plan.id]);

  useEffect(() => { load(1); }, [load]);

  const totalPages = Math.ceil(data.total / 20);
  const mediaIcon = (t: string) => t === 'image' ? '🖼️' : t === 'audio' ? '🎤' : '💬';

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-primary" />
            Logs — {plan.name}
          </DialogTitle>
        </DialogHeader>

        {data.dailyStats.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
            {data.dailyStats.map((d: any) => (
              <div key={d.day} className="flex-shrink-0 text-center bg-primary/5 rounded-lg p-2 min-w-[70px] border border-primary/10">
                <p className="text-xs text-muted-foreground">{new Date(d.day).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</p>
                <p className="text-sm font-bold text-green-400">{d.sent}</p>
                {d.failed > 0 && <p className="text-xs text-red-400">{d.failed} ✗</p>}
              </div>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5 min-h-0">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : data.items.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">Nenhum log ainda</p>
          ) : (
            data.items.map((log: any) => (
              <div key={log.id} className={cn('flex items-center gap-3 px-3 py-2 rounded-lg text-sm', log.status === 'sent' ? 'bg-green-500/5' : 'bg-red-500/5')}>
                <span>{mediaIcon(log.mediaType ?? 'text')}</span>
                {log.status === 'sent' ? <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
                <span className="flex-1 truncate text-muted-foreground">{log.message}</span>
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {new Date(log.sentAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2 border-t border-primary/10">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => load(page - 1)}>Anterior</Button>
            <span className="text-xs text-muted-foreground">Página {page} de {totalPages}</span>
            <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => load(page + 1)}>Próxima</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Plan Form ────────────────────────────────────────────────────────────────

function PlanForm({ initial, sessions, onSave, onClose, loading }: {
  initial?: Partial<WarmupPlanPayload>;
  sessions: any[];
  onSave: (d: WarmupPlanPayload) => Promise<void>;
  onClose: () => void;
  loading: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [selectedSessions, setSelectedSessions] = useState<string[]>(initial?.sessionIds ?? []);
  const [durationDays, setDurationDays] = useState(initial?.durationDays ?? 14);
  const [startMsgsPerDay, setStartMsgsPerDay] = useState(initial?.startMsgsPerDay ?? 5);
  const [maxMsgsPerDay, setMaxMsgsPerDay] = useState(initial?.maxMsgsPerDay ?? 40);
  const [windowStart, setWindowStart] = useState(initial?.windowStart ?? '');
  const [windowEnd, setWindowEnd] = useState(initial?.windowEnd ?? '');
  const [intervalMin, setIntervalMin] = useState(initial?.intervalMin ?? 30);
  const [intervalMax, setIntervalMax] = useState(initial?.intervalMax ?? 120);
  const [useGroup, setUseGroup] = useState(initial?.useGroup ?? false);
  const [groupJid, setGroupJid] = useState(initial?.groupJid ?? '');
  const [mediaEnabled, setMediaEnabled] = useState(initial?.mediaEnabled ?? false);
  const [mediaFreq, setMediaFreq] = useState(initial?.mediaFreq ?? 5);
  const [audioEnabled, setAudioEnabled] = useState(initial?.audioEnabled ?? false);
  const [customMessages, setCustomMessages] = useState((initial?.customMessages ?? []).join('\n'));
  const [tab, setTab] = useState<'basic' | 'media' | 'messages'>('basic');

  const toggleSession = (id: string) =>
    setSelectedSessions((p) => p.includes(id) ? p.filter((s) => s !== id) : [...p, id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSessions.length < 2) { toast.error('Selecione ao menos 2 sessões'); return; }
    const msgs = customMessages.split('\n').map((s) => s.trim()).filter(Boolean);
    await onSave({
      name, sessionIds: selectedSessions, durationDays, startMsgsPerDay, maxMsgsPerDay,
      windowStart: windowStart || undefined, windowEnd: windowEnd || undefined,
      intervalMin, intervalMax, useGroup, groupJid: groupJid || undefined,
      mediaEnabled, mediaFreq, audioEnabled, customMessages: msgs,
    });
  };

  const tabs = [
    { id: 'basic' as const, label: 'Configuração', icon: Settings2 },
    { id: 'media' as const, label: 'Mídia & Áudio', icon: Image },
    { id: 'messages' as const, label: 'Mensagens', icon: MessageSquare },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 bg-primary/5 rounded-xl p-1">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" onClick={() => setTab(id)}
            className={cn('flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all',
              tab === id ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:text-foreground')}>
            <Icon className="w-3.5 h-3.5" />{label}
          </button>
        ))}
      </div>

      {tab === 'basic' && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome do plano</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Aquecimento Principal" required />
          </div>

          <div className="space-y-2">
            <Label>Sessões <span className="text-muted-foreground text-xs">(mín. 2)</span></Label>
            <div className="grid gap-1.5 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
              {sessions.map((s) => (
                <button key={s.id} type="button" onClick={() => toggleSession(s.id)}
                  className={cn('flex items-center gap-2.5 px-3 py-2 rounded-xl border text-left transition-all text-sm',
                    selectedSessions.includes(s.id) ? 'border-primary bg-primary/10 text-primary' : 'border-primary/20 hover:border-primary/40 text-muted-foreground')}>
                  <div className={cn('w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0',
                    selectedSessions.includes(s.id) ? 'border-primary bg-primary' : 'border-muted-foreground')}>
                    {selectedSessions.includes(s.id) && <X className="w-2.5 h-2.5 text-primary-foreground" />}
                  </div>
                  <div><p className="font-medium">{s.name}</p>{s.phoneNumber && <p className="text-xs opacity-60">{s.phoneNumber}</p>}</div>
                </button>
              ))}
              {sessions.length === 0 && <p className="text-sm text-muted-foreground text-center py-3">Nenhuma sessão conectada</p>}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5"><Label>Duração (dias)</Label><Input type="number" min={1} max={90} value={durationDays} onChange={(e) => setDurationDays(+e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Início msgs/dia</Label><Input type="number" min={1} max={50} value={startMsgsPerDay} onChange={(e) => setStartMsgsPerDay(+e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Máx msgs/dia</Label><Input type="number" min={1} max={200} value={maxMsgsPerDay} onChange={(e) => setMaxMsgsPerDay(+e.target.value)} /></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Janela início (UTC)</Label><Input type="time" value={windowStart} onChange={(e) => setWindowStart(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Janela fim (UTC)</Label><Input type="time" value={windowEnd} onChange={(e) => setWindowEnd(e.target.value)} /></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Intervalo mín (seg)</Label><Input type="number" min={10} max={3600} value={intervalMin} onChange={(e) => setIntervalMin(+e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Intervalo máx (seg)</Label><Input type="number" min={10} max={3600} value={intervalMax} onChange={(e) => setIntervalMax(+e.target.value)} /></div>
          </div>

          {/* Group mode */}
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-medium text-purple-300">Modo Grupo</span>
              </div>
              <button type="button" onClick={() => setUseGroup(!useGroup)}
                className={cn('w-10 h-5 rounded-full transition-all relative', useGroup ? 'bg-purple-500' : 'bg-white/10')}>
                <span className={cn('absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow', useGroup ? 'left-5' : 'left-0.5')} />
              </button>
            </div>
            {useGroup && (
              <div className="space-y-1.5">
                <Label className="text-xs">JID do Grupo (ex: 5521999...@g.us)</Label>
                <Input value={groupJid} onChange={(e) => setGroupJid(e.target.value)} placeholder="5521999...@g.us" className="text-xs" />
                <p className="text-[10px] text-muted-foreground">As mensagens serão enviadas para este grupo em vez de mensagens diretas.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'media' && (
        <div className="space-y-4">
          {/* Images */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Image className="w-4 h-4 text-blue-400" />
                <div>
                  <p className="text-sm font-medium text-blue-300">Imagens Aleatórias</p>
                  <p className="text-xs text-muted-foreground">Envia imagens aleatórias durante o aquecimento</p>
                </div>
              </div>
              <button type="button" onClick={() => setMediaEnabled(!mediaEnabled)}
                className={cn('w-10 h-5 rounded-full transition-all relative', mediaEnabled ? 'bg-blue-500' : 'bg-white/10')}>
                <span className={cn('absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow', mediaEnabled ? 'left-5' : 'left-0.5')} />
              </button>
            </div>
            {mediaEnabled && (
              <div className="space-y-1.5">
                <Label className="text-xs">Frequência (a cada N mensagens)</Label>
                <Input type="number" min={1} max={50} value={mediaFreq} onChange={(e) => setMediaFreq(+e.target.value)} />
              </div>
            )}
          </div>

          {/* Audio */}
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mic className="w-4 h-4 text-orange-400" />
                <div>
                  <p className="text-sm font-medium text-orange-300">Áudios Aleatórios</p>
                  <p className="text-xs text-muted-foreground">Envia áudios curtos gerados automaticamente</p>
                </div>
              </div>
              <button type="button" onClick={() => setAudioEnabled(!audioEnabled)}
                className={cn('w-10 h-5 rounded-full transition-all relative', audioEnabled ? 'bg-orange-500' : 'bg-white/10')}>
                <span className={cn('absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow', audioEnabled ? 'left-5' : 'left-0.5')} />
              </button>
            </div>
          </div>

          <div className="bg-primary/5 rounded-xl p-3 text-xs text-muted-foreground space-y-1 border border-primary/10">
            <p className="font-medium text-foreground">Como funciona:</p>
            <p>• Imagens são buscadas de fontes públicas e variam a cada envio</p>
            <p>• Áudios são gerados localmente com variações naturais</p>
            <p>• A frequência é intercalada com mensagens de texto normais</p>
          </div>
        </div>
      )}

      {tab === 'messages' && (
        <div className="space-y-3">
          <div className="bg-primary/5 rounded-xl p-3 border border-primary/10">
            <p className="text-xs text-muted-foreground">
              Cole aqui mensagens personalizadas (uma por linha). Se vazio, usará o banco padrão com 30 mensagens.
              Recomendamos ao menos 10 mensagens variadas.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Mensagens personalizadas</Label>
            <Textarea
              value={customMessages}
              onChange={(e) => setCustomMessages(e.target.value)}
              placeholder={"Oi, tudo bem?\nOlá! Como você está?\nE aí, novidade?"}
              className="min-h-[180px] text-sm font-mono"
            />
            <p className="text-xs text-muted-foreground">
              {customMessages.split('\n').filter((s) => s.trim()).length} mensagens definidas
            </p>
          </div>
        </div>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Salvar
        </Button>
      </DialogFooter>
    </form>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export const WarmupPage: React.FC = () => {
  const [plans, setPlans] = useState<WarmupPlan[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editPlan, setEditPlan] = useState<WarmupPlan | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const [p, s] = await Promise.all([warmupService.list(), sessionService.list()]);
      setPlans(p);
      setSessions(s.filter((s: any) => s.status === 'connected'));
    } catch { toast.error('Erro ao carregar planos'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const socket = getSocket();
    const handler = () => warmupService.list().then(setPlans).catch(() => undefined);
    socket.on('warmup.progress', handler);
    return () => socket.off('warmup.progress', handler);
  }, []);

  const handleSave = async (data: WarmupPlanPayload) => {
    setFormLoading(true);
    try {
      if (editPlan) {
        await warmupService.update(editPlan.id, data);
        toast.success('Plano atualizado!');
      } else {
        await warmupService.create(data);
        toast.success('Plano criado!');
      }
      setFormOpen(false); setEditPlan(null);
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao salvar');
    } finally { setFormLoading(false); }
  };

  const act = async (planId: string, fn: () => Promise<any>, msg: string) => {
    setActionLoading(planId);
    try { await fn(); toast.success(msg); await load(); }
    catch (e: any) { toast.error(e?.message ?? 'Erro'); }
    finally { setActionLoading(null); }
  };

  const totalMsgsToday = plans.reduce((acc) => acc, 0);

  return (
    <div className="space-y-6">
      <style>{`
        @keyframes slideInBubble {
          from { opacity: 0; transform: translateY(12px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes shimmer {
          0% { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10">
              <Flame className="w-6 h-6 text-primary" style={{ filter: 'drop-shadow(0 0 8px hsl(var(--primary)/0.5))' }} />
            </div>
            Aquecimento de Números
          </h1>
          <p className="text-sm text-muted-foreground mt-1 ml-0.5">
            Sessões trocam mensagens para aquecer os números gradualmente
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </Button>
          <Button onClick={() => { setEditPlan(null); setFormOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />Novo Plano
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Planos', value: plans.length, icon: Calendar, color: 'text-primary', glow: 'hsl(var(--primary)/0.2)' },
          { label: 'Ativos', value: plans.filter((p) => p.status === 'running').length, icon: Flame, color: 'text-green-400', glow: '#22c55e30' },
          { label: 'Sessões online', value: sessions.length, icon: Zap, color: 'text-yellow-400', glow: '#eab30830' },
          { label: 'Concluídos', value: plans.filter((p) => p.status === 'completed').length, icon: CheckCircle2, color: 'text-blue-400', glow: '#60a5fa30' },
        ].map(({ label, value, icon: Icon, color, glow }) => (
          <Card key={label} className="bg-card/60 border-primary/20" style={{ boxShadow: `0 0 20px ${glow}` }}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Icon className={cn('w-5 h-5', color)} />
              </div>
              <div>
                <AnimCounter value={value} className={cn('text-2xl font-bold', color)} />
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Plans */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : plans.length === 0 ? (
        <Card className="bg-card/40 border-primary/20">
          <CardContent className="py-16 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <Flame className="w-8 h-8 text-primary/40" />
            </div>
            <div>
              <p className="font-medium">Nenhum plano de aquecimento</p>
              <p className="text-sm text-muted-foreground mt-1">Crie seu primeiro plano para começar a aquecer números</p>
            </div>
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />Criar primeiro plano
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              actionLoading={actionLoading === plan.id}
              onStart={() => act(plan.id, () => warmupService.start(plan.id), 'Aquecimento iniciado!')}
              onPause={() => act(plan.id, () => warmupService.pause(plan.id), 'Aquecimento pausado')}
              onStop={() => act(plan.id, () => warmupService.stop(plan.id), 'Aquecimento parado')}
              onDelete={() => { if (!confirm(`Excluir "${plan.name}"?`)) return; act(plan.id, () => warmupService.delete(plan.id), 'Plano excluído'); }}
              onEdit={() => { setEditPlan(plan); setFormOpen(true); }}
            />
          ))}
        </div>
      )}

      {formOpen && (
        <Dialog open onOpenChange={() => { setFormOpen(false); setEditPlan(null); }}>
          <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto custom-scrollbar">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-primary" />
                {editPlan ? 'Editar Plano' : 'Novo Plano de Aquecimento'}
              </DialogTitle>
            </DialogHeader>
            <PlanForm
              initial={editPlan ? {
                name: editPlan.name, sessionIds: editPlan.sessionIds,
                durationDays: editPlan.durationDays, startMsgsPerDay: editPlan.startMsgsPerDay,
                maxMsgsPerDay: editPlan.maxMsgsPerDay, windowStart: editPlan.windowStart ?? '',
                windowEnd: editPlan.windowEnd ?? '', intervalMin: editPlan.intervalMin,
                intervalMax: editPlan.intervalMax, useGroup: editPlan.useGroup,
                groupJid: editPlan.groupJid ?? '', mediaEnabled: editPlan.mediaEnabled,
                mediaFreq: editPlan.mediaFreq, audioEnabled: editPlan.audioEnabled,
                customMessages: editPlan.customMessages,
              } : undefined}
              sessions={sessions}
              onSave={handleSave}
              onClose={() => { setFormOpen(false); setEditPlan(null); }}
              loading={formLoading}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
