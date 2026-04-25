import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import {
  Flame, Plus, Play, Pause, Square, Trash2, BarChart2, RefreshCw,
  CheckCircle2, AlertCircle, Loader2, X, ChevronDown, ChevronUp,
  Mic, Image as ImageIcon, Users, MessageSquare, Zap, Calendar, Settings2,
  Activity, TrendingUp, Shield, Radio, ArrowDown, Clock,
  Wifi, WifiOff,
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
  type WarmupSessionDetail,
} from '../services/warmupService';
import { sessionService } from '../services/sessionService';
import { groupsService } from '../services/groupsService';
import { getSocket } from '../services/wsClient';
import { cn } from '../lib/utils';

// ─── Inline keyframes ─────────────────────────────────────────────────────────

const STYLES = `
  @keyframes slideInBubble {
    from { opacity: 0; transform: translateY(10px) scale(0.96); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes shimmer {
    0%   { background-position: 200% center; }
    100% { background-position: -200% center; }
  }
  @keyframes typingBounce {
    0%, 60%, 100% { transform: translateY(0); }
    30%           { transform: translateY(-6px); }
  }
  @keyframes pulse-ring {
    0%   { box-shadow: 0 0 0 0 rgba(34,197,94,0.5); }
    70%  { box-shadow: 0 0 0 8px rgba(34,197,94,0); }
    100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
  }
`;

// ─── Utils ────────────────────────────────────────────────────────────────────

function safeFormatTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '--:--';
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function getInitialFromName(name: string): string {
  if (!name) return '?';
  const trimmed = name.trim();
  if (!trimmed) return '?';
  // Use Array.from to handle emojis/multi-byte chars correctly
  const chars = Array.from(trimmed);
  const first = chars.find((c) => /[A-Za-zÀ-ÿ0-9]/.test(c));
  return (first ?? chars[0] ?? '?').toUpperCase();
}

// Stable hash → color index for orphan/unknown senders
function hashIndex(str: string, modulo: number): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return Math.abs(h) % modulo;
}

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

// ─── Chip Health Gauge ────────────────────────────────────────────────────────

function ChipHealthGauge({ health, size = 100 }: { health: number | null; size?: number }) {
  const r = (size / 2) - 10;
  const circ = 2 * Math.PI * r;
  const pct = health ?? 0;
  const offset = circ - (pct / 100) * circ;
  const color = health === null ? 'rgba(255,255,255,0.2)'
    : pct >= 80 ? '#22c55e' : pct >= 60 ? '#eab308' : pct >= 40 ? '#f97316' : '#ef4444';
  const label = health === null ? '—'
    : pct >= 80 ? 'Excelente' : pct >= 60 ? 'Bom' : pct >= 40 ? 'Moderado' : 'Baixo';

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" style={{ filter: health ? `drop-shadow(0 0 6px ${color}40)` : undefined }}>
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
          <div className="font-bold leading-none" style={{ color, fontSize: health !== null ? size * 0.2 : size * 0.16 }}>
            {health !== null ? `${pct}%` : '—'}
          </div>
          <div className="text-muted-foreground" style={{ fontSize: size * 0.1 }}>saúde</div>
        </div>
      </div>
      <span className="text-xs font-medium" style={{ color }}>{label}</span>
    </div>
  );
}

// ─── Animated counter ─────────────────────────────────────────────────────────

