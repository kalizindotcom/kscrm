import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, User, Mail, Lock, Shield, Building2, Save, Loader2 } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button, CardHeader, CardTitle, CardContent } from '@/components/ui/shared';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { adminService } from '@/services/adminService';
import type { Organization } from '@/types/admin';
import { AnimatedCard } from '@/components/admin/AnimatedCard';

const userSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres').optional().or(z.literal('')),
  organizationId: z.string().min(1, 'Selecione uma organização'),
  role: z.enum(['super_admin', 'admin', 'user', 'viewer']),
  status: z.enum(['active', 'suspended', 'invited']),
});

type UserFormData = z.infer<typeof userSchema>;

const roleOptions = [
  { value: 'super_admin', label: 'Super Admin', description: 'Acesso total ao sistema', icon: Shield, color: 'text-red-500' },
  { value: 'admin', label: 'Admin', description: 'Gerencia a organização', icon: Shield, color: 'text-blue-500' },
  { value: 'user', label: 'Usuário', description: 'Acesso padrão', icon: User, color: 'text-green-500' },
  { value: 'viewer', label: 'Visualizador', description: 'Apenas visualização', icon: User, color: 'text-gray-500' },
];

export function UserFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(isEdit);
  const [organizations, setOrganizations] = useState<Organization[]>([]);

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
    loadOrganizations();
    if (isEdit) {
      loadUser();
    }
  }, [id]);

  const loadOrganizations = async () => {
    try {
      const data = await adminService.listOrganizations({ pageSize: 100 });
      setOrganizations(data.items);
    } catch (err: any) {
      toast.error('Erro ao carregar organizações');
    }
  };

  const loadUser = async () => {
    if (!id) return;
    try {
      setLoadingData(true);
      const data = await adminService.getUser(id);
      setValue('name', data.name);
      setValue('email', data.email);
      setValue('organizationId', data.organizationId);
      setValue('role', data.role);
      setValue('status', data.status);
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
      const payload = { ...data };
      if (isEdit && !payload.password) {
        delete payload.password;
      }

      if (isEdit && id) {
        await adminService.updateUser(id, payload);
        toast.success('Usuário atualizado com sucesso!');
      } else {
        await adminService.createUser(payload);
        toast.success('Usuário criado com sucesso!');
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

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info */}
        <AnimatedCard delay={0.1}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Informações Pessoais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo *</Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder="João Silva"
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
                <Label htmlFor="email">Email *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    {...register('email')}
                    placeholder="joao@empresa.com"
                    className={`pl-10 ${errors.email ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.email && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-red-500"
                  >
                    {errors.email.message}
                  </motion.p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                Senha {isEdit ? '(deixe em branco para manter a atual)' : '*'}
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  {...register('password')}
                  placeholder={isEdit ? '••••••••' : 'Mínimo 6 caracteres'}
                  className={`pl-10 ${errors.password ? 'border-red-500' : ''}`}
                />
              </div>
              {errors.password && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-red-500"
                >
                  {errors.password.message}
                </motion.p>
              )}
            </div>
          </CardContent>
        </AnimatedCard>

        {/* Organization & Role */}
        <AnimatedCard delay={0.2}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Organização e Permissões
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="organizationId">Organização *</Label>
              <select
                id="organizationId"
                {...register('organizationId')}
                className={`w-full px-3 py-2 rounded-lg border bg-background ${
                  errors.organizationId ? 'border-red-500' : ''
                }`}
              >
                <option value="">Selecione uma organização</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name} (@{org.slug})
                  </option>
                ))}
              </select>
              {errors.organizationId && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-red-500"
                >
                  {errors.organizationId.message}
                </motion.p>
              )}
            </div>

            <div className="space-y-3">
              <Label>Nível de Acesso *</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {roleOptions.map((option) => {
                  const Icon = option.icon;
                  const isSelected = watchRole === option.value;
                  return (
                    <motion.label
                      key={option.value}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 dark:border-gray-800 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        value={option.value}
                        {...register('role')}
                        className="sr-only"
                      />
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${isSelected ? 'bg-primary/10' : 'bg-gray-100 dark:bg-gray-800'}`}>
                          <Icon className={`w-5 h-5 ${isSelected ? 'text-primary' : option.color}`} />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold">{option.label}</p>
                          <p className="text-xs text-muted-foreground">{option.description}</p>
                        </div>
                      </div>
                      {isSelected && (
                        <motion.div
                          layoutId="role-indicator"
                          className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary"
                          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        />
                      )}
                    </motion.label>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <select
                id="status"
                {...register('status')}
                className="w-full px-3 py-2 rounded-lg border bg-background"
              >
                <option value="active">Ativo</option>
                <option value="suspended">Suspenso</option>
                <option value="invited">Convidado</option>
              </select>
            </div>
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
            onClick={() => navigate('/admin/users')}
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
                {isEdit ? 'Atualizar' : 'Criar'} Usuário
              </>
            )}
          </Button>
        </motion.div>
      </form>
    </div>
  );
}
