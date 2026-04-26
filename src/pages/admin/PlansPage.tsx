import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign,
  Plus,
  Edit2,
  Trash2,
  Check,
  Building2,
  Users,
  MessageSquare,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from '../../components/ui/shared';
import { adminService } from '../../services/adminService';
import type { Plan } from '../../types/admin';
import { toast } from 'sonner';

export const PlansPage: React.FC = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const data = await adminService.listPlans();
      setPlans(data);
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao carregar planos');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja deletar o plano "${name}"?`)) return;
    try {
      await adminService.deletePlan(id);
      toast.success('Plano deletado');
      loadPlans();
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao deletar plano');
    }
  };

  const formatPrice = (price: number, currency: string, interval: string) => {
    const formatted = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency || 'BRL',
    }).format(Number(price));

    const intervalMap: Record<string, string> = {
      monthly: '/mês',
      yearly: '/ano',
      lifetime: 'vitalício',
    };

    return `${formatted}${intervalMap[interval] || ''}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Planos</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os planos de assinatura do sistema
          </p>
        </div>
        <Button onClick={() => navigate('/admin/plans/new')}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Plano
        </Button>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const features = plan.features as Record<string, boolean> || {};
          const featuresList = Object.entries(features).filter(([_, enabled]) => enabled);

          return (
            <Card
              key={plan.id}
              className={`relative ${!plan.isActive ? 'opacity-60' : ''}`}
            >
              {!plan.isActive && (
                <div className="absolute top-4 right-4">
                  <Badge variant="outline">Inativo</Badge>
                </div>
              )}
              {!plan.isPublic && (
                <div className="absolute top-4 right-4">
                  <Badge variant="warning">Privado</Badge>
                </div>
              )}

              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    {plan.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {plan.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-3xl font-bold">
                    {formatPrice(Number(plan.price), plan.currency, plan.interval)}
                  </p>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Limits */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span>Usuários</span>
                    </div>
                    <span className="font-semibold">{plan.maxUsers}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-muted-foreground" />
                      <span>Sessões</span>
                    </div>
                    <span className="font-semibold">{plan.maxSessions}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-muted-foreground" />
                      <span>Campanhas</span>
                    </div>
                    <span className="font-semibold">{plan.maxCampaigns}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <span>Contatos</span>
                    </div>
                    <span className="font-semibold">
                      {plan.maxContacts.toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-muted-foreground" />
                      <span>Mensagens/dia</span>
                    </div>
                    <span className="font-semibold">
                      {plan.maxMessagesDay.toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>

                {/* Features */}
                {featuresList.length > 0 && (
                  <div className="pt-4 border-t">
                    <p className="text-sm font-semibold mb-2">Features:</p>
                    <div className="space-y-1">
                      {featuresList.map(([key]) => (
                        <div key={key} className="flex items-center gap-2 text-sm">
                          <Check className="w-4 h-4 text-green-500" />
                          <span className="capitalize">{key.replace(/_/g, ' ')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Organizations Count */}
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    {(plan as any)._count?.organizations || 0} organizações usando este plano
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => navigate(`/admin/plans/${plan.id}/edit`)}
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(plan.id, plan.name)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {plans.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <DollarSign className="w-12 h-12 mb-4 opacity-50" />
            <p>Nenhum plano cadastrado</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => navigate('/admin/plans/new')}
            >
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeiro Plano
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
