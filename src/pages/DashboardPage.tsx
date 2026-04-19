import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '../components/ui/shared';
import {
  Users,
  UserCheck,
  Send,
  MessageSquare,
  Plus,
  Smartphone,
  FileText,
  Settings,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Activity,
  TrendingUp,
  BarChart3,
  MousePointer2,
  BrainCircuit,
  PieChart,
  RefreshCw,
  Heart,
  Ban,
  DollarSign,
  Target,
  Smile,
  ShieldCheck,
  ZapOff,
  UserPlus
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { cn } from '../lib/utils';
import { motion } from 'framer-motion';
import { apiClient } from '../services/apiClient';
import { useSessionStore } from '../store/useSessionStore';
import { sessionService } from '../services/sessionService';

const MetricCard = ({ label, value, change, trend, icon: Icon, colorClass, progress }: any) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02, translateY: -2 }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group h-full"
    >
      <Card className="h-full overflow-hidden border-none bg-card/40 backdrop-blur-md shadow-[0_0_20px_rgba(0,0,0,0.2)] ring-1 ring-white/5 hover:ring-primary/30 transition-all">
        <CardContent className="p-4 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between space-y-0">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{label}</p>
            <div className={cn("p-1.5 rounded-md", colorClass)}>
              <Icon className="h-3.5 w-3.5" />
            </div>
          </div>

          <div className="mt-2 mb-1">
            <div className="text-lg font-black tracking-tight flex items-baseline gap-2">
              {value}
              {change && (
                <span className={cn(
                  "text-[9px] font-bold",
                  trend === 'up' ? "text-emerald-400" : "text-rose-400"
                )}>
                  {change}
                </span>
              )}
            </div>
          </div>

          {progress !== undefined && (
            <div className="h-1 w-full bg-muted/20 rounded-full overflow-hidden mt-1">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className={cn("h-full river-progress-indicator rounded-full",
                  trend === 'down' && progress < 10 ? "!bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" : ""
                )}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { sessions, setSessions, selectedSessionId } = useSessionStore();
  const [overview, setOverview] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeSessionName, setActiveSessionName] = useState<string | null>(null);

  const resolveActiveConnectedSession = (sessionList = sessions) => {
    const selectedConnected =
      selectedSessionId != null
        ? sessionList.find((session) => session.id === selectedSessionId && session.status === 'connected')
        : null;
    return selectedConnected ?? sessionList.find((session) => session.status === 'connected') ?? null;
  };

  const loadData = async () => {
    try {
      const sessData = await sessionService.list();
      setSessions(sessData);
      const activeSession = resolveActiveConnectedSession(sessData);
      setActiveSessionName(activeSession?.name ?? null);

      if (!activeSession) {
        setOverview({
          contacts: { total: 0, optIn: 0 },
          campaigns: { total: 0 },
          sessions: { total: 0 },
          delivery: { sent: 0, read: 0 },
        });
        return;
      }

      const ovData = await apiClient.get<any>('/api/dashboard/overview', { query: { sessionId: activeSession.id } });
      setOverview(ovData);
    } catch {
      // fail-closed: avoid showing stale metrics when session validation fails
      setSessions([]);
      setActiveSessionName(null);
      setOverview({
        contacts: { total: 0, optIn: 0 },
        campaigns: { total: 0 },
        sessions: { total: 0 },
        delivery: { sent: 0, read: 0 },
      });
    }
  };

  useEffect(() => {
    loadData().catch(() => undefined);
    const iv = setInterval(() => loadData().catch(() => undefined), 30_000);
    return () => clearInterval(iv);
  }, [selectedSessionId]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData().catch(() => undefined);
    setIsRefreshing(false);
  };

  const contacts = overview?.contacts ?? {};
  const delivery = overview?.delivery ?? {};
  const campaigns = overview?.campaigns ?? {};
  const sessionsData = overview?.sessions ?? {};

  const deliveryRate = delivery.sent > 0 ? Math.round((delivery.read / delivery.sent) * 100) : 0;
  const optInRate = contacts.total > 0 ? Math.round((contacts.optIn / contacts.total) * 100) : 0;

  const metricsGroups = [
    {
      title: "Visão Geral",
      metrics: [
        { label: 'Total Contatos', value: (contacts.total ?? 0).toLocaleString(), icon: Users, colorClass: 'bg-blue-500/10 text-blue-400', progress: Math.min(100, Math.round(((contacts.total ?? 0) / 10000) * 100)) },
        { label: 'Opt-in Ativo', value: (contacts.optIn ?? 0).toLocaleString(), icon: UserCheck, colorClass: 'bg-emerald-500/10 text-emerald-400', progress: optInRate },
        { label: 'Sessões', value: (sessionsData.total ?? sessions.length).toString(), icon: Smartphone, colorClass: 'bg-primary/10 text-primary', progress: Math.min(100, (sessionsData.total ?? sessions.length) * 10) },
        { label: 'Campanhas', value: (campaigns.total ?? 0).toString(), icon: Send, colorClass: 'bg-amber-500/10 text-amber-400', progress: Math.min(100, (campaigns.total ?? 0) * 5) },
        { label: 'Enviados', value: (delivery.sent ?? 0).toLocaleString(), icon: Send, colorClass: 'bg-violet-500/10 text-violet-400', progress: Math.min(100, Math.round(((delivery.sent ?? 0) / 100000) * 100)) },
        { label: 'Lidos', value: (delivery.read ?? 0).toLocaleString(), icon: CheckCircle2, colorClass: 'bg-emerald-500/10 text-emerald-400', progress: deliveryRate },
      ]
    },
    {
      title: "Canais Ativos",
      metrics: sessions.slice(0, 6).map(s => ({
        label: s.name,
        value: s.phoneNumber ?? 'Aguardando',
        icon: Smartphone,
        colorClass: s.status === 'connected' ? 'bg-emerald-500/10 text-emerald-400' : s.status === 'error' ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400',
        progress: s.healthScore ?? 0,
        change: s.status,
        trend: s.status === 'connected' ? 'up' : 'down',
      })).concat(
        sessions.length === 0 ? [{
          label: 'Nenhuma sessão', value: 'Crie em Conectores', icon: Settings,
          colorClass: 'bg-muted/10 text-muted-foreground', progress: 0,
        } as any] : []
      ),
    },
  ];

  const shortcuts = [
    { label: 'Contatos', desc: 'Importar novos leads', icon: Users, colorClass: 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20', action: () => navigate('/contacts') },
    { label: 'Templates', desc: 'Criar modelos de msg', icon: FileText, colorClass: 'bg-primary/10 text-primary hover:bg-primary/20', action: () => navigate('/campaigns') },
    { label: 'Conexões', desc: 'Configurar canais', icon: Settings, colorClass: 'bg-violet-500/10 text-violet-400 hover:bg-violet-500/20', action: () => navigate('/connectors') },
    { label: 'Relatórios', desc: 'Análise detalhada', icon: BarChart3, colorClass: 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20', action: () => navigate('/reports') },
  ];

  const connectedSessions = sessions.filter(s => s.status === 'connected');

  return (
    <div className="space-y-8 sm:space-y-12 pb-20 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <Badge variant="outline" className="mb-2 neon-border bg-primary/5 text-primary animate-pulse text-[10px] sm:text-xs">
            SISTEMA OPERACIONAL ATIVO
          </Badge>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tighter text-neon-gradient">
            COMMAND CENTER
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground font-medium">{activeSessionName ? `Metricas reais da sessao ativa: ${activeSessionName}.` : 'Conecte uma sessao para visualizar metricas reais.'}</p>
        </div>
        <div className="hidden md:flex gap-4 items-center">
          <div className="text-right">
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Sessões Online</p>
            <p className="text-xs font-mono font-bold text-emerald-400">{connectedSessions.length} CONECTADAS</p>
          </div>
          <div className="h-10 w-[1px] bg-border" />
          <button onClick={handleRefresh} className="text-right hover:opacity-70 transition-opacity">
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Atualizar</p>
            <RefreshCw className={cn("w-4 h-4 text-primary mx-auto mt-0.5", isRefreshing && "animate-spin")} />
          </button>
        </div>
      </div>

      <div className="space-y-10">
        {metricsGroups.map((group, groupIdx) => (
          <div key={groupIdx} className="space-y-4">
            <div className="flex items-center gap-3">
              <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/80">{group.title}</h2>
              <div className="h-[1px] flex-1 bg-gradient-to-r from-muted via-muted/50 to-transparent" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {group.metrics.map((metric, idx) => (
                <MetricCard key={idx} {...metric} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2 border-none bg-card/40 backdrop-blur-md shadow-2xl ring-1 ring-white/5 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between border-b border-white/5 bg-white/5 py-4">
            <div>
              <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" /> Entregas vs Leituras
              </CardTitle>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-[10px] font-bold text-muted-foreground">ENVIADOS</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-[10px] font-bold text-muted-foreground">LIDOS</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="h-[350px] pt-8 pr-6">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={[
                { name: 'Total', enviados: delivery.sent ?? 0, lidos: delivery.read ?? 0 },
              ]}>
                <defs>
                  <linearGradient id="colorEnviados" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorLidos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: 'hsl(var(--muted-foreground))', fontWeight: 600}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: 'hsl(var(--muted-foreground))', fontWeight: 600}} />
                <Tooltip contentStyle={{ backgroundColor: 'rgba(5, 5, 10, 0.95)', borderColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '8px', backdropFilter: 'blur(10px)', fontSize: '11px' }} />
                <Area type="monotone" dataKey="enviados" stroke="var(--primary)" strokeWidth={4} fillOpacity={1} fill="url(#colorEnviados)" />
                <Area type="monotone" dataKey="lidos" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorLidos)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-none bg-card/40 backdrop-blur-md shadow-2xl ring-1 ring-white/5 overflow-hidden">
            <CardHeader className="pb-4 border-b border-white/5 bg-white/5 py-4">
              <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" /> Atalhos Rápidos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 grid grid-cols-1 gap-3">
              {shortcuts.map((shortcut, i) => (
                <motion.button
                  key={i}
                  whileHover={{ x: 5 }}
                  onClick={shortcut.action}
                  className="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all text-left group"
                >
                  <div className={cn("p-2.5 rounded-lg transition-all shadow-lg", shortcut.colorClass)}>
                    <shortcut.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold">{shortcut.label}</p>
                    <p className="text-[10px] text-muted-foreground">{shortcut.desc}</p>
                  </div>
                  <Plus className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.button>
              ))}
            </CardContent>
          </Card>

          <Card className="border-none bg-card/40 backdrop-blur-md shadow-2xl ring-1 ring-white/5 overflow-hidden">
            <CardHeader className="pb-4 border-b border-white/5 bg-white/5 py-4 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" /> Sessões Ativas
              </CardTitle>
              <Badge variant="outline" className={cn("text-[9px] font-black", connectedSessions.length > 0 ? "border-emerald-500/20 text-emerald-400" : "border-rose-500/20 text-rose-400")}>
                {connectedSessions.length > 0 ? 'STATUS: OK' : 'OFFLINE'}
              </Badge>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {connectedSessions.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhuma sessão conectada. Acesse <button onClick={() => navigate('/connectors')} className="text-primary underline">Conectores</button>.</p>
              ) : (
                connectedSessions.slice(0, 4).map((s, i) => (
                  <div key={s.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <div className="flex flex-col">
                          <span className="text-xs font-bold leading-none">{s.name}</span>
                          <span className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">{s.phoneNumber ?? 'WhatsApp'}</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-muted-foreground">{s.healthScore ?? 100}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${s.healthScore ?? 100}%` }}
                        className="h-full river-progress-indicator rounded-full"
                      />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

