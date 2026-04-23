import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Plus, 
  Smartphone, 
  Tag, 
  QrCode,
  Loader2
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useSessionStore } from '@/store/useSessionStore';
import { sessionService } from '@/services/sessionService';
import { toast } from 'sonner';

const formSchema = z.object({
  name: z.string().min(3, { message: 'O nome deve ter pelo menos 3 caracteres.' }),
  description: z.string().optional(),
  favorite: z.boolean(),
  generateQrImmediately: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

export const CreateSessionModal: React.FC = () => {
  const { 
    isCreateModalOpen, 
    closeCreateSessionModal, 
    addSession, 
    sessions,
    selectSession
  } = useSessionStore();
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      favorite: false,
      generateQrImmediately: false,
    },
  });

  const onSubmit = async (values: FormValues) => {
    if (sessions.some((s) => s.name.toLowerCase() === values.name.toLowerCase())) {
      form.setError('name', { message: 'Já existe uma sessão com este nome.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await sessionService.create({
        name: values.name,
        description: values.description || undefined,
      });

      let saved = created;
      if (values.favorite) {
        saved = await sessionService.update(created.id, { favorite: true });
      }

      if (values.generateQrImmediately) {
        await sessionService.connect(created.id);
      }

      addSession(saved);
      closeCreateSessionModal();
      form.reset();

      toast.success(`Sessão ${saved.name} criada com sucesso!`);

      if (values.generateQrImmediately) {
        setTimeout(() => {
          selectSession(saved.id);
        }, 500);
      }
    } catch (error: any) {
      toast.error(error?.message ?? 'Falha ao criar sessão');
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleClose = () => {
    if (form.formState.isDirty) {
      if (confirm('Você tem alterações não salvas. Deseja realmente sair?')) {
        form.reset();
        closeCreateSessionModal();
      }
    } else {
      closeCreateSessionModal();
    }
  };

  return (
    <Dialog open={isCreateModalOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl bg-slate-950 border-slate-800 text-slate-100 p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-6 bg-slate-900/50 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600/10 text-blue-500">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-white">Nova Sessão</DialogTitle>
              <DialogDescription className="text-slate-400 text-xs">
                Configure um novo conector para expandir sua malha de comunicação.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <ScrollArea className="max-h-[70vh] p-6">
              <div className="flex flex-col gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Smartphone className="w-4 h-4 text-blue-500" />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Informações Básicas</h3>
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold text-slate-300 uppercase">Nome da Sessão *</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: WhatsApp Vendas Matriz" {...field} className="bg-slate-900 border-slate-800 focus:border-blue-500/50 text-sm h-10 rounded-xl" />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold text-slate-300 uppercase">Descrição</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Descreva brevemente o propósito desta sessão..." {...field} className="bg-slate-900 border-slate-800 focus:border-blue-500/50 text-sm min-h-[100px] rounded-xl" />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Tag className="w-4 h-4 text-emerald-500" />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Opções</h3>
                  </div>

                  <FormField
                    control={form.control}
                    name="favorite"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-xl border border-slate-800 p-3 bg-slate-900/30">
                        <div className="space-y-0.5">
                          <FormLabel className="text-xs font-bold text-slate-200">Favoritar Sessão</FormLabel>
                          <FormDescription className="text-[10px] text-slate-500">
                            Destacar esta sessão no topo da lista.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

                <div className="col-span-2 mt-2">
                  <FormField
                    control={form.control}
                    name="generateQrImmediately"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-2xl border border-blue-500/20 p-5 bg-blue-500/5">
                        <div className="flex gap-4">
                          <div className="p-3 rounded-2xl bg-blue-600/10 text-blue-500 h-fit">
                            <QrCode className="w-6 h-6" />
                          </div>
                          <div className="space-y-1">
                            <FormLabel className="text-sm font-bold text-white">Gerar QR Code imediatamente?</FormLabel>
                            <FormDescription className="text-xs text-slate-400 max-w-md">
                              Se ativo, a sessão iniciará no status <strong>pairing</strong> e abrirá a tela de conexão logo após a criação.
                            </FormDescription>
                          </div>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="data-[state=checked]:bg-blue-600"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
            </ScrollArea>

            <Separator className="bg-slate-800" />

            <DialogFooter className="p-6 bg-slate-900/50">
              <div className="flex items-center justify-between w-full">
                <p className="text-[10px] text-slate-500 font-medium">
                  * Campos obrigatórios
                </p>
                <div className="flex gap-3">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    className="text-slate-400 hover:text-white hover:bg-slate-800 font-bold text-xs"
                    onClick={handleClose}
                  >
                    CANCELAR
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs h-10 px-8 shadow-lg shadow-blue-600/20 min-w-[140px]"
                    disabled={isSubmitting || !form.formState.isValid}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        CRIANDO...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        CRIAR SESSÃO
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

