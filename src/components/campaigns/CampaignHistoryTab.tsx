import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Smartphone,
  Users,
  AlertCircle,
  Ban,
  PauseCircle,
  Trophy,
  TrendingUp,
  FileText,
  RefreshCw,
  Send,
  ChevronLeft,
  Calendar,
} from 'lucide-react';
import { Card, CardContent, Badge, Button } from '../ui/shared';
import { cn, formatDate } from '../../lib/utils';
import { campaignService, type CampaignHistoryEntry, type CampaignTargetDto } from '../../services/campaignService';
import { toast } from 'sonner';

const statusStyle: Record<string, { label: string; Icon: any; color: string; bg: string }> = {
  completed: { label: 'Concluída', Icon: Trophy, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  cancelled: { label: 'Cancelada', Icon: Ban, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  failed: { label: 'Falhou', Icon: AlertCircle, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
  paused: { label: 'Pausada', Icon: PauseCircle, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
};

function formatDuration(ms: number) {
  if (!ms || ms <= 0) return '—';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export const CampaignHistoryTab: React.FC<{ onRestart?: (id: string) => void }> = ({ onRestart }) => {
  const [items, setItems] = useState<CampaignHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await campaignService.history(100);
      setItems(data);
    } catch (err: any) {
      toast.error(err?.message ?? 'Falha ao carregar histórico');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (selectedId) {
    return (
      <CampaignHistoryDetail
        campaignId={selectedId}
        onBack={() => setSelectedId(null)}
        onRestart={onRestart}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold">Histórico de Disparos</h3>
          <p className="text-xs text-muted-foreground">
            Campanhas finalizadas, canceladas, pausadas ou com falha.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} /> Atualizar
        </Button>
      </div>

      {loading && items.length === 0 && (
        <div className="text-sm text-muted-foreground">Carregando...</div>
      )}

      {!loading && items.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center space-y-2">
            <FileText className="w-8 h-8 text-muted-foreground mx-auto" />
            <p className="text-sm font-medium">Nenhuma campanha finalizada ainda.</p>
            <p className="text-xs text-muted-foreground">
              Dispare uma campanha para começar a construir o histórico.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3">
        {items.map((it) => {
          const meta = statusStyle[it.status] ?? statusStyle.completed;
          const Icon = meta.Icon;
          return (
            <Card
              key={it.id}
              className="cursor-pointer hover:border-primary/40 transition-all"
              onClick={() => setSelectedId(it.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      'h-12 w-12 rounded-xl border flex items-center justify-center shrink-0',
                      meta.bg,
                    )}
                  >
                    <Icon className={cn('w-5 h-5', meta.color)} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h4 className="font-bold truncate">{it.name}</h4>
                      <Badge variant="outline" className={cn('text-[10px] py-0', meta.color)}>
                        {meta.label}
                      </Badge>
                    </div>
                    {it.messagePreview && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                        {it.messagePreview}
                      </p>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                      <InlineStat icon={Users} label="Total" value={it.total.toLocaleString('pt-BR')} />
                      <InlineStat
                        icon={CheckCircle2}
                        label="Enviados"
                        value={it.sent.toLocaleString('pt-BR')}
                        tone="text-emerald-400"
                      />
                      <InlineStat
                        icon={XCircle}
                        label="Falhas"
                        value={it.failed.toLocaleString('pt-BR')}
                        tone="text-rose-400"
                      />
                      <InlineStat
                        icon={TrendingUp}
                        label="Sucesso"
                        value={`${it.successRate}%`}
                        tone="text-blue-400"
                      />
                      <InlineStat icon={Clock} label="Duração" value={formatDuration(it.durationMs)} />
                    </div>

                    <div className="flex flex-wrap items-center gap-3 mt-3 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {it.finishedAt ? formatDate(it.finishedAt) : '—'}
                      </span>
                      {it.session && (
                        <span className="flex items-center gap-1">
                          <Smartphone className="w-3 h-3" />
                          {it.session.label}
                        </span>
                      )}
                      {it.hasMedia && (
                        <Badge variant="outline" className="text-[9px] py-0 h-4">
                          {(it.mediaType ?? 'mídia').toUpperCase()}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {onRestart && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRestart(it.id);
                      }}
                    >
                      <Send className="w-3 h-3 mr-1" /> Disparar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

const InlineStat: React.FC<{ icon: any; label: string; value: string; tone?: string }> = ({
  icon: Icon,
  label,
  value,
  tone,
}) => (
  <div>
    <p className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground flex items-center gap-1">
      <Icon className="w-3 h-3" /> {label}
    </p>
    <p className={cn('text-sm font-black italic tracking-tighter', tone)}>{value}</p>
  </div>
);

const CampaignHistoryDetail: React.FC<{
  campaignId: string;
  onBack: () => void;
  onRestart?: (id: string) => void;
}> = ({ campaignId, onBack, onRestart }) => {
  const [detail, setDetail] = useState<any | null>(null);
  const [targets, setTargets] = useState<CampaignTargetDto[]>([]);
  const [filter, setFilter] = useState<'all' | 'sent' | 'failed'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [camp, tgs] = await Promise.all([
          campaignService.get(campaignId),
          campaignService.getTargets(campaignId, { pageSize: 500 }),
        ]);
        if (cancelled) return;
        setDetail(camp);
        setTargets(tgs.items);
      } catch (err: any) {
        toast.error(err?.message ?? 'Falha ao carregar detalhes');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  const filtered = useMemo(() => {
    if (filter === 'all') return targets;
    return targets.filter((t) => t.status === filter);
  }, [filter, targets]);

  if (loading || !detail) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Voltar ao histórico
        </Button>
        <div className="text-sm text-muted-foreground">Carregando detalhes...</div>
      </div>
    );
  }

  const sent = detail.targetsByStatus?.sent ?? 0;
  const failed = detail.targetsByStatus?.failed ?? 0;
  const total = detail.targetTotal ?? 0;
  const successRate = total > 0 ? Math.round((sent / total) * 100) : 0;
  const durationMs =
    detail.startedAt && detail.finishedAt
      ? new Date(detail.finishedAt).getTime() - new Date(detail.startedAt).getTime()
      : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Voltar ao histórico
        </Button>
        {onRestart && (
          <Button size="sm" onClick={() => onRestart(detail.id)}>
            <Send className="w-4 h-4 mr-2" /> Disparar Novamente
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-5 space-y-4">
          <div>
            <h3 className="text-xl font-black italic tracking-tighter">{detail.name}</h3>
            <p className="text-xs text-muted-foreground capitalize">
              {detail.status} · {detail.channel}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SummaryCell label="Total" value={total.toLocaleString('pt-BR')} />
            <SummaryCell label="Enviados" value={sent.toLocaleString('pt-BR')} tone="text-emerald-400" />
            <SummaryCell label="Falhas" value={failed.toLocaleString('pt-BR')} tone="text-rose-400" />
            <SummaryCell label="Sucesso" value={`${successRate}%`} tone="text-blue-400" />
            <SummaryCell label="Duração" value={formatDuration(durationMs)} />
            <SummaryCell
              label="Iniciada"
              value={detail.startedAt ? new Date(detail.startedAt).toLocaleString('pt-BR') : '—'}
            />
            <SummaryCell
              label="Finalizada"
              value={detail.finishedAt ? new Date(detail.finishedAt).toLocaleString('pt-BR') : '—'}
            />
            <SummaryCell
              label="Intervalo"
              value={`${detail.intervalSec ?? 0}s`}
            />
          </div>

          {detail.messageContent && (
            <div>
              <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-1">
                Mensagem
              </p>
              <p className="text-sm whitespace-pre-wrap bg-muted/30 rounded-lg p-3 border">
                {detail.messageContent}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center gap-2">
        {(['all', 'sent', 'failed'] as const).map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? 'primary' : 'outline'}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'Todos' : f === 'sent' ? 'Enviados' : 'Falhas'}
          </Button>
        ))}
        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length} registros
        </span>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="max-h-[480px] overflow-y-auto divide-y">
            {filtered.map((t) => (
              <div key={t.id} className="p-3 flex items-start gap-3 text-xs">
                <div
                  className={cn(
                    'h-2 w-2 rounded-full mt-1.5 shrink-0',
                    t.status === 'sent' && 'bg-emerald-500',
                    t.status === 'failed' && 'bg-rose-500',
                    t.status === 'pending' && 'bg-amber-500',
                    t.status === 'skipped' && 'bg-slate-500',
                  )}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold">{t.phone}</span>
                    {t.name && <span className="text-muted-foreground truncate">· {t.name}</span>}
                  </div>
                  {t.error && <p className="text-rose-400 mt-0.5 line-clamp-2">{t.error}</p>}
                  {t.processedAt && (
                    <p className="text-muted-foreground text-[10px] mt-0.5">
                      {new Date(t.processedAt).toLocaleString('pt-BR')}
                    </p>
                  )}
                </div>
                <Badge variant="outline" className="text-[9px] py-0 h-4 capitalize">
                  {t.status}
                </Badge>
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="p-6 text-center text-sm text-muted-foreground">
                Nenhum registro para este filtro.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const SummaryCell: React.FC<{ label: string; value: string; tone?: string }> = ({ label, value, tone }) => (
  <div>
    <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">{label}</p>
    <p className={cn('text-lg font-black italic tracking-tighter', tone)}>{value}</p>
  </div>
);
