import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Clock,
  Zap,
  Send,
  Users,
  MessageSquare,
  Sparkles,
  Copy,
  Check,
  Phone,
  Mail,
  User,
} from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/shared';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { TrialUserFormData, TrialPreset } from '@/types/admin';

const trialSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  email: z.string().email('Email inválido'),
  phone: z.string().optional(),
  duration: z.number().min(1, 'Duração mínima de 1 hora'),
  maxSessions: z.number().min(1),
  maxCampaigns: z.number().min(1),
  maxContacts: z.number().min(1),
  maxMessagesDay: z.number().min(1),
});

const TRIAL_PRESETS: TrialPreset[] = [
  {
    id: 'quick',
    name: 'Teste Rápido',
    duration: 2,
    maxSessions: 1,
    maxCampaigns: 5,
    maxContacts: 50,
    maxMessagesDay: 100,
    description: '2 horas para testar o básico',
  },
  {
    id: 'standard',
    name: 'Teste Padrão',
    duration: 24,
    maxSessions: 2,
    maxCampaigns: 10,
    maxContacts: 200,
    maxMessagesDay: 500,
    description: '24 horas de teste completo',
  },
  {
    id: 'extended',
    name: 'Teste Estendido',
    duration: 72,
    maxSessions: 3,
    maxCampaigns: 20,
    maxContacts: 500,
    maxMessagesDay: 1000,
    description: '3 dias para explorar tudo',
  },
  {
    id: 'custom',
    name: 'Personalizado',
    duration: 0,
    maxSessions: 0,
    maxCampaigns: 0,
    maxContacts: 0,
    maxMessagesDay: 0,
    description: 'Configure manualmente',
  },
];

interface CreateTrialUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (credentials: { email: string; password: string; expiresAt: string }) => void;
}

export function CreateTrialUserModal({ isOpen, onClose, onSuccess }: CreateTrialUserModalProps) {
  const [selectedPreset, setSelectedPreset] = useState<string>('quick');
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<TrialUserFormData>({
    resolver: zodResolver(trialSchema),
    defaultValues: TRIAL_PRESETS[0],
  });

  const watchDuration = watch('duration');
  const watchMaxSessions = watch('maxSessions');
  const watchMaxCampaigns = watch('maxCampaigns');
  const watchMaxContacts = watch('maxContacts');
  const watchMaxMessagesDay = watch('maxMessagesDay');

  const handlePresetSelect = (presetId: string) => {
    setSelectedPreset(presetId);
    const preset = TRIAL_PRESETS.find((p) => p.id === presetId);
    if (preset && presetId !== 'custom') {
      setValue('duration', preset.duration);
      setValue('maxSessions', preset.maxSessions);
      setValue('maxCampaigns', preset.maxCampaigns);
      setValue('maxContacts', preset.maxContacts);
      setValue('maxMessagesDay', preset.maxMessagesDay);
    }
  };

  const onSubmit = async (data: TrialUserFormData) => {
    try {
      setLoading(true);

      // Gerar senha aleatória
      const password = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8).toUpperCase();

      // Calcular data de expiração
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + data.duration);

      // Criar usuário trial via API
      const response = await fetch('/api/admin/users/trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          password,
          expiresAt: expiresAt.toISOString(),
        }),
      });

      if (!response.ok) throw new Error('Erro ao criar usuário trial');

      toast.success('Usuário trial criado com sucesso!');
      onSuccess({ email: data.email, password, expiresAt: expiresAt.toISOString() });
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao criar usuário trial');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-card border border-primary/20 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="relative bg-gradient-to-r from-orange-500/10 via-yellow-500/10 to-orange-500/10 border-b border-primary/20 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Criar Usuário Trial</h2>
                  <p className="text-sm text-muted-foreground">
                    Configure um acesso temporário para teste
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-primary/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="overflow-y-auto max-h-[calc(90vh-180px)]">
            <div className="p-6 space-y-6">
              {/* Presets */}
              <div>
                <Label className="text-base font-semibold mb-3 block">
                  Escolha um Preset
                </Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {TRIAL_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handlePresetSelect(preset.id)}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        selectedPreset === preset.id
                          ? 'border-orange-500 bg-orange-500/10'
                          : 'border-border hover:border-orange-500/50'
                      }`}
                    >
                      <div className="font-semibold text-sm mb-1">{preset.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {preset.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Informações do Cliente */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">Informações do Cliente</Label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Nome Completo *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="name"
                        {...register('name')}
                        placeholder="João Silva"
                        className={`pl-10 ${errors.name ? 'border-red-500' : ''}`}
                      />
                    </div>
                    {errors.name && (
                      <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="email">Email *</Label>
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

                  <div className="md:col-span-2">
                    <Label htmlFor="phone">WhatsApp (opcional)</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        {...register('phone')}
                        placeholder="(11) 99999-9999"
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Configurações do Trial */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">Limites do Trial</Label>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="duration" className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-orange-500" />
                      Duração (horas)
                    </Label>
                    <Input
                      id="duration"
                      type="number"
                      {...register('duration', { valueAsNumber: true })}
                      className={errors.duration ? 'border-red-500' : ''}
                    />
                  </div>

                  <div>
                    <Label htmlFor="maxSessions" className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-blue-500" />
                      Sessões
                    </Label>
                    <Input
                      id="maxSessions"
                      type="number"
                      {...register('maxSessions', { valueAsNumber: true })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="maxCampaigns" className="flex items-center gap-2">
                      <Send className="w-4 h-4 text-green-500" />
                      Campanhas
                    </Label>
                    <Input
                      id="maxCampaigns"
                      type="number"
                      {...register('maxCampaigns', { valueAsNumber: true })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="maxContacts" className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-purple-500" />
                      Contatos
                    </Label>
                    <Input
                      id="maxContacts"
                      type="number"
                      {...register('maxContacts', { valueAsNumber: true })}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="maxMessagesDay" className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-yellow-500" />
                      Mensagens por Dia
                    </Label>
                    <Input
                      id="maxMessagesDay"
                      type="number"
                      {...register('maxMessagesDay', { valueAsNumber: true })}
                    />
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="bg-gradient-to-r from-orange-500/5 via-yellow-500/5 to-orange-500/5 border border-orange-500/20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-orange-500" />
                  <span className="font-semibold text-sm">Resumo do Trial</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                  <div>
                    <div className="text-muted-foreground text-xs">Duração</div>
                    <div className="font-semibold">{watchDuration}h</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">Sessões</div>
                    <div className="font-semibold">{watchMaxSessions}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">Campanhas</div>
                    <div className="font-semibold">{watchMaxCampaigns}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">Contatos</div>
                    <div className="font-semibold">{watchMaxContacts}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">Msgs/Dia</div>
                    <div className="font-semibold">{watchMaxMessagesDay}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-primary/20 p-6 bg-muted/20">
              <div className="flex gap-3 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600"
                >
                  {loading ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                      />
                      Criando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Criar Trial
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
