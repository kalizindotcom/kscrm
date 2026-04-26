import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, DollarSign, Users, Zap, MessageSquare, Building2, Save, Loader2, Check } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button, CardHeader, CardTitle, CardContent } from '@/components/ui/shared';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { adminService } from '@/services/adminService';
import { AnimatedCard } from '@/components/admin/AnimatedCard';
import { AnimatedCheckbox } from '@/components/admin/AnimatedCheckbox';

const planSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  slug: z.string()
    .min(3, 'Slug deve ter no mínimo 3 caracteres')
    .regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens'),
  description: z.string().optional(),
  price: z.number().min(0, 'Preço deve ser maior ou igual a 0'),
  currency: z.string().default('BRL'),
  interval: z.enum(['monthly', 'yearly', 'lifetime']),
  maxUsers: z.number().min(1, 'Mínimo 1 usuário'),
  maxSessions: z.number().min(1, 'Mínimo 1 sessão'),
  maxCampaigns: z.number().min(1, 'Mínimo 1 campanha'),
  maxContacts: z.number().min(1, 'Mínimo 1 contato'),
  maxMessagesDay: z.number().min(1, 'Mínimo 1 mensagem'),
  maxGroupsPerSession: z.number().min(1, 'Mínimo 1 grupo'),
  isActive: z.boolean(),
  isPublic: z.boolean(),
});

type PlanFormData = z.infer<typeof planSchema>;

const features = [
  { key: 'api_access', label: 'Acesso à API', description: 'Integração via API REST' },
  { key: 'webhooks', label: 'Webhooks', description: 'Receba eventos em tempo real' },
  { key: 'custom_fields', label: 'Campos Customizados', description: 'Crie campos personalizados' },
  { key: 'advanced_reports', label: 'Relatórios Avançados', description: 'Analytics detalhados' },
  { key: 'priority_support', label: 'Suporte Prioritário', description: 'Atendimento preferencial' },
  { key: 'white_label', label: 'White Label', description: 'Personalize a marca' },
];

