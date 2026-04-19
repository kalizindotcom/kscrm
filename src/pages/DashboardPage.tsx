import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '../components/ui/shared';
import { 
  Users, 
  UserCheck, 
  Send, 
  MessageSquare, 
  ArrowUpRight, 
  ArrowDownRight,
  Plus,
  Smartphone,
  FileText,
  Settings,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Activity,
  Database,
  Globe,
  TrendingUp,
  BarChart3,
  MousePointer2,
  BrainCircuit,
  PieChart,
  HardDrive,
  Cpu,
  RefreshCw,
  LayoutGrid,
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

const chartData = [
  { name: 'Jan', contatos: 4000, envios: 2400 },
  { name: 'Fev', contatos: 3000, envios: 1398 },
  { name: 'Mar', contatos: 2000, envios: 9800 },
  { name: 'Abr', contatos: 2780, envios: 3908 },
  { name: 'Mai', contatos: 1890, envios: 4800 },
  { name: 'Jun', contatos: 2390, envios: 3800 },
];

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

  const metricsGroups = [
    {
      title: "Visão Geral",
      metrics: [
        { label: 'Total Contatos', value: '12,543', change: '+12%', trend: 'up', icon: Users, colorClass: 'bg-blue-500/10 text-blue-400', progress: 75 },
        { label: 'Opt-in Ativo', value: '8,432', change: '+5%', trend: 'up', icon: UserCheck, colorClass: 'bg-emerald-500/10 text-emerald-400', progress: 92 },
        { label: 'Novos (24h)', value: '142', change: '+18%', trend: 'up', icon: UserPlus, colorClass: 'bg-primary/10 text-primary', progress: 15 },
        { label: 'Campanhas', value: '45', change: '-2%', trend: 'down', icon: Send, colorClass: 'bg-amber-500/10 text-amber-400', progress: 60 },
        { label: 'Templates', value: '128', change: '+4', trend: 'up', icon: FileText, colorClass: 'bg-violet-500/10 text-violet-400', progress: 85 },
        { label: 'Créditos', value: 'R$ 1.2k', change: '-R$ 45', trend: 'down', icon: DollarSign, colorClass: 'bg-emerald-500/10 text-emerald-400', progress: 40 },
      ]
    },
    {
      title: "Entrega de Mensagens",
      metrics: [
        { label: 'Enviados', value: '154k', change: '+18%', trend: 'up', icon: Send, colorClass: 'bg-primary/10 text-primary', progress: 88 },
        { label: 'Entregues', value: '98.2%', change: '+0.5%', trend: 'up', icon: CheckCircle2, colorClass: 'bg-emerald-500/10 text-emerald-400', progress: 98 },
        { label: 'Lidas', value: '74.5%', change: '+12%', trend: 'up', icon: Smartphone, colorClass: 'bg-blue-500/10 text-blue-400', progress: 74 },
        { label: 'Falhas', value: '1.2%', change: '-0.1%', trend: 'down', icon: AlertTriangle, colorClass: 'bg-rose-500/10 text-rose-400', progress: 1.2 },
        { label: 'Pendentes', value: '450', change: '+2%', trend: 'up', icon: Clock, colorClass: 'bg-amber-500/10 text-amber-400', progress: 5 },
        { label: 'Bloqueios', value: '12', change: '-2', trend: 'down', icon: Ban, colorClass: 'bg-rose-500/10 text-rose-400', progress: 0.1 },
      ]
    },
    {
      title: "Engajamento & IA",
      metrics: [
        { label: 'Taxa Resposta', value: '24.5%', change: '+3.2%', trend: 'up', icon: MessageSquare, colorClass: 'bg-violet-500/10 text-violet-400', progress: 45 },
        { label: 'CTR Médio', value: '8.4%', change: '+1.2%', trend: 'up', icon: MousePointer2, colorClass: 'bg-blue-500/10 text-blue-400', progress: 34 },
        { label: 'Tempo Médio', value: '2.4m', change: '+0.5m', trend: 'up', icon: Activity, colorClass: 'bg-emerald-500/10 text-emerald-400', progress: 62 },
        { label: 'Unsubscribes', value: '0.4%', change: '-0.1%', trend: 'down', icon: ZapOff, colorClass: 'bg-rose-500/10 text-rose-400', progress: 0.4 },
        { label: 'Reações', value: '12.4k', change: '+2k', trend: 'up', icon: Heart, colorClass: 'bg-rose-500/10 text-rose-400', progress: 70 },
        { label: 'Recebidas', value: '42k', change: '+5k', trend: 'up', icon: MessageSquare, colorClass: 'bg-primary/10 text-primary', progress: 55 },
      ]
    },
    {
      title: "Inteligência Artificial",
      metrics: [
        { label: 'Intenções', value: '28', trend: 'up', icon: Target, colorClass: 'bg-violet-500/10 text-violet-400', progress: 100 },
        { label: 'Automatizado', value: '64%', change: '+12%', trend: 'up', icon: BrainCircuit, colorClass: 'bg-emerald-500/10 text-emerald-400', progress: 64 },
        { label: 'Transbordos', value: '124', change: '-15%', trend: 'down', icon: Users, colorClass: 'bg-amber-500/10 text-amber-400', progress: 12 },
        { label: 'Sentimento', value: '85%', change: '+5%', trend: 'up', icon: Smile, colorClass: 'bg-primary/10 text-primary', progress: 85 },
        { label: 'Precisão IA', value: '94%', change: '+1%', trend: 'up', icon: ShieldCheck, colorClass: 'bg-emerald-500/10 text-emerald-400', progress: 94 },
        { label: 'Tempo Salvo', value: '450h', change: '+40h', trend: 'up', icon: Zap, colorClass: 'bg-primary/10 text-primary', progress: 100 },
      ]
    },
    {
      title: "Conversão & ROI",
      metrics: [
        { label: 'Vendas (R$)', value: '125k', change: '+15k', trend: 'up', icon: DollarSign, colorClass: 'bg-emerald-500/10 text-emerald-400', progress: 72 },
        { label: 'Leads Qual.', value: '1.8k', change: '+240', trend: 'up', icon: Target, colorClass: 'bg-blue-500/10 text-blue-400', progress: 65 },
        { label: 'ROI Médio', value: '4.5x', change: '+0.5', trend: 'up', icon: TrendingUp, colorClass: 'bg-violet-500/10 text-violet-400', progress: 88 },
        { label: 'Custo/Lead', value: 'R$ 4.2', change: '-0.5', trend: 'down', icon: DollarSign, colorClass: 'bg-amber-500/10 text-amber-400', progress: 10 },
        { label: 'Retenção', value: '92%', change: '+2%', trend: 'up', icon: Activity, colorClass: 'bg-primary/10 text-primary', progress: 92 },
        { label: 'LTV Estimado', value: 'R$ 850', change: '+50', trend: 'up', icon: BarChart3, colorClass: 'bg-emerald-500/10 text-emerald-400', progress: 55 },
      ]
    }
  ];

  const shortcuts = [
    { label: 'Contatos', desc: 'Importar novos leads', icon: Users, colorClass: 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20', action: () => navigate('/contacts') },
    { label: 'Templates', desc: 'Criar modelos de msg', icon: FileText, colorClass: 'bg-primary/10 text-primary hover:bg-primary/20', action: () => navigate('/campaigns') },
    { label: 'Conexões', desc: 'Configurar canais', icon: Settings, colorClass: 'bg-violet-500/10 text-violet-400 hover:bg-violet-500/20', action: () => navigate('/connectors') },
    { label: 'Relatórios', desc: 'Análise detalhada', icon: BarChart3, colorClass: 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20', action: () => navigate('/reports') },
  ];

  const channels = [
    { name: 'WhatsApp Business', provider: 'Twilio', status: 'Conectado', health: 98, colorClass: 'bg-blue-500 text-blue-500' },
    { name: 'WhatsApp Official', provider: 'Meta API', status: 'Conectado', health: 92, colorClass: 'bg-emerald-500 text-emerald-500' },
    { name: 'Email Marketing', provider: 'SendGrid', status: 'Ativo', health: 85, colorClass: 'bg-primary text-primary' },
  ];

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
          <p className="text-xs sm:text-sm text-muted-foreground font-medium">Monitoramento global de métricas e performance em tempo real.</p>
        </div>
        <div className="hidden md:flex gap-4 items-center">
            <div className="text-right">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Server Load</p>
                <p className="text-xs font-mono font-bold text-emerald-400">12.4% - OPTIMIZED</p>
            </div>
            <div className="h-10 w-[1px] bg-border" />
            <div className="text-right">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Last Sync</p>
                <p className="text-xs font-mono font-bold text-primary">JUST NOW</p>
            </div>
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
                <TrendingUp className="w-4 h-4 text-primary" /> Fluxo de Crescimento
              </CardTitle>
            </div>
            <div className="flex gap-4">
               <div className="flex items-center gap-1.5">
                   <div className="w-2 h-2 rounded-full bg-primary" />
                   <span className="text-[10px] font-bold text-muted-foreground">CONTATOS</span>
               </div>
               <div className="flex items-center gap-1.5">
                   <div className="w-2 h-2 rounded-full bg-emerald-400" />
                   <span className="text-[10px] font-bold text-muted-foreground">ENVIO</span>
               </div>
            </div>
          </CardHeader>
          <CardContent className="h-[350px] pt-8 pr-6">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorContatos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorEnvios" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: 'hsl(var(--muted-foreground))', fontWeight: 600}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: 'hsl(var(--muted-foreground))', fontWeight: 600}} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(5, 5, 10, 0.95)', 
                    borderColor: 'rgba(255, 255, 255, 0.1)', 
                    borderRadius: '8px',
                    backdropFilter: 'blur(10px)',
                    fontSize: '11px'
                  }}
                />
                <Area type="monotone" dataKey="contatos" stroke="var(--primary)" strokeWidth={4} fillOpacity={1} fill="url(#colorContatos)" />
                <Area type="monotone" dataKey="envios" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorEnvios)" />
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
                <Activity className="w-4 h-4 text-emerald-400" /> Canais Ativos
              </CardTitle>
              <Badge variant="outline" className="text-[9px] font-black border-emerald-500/20 text-emerald-400">STATUS: OK</Badge>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {channels.map((channel, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                       <div className="flex flex-col">
                           <span className="text-xs font-bold leading-none">{channel.name}</span>
                           <span className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">{channel.provider}</span>
                       </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-muted-foreground">{channel.health}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${channel.health}%` }}
                        className={cn("h-full river-progress-indicator rounded-full", 
                          channel.health > 90 ? "opacity-100" : "opacity-80"
                        )}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};