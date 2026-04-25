import React, { useState, useEffect, useCallback } from 'react';
import {
  Flame, Plus, Play, Pause, Square, Trash2, BarChart2,
  Clock, CheckCircle2, AlertCircle, Loader2, ChevronDown,
  ChevronUp, RefreshCw, Zap, Calendar, MessageSquare, X
} from 'lucide-react';
import { Card, CardContent, Button, Badge } from '../components/ui/shared';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../components/ui/dialog';
import { toast } from 'sonner';
import { warmupService, type WarmupPlan, type WarmupStats, type WarmupPlanPayload } from '../services/warmupService';
import { sessionService } from '../services/sessionService';
import { getSocket } from '../services/wsClient';
import { cn } from '../lib/utils';

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  idle:      { label: 'Parado',     color: 'text-muted-foreground', icon: Square },
  running:   { label: 'Ativo',      color: 'text-green-400',        icon: Flame },
  paused:    { label: 'Pausado',    color: 'text-yellow-400',       icon: Pause },
  completed: { label: 'Concluído',  color: 'text-blue-400',         icon: CheckCircle2 },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] ?? statusConfig.idle;
  const Icon = cfg.icon;
  return (
    <span className={cn('flex items-center gap-1.5 text-sm font-medium', cfg.color)}>
      <Icon className="w-4 h-4" />
      {cfg.label}
    </span>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="w-full bg-primary/10 rounded-full h-2">
      <div
        className="bg-primary h-2 rounded-full transition-all duration-500"
        style={{ width: `${Math.min(100, value)}%` }}
      />
    </div>
  );
}

interface PlanFormProps {
  initial?: Partial<WarmupPlanPayload>;
  sessions: { id: string; name: string; phoneNumber?: string | null }[];
  onSave: (data: WarmupPlanPayload) => Promise<void>;
  onClose: () => void;
  loading: boolean;
}

