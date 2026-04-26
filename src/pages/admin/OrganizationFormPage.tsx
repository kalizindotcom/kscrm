import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Building2, Mail, Tag, Calendar, DollarSign, Save, Loader2 } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui/shared';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { adminService } from '@/services/adminService';
import type { Plan, OrganizationDetail } from '@/types/admin';
import { AnimatedCard } from '@/components/admin/AnimatedCard';

const organizationSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  slug: z.string()
    .min(3, 'Slug deve ter no mínimo 3 caracteres')
    .regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens'),
  billingEmail: z.string().email('Email inválido'),
  planId: z.string().min(1, 'Selecione um plano'),
  status: z.enum(['active', 'trial', 'suspended', 'cancelled']),
  trialEndsAt: z.string().optional(),
  domain: z.string().optional(),
});

type OrganizationFormData = z.infer<typeof organizationSchema>;

export function OrganizationFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(isEdit);
  const [plans, setPlans] = useState<Plan[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      status: 'active',
    },
  });

  const watchName = watch('name');
  const watchStatus = watch('status');

  // Auto-generate slug from name
  useEffect(() => {
    if (!isEdit && watchName) {
      const slug = watchName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setValue('slug', slug);
    }
  }, [watchName, isEdit, setValue]);

  useEffect(() => {
    loadPlans();
    if (isEdit) {
      loadOrganization();
    }
  }, [id]);

  const loadPlans = async () => {
    try {
      const data = await adminService.listPlans();
      setPlans(data);
    } catch (err: any) {
      toast.error('Erro ao carregar planos');
    }
  };

  const loadOrganization = async () => {
    if (!id) return;
    try {
      setLoadingData(true);
      const data = await adminService.getOrganization(id);
      setValue('name', data.name);
      setValue('slug', data.slug);
      setValue('billingEmail', data.billingEmail);
      setValue('planId', data.planId);
      setValue('status', data.status);
      setValue('domain', data.domain || '');
      if (data.trialEndsAt) {
        setValue('trialEndsAt', new Date(data.trialEndsAt).toISOString().split('T')[0]);
      }
    } catch (err: any) {
      toast.error('Erro ao carregar organização');
      navigate('/admin/organizations');
    } finally {
      setLoadingData(false);
    }
  };

  const onSubmit = async (data: OrganizationFormData) => {
    try {
      setLoading(true);
      if (isEdit && id) {
        await adminService.updateOrganization(id, data);
        toast.success('Organização atualizada com sucesso!');
      } else {
        await adminService.createOrganization(data);
        toast.success('Organização criada com sucesso!');
      }
      navigate('/admin/organizations');
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao salvar organização');
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
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

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4"
      >
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
          <h1 className="text-3xl font-bold">
            {isEdit ? 'Editar Organização' : 'Nova Organização'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isEdit ? 'Atualize as informações da organização' : 'Crie uma nova organização no sistema'}
          </p>
        </div>
      </motion.div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info */}
        <AnimatedCard delay={0.1}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Informações Básicas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Organização *</Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder="Acme Corporation"
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-red-500"
                  >
                    {errors.name.message}
                  </motion.p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Slug *</Label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="slug"
                    {...register('slug')}
                    placeholder="acme-corporation"
                    className={`pl-10 ${errors.slug ? 'border-red-500' : ''}`}
                    disabled={isEdit}
                  />
                </div>
                {errors.slug && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-red-500"
                  >
                    {errors.slug.message}
                  </motion.p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="billingEmail">Email de Cobrança *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="billingEmail"
                    type="email"
                    {...register('billingEmail')}
                    placeholder="billing@acme.com"
                    className={`pl-10 ${errors.billingEmail ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.billingEmail && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-red-500"
                  >
                    {errors.billingEmail.message}
                  </motion.p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="domain">Domínio (Opcional)</Label>
                <Input
                  id="domain"
                  {...register('domain')}
                  placeholder="acme.com"
                />
              </div>
            </div>
          </CardContent>
        </AnimatedCard>

        {/* Plan & Status */}
        <AnimatedCard delay={0.2}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Plano e Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="planId">Plano *</Label>
                <select
                  id="planId"
                  {...register('planId')}
                  className={`w-full px-3 py-2 rounded-lg border bg-background ${
                    errors.planId ? 'border-red-500' : ''
                  }`}
                >
                  <option value="">Selecione um plano</option>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} - R$ {Number(plan.price).toFixed(2)}/{plan.interval === 'monthly' ? 'mês' : 'ano'}
                    </option>
                  ))}
                </select>
                {errors.planId && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-red-500"
                  >
                    {errors.planId.message}
                  </motion.p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <select
                  id="status"
                  {...register('status')}
                  className="w-full px-3 py-2 rounded-lg border bg-background"
                >
                  <option value="active">Ativa</option>
                  <option value="trial">Trial</option>
                  <option value="suspended">Suspensa</option>
                  <option value="cancelled">Cancelada</option>
                </select>
              </div>
            </div>

            {watchStatus === 'trial' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <Label htmlFor="trialEndsAt">Data de Término do Trial</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="trialEndsAt"
                    type="date"
                    {...register('trialEndsAt')}
                    className="pl-10"
                  />
                </div>
              </motion.div>
            )}
          </CardContent>
        </AnimatedCard>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex justify-end gap-3"
        >
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/admin/organizations')}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={loading} className="gap-2">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {isEdit ? 'Atualizar' : 'Criar'} Organização
              </>
            )}
          </Button>
        </motion.div>
      </form>
    </div>
  );
}
