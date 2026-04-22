import React, { useEffect, useMemo, useState } from 'react';
import { Copy, KeyRound, Loader2, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { sessionService } from '@/services/sessionService';
import type { Session } from './types';

interface PairingCodeModalProps {
  isOpen: boolean;
  session: Session | null;
  onClose: () => void;
  onGenerated?: (sessionId: string) => void;
}

const normalizePhone = (value: string) => value.replace(/\D/g, '');

export const PairingCodeModal: React.FC<PairingCodeModalProps> = ({
  isOpen,
  session,
  onClose,
  onGenerated,
}) => {
  const [phone, setPhone] = useState('');
  const [pairingCode, setPairingCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setPhone(session?.phoneNumber ?? '');
    setPairingCode('');
  }, [isOpen, session?.id, session?.phoneNumber]);

  const cleanedPhone = useMemo(() => normalizePhone(phone), [phone]);
  const canSubmit = cleanedPhone.length >= 8 && cleanedPhone.length <= 15;

  const handleGenerate = async () => {
    if (!session) return;
    if (!canSubmit) {
      toast.error('Informe um numero valido com DDI/DDD.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = await sessionService.pairingCode(session.id, cleanedPhone);
      setPairingCode(payload.code);
      onGenerated?.(session.id);
      toast.success('Codigo de pareamento gerado!');
    } catch (error: any) {
      toast.error(error?.message ?? 'Falha ao gerar codigo de pareamento');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyCode = async () => {
    if (!pairingCode) return;
    await navigator.clipboard.writeText(pairingCode);
    toast.success('Codigo copiado!');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[540px] bg-slate-950 border-slate-800 text-slate-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-blue-400" />
            Conectar por numero (Pairing Code)
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Digite o numero que possui WhatsApp e gere o codigo para vincular em
            <strong className="text-slate-300"> Dispositivos conectados</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Numero com DDI
            </label>
            <div className="relative">
              <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ex: 5511987654321"
                className="pl-9 bg-slate-900 border-slate-800 text-white"
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Use apenas o numero do WhatsApp. O codigo gerado nao e SMS.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-3">
            <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500">
              Codigo de Pareamento
            </p>
            {pairingCode ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 rounded-lg border border-blue-500/30 bg-blue-500/5 px-3 py-2">
                  <p className="font-mono font-black text-lg tracking-wider text-blue-300 text-center">
                    {pairingCode}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="border-slate-700 hover:bg-slate-800"
                  onClick={copyCode}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copiar
                </Button>
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                Gere o codigo para exibir aqui.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="border-slate-700 hover:bg-slate-800"
            onClick={onClose}
          >
            Fechar
          </Button>
          <Button
            type="button"
            className="bg-blue-600 hover:bg-blue-500 text-white"
            disabled={isSubmitting || !canSubmit}
            onClick={handleGenerate}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <KeyRound className="w-4 h-4 mr-2" />
                Gerar Codigo
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
