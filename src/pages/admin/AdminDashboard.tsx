import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Users,
  DollarSign,
  TrendingUp,
  Activity,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowRight,
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import type { GlobalStats } from '../../types/admin';
import { toast } from 'sonner';
import { StatCard } from '../../components/admin/StatCard';
import { AnimatedCard } from '../../components/admin/AnimatedCard';
import { AnimatedChart } from '../../components/admin/AnimatedChart';
import { CardSkeleton } from '../../components/admin/SkeletonLoader';
import { CardHeader, CardTitle, CardContent } from '../../components/ui/shared';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await adminService.getStats();
      setStats(data);
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao carregar estatísticas');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Painel Administrativo</h1>
          <p className="text-muted-foreground mt-1">
            Visão geral do sistema e métricas principais
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  // Dados para gráficos (mock - você pode buscar do backend depois)
  const growthData = [
    { name: 'Jan', value: stats.totalOrgs - 30 },
    { name: 'Fev', value: stats.totalOrgs - 25 },
    { name: 'Mar', value: stats.totalOrgs - 20 },
    { name: 'Abr', value: stats.totalOrgs - 15 },
    { name: 'Mai', value: stats.totalOrgs - 10 },
    { name: 'Jun', value: stats.totalOrgs },
  ];

  const mrrData = [
    { name: 'Jan', value: stats.mrr * 0.7 },
    { name: 'Fev', value: stats.mrr * 0.75 },
    { name: 'Mar', value: stats.mrr * 0.8 },
    { name: 'Abr', value: stats.mrr * 0.85 },
    { name: 'Mai', value: stats.mrr * 0.92 },
    { name: 'Jun', value: stats.mrr },
  ];

  const statusData = [
    { name: 'Ativas', value: stats.activeOrgs },
    { name: 'Trial', value: stats.trialOrgs },
    { name: 'Suspensas', value: stats.suspendedOrgs },
  ];

  const statCards = [
    {
      title: 'Organizações',
      value: stats.totalOrgs,
      subtitle: `${stats.activeOrgs} ativas`,
      icon: Building2,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      trend: {
        value: stats.newOrgsLast30Days,
        isPositive: true,
      },
      onClick: () => navigate('/admin/organizations'),
    },
    {
      title: 'Usuários',
      value: stats.totalUsers,
      subtitle: `em ${stats.totalOrgs} organizações`,
      icon: Users,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      onClick: () => navigate('/admin/users'),
    },
    {
      title: 'MRR',
      value: `R$ ${stats.mrr.toFixed(2)}`,
      subtitle: 'Receita mensal',
      icon: DollarSign,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      trend: {
        value: 12.5,
        isPositive: true,
      },
    },
    {
      title: 'Crescimento',
      value: `+${stats.newOrgsLast30Days}`,
      subtitle: 'Últimos 30 dias',
      icon: TrendingUp,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      trend: {
        value: 8.3,
        isPositive: true,
      },
    },
  ];

  const statusCards = [
    {
      title: 'Ativas',
      value: stats.activeOrgs,
      icon: CheckCircle2,
      color: 'text-green-500',
    },
    {
      title: 'Trial',
      value: stats.trialOrgs,
      icon: Clock,
      color: 'text-yellow-500',
    },
    {
      title: 'Suspensas',
      value: stats.suspendedOrgs,
      icon: XCircle,
      color: 'text-red-500',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Painel Administrativo</h1>
        <p className="text-muted-foreground mt-1">
          Visão geral do sistema e métricas principais
        </p>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, idx) => (
          <StatCard
            key={idx}
            title={stat.title}
            value={stat.value}
            subtitle={stat.subtitle}
            icon={stat.icon}
            color={stat.color}
            bgColor={stat.bgColor}
            trend={stat.trend}
            delay={idx * 0.1}
            onClick={stat.onClick}
          />
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnimatedChart
          title="Crescimento de Organizações"
          data={growthData}
          type="area"
          dataKey="value"
          xAxisKey="name"
          color="#3b82f6"
          delay={0.5}
        />
        <AnimatedChart
          title="MRR - Receita Mensal Recorrente"
          data={mrrData}
          type="line"
          dataKey="value"
          xAxisKey="name"
          color="#10b981"
          delay={0.6}
        />
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AnimatedChart
            title="Distribuição por Status"
            data={statusData}
            type="pie"
            dataKey="value"
            xAxisKey="name"
            delay={0.7}
            height={350}
          />
        </div>

        <AnimatedCard delay={0.8}>
          <CardHeader>
            <CardTitle>Status das Organizações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {statusCards.map((status, idx) => (
                <div key={idx} className="flex items-center space-x-3 p-4 rounded-lg bg-muted/50">
                  <status.icon className={`w-8 h-8 ${status.color}`} />
                  <div>
                    <p className="text-sm text-muted-foreground">{status.title}</p>
                    <p className="text-2xl font-bold">{status.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </AnimatedCard>
      </div>

      {/* Sessions & Campaigns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AnimatedCard delay={0.9}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Sessões</span>
              <Activity className="w-5 h-5 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total</span>
                <span className="text-2xl font-bold">{stats.totalSessions}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Conectadas</span>
                <span className="text-xl font-semibold text-green-500">
                  {stats.activeSessions}
                </span>
              </div>
              <button
                onClick={() => navigate('/admin/sessions')}
                className="w-full mt-4 flex items-center justify-center space-x-2 text-sm text-primary hover:underline"
              >
                <span>Ver todas as sessões</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </CardContent>
        </AnimatedCard>

        <AnimatedCard delay={1.0}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Campanhas</span>
              <Activity className="w-5 h-5 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total</span>
                <span className="text-2xl font-bold">{stats.totalCampaigns}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Em execução</span>
                <span className="text-xl font-semibold text-blue-500">
                  {stats.runningCampaigns}
                </span>
              </div>
              <button
                onClick={() => navigate('/admin/activity')}
                className="w-full mt-4 flex items-center justify-center space-x-2 text-sm text-primary hover:underline"
              >
                <span>Ver logs de atividade</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </CardContent>
        </AnimatedCard>
      </div>

      {/* Quick Actions */}
      <AnimatedCard delay={1.1}>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              onClick={() => navigate('/admin/organizations/new')}
              className="p-4 rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-primary hover:bg-primary/5 transition-colors text-left"
            >
              <Building2 className="w-6 h-6 text-primary mb-2" />
              <p className="font-semibold">Nova Organização</p>
              <p className="text-xs text-muted-foreground">Criar novo cliente</p>
            </button>

            <button
              onClick={() => navigate('/admin/users/new')}
              className="p-4 rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-primary hover:bg-primary/5 transition-colors text-left"
            >
              <Users className="w-6 h-6 text-primary mb-2" />
              <p className="font-semibold">Novo Usuário</p>
              <p className="text-xs text-muted-foreground">Adicionar usuário</p>
            </button>

            <button
              onClick={() => navigate('/admin/plans')}
              className="p-4 rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-primary hover:bg-primary/5 transition-colors text-left"
            >
              <DollarSign className="w-6 h-6 text-primary mb-2" />
              <p className="font-semibold">Gerenciar Planos</p>
              <p className="text-xs text-muted-foreground">Ver e editar planos</p>
            </button>
          </div>
        </CardContent>
      </AnimatedCard>
    </div>
  );
};
