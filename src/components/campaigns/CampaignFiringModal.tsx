import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Send, 
  ShieldCheck, 
  Zap, 
  X,
  Smartphone,
  Check
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface CampaignFiringModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  campaignName: string;
  contactCount: number;
  sessionName: string;
}

type FiringStep = 'verifying' | 'confirming' | 'firing';

export const CampaignFiringModal: React.FC<CampaignFiringModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  campaignName,
  contactCount,
  sessionName
}) => {
  const [step, setStep] = useState<FiringStep>('verifying');
  const [verificationStatus, setVerificationStatus] = useState({
    csv: 'pending' as 'pending' | 'loading' | 'success' | 'error',
    session: 'pending' as 'pending' | 'loading' | 'success' | 'error',
  });
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (isOpen && step === 'verifying') {
      // Start verification sequence
      const runVerification = async () => {
        setVerificationStatus({ csv: 'loading', session: 'pending' });
        await new Promise(resolve => setTimeout(resolve, 1500));
        setVerificationStatus({ csv: 'success', session: 'loading' });
        await new Promise(resolve => setTimeout(resolve, 1200));
        setVerificationStatus({ csv: 'success', session: 'success' });
        await new Promise(resolve => setTimeout(resolve, 800));
        setStep('confirming');
      };
      runVerification();
    }
  }, [isOpen, step]);

  const handleConfirm = () => {
    setStep('firing');
    onConfirm();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] bg-slate-950 border-slate-800 text-white overflow-hidden p-0 gap-0">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-transparent to-primary/5 pointer-events-none" />
        
        {/* Header with Neon Glow */}
        <div className="relative p-6 pb-0">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black italic tracking-tighter flex items-center gap-2">
              <Zap className="w-6 h-6 text-blue-500 animate-pulse" />
              EXECUTAR DISPARO
            </DialogTitle>
            <DialogDescription className="text-slate-400 font-medium">
              Preparando envio da campanha: <span className="text-white font-bold">{campaignName}</span>
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-8 relative z-10">
          {step === 'verifying' && (
            <div className="space-y-6 animate-in fade-in zoom-in duration-300">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-900/50 border border-slate-800 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-xl border transition-colors duration-300",
                      verificationStatus.csv === 'success' ? "bg-green-500/10 border-green-500/20 text-green-500" : 
                      verificationStatus.csv === 'loading' ? "bg-blue-500/10 border-blue-500/20 text-blue-500" :
                      "bg-slate-800 border-slate-700 text-slate-500"
                    )}>
                      {verificationStatus.csv === 'loading' ? <Loader2 className="w-5 h-5 animate-spin" /> : 
                       verificationStatus.csv === 'success' ? <CheckCircle2 className="w-5 h-5" /> : 
                       <ShieldCheck className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="font-bold text-sm">Verificando números CSV</p>
                      <p className="text-xs text-slate-500">Validando formato e duplicatas...</p>
                    </div>
                  </div>
                  {verificationStatus.csv === 'success' && <Badge variant="success" className="bg-green-500/20 text-green-500 border-green-500/20">OK</Badge>}
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-900/50 border border-slate-800 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-xl border transition-colors duration-300",
                      verificationStatus.session === 'success' ? "bg-green-500/10 border-green-500/20 text-green-500" : 
                      verificationStatus.session === 'loading' ? "bg-blue-500/10 border-blue-500/20 text-blue-500" :
                      "bg-slate-800 border-slate-700 text-slate-500"
                    )}>
                      {verificationStatus.session === 'loading' ? <Loader2 className="w-5 h-5 animate-spin" /> : 
                       verificationStatus.session === 'success' ? <CheckCircle2 className="w-5 h-5" /> : 
                       <Smartphone className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="font-bold text-sm">Testando Sessão</p>
                      <p className="text-xs text-slate-500">Conectando com <span className="text-blue-400 font-medium">{sessionName}</span>...</p>
                    </div>
                  </div>
                  {verificationStatus.session === 'success' && <Badge variant="success" className="bg-green-500/20 text-green-500 border-green-500/20">OK</Badge>}
                </div>
              </div>

              <div className="flex flex-col items-center justify-center py-4">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" />
                <p className="text-xs text-slate-500 animate-pulse">Este processo leva apenas alguns segundos...</p>
              </div>
            </div>
          )}

          {step === 'confirming' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-blue-600/10 border border-blue-500/20 rounded-3xl p-6 relative overflow-hidden group">
                <div className="absolute -top-12 -right-12 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full" />
                <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-primary/10 blur-3xl rounded-full" />
                
                <div className="space-y-4 relative z-10">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">Resumo do Disparo</span>
                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/20">PRONTO</Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Destinatários</p>
                      <p className="text-2xl font-black italic tracking-tighter text-white">{contactCount}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Sessão Ativa</p>
                      <p className="text-lg font-bold text-blue-400 truncate">{sessionName}</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-blue-500/10 flex items-center gap-2 text-[11px] text-slate-400">
                    <AlertCircle className="w-3.5 h-3.5 text-blue-500" />
                    <span>O disparo será iniciado imediatamente após a confirmação.</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <Button 
                  onClick={handleConfirm}
                  className="w-full h-14 bg-blue-600 hover:bg-blue-500 text-white font-black italic tracking-tighter text-lg shadow-[0_0_20px_rgba(37,99,235,0.4)] group relative overflow-hidden transition-all active:scale-95"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite]" />
                  CONFIRMAR E DISPARAR AGORA
                  <Send className="w-5 h-5 ml-3" />
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={onClose}
                  className="w-full text-slate-500 hover:text-white hover:bg-slate-900 font-bold text-xs uppercase tracking-widest h-10"
                >
                  CANCELAR
                </Button>
              </div>
            </div>
          )}

          {step === 'firing' && (
            <div className="space-y-8 py-4 animate-in fade-in zoom-in duration-500">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center p-4 bg-blue-600/20 rounded-full mb-4 shadow-[0_0_30px_rgba(37,99,235,0.3)] border border-blue-500/30 animate-pulse">
                  <Zap className="w-8 h-8 text-blue-500" />
                </div>
                <h3 className="text-xl font-black italic tracking-tighter">DISPARO EM ANDAMENTO</h3>
                <p className="text-sm text-slate-500">Acompanhe o progresso em tempo real.</p>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-end mb-1">
                  <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">Progresso Total</span>
                  <span className="text-lg font-black italic tracking-tighter text-white">INICIANDO...</span>
                </div>
                <div className="h-4 bg-slate-900 rounded-full border border-slate-800 p-1 overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full w-2 animate-pulse shadow-[0_0_10px_rgba(37,99,235,0.8)]" />
                </div>
              </div>

              <div className="flex flex-col items-center">
                <Button 
                  variant="outline" 
                  onClick={onClose}
                  className="bg-slate-950 border-slate-800 text-slate-400 hover:text-white rounded-2xl px-8"
                >
                  FECHAR JANELA
                </Button>
                <p className="text-[10px] text-slate-600 mt-4 uppercase font-bold tracking-widest">A campanha continuará rodando em segundo plano</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

const Badge: React.FC<{ children: React.ReactNode, variant?: string, className?: string }> = ({ children, className }) => (
  <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border", className)}>
    {children}
  </span>
);
