import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Building2,
  Users,
  Zap,
  MessageSquare,
  Activity,
  Edit2,
  Ban,
  CheckCircle2,
  Trash2,
  Calendar,
  Mail,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button, Badge, CardHeader, CardTitle, CardContent } from '@/components/ui/shared';
import { adminService } from '@/services/adminService';
import type { OrganizationDetail } from '@/types/admin';
import { AnimatedCard } from '@/components/admin/AnimatedCard';
import { StatCard } from '@/components/admin/StatCard';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { formatDate } from '@/lib/utils';

const statusMap: Record<string, { label: string; variant: any }> = {
  active: { label: 'Ativa', variant: 'success' },
  trial: { label: 'Trial', variant: 'warning' },
  suspended: { label: 'Suspensa', variant: 'error' },
  cancelled: { label: 'Cancelada', variant: 'outline' },
};

export function OrganizationDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [org, setOrg] = useState<OrganizationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    action: 'suspend' | 'activate' | 'delete' | null;
  }>({ isOpen: false, action: null });

  useEffect(() => {
    if (id) loadOrganization();
  }, [id]);

  const loadOrganization = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await adminService.getOrganization(id);
      setOrg(data);
    } catch (err: any) {
      toast.error('Erro ao carregar organização');
      navigate('/admin/organizations');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    if (!id || !confirmDialog.action) return;
    try {
      setActionLoading(true);
      switch (confirmDialog.action) {
        case 'suspend':
          await adminService.suspendOrganization(id);
          toast.success('Organização suspensa');
          break;
        case 'activate':
          await adminService.activateOrganization(id);
          toast.success('Organização ativada');
          break;
        case 'delete':
          await adminService.deleteOrganization(id);
          toast.success('Organização deletada');
          navigate('/admin/organizations');
          return;
      }
      loadOrganization();
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao executar ação');
    } finally {
      setActionLoading(false);
      setConfirmDialog({ isOpen: false, action: null });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!org) return null;

  const usagePercentage = {
    users: (org.currentUsers / org.maxUsers) * 100,
    sessions: (org.currentSessions / org.maxSessions) * 100,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin/organizations')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{org.name}</h1>
              <Badge variant={statusMap[org.status]?.variant}>
                {statusMap[org.status]?.label}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">@{org.slug}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/admin/organizations/${id}/edit`)}
            className="gap-2"
          >
            <Edit2 className="w-4 h-4" />
            Editar
          </Button>
          {org.status === 'suspended' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmDialog({ isOpen: true, action: 'activate' })}
              className="gap-2 text-green-600"
            >
              <CheckCircle2 className="w-4 h-4" />
              Ativar
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmDialog({ isOpen: true, action: 'suspend' })}
              className="gap-2 text-yellow-600"
            >
              <Ban className="w-4 h-4" />
              Suspender
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirmDialog({ isOpen: true, action: 'delete' })}
            className="gap-2 text-red-600"
          >
            <Trash2 className="w-4 h-4" />
            Deletar
          </Button>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Usuários"
          value={`${org.currentUsers}/${org.maxUsers}`}
          subtitle={`${usagePercentage.users.toFixed(0)}% utilizado`}
          icon={Users}
          color="text-blue-500"
          bgColor="bg-blue-500/10"
          delay={0.1}
        />
        <StatCard
          title="Sessões"
          value={`${org.currentSessions}/${org.maxSessions}`}
          subtitle={`${usagePercentage.sessions.toFixed(0)}% utilizado`}
          icon={Zap}
          color="text-green-500"
          bgColor="bg-green-500/10"
          delay={0.2}
        />
        <StatCard
          title="Campanhas"
          value={org._count?.subscriptions || 0}
          subtitle="Total de assinaturas"
          icon={MessageSquare}
          color="text-purple-500"
          bgColor="bg-purple-500/10"
          delay={0.3}
        />
        <StatCard
          title="Sessões Ativas"
          value={org.sessions.filter(s => s.status === 'connected').length}
          subtitle={`de ${org.sessions.length} total`}
          icon={Activity}
          color="text-yellow-500"
          bgColor="bg-yellow-500/10"
          delay={0.4}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Details */}
          <AnimatedCard delay={0.5}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Detalhes da Organização
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Email de Cobrança</p>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <p className="font-medium">{org.billingEmail}</p>
                  </div>
                </div>
                {org.domain && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Domínio</p>
                    <p className="font-medium">{org.domain}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Criada em</p>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <p className="font-medium">{formatDate(org.createdAt)}</p>
                  </div>
                </div>
                {org.trialEndsAt && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Trial termina em</p>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <p className="font-medium">{formatDate(org.trialEndsAt)}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </AnimatedCard>

          {/* Plan */}
          <AnimatedCard delay={0.6}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Plano Atual
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-bold">{org.plan.name}</h3>
                  <p className="text-2xl font-bold text-primary mt-2">
                    R$ {Number(org.plan.price).toFixed(2)}
                    <span className="text-sm text-muted-foreground font-normal">
                      /{org.plan.interval === 'monthly' ? 'mês' : 'ano'}
                    </span>
                  </p>
                  {org.plan.description && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {org.plan.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-6 pt-6 border-t grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Iniciado em</p>
                  <p className="font-medium">{formatDate(org.planStartedAt)}</p>
                </div>
                {org.planExpiresAt && (
                  <div>
                    <p className="text-sm text-muted-foreground">Expira em</p>
                    <p className="font-medium">{formatDate(org.planExpiresAt)}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </AnimatedCard>

          {/* Users */}
          <AnimatedCard delay={0.7}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Usuários ({org.users.length})
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate('/admin/users/new')}
                >
                  Adicionar
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {org.users.map((user, index) => (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 + index * 0.05 }}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/admin/users/${user.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{user.role}</Badge>
                      <Badge variant={user.status === 'active' ? 'success' : 'error'}>
                        {user.status}
                      </Badge>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </AnimatedCard>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Usage Progress */}
          <AnimatedCard delay={0.8}>
            <CardHeader>
              <CardTitle>Uso de Recursos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Usuários</span>
                  <span className="font-semibold">
                    {org.currentUsers}/{org.maxUsers}
                  </span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${usagePercentage.users}%` }}
                    transition={{ delay: 0.9, duration: 1 }}
                    className={`h-full rounded-full ${
                      usagePercentage.users > 90
                        ? 'bg-red-500'
                        : usagePercentage.users > 70
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                    }`}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Sessões</span>
                  <span className="font-semibold">
                    {org.currentSessions}/{org.maxSessions}
                  </span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${usagePercentage.sessions}%` }}
                    transition={{ delay: 1, duration: 1 }}
                    className={`h-full rounded-full ${
                      usagePercentage.sessions > 90
                        ? 'bg-red-500'
                        : usagePercentage.sessions > 70
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                    }`}
                  />
                </div>
              </div>
            </CardContent>
          </AnimatedCard>

          {/* Recent Activity */}
          <AnimatedCard delay={0.9}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Atividade Recente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {org.usageLogs.slice(0, 5).map((log, index) => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1 + index * 0.05 }}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-muted-foreground">
                      {formatDate(log.date)}
                    </span>
                    <span className="font-semibold">
                      {log.messagesSent} msgs
                    </span>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </AnimatedCard>
        </div>
      </div>

      {/* Confirm Dialogs */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen && confirmDialog.action === 'suspend'}
        onClose={() => setConfirmDialog({ isOpen: false, action: null })}
        onConfirm={handleAction}
        title="Suspender Organização"
        description="Tem certeza que deseja suspender esta organização? Os usuários não poderão acessar o sistema."
        confirmText="Suspender"
        variant="warning"
        loading={actionLoading}
      />

      <ConfirmDialog
        isOpen={confirmDialog.isOpen && confirmDialog.action === 'activate'}
        onClose={() => setConfirmDialog({ isOpen: false, action: null })}
        onConfirm={handleAction}
        title="Ativar Organização"
        description="Deseja reativar esta organização? Os usuários voltarão a ter acesso."
        confirmText="Ativar"
        variant="success"
        loading={actionLoading}
      />

      <ConfirmDialog
        isOpen={confirmDialog.isOpen && confirmDialog.action === 'delete'}
        onClose={() => setConfirmDialog({ isOpen: false, action: null })}
        onConfirm={handleAction}
        title="Deletar Organização"
        description="ATENÇÃO: Esta ação é irreversível! Todos os dados da organização, incluindo usuários, sessões e campanhas serão permanentemente deletados."
        confirmText="Deletar Permanentemente"
        variant="danger"
        loading={actionLoading}
      />
    </div>
  );
}
