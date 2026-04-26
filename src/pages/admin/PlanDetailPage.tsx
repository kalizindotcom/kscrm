import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  DollarSign,
  Users,
  Building2,
  TrendingUp,
  Edit2,
  Trash2,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button, Badge, CardHeader, CardTitle, CardContent } from '@/components/ui/shared';
import { adminService } from '@/services/adminService';
import type { Plan } from '@/types/admin';
import { AnimatedCard } from '@/components/admin/AnimatedCard';
import { StatCard } from '@/components/admin/StatCard';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { AnimatedChart } from '@/components/admin/AnimatedChart';

export function PlanDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    action: 'delete' | null;
  }>({ isOpen: false, action: null });

  useEffect(() => {
    if (id) loadPlan();
  }, [id]);

  const loadPlan = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const plans = await adminService.listPlans();
      const foundPlan = plans.find(p => p.id === id);
      if (!foundPlan) throw new Error('Plano não encontrado');
      setPlan(foundPlan);
    } catch (err: any) {
      toast.error('Erro ao carregar plano');
      navigate('/admin/plans');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      setActionLoading(true);
      await adminService.deletePlan(id);
      toast.success('Plano deletado');
      navigate('/admin/plans');
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao deletar plano');
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

  if (!plan) return null;

  const features = plan.features as Record<string, boolean> || {};
  const featuresList = Object.entries(features).filter(([_, enabled]) => enabled);

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
            onClick={() => navigate('/admin/plans')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{plan.name}</h1>
              {!plan.isActive && <Badge variant="outline">Inativo</Badge>}
              {!plan.isPublic && <Badge variant="warning">Privado</Badge>}
            </div>
            {plan.description && (
              <p className="text-muted-foreground mt-1">{plan.description}</p>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/admin/plans/${id}/edit`)}
            className="gap-2"
          >
            <Edit2 className="w-4 h-4" />
            Editar
          </Button>
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

      {/* Pricing */}
      <AnimatedCard delay={0.1}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Preço e Cobrança
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: plan.currency || 'BRL',
              }).format(Number(plan.price))}
            </span>
            <span className="text-muted-foreground">
              /{plan.interval === 'monthly' ? 'mês' : plan.interval === 'yearly' ? 'ano' : 'vitalício'}
            </span>
          </div>
        </CardContent>
      </AnimatedCard>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Usuários"
          value={plan.maxUsers}
          subtitle="Máximo permitido"
          icon={Users}
          color="text-blue-500"
          bgColor="bg-blue-500/10"
          delay={0.2}
        />
        <StatCard
          title="Sessões"
          value={plan.maxSessions}
          subtitle="Máximo permitido"
          icon={Building2}
          color="text-green-500"
          bgColor="bg-green-500/10"
          delay={0.3}
        />
        <StatCard
          title="Campanhas"
          value={plan.maxCampaigns}
          subtitle="Máximo permitido"
          icon={TrendingUp}
          color="text-purple-500"
          bgColor="bg-purple-500/10"
          delay={0.4}
        />
        <StatCard
          title="Organizações"
          value={(plan as any)._count?.organizations || 0}
          subtitle="Usando este plano"
          icon={Building2}
          color="text-yellow-500"
          bgColor="bg-yellow-500/10"
          delay={0.5}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Limits */}
        <AnimatedCard delay={0.6}>
          <CardHeader>
            <CardTitle>Limites e Recursos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
              <span className="text-sm">Máximo de Usuários</span>
              <span className="font-bold">{plan.maxUsers}</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
              <span className="text-sm">Máximo de Sessões</span>
              <span className="font-bold">{plan.maxSessions}</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
              <span className="text-sm">Máximo de Campanhas</span>
              <span className="font-bold">{plan.maxCampaigns}</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
              <span className="text-sm">Máximo de Contatos</span>
              <span className="font-bold">{plan.maxContacts.toLocaleString('pt-BR')}</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
              <span className="text-sm">Mensagens por Dia</span>
              <span className="font-bold">{plan.maxMessagesDay.toLocaleString('pt-BR')}</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
              <span className="text-sm">Grupos por Sessão</span>
              <span className="font-bold">{plan.maxGroupsPerSession}</span>
            </div>
          </CardContent>
        </AnimatedCard>

        {/* Features */}
        <AnimatedCard delay={0.7}>
          <CardHeader>
            <CardTitle>Features Incluídas</CardTitle>
          </CardHeader>
          <CardContent>
            {featuresList.length > 0 ? (
              <div className="space-y-2">
                {featuresList.map(([key]) => (
                  <div key={key} className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="text-sm capitalize">{key.replace(/_/g, ' ')}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma feature adicional
              </p>
            )}
          </CardContent>
        </AnimatedCard>
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen && confirmDialog.action === 'delete'}
        onClose={() => setConfirmDialog({ isOpen: false, action: null })}
        onConfirm={handleDelete}
        title="Deletar Plano"
        description={`Tem certeza que deseja deletar o plano "${plan.name}"? Esta ação não pode ser desfeita.`}
        confirmText="Deletar"
        variant="danger"
        loading={actionLoading}
      />
    </div>
  );
}

import { useParams } from 'react-router-dom';
