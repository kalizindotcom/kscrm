import React from 'react';
import { AlertCircle, Send, Zap, Smartphone, Users, Clock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface CampaignFiringModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  campaignName: string;
  contactCount: number;
  sessionName: string;
  intervalSec: number;
  isSubmitting?: boolean;
  scheduledAt?: string | null;
}

/**
 * Real confirmation modal. No theatrical fake verification steps.
 * Shows a summary of what will happen and asks user to confirm.
 */
export const CampaignFiringModal: React.FC<CampaignFiringModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  campaignName,
  contactCount,
  sessionName,
  intervalSec,
  isSubmitting = false,
  scheduledAt = null,
}) => {
  const estimatedMinutes = Math.max(1, Math.round((contactCount * intervalSec) / 60));
  const isScheduled = !!scheduledAt;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="sm:max-w-[500px] bg-slate-950 border-slate-800 text-white overflow-hidden p-0 gap-0">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-transparent to-primary/5 pointer-events-none" />
        <div className="relative p-6 pb-0">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black italic tracking-tighter flex items-center gap-2">
              <Zap className="w-6 h-6 text-blue-500 animate-pulse" />
              {isScheduled ? 'AGENDAR CAMPANHA' : 'EXECUTAR DISPARO'}
            </DialogTitle>
            <DialogDescription className="text-slate-400 font-medium">
              {isScheduled ? 'Confirmar agendamento de ' : 'Confirmar disparo de '}
              <span className="text-white font-bold">{campaignName}</span>
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-6 relative z-10">
          <div className="bg-blue-600/10 border border-blue-500/20 rounded-3xl p-6 relative overflow-hidden">
            <div className="space-y-4 relative z-10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">
                  Resumo
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-blue-500/20 text-blue-400 border-blue-500/20">
                  {isScheduled ? 'AGENDADO' : 'PRONTO'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider flex items-center gap-1">
                    <Users className="w-3 h-3" /> Destinatários
                  </p>
                  <p className="text-2xl font-black italic tracking-tighter text-white">
                    {contactCount.toLocaleString('pt-BR')}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider flex items-center gap-1">
                    <Smartphone className="w-3 h-3" /> Sessão
                  </p>
                  <p className="text-lg font-bold text-blue-400 truncate">{sessionName}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Intervalo
                  </p>
                  <p className="text-sm font-bold">{intervalSec}s / mensagem</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                    Duração estimada
                  </p>
                  <p className="text-sm font-bold">~{estimatedMinutes} min</p>
                </div>
                {isScheduled && (
                  <div className="col-span-2 space-y-1">
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                      Agendado para
                    </p>
                    <p className="text-sm font-bold text-amber-400">
                      {new Date(scheduledAt!).toLocaleString('pt-BR')}
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-blue-500/10 flex items-center gap-2 text-[11px] text-slate-400">
                <AlertCircle className="w-3.5 h-3.5 text-blue-500" />
                <span>
                  {isScheduled
                    ? 'A campanha será iniciada automaticamente na data escolhida.'
                    : 'O disparo será iniciado imediatamente.'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Button
              onClick={() => void onConfirm()}
              disabled={isSubmitting || contactCount === 0}
              className="w-full h-14 bg-blue-600 hover:bg-blue-500 text-white font-black italic tracking-tighter text-lg shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all active:scale-95 disabled:opacity-50"
            >
              {isSubmitting
                ? 'PROCESSANDO...'
                : isScheduled
                ? 'CONFIRMAR AGENDAMENTO'
                : 'CONFIRMAR E DISPARAR AGORA'}
              <Send className="w-5 h-5 ml-3" />
            </Button>
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full text-slate-500 hover:text-white hover:bg-slate-900 font-bold text-xs uppercase tracking-widest h-10"
            >
              CANCELAR
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
