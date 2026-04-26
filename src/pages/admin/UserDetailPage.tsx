import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  User,
  Mail,
  Shield,
  Building2,
  Activity,
  Edit2,
  Ban,
  Trash2,
  Calendar,
  MapPin,
  Zap,
  MessageSquare,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button, Badge, CardHeader, CardTitle, CardContent } from '@/components/ui/shared';
import { adminService } from '@/services/adminService';
import type { AdminUserDetail } from '@/types/admin';
import { AnimatedCard } from '@/components/admin/AnimatedCard';
import { StatCard } from '@/components/admin/StatCard';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { formatDate } from '@/lib/utils';

const roleMap: Record<string, { label: string; color: string }> = {
  super_admin: { label: 'Super Admin', color: 'text-red-500' },
  admin: { label: 'Admin', color: 'text-blue-500' },
  user: { label: 'Usuário', color: 'text-green-500' },
  viewer: { label: 'Visualizador', color: 'text-gray-500' },
};

const statusMap: Record<string, { label: string; variant: any }> = {
  active: { label: 'Ativo', variant: 'success' },
  suspended: { label: 'Suspenso', variant: 'error' },
  invited: { label: 'Convidado', variant: 'warning' },
};

export function UserDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    action: 'suspend' | 'delete' | null;
  }>({ isOpen: false, action: null });

  useEffect(() => {
    if (id) loadUser();
  }, [id]);

  const loadUser = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await adminService.getUser(id);
      setUser(data);
    } catch (err: any) {
      toast.error('Erro ao carregar usuário');
      navigate('/admin/users');
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
          await adminService.suspendUser(id);
          toast.success('Usuário suspenso');
          break;
        case 'delete':
          await adminService.deleteUser(id);
          toast.success('Usuário deletado');
          navigate('/admin/users');
          return;
      }
      loadUser();
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

  if (!user) return null;

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
            onClick={() => navigate('/admin/users')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
          <div className="flex items-center gap-4">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-16 h-16 rounded-full"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-8 h-8 text-primary" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold">{user.name}</h1>
                <Badge variant={statusMap[user.status]?.variant}>
                  {statusMap[user.status]?.label}
                </Badge>
              </div>
              <p className="text-muted-foreground mt-1">{user.email}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/admin/users/${id}/edit`)}
            className="gap-2"
          >
            <Edit2 className="w-4 h-4" />
            Editar
          </Button>
          {user.status !== 'suspended' && (
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Sessões"
          value={user._count?.sessions || 0}
          subtitle="Total criadas"
          icon={Zap}
          color="text-blue-500"
          bgColor="bg-blue-500/10"
          delay={0.1}
        />
        <StatCard
          title="Campanhas"
          value={user._count?.campaigns || 0}
          subtitle="Total criadas"
          icon={MessageSquare}
          color="text-green-500"
          bgColor="bg-green-500/10"
          delay={0.2}
        />
        <StatCard
          title="Contatos"
          value={user._count?.contacts || 0}
          subtitle="Total cadastrados"
          icon={Users}
          color="text-purple-500"
          bgColor="bg-purple-500/10"
          delay={0.3}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Details */}
          <AnimatedCard delay={0.4}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Informações do Usuário
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Email</p>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <p className="font-medium">{user.email}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Nível de Acesso</p>
                  <div className="flex items-center gap-2">
                    <Shield className={`w-4 h-4 ${roleMap[user.role]?.color}`} />
                    <p className="font-medium">{roleMap[user.role]?.label}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Organização</p>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <p className="font-medium">{user.organization.name}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Criado em</p>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <p className="font-medium">{formatDate(user.createdAt)}</p>
                  </div>
                </div>
                {user.lastLoginAt && (
                  <>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Último Login</p>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <p className="font-medium">{formatDate(user.lastLoginAt)}</p>
                      </div>
                    </div>
                    {user.lastLoginIp && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">IP do Último Login</p>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          <p className="font-medium">{user.lastLoginIp}</p>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </AnimatedCard>

          {/* Sessions */}
          <AnimatedCard delay={0.5}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Sessões ({user.sessions?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {user.sessions && user.sessions.length > 0 ? (
                <div className="space-y-3">
                  {user.sessions.map((session, index) => (
                    <motion.div
                      key={session.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + index * 0.05 }}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          session.status === 'connected' ? 'bg-green-500' : 'bg-gray-400'
                        }`} />
                        <div>
                          <p className="font-medium">{session.name}</p>
                          {session.phoneNumber && (
                            <p className="text-sm text-muted-foreground">{session.phoneNumber}</p>
                          )}
                        </div>
                      </div>
                      <Badge variant={session.status === 'connected' ? 'success' : 'outline'}>
                        {session.status}
                      </Badge>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma sessão criada
                </p>
              )}
            </CardContent>
          </AnimatedCard>

          {/* Campaigns */}
          <AnimatedCard delay={0.6}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Campanhas ({user.campaigns?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {user.campaigns && user.campaigns.length > 0 ? (
                <div className="space-y-3">
                  {user.campaigns.map((campaign, index) => (
                    <motion.div
                      key={campaign.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + index * 0.05 }}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div>
                        <p className="font-medium">{campaign.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {campaign.sentCount}/{campaign.totalCount} enviadas
                        </p>
                      </div>
                      <Badge variant={
                        campaign.status === 'completed' ? 'success' :
                        campaign.status === 'running' ? 'warning' : 'outline'
                      }>
                        {campaign.status}
                      </Badge>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma campanha criada
                </p>
              )}
            </CardContent>
          </AnimatedCard>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Recent Activity */}
          <AnimatedCard delay={0.7}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Atividade Recente
              </CardTitle>
            </CardHeader>
            <CardContent>
              {user.activityLogs && user.activityLogs.length > 0 ? (
                <div className="space-y-3">
                  {user.activityLogs.slice(0, 10).map((log, index) => (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.7 + index * 0.05 }}
                      className="pb-3 border-b last:border-0"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="outline" className="text-xs">
                          {log.action}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(log.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm font-medium">{log.module}</p>
                      {log.resource && (
                        <p className="text-xs text-muted-foreground truncate">
                          {log.resource}
                        </p>
                      )}
                    </motion.div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma atividade registrada
                </p>
              )}
            </CardContent>
          </AnimatedCard>
        </div>
      </div>

      {/* Confirm Dialogs */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen && confirmDialog.action === 'suspend'}
        onClose={() => setConfirmDialog({ isOpen: false, action: null })}
        onConfirm={handleAction}
        title="Suspender Usuário"
        description="Tem certeza que deseja suspender este usuário? Ele não poderá acessar o sistema."
        confirmText="Suspender"
        variant="warning"
        loading={actionLoading}
      />

      <ConfirmDialog
        isOpen={confirmDialog.isOpen && confirmDialog.action === 'delete'}
        onClose={() => setConfirmDialog({ isOpen: false, action: null })}
        onConfirm={handleAction}
        title="Deletar Usuário"
        description="ATENÇÃO: Esta ação é irreversível! Todos os dados do usuário serão permanentemente deletados."
        confirmText="Deletar Permanentemente"
        variant="danger"
        loading={actionLoading}
      />
    </div>
  );
}