export function PlanFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(isEdit);
  const [selectedFeatures, setSelectedFeatures] = useState<Record<string, boolean>>({});

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<PlanFormData>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      currency: 'BRL',
      interval: 'monthly',
      isActive: true,
      isPublic: true,
      maxGroupsPerSession: 50,
    },
  });

  const watchName = watch('name');
  const watchInterval = watch('interval');

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
    if (isEdit) {
      loadPlan();
    }
  }, [id]);

  const loadPlan = async () => {
    if (!id) return;
    try {
      setLoadingData(true);
      const plans = await adminService.listPlans();
      const plan = plans.find(p => p.id === id);
      if (!plan) throw new Error('Plano não encontrado');

      setValue('name', plan.name);
      setValue('slug', plan.slug);
      setValue('description', plan.description || '');
      setValue('price', Number(plan.price));
      setValue('currency', plan.currency);
      setValue('interval', plan.interval);
      setValue('maxUsers', plan.maxUsers);
      setValue('maxSessions', plan.maxSessions);
      setValue('maxCampaigns', plan.maxCampaigns);
      setValue('maxContacts', plan.maxContacts);
      setValue('maxMessagesDay', plan.maxMessagesDay);
      setValue('maxGroupsPerSession', plan.maxGroupsPerSession);
      setValue('isActive', plan.isActive);
      setValue('isPublic', plan.isPublic);
      setSelectedFeatures(plan.features as Record<string, boolean> || {});
    } catch (err: any) {
      toast.error('Erro ao carregar plano');
      navigate('/admin/plans');
    } finally {
      setLoadingData(false);
    }
  };

  const onSubmit = async (data: PlanFormData) => {
    try {
      setLoading(true);
      const payload = {
        ...data,
        features: selectedFeatures,
      };

      if (isEdit && id) {
        await adminService.updatePlan(id, payload);
        toast.success('Plano atualizado com sucesso!');
      } else {
        await adminService.createPlan(payload);
        toast.success('Plano criado com sucesso!');
      }
      navigate('/admin/plans');
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao salvar plano');
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
          onClick={() => navigate('/admin/plans')}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>
        <div>
          <h1 className="text-3xl font-bold">
            {isEdit ? 'Editar Plano' : 'Novo Plano'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isEdit ? 'Atualize as informações do plano' : 'Crie um novo plano de assinatura'}
          </p>
        </div>
      </motion.div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info */}
        <AnimatedCard delay={0.1}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Informações Básicas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Plano *</Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder="Plano Profissional"
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
                <Input
                  id="slug"
                  {...register('slug')}
                  placeholder="plano-profissional"
                  className={errors.slug ? 'border-red-500' : ''}
                  disabled={isEdit}
                />
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

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <textarea
                id="description"
                {...register('description')}
                placeholder="Descrição do plano..."
                rows={3}
                className="w-full px-3 py-2 rounded-lg border bg-background resize-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Preço *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  {...register('price', { valueAsNumber: true })}
                  placeholder="99.90"
                  className={errors.price ? 'border-red-500' : ''}
                />
                {errors.price && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-red-500"
                  >
                    {errors.price.message}
                  </motion.p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Moeda</Label>
                <select
                  id="currency"
                  {...register('currency')}
                  className="w-full px-3 py-2 rounded-lg border bg-background"
                >
                  <option value="BRL">BRL (R$)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="interval">Intervalo *</Label>
                <select
                  id="interval"
                  {...register('interval')}
                  className="w-full px-3 py-2 rounded-lg border bg-background"
                >
                  <option value="monthly">Mensal</option>
                  <option value="yearly">Anual</option>
                  <option value="lifetime">Vitalício</option>
                </select>
              </div>
            </div>
          </CardContent>
        </AnimatedCard>

        {/* Limits */}
        <AnimatedCard delay={0.2}>
          <CardHeader>
            <CardTitle>Limites e Recursos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxUsers" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Máximo de Usuários *
                </Label>
                <Input
                  id="maxUsers"
                  type="number"
                  {...register('maxUsers', { valueAsNumber: true })}
                  placeholder="10"
                  className={errors.maxUsers ? 'border-red-500' : ''}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxSessions" className="flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Máximo de Sessões *
                </Label>
                <Input
                  id="maxSessions"
                  type="number"
                  {...register('maxSessions', { valueAsNumber: true })}
                  placeholder="5"
                  className={errors.maxSessions ? 'border-red-500' : ''}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxCampaigns" className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Máximo de Campanhas *
                </Label>
                <Input
                  id="maxCampaigns"
                  type="number"
                  {...register('maxCampaigns', { valueAsNumber: true })}
                  placeholder="20"
                  className={errors.maxCampaigns ? 'border-red-500' : ''}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxContacts" className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Máximo de Contatos *
                </Label>
                <Input
                  id="maxContacts"
                  type="number"
                  {...register('maxContacts', { valueAsNumber: true })}
                  placeholder="10000"
                  className={errors.maxContacts ? 'border-red-500' : ''}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxMessagesDay">Mensagens por Dia *</Label>
                <Input
                  id="maxMessagesDay"
                  type="number"
                  {...register('maxMessagesDay', { valueAsNumber: true })}
                  placeholder="1000"
                  className={errors.maxMessagesDay ? 'border-red-500' : ''}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxGroupsPerSession">Grupos por Sessão *</Label>
                <Input
                  id="maxGroupsPerSession"
                  type="number"
                  {...register('maxGroupsPerSession', { valueAsNumber: true })}
                  placeholder="50"
                  className={errors.maxGroupsPerSession ? 'border-red-500' : ''}
                />
              </div>
            </div>
          </CardContent>
        </AnimatedCard>

        {/* Features */}
        <AnimatedCard delay={0.3}>
          <CardHeader>
            <CardTitle>Features Incluídas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.key}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.05 }}
                  className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <AnimatedCheckbox
                    checked={selectedFeatures[feature.key] || false}
                    onChange={(checked) =>
                      setSelectedFeatures({ ...selectedFeatures, [feature.key]: checked })
                    }
                  />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{feature.label}</p>
                    <p className="text-xs text-muted-foreground">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </AnimatedCard>

        {/* Settings */}
        <AnimatedCard delay={0.4}>
          <CardHeader>
            <CardTitle>Configurações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div>
                <p className="font-medium">Plano Ativo</p>
                <p className="text-sm text-muted-foreground">
                  Disponível para novas assinaturas
                </p>
              </div>
              <AnimatedCheckbox
                checked={watch('isActive')}
                onChange={(checked) => setValue('isActive', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div>
                <p className="font-medium">Plano Público</p>
                <p className="text-sm text-muted-foreground">
                  Visível na página de preços
                </p>
              </div>
              <AnimatedCheckbox
                checked={watch('isPublic')}
                onChange={(checked) => setValue('isPublic', checked)}
              />
            </div>
          </CardContent>
        </AnimatedCard>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex justify-end gap-3"
        >
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/admin/plans')}
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
                {isEdit ? 'Atualizar' : 'Criar'} Plano
              </>
            )}
          </Button>
        </motion.div>
      </form>
    </div>
  );
}
