import React from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Users, MessageSquare, Clock, Target, ArrowUp, ArrowDown } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';

const messageData = [
  { name: 'Seg', enviadas: 120, entregues: 115, lidas: 98, respondidas: 45 },
  { name: 'Ter', enviadas: 150, entregues: 145, lidas: 130, respondidas: 68 },
  { name: 'Qua', enviadas: 180, entregues: 175, lidas: 160, respondidas: 85 },
  { name: 'Qui', enviadas: 200, entregues: 195, lidas: 180, respondidas: 95 },
  { name: 'Sex', enviadas: 170, entregues: 165, lidas: 150, respondidas: 78 },
  { name: 'Sáb', enviadas: 90, entregues: 88, lidas: 75, respondidas: 32 },
  { name: 'Dom', enviadas: 60, entregues: 58, lidas: 50, respondidas: 20 },
];

const campaignData = [
  { name: 'Promoção Verão', value: 450, color: '#3b82f6' },
  { name: 'Black Friday', value: 380, color: '#8b5cf6' },
  { name: 'Lançamento', value: 290, color: '#ec4899' },
  { name: 'Follow-up', value: 180, color: '#f59e0b' },
];

const hourlyData = [
  { hour: '00h', msgs: 5 },
  { hour: '03h', msgs: 2 },
  { hour: '06h', msgs: 8 },
  { hour: '09h', msgs: 45 },
  { hour: '12h', msgs: 78 },
  { hour: '15h', msgs: 92 },
  { hour: '18h', msgs: 110 },
  { hour: '21h', msgs: 65 },
];

interface MetricCardProps {
  title: string;
  value: string | number;
  change: number;
  icon: React.ElementType;
  color: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, change, icon: Icon, color }) => {
  const isPositive = change >= 0;
  return (
    <Card className="bg-card/40 backdrop-blur-md border-primary/10 p-6 relative overflow-hidden group hover:border-primary/30 transition-all">
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/5 to-transparent rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500" />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", `bg-${color}-500/10 border border-${color}-500/20`)}>
            <Icon className={cn("w-6 h-6", `text-${color}-500`)} />
          </div>
          <div className={cn(
            "flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg",
            isPositive ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
          )}>
            {isPositive ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
            {Math.abs(change)}%
          </div>
        </div>
        <p className="text-sm text-slate-500 font-bold uppercase tracking-widest mb-1">{title}</p>
        <p className="text-3xl font-black text-white">{value}</p>
      </div>
    </Card>
  );
};

export const AdvancedAnalytics: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-black text-white">Analytics Avançado</h2>
          <p className="text-xs text-slate-500 font-medium">Métricas detalhadas e insights em tempo real</p>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Enviadas"
          value="12.5K"
          change={12.5}
          icon={MessageSquare}
          color="blue"
        />
        <MetricCard
          title="Taxa de Entrega"
          value="98.2%"
          change={2.3}
          icon={Target}
          color="emerald"
        />
        <MetricCard
          title="Taxa de Leitura"
          value="87.5%"
          change={5.8}
          icon={Users}
          color="purple"
        />
        <MetricCard
          title="Taxa de Resposta"
          value="42.1%"
          change={-1.2}
          icon={TrendingUp}
          color="orange"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Messages Timeline */}
        <Card className="bg-card/40 backdrop-blur-md border-primary/10 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-black text-white uppercase tracking-widest">Mensagens por Dia</h3>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Últimos 7 dias</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={messageData}>
              <defs>
                <linearGradient id="colorEnviadas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorLidas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: '11px', fontWeight: 'bold' }} />
              <YAxis stroke="#64748b" style={{ fontSize: '11px', fontWeight: 'bold' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                }}
              />
              <Area type="monotone" dataKey="enviadas" stroke="#3b82f6" fillOpacity={1} fill="url(#colorEnviadas)" strokeWidth={2} />
              <Area type="monotone" dataKey="lidas" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorLidas)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Campaign Distribution */}
        <Card className="bg-card/40 backdrop-blur-md border-primary/10 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-black text-white uppercase tracking-widest">Distribuição por Campanha</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={campaignData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {campaignData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Hourly Activity */}
        <Card className="bg-card/40 backdrop-blur-md border-primary/10 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Atividade por Horário
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="hour" stroke="#64748b" style={{ fontSize: '11px', fontWeight: 'bold' }} />
              <YAxis stroke="#64748b" style={{ fontSize: '11px', fontWeight: 'bold' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                }}
              />
              <Bar dataKey="msgs" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Performance Comparison */}
        <Card className="bg-card/40 backdrop-blur-md border-primary/10 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-black text-white uppercase tracking-widest">Comparativo de Performance</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={messageData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: '11px', fontWeight: 'bold' }} />
              <YAxis stroke="#64748b" style={{ fontSize: '11px', fontWeight: 'bold' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
              <Bar dataKey="enviadas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="lidas" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="respondidas" fill="#ec4899" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Insights */}
      <Card className="bg-card/40 backdrop-blur-md border-primary/10 p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-black text-white uppercase tracking-widest">Insights Automáticos</h3>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
            <p className="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-2">Melhor Horário</p>
            <p className="text-sm text-slate-300 leading-relaxed">
              Suas mensagens têm <strong className="text-white">35% mais engajamento</strong> entre 18h e 21h.
            </p>
          </div>
          <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl">
            <p className="text-xs font-bold text-primary uppercase tracking-widest mb-2">Dia da Semana</p>
            <p className="text-sm text-slate-300 leading-relaxed">
              <strong className="text-white">Quinta-feira</strong> é o dia com maior taxa de resposta (47.5%).
            </p>
          </div>
          <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl">
            <p className="text-xs font-bold text-orange-500 uppercase tracking-widest mb-2">Oportunidade</p>
            <p className="text-sm text-slate-300 leading-relaxed">
              Aumente o envio aos <strong className="text-white">sábados</strong> para explorar potencial não utilizado.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