function PlanForm({ initial, sessions, onSave, onClose, loading }: PlanFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [selectedSessions, setSelectedSessions] = useState<string[]>(initial?.sessionIds ?? []);
  const [durationDays, setDurationDays] = useState(initial?.durationDays ?? 14);
  const [startMsgsPerDay, setStartMsgsPerDay] = useState(initial?.startMsgsPerDay ?? 5);
  const [maxMsgsPerDay, setMaxMsgsPerDay] = useState(initial?.maxMsgsPerDay ?? 40);
  const [windowStart, setWindowStart] = useState(initial?.windowStart ?? '');
  const [windowEnd, setWindowEnd] = useState(initial?.windowEnd ?? '');
  const [intervalMin, setIntervalMin] = useState(initial?.intervalMin ?? 30);
  const [intervalMax, setIntervalMax] = useState(initial?.intervalMax ?? 120);

  const toggleSession = (id: string) => {
    setSelectedSessions((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSessions.length < 2) {
      toast.error('Selecione ao menos 2 sessões');
      return;
    }
    await onSave({
      name,
      sessionIds: selectedSessions,
      durationDays,
      startMsgsPerDay,
      maxMsgsPerDay,
      windowStart: windowStart || undefined,
      windowEnd: windowEnd || undefined,
      intervalMin,
      intervalMax,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <Label>Nome do plano</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Aquecimento Principal"
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Sessões participantes <span className="text-muted-foreground text-xs">(min. 2)</span></Label>
        <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
          {sessions.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => toggleSession(s.id)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all',
                selectedSessions.includes(s.id)
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-primary/20 hover:border-primary/40 text-muted-foreground hover:text-foreground'
              )}
            >
              <div className={cn(
                'w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0',
                selectedSessions.includes(s.id) ? 'border-primary bg-primary' : 'border-muted-foreground'
              )}>
                {selectedSessions.includes(s.id) && <X className="w-2.5 h-2.5 text-primary-foreground" />}
              </div>
              <div>
                <p className="text-sm font-medium">{s.name}</p>
                {s.phoneNumber && <p className="text-xs text-muted-foreground">{s.phoneNumber}</p>}
              </div>
            </button>
          ))}
          {sessions.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma sessão conectada</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label>Duração (dias)</Label>
          <Input type="number" min={1} max={90} value={durationDays} onChange={(e) => setDurationDays(Number(e.target.value))} />
        </div>
        <div className="space-y-1.5">
          <Label>Msgs/dia início</Label>
          <Input type="number" min={1} max={50} value={startMsgsPerDay} onChange={(e) => setStartMsgsPerDay(Number(e.target.value))} />
        </div>
        <div className="space-y-1.5">
          <Label>Msgs/dia máx</Label>
          <Input type="number" min={1} max={200} value={maxMsgsPerDay} onChange={(e) => setMaxMsgsPerDay(Number(e.target.value))} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Janela início (UTC)</Label>
          <Input type="time" value={windowStart} onChange={(e) => setWindowStart(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Janela fim (UTC)</Label>
          <Input type="time" value={windowEnd} onChange={(e) => setWindowEnd(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Intervalo mín (seg)</Label>
          <Input type="number" min={10} max={3600} value={intervalMin} onChange={(e) => setIntervalMin(Number(e.target.value))} />
        </div>
        <div className="space-y-1.5">
          <Label>Intervalo máx (seg)</Label>
          <Input type="number" min={10} max={3600} value={intervalMax} onChange={(e) => setIntervalMax(Number(e.target.value))} />
        </div>
      </div>

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

interface PlanCardProps {
  plan: WarmupPlan;
  onStart: () => void;
  onPause: () => void;
  onStop: () => void;
  onDelete: () => void;
  onViewLogs: () => void;
  actionLoading: boolean;
}

function PlanCard({ plan, onStart, onPause, onStop, onDelete, onViewLogs, actionLoading }: PlanCardProps) {
  const [stats, setStats] = useState<WarmupStats | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    warmupService.stats(plan.id).then(setStats).catch(() => undefined);
  }, [plan.id, plan.status, plan.currentDay]);

  const isRunning = plan.status === 'running';
  const isPaused = plan.status === 'paused';
  const isIdle = plan.status === 'idle';

  return (
    <Card className="bg-card/60 border-primary/20 hover:border-primary/40 transition-all">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-base truncate">{plan.name}</h3>
              <StatusBadge status={plan.status} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {plan.sessionIds.length} sessões · Dia {plan.currentDay}/{plan.durationDays}
            </p>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {(isIdle || isPaused) && (
              <Button size="sm" variant="outline" className="h-8 px-3 border-green-500/40 text-green-400 hover:bg-green-500/10" onClick={onStart} disabled={actionLoading}>
                <Play className="w-3.5 h-3.5" />
              </Button>
            )}
            {isRunning && (
              <Button size="sm" variant="outline" className="h-8 px-3 border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10" onClick={onPause} disabled={actionLoading}>
                <Pause className="w-3.5 h-3.5" />
              </Button>
            )}
            {(isRunning || isPaused) && (
              <Button size="sm" variant="outline" className="h-8 px-3 border-red-500/40 text-red-400 hover:bg-red-500/10" onClick={onStop} disabled={actionLoading}>
                <Square className="w-3.5 h-3.5" />
              </Button>
            )}
            <Button size="sm" variant="outline" className="h-8 px-3" onClick={onViewLogs} disabled={actionLoading}>
              <BarChart2 className="w-3.5 h-3.5" />
            </Button>
            {isIdle && (
              <Button size="sm" variant="outline" className="h-8 px-3 border-red-500/40 text-red-400 hover:bg-red-500/10" onClick={onDelete} disabled={actionLoading}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>

        {stats && (
          <div className="mt-4 space-y-3">
            <ProgressBar value={stats.progress} />
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-primary/5 rounded-lg p-2">
                <p className="text-lg font-bold text-primary">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total enviado</p>
              </div>
              <div className="bg-primary/5 rounded-lg p-2">
                <p className="text-lg font-bold text-green-400">{stats.todayCount}</p>
                <p className="text-xs text-muted-foreground">Hoje</p>
              </div>
              <div className="bg-primary/5 rounded-lg p-2">
                <p className="text-lg font-bold text-red-400">{stats.failed}</p>
                <p className="text-xs text-muted-foreground">Falhas</p>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          Detalhes
        </button>

        {expanded && (
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>Msgs/dia: {stats ? `${stats.todayCount}/${warmupService ? '-' : '-'}` : '-'}</span>
            <span>Intervalo: {plan.intervalMin}–{plan.intervalMax}s</span>
            {plan.windowStart && <span>Janela: {plan.windowStart}–{plan.windowEnd} UTC</span>}
            {plan.startedAt && <span>Início: {new Date(plan.startedAt).toLocaleDateString('pt-BR')}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface LogsModalProps {
  plan: WarmupPlan;
  onClose: () => void;
}

function LogsModal({ plan, onClose }: LogsModalProps) {
  const [logs, setLogs] = useState<{ items: any[]; total: number; dailyStats: any[] }>({ items: [], total: 0, dailyStats: [] });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const data = await warmupService.logs(plan.id, p, 20);
      setLogs(data);
      setPage(p);
    } finally {
      setLoading(false);
    }
  }, [plan.id]);

  useEffect(() => { load(1); }, [load]);

  const totalPages = Math.ceil(logs.total / 20);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-primary" />
            Logs — {plan.name}
          </DialogTitle>
        </DialogHeader>

        {logs.dailyStats.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
            {logs.dailyStats.map((d) => (
              <div key={d.day} className="flex-shrink-0 text-center bg-primary/5 rounded-lg p-2 min-w-[70px]">
                <p className="text-xs text-muted-foreground">{new Date(d.day).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</p>
                <p className="text-sm font-bold text-green-400">{d.sent}</p>
                {d.failed > 0 && <p className="text-xs text-red-400">{d.failed} falhas</p>}
              </div>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5 min-h-0">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : logs.items.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">Nenhum log ainda</p>
          ) : (
            logs.items.map((log) => (
              <div key={log.id} className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm',
                log.status === 'sent' ? 'bg-green-500/5' : 'bg-red-500/5'
              )}>
                {log.status === 'sent'
                  ? <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                  : <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                }
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

export const WarmupPage: React.FC = () => {
  const [plans, setPlans] = useState<WarmupPlan[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [logsTarget, setLogsTarget] = useState<WarmupPlan | null>(null);

  const load = useCallback(async () => {
    try {
      const [p, s] = await Promise.all([
        warmupService.list(),
        sessionService.list(),
      ]);
      setPlans(p);
      setSessions(s.filter((s: any) => s.status === 'connected'));
    } catch {
      toast.error('Erro ao carregar planos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Listen to WS warmup.progress events
  useEffect(() => {
    const socket = getSocket();
    const handler = () => {
      warmupService.list().then(setPlans).catch(() => undefined);
    };
    socket.on('warmup.progress', handler);
    return () => { socket.off('warmup.progress', handler); };
  }, []);

  const handleCreate = async (data: WarmupPlanPayload) => {
    setCreateLoading(true);
    try {
      await warmupService.create(data);
      toast.success('Plano criado!');
      setShowCreate(false);
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao criar plano');
    } finally {
      setCreateLoading(false);
    }
  };

  const action = async (planId: string, fn: () => Promise<any>, successMsg: string) => {
    setActionLoading(planId);
    try {
      await fn();
      toast.success(successMsg);
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro');
    } finally {
      setActionLoading(null);
    }
  };

  const totalRunning = plans.filter((p) => p.status === 'running').length;
  const totalMsgs = plans.reduce((acc, p) => acc, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Flame className="w-6 h-6 text-primary" />
            Aquecimento de Números
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sessões trocam mensagens automaticamente para aquecer os números
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </Button>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Plano
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Planos totais', value: plans.length, icon: Calendar, color: 'text-primary' },
          { label: 'Em execução', value: totalRunning, icon: Flame, color: 'text-green-400' },
          { label: 'Sessões disponíveis', value: sessions.length, icon: Zap, color: 'text-yellow-400' },
          { label: 'Concluídos', value: plans.filter((p) => p.status === 'completed').length, icon: CheckCircle2, color: 'text-blue-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="bg-card/60 border-primary/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Icon className={cn('w-5 h-5', color)} />
              </div>
              <div>
                <p className="text-xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Plans list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : plans.length === 0 ? (
        <Card className="bg-card/40 border-primary/20">
          <CardContent className="py-16 text-center space-y-3">
            <Flame className="w-12 h-12 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">Nenhum plano de aquecimento criado ainda</p>
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Criar primeiro plano
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              actionLoading={actionLoading === plan.id}
              onStart={() => action(plan.id, () => warmupService.start(plan.id), 'Aquecimento iniciado!')}
              onPause={() => action(plan.id, () => warmupService.pause(plan.id), 'Aquecimento pausado')}
              onStop={() => action(plan.id, () => warmupService.stop(plan.id), 'Aquecimento parado')}
              onDelete={() => {
                if (!confirm(`Excluir plano "${plan.name}"?`)) return;
                action(plan.id, () => warmupService.delete(plan.id), 'Plano excluído');
              }}
              onViewLogs={() => setLogsTarget(plan)}
            />
          ))}
        </div>
      )}

      {/* Create dialog */}
      {showCreate && (
        <Dialog open onOpenChange={() => setShowCreate(false)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto custom-scrollbar">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-primary" />
                Novo Plano de Aquecimento
              </DialogTitle>
            </DialogHeader>
            <PlanForm
              sessions={sessions}
              onSave={handleCreate}
              onClose={() => setShowCreate(false)}
              loading={createLoading}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Logs modal */}
      {logsTarget && (
        <LogsModal plan={logsTarget} onClose={() => setLogsTarget(null)} />
      )}
    </div>
  );
};