function AnimCounter({ value, className }: { value: number; className?: string }) {
  const [display, setDisplay] = useState(value);
  const prevValue = useRef(value);

  useEffect(() => {
    const start = prevValue.current;
    prevValue.current = value;
    const diff = value - start;
    if (diff === 0) return;
    const steps = 20;
    let count = 0;
    const t = setInterval(() => {
      count++;
      const next = Math.round(start + (diff * count) / steps);
      setDisplay(count >= steps ? value : next);
      if (count >= steps) clearInterval(t);
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

const BUBBLE_COLORS = [
  { bg: 'bg-primary/15', border: 'border-primary/20', avatar: 'bg-primary' },
  { bg: 'bg-secondary/15', border: 'border-secondary/20', avatar: 'bg-secondary' },
  { bg: 'bg-purple-500/15', border: 'border-purple-500/20', avatar: 'bg-purple-500' },
  { bg: 'bg-green-500/15', border: 'border-green-500/20', avatar: 'bg-green-600' },
  { bg: 'bg-pink-500/15', border: 'border-pink-500/20', avatar: 'bg-pink-500' },
  { bg: 'bg-cyan-500/15', border: 'border-cyan-500/20', avatar: 'bg-cyan-500' },
];

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-3 py-2">
      {[0, 0.2, 0.4].map((d, i) => (
        <span
          key={i}
          className="w-2 h-2 rounded-full bg-primary/60"
          style={{ animation: `typingBounce 0.9s ${d}s infinite` }}
        />
      ))}
    </div>
  );
}

function ChatBubble({ bubble, sessionIndex, sessionInitial }: { bubble: Bubble; sessionIndex: number; sessionInitial: string }) {
  const colorIdx = sessionIndex % BUBBLE_COLORS.length;
  const scheme = BUBBLE_COLORS[colorIdx];
  const isLeft = sessionIndex % 2 === 0;
  const mediaIcon = bubble.mediaType === 'image' ? '🖼️ ' : bubble.mediaType === 'audio' ? '🎤 ' : '';

  return (
    <div
      className={cn('flex items-end gap-2 mb-2', isLeft ? 'flex-row' : 'flex-row-reverse')}
      style={{ animation: 'slideInBubble 0.35s ease-out' }}
    >
      <div
        className={cn('w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 text-white', scheme.avatar)}
        title={bubble.fromName}
      >
        {sessionInitial}
      </div>
      <div className={cn(
        'max-w-[72%] px-3 py-2 rounded-2xl text-sm leading-relaxed border',
        scheme.bg, scheme.border,
        isLeft ? 'rounded-bl-sm' : 'rounded-br-sm',
        bubble.status === 'failed' && 'opacity-60 border-red-500/40 bg-red-500/10',
      )}>
        <div className="text-[10px] font-semibold opacity-70 mb-0.5">{bubble.fromName}</div>
        <span>{mediaIcon}{bubble.message}</span>
        <div className={cn('text-[10px] mt-0.5 opacity-50', isLeft ? 'text-left' : 'text-right')}>
          {safeFormatTime(bubble.timestamp)}
          {bubble.status === 'failed' && ' ⚠️'}
        </div>
      </div>
    </div>
  );
}

function buildLiveMessageKey(item: { fromId: string; timestamp: string; status: string; mediaType: string; message: string }): string {
  return `${item.fromId}|${item.timestamp}|${item.status}|${item.mediaType}|${item.message}`;
}

function LiveChatFeed({ planId, sessions, isRunning }: { planId: string; sessions: string[]; isRunning: boolean }) {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [typing, setTyping] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout>>();
  const seenKeysRef = useRef<Set<string>>(new Set());

  const sessionIndexOf = useCallback((id: string) => {
    const idx = sessions.indexOf(id);
    if (idx >= 0) return idx;
    // Orphan session — stable hash-based index past known sessions
    return sessions.length + hashIndex(id, BUBBLE_COLORS.length);
  }, [sessions]);

  // Load initial logs
  const loadLogs = useCallback(async () => {
    try {
      const res = await warmupService.logs(planId, 1, 25);
      if (!res?.items?.length) {
        seenKeysRef.current.clear();
        setBubbles([]);
        return;
      }
      const initial: Bubble[] = [...res.items].reverse().map((log: WarmupLog) => ({
        id: log.id,
        fromId: log.fromSession,
        fromName: log.fromName ?? `Sessão ${log.fromSession.slice(-4)}`,
        message: log.message,
        status: log.status,
        mediaType: (log.mediaType ?? 'text') as 'text' | 'image' | 'audio',
        timestamp: log.sentAt,
      }));
      seenKeysRef.current = new Set(
        initial.map((b) => buildLiveMessageKey({
          fromId: b.fromId,
          timestamp: b.timestamp,
          status: b.status,
          mediaType: b.mediaType,
          message: b.message,
        })),
      );
      setBubbles(initial);
    } catch (err) {
      console.warn('[LiveChatFeed] load logs failed:', err);
    }
  }, [planId]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  // Polling fallback while running (every 30s)
  useEffect(() => {
    if (!isRunning) return;
    const t = setInterval(loadLogs, 30_000);
    return () => clearInterval(t);
  }, [isRunning, loadLogs]);

  // WS listeners
  useEffect(() => {
    const socket = getSocket();
    setWsConnected(socket.connected);

    const onConnect = () => setWsConnected(true);
    const onDisconnect = () => setWsConnected(false);

    const handleMsg = (data: WarmupMessage) => {
      if (!data || data.planId !== planId) return;
      const liveKey = buildLiveMessageKey({
        fromId: data.fromId,
        timestamp: data.timestamp,
        status: data.status,
        mediaType: data.mediaType,
        message: data.message,
      });
      if (seenKeysRef.current.has(liveKey)) return;

      clearTimeout(typingTimer.current);
      setTyping(false);
      setBubbles((prev) => {
        seenKeysRef.current.add(liveKey);
        if (seenKeysRef.current.size > 500) {
          seenKeysRef.current = new Set(Array.from(seenKeysRef.current).slice(-300));
        }
        const next = [...prev, {
          id: `live-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          fromId: data.fromId,
          fromName: data.fromName ?? `Sessão ${data.fromId.slice(-4)}`,
          message: data.message,
          status: data.status,
          mediaType: data.mediaType,
          timestamp: data.timestamp,
        }];
        return next.slice(-50);
      });
    };

    const handleProgress = (data: any) => {
      if (!data || data.planId !== planId) return;
      if (data.status === 'running' && !data.waiting) {
        setTyping(true);
        clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setTyping(false), 5000);
      } else {
        setTyping(false);
      }
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('warmup.message', handleMsg);
    socket.on('warmup.progress', handleProgress);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('warmup.message', handleMsg);
      socket.off('warmup.progress', handleProgress);
      clearTimeout(typingTimer.current);
    };
  }, [planId]);

  // Smart scroll: only auto-scroll if user is near the bottom
  const checkScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    setAutoScroll(distance < 80);
  }, []);

  useEffect(() => {
    if (autoScroll) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [bubbles, typing, autoScroll]);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    setAutoScroll(true);
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Connection indicator */}
      <div className="absolute top-1 right-2 z-10 flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-background/60 backdrop-blur-sm">
        {wsConnected ? (
          <><Wifi className="w-2.5 h-2.5 text-green-400" /><span className="text-green-400">conectado</span></>
        ) : (
          <><WifiOff className="w-2.5 h-2.5 text-red-400" /><span className="text-red-400">offline</span></>
        )}
      </div>

      <div
        ref={containerRef}
        onScroll={checkScroll}
        className="flex-1 overflow-y-auto px-3 py-2 custom-scrollbar space-y-0.5"
      >
        {bubbles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
            <Radio className={cn('w-8 h-8 opacity-30', isRunning && 'animate-pulse')} />
            <p className="text-xs">{isRunning ? 'Aguardando mensagens...' : 'Nenhuma mensagem ainda'}</p>
            {!isRunning && (
              <p className="text-[10px] text-muted-foreground/60">Inicie o aquecimento para ver mensagens</p>
            )}
          </div>
        ) : (
          bubbles.map((b) => (
            <ChatBubble
              key={b.id}
              bubble={b}
              sessionIndex={sessionIndexOf(b.fromId)}
              sessionInitial={getInitialFromName(b.fromName)}
            />
          ))
        )}
        {typing && (
          <div className="flex items-end gap-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs text-white font-bold">…</div>
            <div className="bg-muted/20 border border-muted/30 rounded-2xl rounded-bl-sm">
              <TypingDots />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {!autoScroll && bubbles.length > 0 && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-3 right-3 bg-primary/90 text-primary-foreground rounded-full p-2 shadow-lg hover:scale-110 transition-transform"
          title="Ir para o fim"
        >
          <ArrowDown className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

// ─── Session Health Bar ───────────────────────────────────────────────────────

const HEALTH_COLORS: Record<string, { bar: string; glow: string }> = {
  green:  { bar: 'bg-green-500',  glow: '#22c55e' },
  yellow: { bar: 'bg-yellow-500', glow: '#eab308' },
  orange: { bar: 'bg-orange-500', glow: '#f97316' },
  red:    { bar: 'bg-red-500',    glow: '#ef4444' },
};

function getHealthKey(h: number): keyof typeof HEALTH_COLORS {
  return h >= 80 ? 'green' : h >= 60 ? 'yellow' : h >= 40 ? 'orange' : 'red';
}

function SessionHealthBar({ session, hasStarted }: {
  session: WarmupSessionDetail;
  hasStarted: boolean;
}) {
  const connected = session.status === 'connected';
  const health = hasStarted ? (session.sessionHealth ?? null) : null;
  const key = getHealthKey(health ?? 0);
  const { bar, glow } = HEALTH_COLORS[key];

  return (
    <div className="bg-primary/5 border border-primary/10 rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={cn('w-2 h-2 rounded-full flex-shrink-0', connected ? 'bg-green-500' : 'bg-red-400')}
            style={connected ? { boxShadow: '0 0 6px #22c55e' } : undefined}
          />
          <span className="text-sm font-medium truncate max-w-[140px]">{session.name}</span>
        </div>
        <span className="text-xs text-muted-foreground flex-shrink-0">{session.phoneNumber ?? '—'}</span>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Saúde do chip</span>
          <span className="font-medium" style={{ color: health !== null ? glow : undefined }}>
            {health !== null ? `${health}%` : '—'}
          </span>
        </div>
        <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-1000', health !== null ? bar : 'bg-white/10')}
            style={{
              width: `${health ?? 0}%`,
              boxShadow: health !== null && health >= 60 ? `0 0 8px ${glow}` : undefined,
            }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground/60">
          <span>{(session.sent ?? 0)} enviadas · {(session.failed ?? 0)} falhas</span>
          <span>{health !== null ? `Risco ban ${100 - health}%` : ''}</span>
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

const PlanCard = memo(function PlanCard({ plan, onStart, onPause, onStop, onDelete, actionLoading, onEdit }: {
  plan: WarmupPlan;
  onStart: () => void; onPause: () => void; onStop: () => void;
  onDelete: () => void; onEdit: () => void; actionLoading: boolean;
}) {
  const [stats, setStats] = useState<WarmupStats | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmStop, setConfirmStop] = useState(false);
  const statsTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastFetchRef = useRef(0);

  const loadStats = useCallback(() => {
    lastFetchRef.current = Date.now();
    warmupService.stats(plan.id).then(setStats).catch((err) => console.warn('[stats]', err));
  }, [plan.id]);

  useEffect(() => { loadStats(); }, [loadStats]);

  // Throttled WS stats refresh — at most 1 request per 6 seconds (leading-edge with trailing)
  useEffect(() => {
    const socket = getSocket();
    const handler = (data: any) => {
      if (!data || data.planId !== plan.id) return;
      const now = Date.now();
      const delta = now - lastFetchRef.current;
      if (delta >= 6000) {
        loadStats();
      } else {
        clearTimeout(statsTimer.current);
        statsTimer.current = setTimeout(loadStats, 6000 - delta);
      }
    };
    socket.on('warmup.progress', handler);
    return () => {
      socket.off('warmup.progress', handler);
      clearTimeout(statsTimer.current);
    };
  }, [plan.id, loadStats]);

  const effectiveStatus = plan.status;

  // Periodic refetch every 60s while running, in case WS misses an event
  useEffect(() => {
    if (effectiveStatus !== 'running') return;
    const t = setInterval(loadStats, 60_000);
    return () => clearInterval(t);
  }, [effectiveStatus, loadStats]);

  const cfg = STATUS_CFG[effectiveStatus] ?? STATUS_CFG.idle;
  const isRunning = effectiveStatus === 'running';
  const isPaused = effectiveStatus === 'paused';
  const isIdle = effectiveStatus === 'idle';
  const hasStarted = !!plan.startedAt;

  const quota = (() => {
    if (plan.durationDays <= 1) return plan.maxMsgsPerDay;
    const dayIndex = Math.max(1, Math.min(plan.currentDay, plan.durationDays));
    const prog = (dayIndex - 1) / (plan.durationDays - 1);
    return Math.round(plan.startMsgsPerDay + (plan.maxMsgsPerDay - plan.startMsgsPerDay) * prog);
  })();

  const chipHealth = hasStarted ? (stats?.chipHealth ?? null) : null;
  const completedAt = plan.completedAt ? new Date(plan.completedAt) : null;

  return (
    <>
      <Card
        className="border-primary/20 bg-card/60 backdrop-blur-sm overflow-hidden transition-all duration-300"
        style={isRunning ? { boxShadow: '0 0 30px rgba(34,197,94,0.06), 0 0 0 1px rgba(34,197,94,0.15)' } : undefined}
      >
        {isRunning && (
          <div className="h-0.5 bg-gradient-to-r from-primary via-secondary to-primary"
            style={{ animation: 'shimmer 2s linear infinite', backgroundSize: '200% 100%' }} />
        )}

        <CardContent className="p-0">
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-primary/10 gap-2 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <div className={cn('p-2 rounded-xl', isRunning ? 'bg-green-500/10' : 'bg-primary/10')}>
                <Flame
                  className={cn('w-5 h-5', cfg.color, isRunning && 'animate-pulse')}
                  style={isRunning ? { filter: `drop-shadow(0 0 6px ${cfg.glow})` } : undefined}
                />
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
                  {completedAt && (
                    <span className="text-[10px] text-blue-400/80 flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      {completedAt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                    </span>
                  )}
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
                <Button size="sm" variant="outline" className="h-8 px-2.5 border-red-500/40 text-red-400 hover:bg-red-500/10" onClick={() => setConfirmStop(true)} disabled={actionLoading}>
                  <Square className="w-3.5 h-3.5" />
                </Button>
              )}
              <Button
                size="sm" variant="outline" className={cn('h-8 px-2.5', isRunning && 'border-yellow-500/30 text-yellow-500/70 cursor-not-allowed')}
                onClick={() => {
                  if (isRunning) {
                    toast.error('Pare o aquecimento antes de editar');
                    return;
                  }
                  onEdit();
                }}
                disabled={actionLoading}
                title={isRunning ? 'Pare o aquecimento antes de editar' : 'Editar'}
              >
                <Settings2 className="w-3.5 h-3.5" />
              </Button>
              <Button size="sm" variant="outline" className="h-8 px-2.5" onClick={() => setShowLogs(true)} title="Ver logs">
                <BarChart2 className="w-3.5 h-3.5" />
              </Button>
              {!isRunning && (
                <Button size="sm" variant="outline" className="h-8 px-2.5 border-red-500/30 text-red-400 hover:bg-red-500/10" onClick={() => setConfirmDelete(true)} disabled={actionLoading}>
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

                <div className="flex items-center justify-center gap-6">
                  <ChipHealthGauge health={chipHealth} size={110} />
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-green-400" />
                      <span className="text-muted-foreground text-xs">Proteção</span>
                      <span className="font-bold text-green-400 text-xs">{chipHealth !== null ? `${chipHealth}%` : '—'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-400" />
                      <span className="text-muted-foreground text-xs">Risco ban</span>
                      <span className="font-bold text-red-400 text-xs">{chipHealth !== null ? `${100 - chipHealth}%` : '—'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-blue-400" />
                      <span className="text-muted-foreground text-xs">Intervalo</span>
                      <span className="text-xs text-muted-foreground">{plan.intervalMin}–{plan.intervalMax}s</span>
                    </div>
                  </div>
                </div>

                {stats?.sessions && stats.sessions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Sessões</p>
                    {stats.sessions.map((s) => (
                      <SessionHealthBar key={s.id} session={s} hasStarted={hasStarted} />
                    ))}
                  </div>
                )}
              </div>

              {/* Right: Live Chat */}
              <div className="flex flex-col" style={{ height: 420, maxHeight: 420 }}>
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-primary/10 bg-primary/5">
                  <div
                    className={cn('w-2 h-2 rounded-full', isRunning ? 'bg-green-500' : 'bg-muted-foreground/30')}
                    style={isRunning ? { animation: 'pulse-ring 1.5s infinite' } : undefined}
                  />
                  <span className="text-xs font-medium text-muted-foreground">
                    {isRunning ? 'Chat ao vivo' : 'Histórico de mensagens'}
                  </span>
                  {plan.useGroup && (
                    <Badge className="text-[10px] py-0 h-4 ml-auto bg-purple-500/20 text-purple-300 border-purple-500/30">
                      <Users className="w-2.5 h-2.5 mr-1" />Grupo
                    </Badge>
                  )}
                </div>
                <div className="flex-1 overflow-hidden">
                  <LiveChatFeed planId={plan.id} sessions={plan.sessionIds} isRunning={isRunning} />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Logs modal */}
      {showLogs && <LogsModal plan={plan} onClose={() => setShowLogs(false)} />}

      {/* Delete confirmation */}
      {confirmDelete && (
        <Dialog open onOpenChange={() => setConfirmDelete(false)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-400">
                <Trash2 className="w-5 h-5" /> Excluir plano
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Tem certeza que quer excluir <span className="font-semibold text-foreground">"{plan.name}"</span>?
              Todos os logs serão perdidos.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmDelete(false)}>Cancelar</Button>
              <Button
                className="bg-red-500 hover:bg-red-600 text-white border-0"
                onClick={() => { setConfirmDelete(false); onDelete(); }}
              >
                Excluir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Stop confirmation */}
      {confirmStop && (
        <Dialog open onOpenChange={() => setConfirmStop(false)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-400">
                <Square className="w-5 h-5" /> Parar aquecimento
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Parar agora vai interromper o aquecimento de <span className="font-semibold text-foreground">"{plan.name}"</span>.
              O progresso atual é mantido — você pode iniciar novamente depois.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmStop(false)}>Cancelar</Button>
              <Button
                className="bg-red-500 hover:bg-red-600 text-white border-0"
                onClick={() => { setConfirmStop(false); onStop(); }}
              >
                Parar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
});

// ─── Logs Modal ───────────────────────────────────────────────────────────────

function LogsModal({ plan, onClose }: { plan: WarmupPlan; onClose: () => void }) {
  const [data, setData] = useState<{ items: WarmupLog[]; total: number; dailyStats: { day: string; sent: number; failed: number }[] }>({
    items: [], total: 0, dailyStats: [],
  });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const d = await warmupService.logs(plan.id, p, 20);
      setData(d);
      setPage(p);
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao carregar logs');
    } finally { setLoading(false); }
  }, [plan.id]);

  useEffect(() => { load(1); }, [load]);

  const totalPages = Math.max(1, Math.ceil(data.total / 20));
  const mediaIcon = (t: string) => t === 'image' ? '🖼️' : t === 'audio' ? '🎤' : '💬';

  const formatDay = (day: string) => {
    const [y, m, d] = day.split('-').map(Number);
    if (!y || !m || !d) return day;
    return new Date(y, m - 1, d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

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
            {data.dailyStats.map((d) => (
              <div key={d.day} className="flex-shrink-0 text-center bg-primary/5 rounded-lg p-2 min-w-[70px] border border-primary/10">
                <p className="text-xs text-muted-foreground">{formatDay(d.day)}</p>
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
            data.items.map((log) => (
              <div key={log.id} className={cn('flex items-center gap-3 px-3 py-2 rounded-lg text-sm', log.status === 'sent' ? 'bg-green-500/5' : 'bg-red-500/5')}>
                <span className="flex-shrink-0">{mediaIcon(log.mediaType ?? 'text')}</span>
                {log.status === 'sent'
                  ? <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                  : <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="truncate text-foreground/80">{log.message}</p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {log.fromName ?? log.fromSession.slice(-4)} → {log.toName ?? log.toSession.slice(-4)}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {new Date(log.sentAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2 border-t border-primary/10">
            <Button size="sm" variant="outline" disabled={page <= 1 || loading} onClick={() => load(page - 1)}>Anterior</Button>
            <span className="text-xs text-muted-foreground">Página {page} de {totalPages}</span>
            <Button size="sm" variant="outline" disabled={page >= totalPages || loading} onClick={() => load(page + 1)}>Próxima</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Plan Form ────────────────────────────────────────────────────────────────

interface PlanFormState {
  name: string;
  selectedSessions: string[];
  durationDays: number;
  startMsgsPerDay: number;
  maxMsgsPerDay: number;
  windowStart: string;
  windowEnd: string;
  intervalMin: number;
  intervalMax: number;
  useGroup: boolean;
  groupJid: string;
  mediaEnabled: boolean;
  mediaFreq: number;
  audioEnabled: boolean;
  audioFreq: number;
  customMessages: string;
}

interface GroupOption {
  jid: string;
  name: string;
  memberCount: number;
  sessionId: string;
  sessionName: string;
}

function PlanForm({ initial, sessions, onSave, onClose, loading }: {
  initial?: Partial<WarmupPlanPayload>;
  sessions: any[];
  onSave: (d: WarmupPlanPayload) => Promise<void>;
  onClose: () => void;
  loading: boolean;
}) {
  const [s, setS] = useState<PlanFormState>({
    name: initial?.name ?? '',
    selectedSessions: initial?.sessionIds ?? [],
    durationDays: initial?.durationDays ?? 14,
    startMsgsPerDay: initial?.startMsgsPerDay ?? 5,
    maxMsgsPerDay: initial?.maxMsgsPerDay ?? 40,
    windowStart: initial?.windowStart ?? '',
    windowEnd: initial?.windowEnd ?? '',
    intervalMin: initial?.intervalMin ?? 30,
    intervalMax: initial?.intervalMax ?? 120,
    useGroup: initial?.useGroup ?? false,
    groupJid: initial?.groupJid ?? '',
    mediaEnabled: initial?.mediaEnabled ?? false,
    mediaFreq: initial?.mediaFreq ?? 5,
    audioEnabled: initial?.audioEnabled ?? false,
    audioFreq: initial?.audioFreq ?? 7,
    customMessages: (initial?.customMessages ?? []).join('\n'),
  });
  const [tab, setTab] = useState<'basic' | 'media' | 'messages'>('basic');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [groupOptions, setGroupOptions] = useState<GroupOption[]>([]);
  const [groupLoading, setGroupLoading] = useState(false);
  const [groupError, setGroupError] = useState<string | null>(null);

  const update = <K extends keyof PlanFormState>(k: K, v: PlanFormState[K]) =>
    setS((p) => ({ ...p, [k]: v }));

  type NumericField =
    | 'durationDays'
    | 'startMsgsPerDay'
    | 'maxMsgsPerDay'
    | 'intervalMin'
    | 'intervalMax'
    | 'mediaFreq'
    | 'audioFreq';

  const updateNumber = (field: NumericField, min: number, max: number) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const parsed = Number.parseInt(e.target.value, 10);
      if (Number.isNaN(parsed)) return;
      update(field, clampInt(parsed, min, max) as PlanFormState[NumericField]);
    };

  const toggleSession = (id: string) =>
    setS((p) => ({
      ...p,
      selectedSessions: p.selectedSessions.includes(id)
        ? p.selectedSessions.filter((x) => x !== id)
        : [...p.selectedSessions, id],
    }));

  const loadGroupsForSelectedSessions = useCallback(async (forceSync = false) => {
    if (!s.useGroup) {
      setGroupOptions([]);
      setGroupError(null);
      return;
    }

    const selectedConnected = sessions.filter((sess: any) =>
      s.selectedSessions.includes(sess.id) && sess.status === 'connected',
    );
    if (selectedConnected.length === 0) {
      setGroupOptions([]);
      setGroupError('Conecte ao menos 1 sessao selecionada para listar grupos');
      return;
    }

    setGroupLoading(true);
    setGroupError(null);
    try {
      const groupsPerSession = await Promise.all(
        selectedConnected.map(async (sess: any) => {
          if (forceSync) {
            await groupsService.sync(sess.id).catch(() => undefined);
          }
          const listed = await groupsService.listBySession(sess.id);
          return listed.map((g: any) => ({
            jid: g.waGroupId as string | undefined,
            name: (g.name as string | undefined) ?? 'Grupo',
            memberCount: Number(g.memberCount ?? 0),
            sessionId: sess.id,
            sessionName: sess.name,
          }));
        }),
      );

      const flat = groupsPerSession
        .flat()
        .filter((g) => typeof g.jid === 'string' && g.jid.endsWith('@g.us')) as GroupOption[];
      const unique = Array.from(new Map(flat.map((g) => [g.jid, g])).values());
      setGroupOptions(unique);
      if (unique.length === 0) {
        setGroupError('Nenhum grupo encontrado nas sessoes selecionadas');
      }
    } catch {
      setGroupOptions([]);
      setGroupError('Nao foi possivel carregar os grupos');
    } finally {
      setGroupLoading(false);
    }
  }, [s.useGroup, s.selectedSessions, sessions]);

  useEffect(() => {
    loadGroupsForSelectedSessions(false);
  }, [loadGroupsForSelectedSessions]);

  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (!s.name.trim()) e.name = 'Nome obrigatorio';
    if (s.selectedSessions.length < 2) e.sessions = 'Selecione ao menos 2 sessoes';
    if (s.durationDays < 1 || s.durationDays > 90) e.durationDays = 'Duracao deve ficar entre 1 e 90 dias';
    if (s.startMsgsPerDay < 1 || s.startMsgsPerDay > 50) e.startMsgsPerDay = 'Inicio deve ficar entre 1 e 50';
    if (s.maxMsgsPerDay < 1 || s.maxMsgsPerDay > 200) e.maxMsgsPerDay = 'Maximo deve ficar entre 1 e 200';
    if (s.intervalMin < 10 || s.intervalMin > 3600) e.intervalMin = 'Intervalo minimo deve ficar entre 10 e 3600';
    if (s.intervalMax < 10 || s.intervalMax > 3600) e.intervalMax = 'Intervalo maximo deve ficar entre 10 e 3600';
    if (s.intervalMin > s.intervalMax) e.intervalMin = 'Intervalo minimo deve ser <= maximo';
    if (s.startMsgsPerDay > s.maxMsgsPerDay) e.startMsgsPerDay = 'Inicio deve ser <= maximo';
    if (s.mediaEnabled && (s.mediaFreq < 3 || s.mediaFreq > 50)) e.mediaFreq = 'Frequencia de midia deve ficar entre 3 e 50';
    if (s.audioEnabled && (s.audioFreq < 3 || s.audioFreq > 50)) e.audioFreq = 'Frequencia de audio deve ficar entre 3 e 50';
    if (s.useGroup && !s.groupJid.trim()) e.groupJid = 'JID obrigatorio no modo grupo';
    if (s.useGroup && s.groupJid.trim() && !s.groupJid.endsWith('@g.us')) e.groupJid = 'JID deve terminar com @g.us';
    if (s.windowStart && !/^([01]?\d|2[0-3]):[0-5]\d$/.test(s.windowStart)) e.windowStart = 'Formato HH:mm';
    if (s.windowEnd && !/^([01]?\d|2[0-3]):[0-5]\d$/.test(s.windowEnd)) e.windowEnd = 'Formato HH:mm';
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast.error(Object.values(errs)[0]);
      // jump to tab where the first error is
      if (errs.mediaFreq || errs.audioFreq) {
        setTab('media');
      } else if (
        errs.name || errs.sessions || errs.durationDays || errs.startMsgsPerDay || errs.maxMsgsPerDay
        || errs.intervalMin || errs.intervalMax || errs.groupJid || errs.windowStart || errs.windowEnd
      ) {
        setTab('basic');
      }
      return;
    }
    const msgs = s.customMessages.split('\n').map((x) => x.trim()).filter(Boolean);
    await onSave({
      name: s.name,
      sessionIds: s.selectedSessions,
      durationDays: s.durationDays,
      startMsgsPerDay: s.startMsgsPerDay,
      maxMsgsPerDay: s.maxMsgsPerDay,
      windowStart: s.windowStart || undefined,
      windowEnd: s.windowEnd || undefined,
      intervalMin: s.intervalMin,
      intervalMax: s.intervalMax,
      useGroup: s.useGroup,
      groupJid: s.useGroup ? (s.groupJid || undefined) : undefined,
      mediaEnabled: s.mediaEnabled,
      mediaFreq: s.mediaFreq,
      audioEnabled: s.audioEnabled,
      audioFreq: s.audioFreq,
      customMessages: msgs,
    });
  };

  const tabs = [
    { id: 'basic' as const, label: 'Configuração', icon: Settings2 },
    { id: 'media' as const, label: 'Mídia & Áudio', icon: ImageIcon },
    { id: 'messages' as const, label: 'Mensagens', icon: MessageSquare },
  ];

  const customMsgCount = s.customMessages.split('\n').filter((x) => x.trim()).length;

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
            <Input value={s.name} onChange={(e) => update('name', e.target.value)} placeholder="Ex: Aquecimento Principal" required />
            {errors.name && <p className="text-xs text-red-400">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Sessões <span className="text-muted-foreground text-xs">(mín. 2)</span></Label>
              <button
                type="button"
                onClick={() => {
                  const connected = sessions.filter((x: any) => x.status === 'connected').map((x: any) => x.id);
                  setS((p) => ({ ...p, selectedSessions: connected }));
                }}
                className="text-[10px] text-primary hover:underline"
              >
                Selecionar conectadas
              </button>
            </div>
            <div className="grid gap-1.5 max-h-44 overflow-y-auto pr-1 custom-scrollbar">
              {sessions.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-3">Nenhuma sessão disponível</p>
              )}
              {sessions.map((sess) => {
                const selected = s.selectedSessions.includes(sess.id);
                const connected = sess.status === 'connected';
                return (
                  <button key={sess.id} type="button" onClick={() => toggleSession(sess.id)}
                    className={cn('flex items-center gap-2.5 px-3 py-2 rounded-xl border text-left transition-all text-sm',
                      selected ? 'border-primary bg-primary/10 text-primary' : 'border-primary/20 hover:border-primary/40 text-muted-foreground')}>
                    <div className={cn('w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0',
                      selected ? 'border-primary bg-primary' : 'border-muted-foreground')}>
                      {selected && <X className="w-2.5 h-2.5 text-primary-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{sess.name}</p>
                      {sess.phoneNumber && <p className="text-xs opacity-60">{sess.phoneNumber}</p>}
                    </div>
                    <div className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', connected ? 'bg-green-500' : 'bg-red-400')}
                      title={connected ? 'Conectada' : 'Desconectada'} />
                  </button>
                );
              })}
            </div>
            {errors.sessions && <p className="text-xs text-red-400">{errors.sessions}</p>}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Duração (dias)</Label>
              <Input type="number" min={1} max={90} value={s.durationDays} onChange={updateNumber('durationDays', 1, 90)} />
              {errors.durationDays && <p className="text-xs text-red-400">{errors.durationDays}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Início msgs/dia</Label>
              <Input type="number" min={1} max={50} value={s.startMsgsPerDay} onChange={updateNumber('startMsgsPerDay', 1, 50)} />
              {errors.startMsgsPerDay && <p className="text-xs text-red-400">{errors.startMsgsPerDay}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Máx msgs/dia</Label>
              <Input type="number" min={1} max={200} value={s.maxMsgsPerDay} onChange={updateNumber('maxMsgsPerDay', 1, 200)} />
              {errors.maxMsgsPerDay && <p className="text-xs text-red-400">{errors.maxMsgsPerDay}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Janela início <span className="text-muted-foreground/60 text-[10px]">(UTC)</span></Label>
              <Input type="time" value={s.windowStart} onChange={(e) => update('windowStart', e.target.value)} />
              {errors.windowStart && <p className="text-xs text-red-400">{errors.windowStart}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Janela fim <span className="text-muted-foreground/60 text-[10px]">(UTC)</span></Label>
              <Input type="time" value={s.windowEnd} onChange={(e) => update('windowEnd', e.target.value)} />
              {errors.windowEnd && <p className="text-xs text-red-400">{errors.windowEnd}</p>}
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground/70 -mt-2">
            ⓘ Janela em UTC. Hora atual UTC: {new Date().toUTCString().slice(17, 22)}
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Intervalo mín (seg)</Label>
              <Input type="number" min={10} max={3600} value={s.intervalMin} onChange={updateNumber('intervalMin', 10, 3600)} />
              {errors.intervalMin && <p className="text-xs text-red-400">{errors.intervalMin}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Intervalo máx (seg)</Label>
              <Input type="number" min={10} max={3600} value={s.intervalMax} onChange={updateNumber('intervalMax', 10, 3600)} />
              {errors.intervalMax && <p className="text-xs text-red-400">{errors.intervalMax}</p>}
            </div>
          </div>

          {/* Group mode */}
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-medium text-purple-300">Modo Grupo</span>
              </div>
              <button type="button" onClick={() => update('useGroup', !s.useGroup)}
                className={cn('w-10 h-5 rounded-full transition-all relative', s.useGroup ? 'bg-purple-500' : 'bg-white/10')}>
                <span className={cn('absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow', s.useGroup ? 'left-5' : 'left-0.5')} />
              </button>
            </div>
            {s.useGroup && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-xs">Grupo de destino</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-[10px]"
                    onClick={() => loadGroupsForSelectedSessions(true)}
                    disabled={groupLoading}
                  >
                    {groupLoading ? 'Sincronizando...' : 'Sincronizar grupos'}
                  </Button>
                </div>
                <select
                  value={s.groupJid}
                  onChange={(e) => update('groupJid', e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
                >
                  <option value="">Selecionar grupo</option>
                  {groupOptions.map((g) => (
                    <option key={g.jid} value={g.jid}>
                      {g.name} ({g.memberCount}) - {g.sessionName}
                    </option>
                  ))}
                </select>
                <Label className="text-[10px] text-muted-foreground">Ou informe o JID manualmente (ex: 12036304...@g.us)</Label>
                <Input value={s.groupJid} onChange={(e) => update('groupJid', e.target.value)} placeholder="...@g.us" className="text-xs" />
                {errors.groupJid && <p className="text-xs text-red-400">{errors.groupJid}</p>}
                {groupError && <p className="text-[10px] text-yellow-400">{groupError}</p>}
                <p className="text-[10px] text-muted-foreground">Mensagens serão enviadas neste grupo em vez de mensagens diretas.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'media' && (
        <div className="space-y-4">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-blue-400" />
                <div>
                  <p className="text-sm font-medium text-blue-300">Imagens Aleatórias</p>
                  <p className="text-xs text-muted-foreground">Envia imagens aleatórias durante o aquecimento</p>
                </div>
              </div>
              <button type="button" onClick={() => update('mediaEnabled', !s.mediaEnabled)}
                className={cn('w-10 h-5 rounded-full transition-all relative', s.mediaEnabled ? 'bg-blue-500' : 'bg-white/10')}>
                <span className={cn('absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow', s.mediaEnabled ? 'left-5' : 'left-0.5')} />
              </button>
            </div>
            {s.mediaEnabled && (
              <div className="space-y-1.5">
                <Label className="text-xs">Frequência — enviar imagem a cada N mensagens (mín. 3)</Label>
                <Input type="number" min={3} max={50} value={s.mediaFreq} onChange={updateNumber('mediaFreq', 3, 50)} />
                {errors.mediaFreq && <p className="text-xs text-red-400">{errors.mediaFreq}</p>}
              </div>
            )}
          </div>

          <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mic className="w-4 h-4 text-orange-400" />
                <div>
                  <p className="text-sm font-medium text-orange-300">Áudios Aleatórios</p>
                  <p className="text-xs text-muted-foreground">Envia áudios curtos gerados automaticamente</p>
                </div>
              </div>
              <button type="button" onClick={() => update('audioEnabled', !s.audioEnabled)}
                className={cn('w-10 h-5 rounded-full transition-all relative', s.audioEnabled ? 'bg-orange-500' : 'bg-white/10')}>
                <span className={cn('absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow', s.audioEnabled ? 'left-5' : 'left-0.5')} />
              </button>
            </div>
            {s.audioEnabled && (
              <div className="space-y-1.5">
                <Label className="text-xs">Frequência — enviar áudio a cada N mensagens (mín. 3)</Label>
                <Input type="number" min={3} max={50} value={s.audioFreq} onChange={updateNumber('audioFreq', 3, 50)} />
                {errors.audioFreq && <p className="text-xs text-red-400">{errors.audioFreq}</p>}
              </div>
            )}
          </div>

          <div className="bg-primary/5 rounded-xl p-3 text-xs text-muted-foreground space-y-1 border border-primary/10">
            <p className="font-medium text-foreground">Como funciona:</p>
            <p>• Imagens buscadas de fontes públicas variam a cada envio</p>
            <p>• Áudios são gerados localmente em WAV com tom + ruído natural</p>
            <p>• Frequências são independentes — configure cada tipo separadamente</p>
            <p>• Mín. 3 para evitar spam (mídia em toda mensagem aumenta risco de ban)</p>
          </div>
        </div>
      )}

      {tab === 'messages' && (
        <div className="space-y-3">
          <div className="bg-primary/5 rounded-xl p-3 border border-primary/10">
            <p className="text-xs text-muted-foreground">
              Cole mensagens personalizadas (uma por linha). Se &lt; 3 entradas, usa o banco padrão com 30 frases.
              Recomendamos 10+ mensagens variadas para maior naturalidade.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Mensagens personalizadas</Label>
            <Textarea
              value={s.customMessages}
              onChange={(e) => update('customMessages', e.target.value)}
              placeholder={"Oi, tudo bem?\nOlá! Como você está?\nE aí, novidade?"}
              className="min-h-[180px] text-sm font-mono"
            />
            <p className="text-xs text-muted-foreground">
              {customMsgCount} mensagens definidas
              {customMsgCount > 0 && customMsgCount < 3 && (
                <span className="text-yellow-400 ml-1">— adicione ao menos 3 para ativar o banco personalizado</span>
              )}
              {customMsgCount >= 3 && customMsgCount < 10 && (
                <span className="text-yellow-300 ml-1">— recomendamos 10+ para mais naturalidade</span>
              )}
            </p>
          </div>
        </div>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Salvar
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
  const reloadTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const load = useCallback(async () => {
    try {
      const [p, s] = await Promise.all([warmupService.list(), sessionService.list()]);
      setPlans(p);
      setSessions(s);
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao carregar planos');
    }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Reload list only on terminal status changes — debounced
  useEffect(() => {
    const socket = getSocket();
    const handler = (data: any) => {
      if (!data?.planId) return;
      const nextStatus = data.completed === true
        ? 'completed'
        : data.paused === true
          ? 'paused'
          : data.stopped === true
            ? 'idle'
            : data.status;

      if (nextStatus) {
        setPlans((prev) => prev.map((plan) => (
          plan.id !== data.planId
            ? plan
            : {
                ...plan,
                status: nextStatus,
                isActive: nextStatus === 'running',
                currentDay: typeof data.currentDay === 'number' ? data.currentDay : plan.currentDay,
              }
        )));
      }

      clearTimeout(reloadTimer.current);
      reloadTimer.current = setTimeout(() => {
        warmupService.list().then(setPlans).catch(() => {});
      }, nextStatus === 'running' ? 1200 : 500);
    };
    socket.on('warmup.progress', handler);
    return () => {
      socket.off('warmup.progress', handler);
      clearTimeout(reloadTimer.current);
    };
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

  const act = async (
    planId: string,
    fn: () => Promise<any>,
    msg: string,
    optimisticStatus?: WarmupPlan['status'],
  ) => {
    setActionLoading(planId);
    if (optimisticStatus) {
      setPlans((prev) => prev.map((plan) => (
        plan.id !== planId
          ? plan
          : { ...plan, status: optimisticStatus, isActive: optimisticStatus === 'running' }
      )));
    }
    try {
      await fn();
      toast.success(msg);
      await load();
    }
    catch (e: any) { toast.error(e?.message ?? 'Erro'); }
    finally { setActionLoading(null); }
  };

  const handleEdit = (plan: WarmupPlan) => {
    if (plan.status === 'running') {
      toast.error('Pare o aquecimento antes de editar');
      return;
    }
    setEditPlan(plan);
    setFormOpen(true);
  };

  const activePlans = plans.filter((p) => p.status === 'running');
  const connectedSessions = sessions.filter((sx) => sx.status === 'connected');

  return (
    <div className="space-y-6">
      <style>{STYLES}</style>

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
          { label: 'Ativos', value: activePlans.length, icon: Flame, color: 'text-green-400', glow: '#22c55e30' },
          { label: 'Sessões online', value: connectedSessions.length, icon: Zap, color: 'text-yellow-400', glow: '#eab30830' },
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
              onStart={() => act(plan.id, () => warmupService.start(plan.id), 'Aquecimento iniciado!', 'running')}
              onPause={() => act(plan.id, () => warmupService.pause(plan.id), 'Aquecimento pausado', 'paused')}
              onStop={() => act(plan.id, () => warmupService.stop(plan.id), 'Aquecimento parado', 'idle')}
              onDelete={() => act(plan.id, () => warmupService.delete(plan.id), 'Plano excluído')}
              onEdit={() => handleEdit(plan)}
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
                audioFreq: editPlan.audioFreq,
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
