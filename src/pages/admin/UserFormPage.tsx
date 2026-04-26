import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, User, Mail, Lock, Shield, CreditCard, Save, Loader2, Calendar } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button, CardHeader, CardTitle, CardContent } from '@/components/ui/shared';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { adminService } from '@/services/adminService';
import type { Plan } from '@/types/admin';
import { AnimatedCard } from '@/components/admin/AnimatedCard';

const userSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres').optional().or(z.literal('')),
  planId: z.string().optional(),
  subscriptionExpiresAt: z.string().optional(),
  role: z.enum(['super_admin', 'admin', 'user', 'viewer']),
  status: z.enum(['active', 'suspended', 'invited']),
});

type UserFormData = z.infer<typeof userSchema>;

const roleOptions = [
  { value: 'super_admin', label: 'Super Admin', description: 'Acesso total ao sistema', icon: Shield, color: 'text-red-500' },
  { value: 'admin', label: 'Admin', description: 'Gerencia recursos', icon: Shield, color: 'text-blue-500' },
  { value: 'user', label: 'Usuário', description: 'Acesso padrão', icon: User, color: 'text-green-500' },
  { value: 'viewer', label: 'Visualizador', description: 'Apenas visualização', icon: User, color: 'text-gray-500' },
];

export function UserFormPage() {
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
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      role: 'user',
      status: 'active',
    },
  });

  const watchRole = watch('role');

  useEffect(() => {
    loadPlans();
    if (isEdit) {
      loadUser();
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

  const loadUser = async () => {
    if (!id) return;
    try {
      setLoadingData(true);
      const data = await adminService.getUser(id);
      setValue('name', data.name);
      setValue('email', data.email);
      setValue('role', data.role);
      setValue('status', data.status);
      if (data.subscription) {
        setValue('planId', data.subscription.plan.id);
        if (data.subscription.expiresAt) {
          setValue('subscriptionExpiresAt', new Date(data.subscription.expiresAt).toISOString().split('T')[0]);
        }
      }
    } catch (err: any) {
      toast.error('Erro ao carregar usuário');
      navigate('/admin/users');
    } finally {
      setLoadingData(false);
    }
  };

  const onSubmit = async (data: UserFormData) => {
    try {
      setLoading(true);
      const payload: any = { ...data };
      if (isEdit && !payload.password) {
        delete payload.password;
      }

      if (isEdit) {
        await adminService.updateUser(id!, payload);
        toast.success('Usuário atualizado com sucesso');
      } else {
        await adminService.createUser(payload);
        toast.success('Usuário criado com sucesso');
      }
      navigate('/admin/users');
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao salvar usuário');
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
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4"
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/admin/users')}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>
        <div>
          <h1 className="text-3xl font-bold">
            {isEdit ? 'Editar Usuário' : 'Novo Usuário'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isEdit ? 'Atualize as informações do usuário' : 'Crie um novo usuário no sistema'}
          </p>
        </div>
      </motion.div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <AnimatedCard delay={0.1}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Informações Básicas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome Completo</Label>
                  <Input
                    id="name"
                    {...register('name')}
                    placeholder="João Silva"
                    className={errors.name ? 'border-red-500' : ''}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      {...register('email')}
                      placeholder="joao@exemplo.com"
                      className={`pl-10 ${errors.email ? 'border-red-500' : ''}`}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="password">
                    {isEdit ? 'Nova Senha (deixe em branco para manter)' : 'Senha'}
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      {...register('password')}
                      placeholder="••••••••"
                      className={`pl-10 ${errors.password ? 'border-red-500' : ''}`}
                    />
                  </div>
                  {errors.password && (
                    <p className="text-sm text-red-500 mt-1">{errors.password.message}</p>
                  )}
                </div>
              </CardContent>
            </AnimatedCard>

            <AnimatedCard delay={0.2}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Plano e Assinatura
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="planId">Plano</Label>
                  <select
                    id="planId"
                    {...register('planId')}
                    className="w-full px-3 py-2 border rounded-lg bg-background"
                  >
                    <option value="">Sem plano</option>
                    {plans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} - R$ {plan.price.toString()}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="subscriptionExpiresAt">Data de Expiração</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="subscriptionExpiresAt"
                      type="date"
                      {...register('subscriptionExpiresAt')}
                      className="pl-10"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Deixe em branco para assinatura sem expiração
                  </p>
                </div>
              </CardContent>
            </AnimatedCard>
          </div>

          <div className="space-y-6">
            <AnimatedCard delay={0.3}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Permissões
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Nível de Acesso</Label>
                  <div className="space-y-2 mt-2">
                    {roleOptions.map((option) => {
                      const Icon = option.icon;
                      return (
                        <label
                          key={option.value}
                          className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                            watchRole === option.value
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <input
                            type="radio"
                            value={option.value}
                            {...register('role')}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Icon className={`w-4 h-4 ${option.color}`} />
                              <span className="font-medium">{option.label}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {option.description}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <Label>Status</Label>
                  <select
                    {...register('status')}
                    className="w-full px-3 py-2 border rounded-lg bg-background mt-2"
                  >
                    <option value="active">Ativo</option>
                    <option value="suspended">Suspenso</option>
                    <option value="invited">Convidado</option>
                  </select>
                </div>
              </CardContent>
            </AnimatedCard>

            <AnimatedCard delay={0.4}>
              <CardContent className="pt-6">
                <Button
                  type="submit"
                  className="w-full gap-2"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {isEdit ? 'Atualizar Usuário' : 'Criar Usuário'}
                    </>
                  )}
                </Button>
              </CardContent>
            </AnimatedCard>
          </div>
        </div>
      </form>
    </div>
  );
}
