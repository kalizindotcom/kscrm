import React, { useEffect, useState } from 'react';
import {
  QrCode,
  RefreshCcw,
  Clock,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { sessionService } from '@/services/sessionService';

interface QRCodeDisplayProps {
  onCancel?: () => void;
  onSuccess?: () => void;
  sessionId?: string;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({ onCancel, onSuccess, sessionId }) => {
  const [timeLeft, setTimeLeft] = useState(120);
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState<'waiting' | 'expired' | 'success'>('waiting');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    setTimeLeft(120);
    setStatus('waiting');
    setQrDataUrl(null);
  }, [sessionId]);

  const loadQr = async () => {
    if (!sessionId) return;
    try {
      const payload = await sessionService.getQr(sessionId);
      if (payload.status === 'connected') {
        setStatus('success');
        toast.success('Dispositivo conectado com sucesso!');
        setTimeout(() => onSuccess?.(), 800);
        return;
      }
      if (payload.dataUrl) {
        setQrDataUrl(payload.dataUrl);
        setStatus('waiting');
      }
    } catch (error: any) {
      toast.error(error?.message ?? 'Falha ao obter QR Code');
    }
  };

  useEffect(() => {
    if (!sessionId || status === 'success') return;
    loadQr().catch(() => undefined);
    const poll = setInterval(() => {
      loadQr().catch(() => undefined);
    }, 3000);
    return () => clearInterval(poll);
  }, [sessionId, status]);

  useEffect(() => {
    if (status !== 'waiting') return;
    if (timeLeft <= 0) {
      setStatus('expired');
      return;
    }
    const timer = setInterval(() => setTimeLeft((previous) => previous - 1), 1000);
    return () => clearInterval(timer);
  }, [status, timeLeft]);

  const handleRefresh = () => {
    if (!sessionId) return;
    setIsGenerating(true);
    toast.promise(
      sessionService.connect(sessionId).then(async () => {
        setTimeLeft(120);
        await loadQr();
      }),
      {
        loading: 'Gerando novo QR Code...',
        success: () => {
          setIsGenerating(false);
          setStatus('waiting');
          return 'QR Code atualizado!';
        },
        error: () => {
          setIsGenerating(false);
          return 'Erro ao gerar QR Code';
        },
      },
    );
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl space-y-8 max-w-lg mx-auto overflow-hidden relative group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/5 blur-3xl rounded-full" />

      <div className="flex flex-col items-center text-center space-y-2">
        <h3 className="text-xl font-bold text-white flex items-center gap-2 tracking-tight">
          Conectar WhatsApp
          <Badge variant="outline" className="text-[10px] uppercase border-blue-500/30 text-blue-400 font-bold bg-blue-500/5">Beta v2</Badge>
        </h3>
        <p className="text-slate-400 text-sm max-w-[300px]">
          Abra o WhatsApp no seu celular e aponte a câmera para o código abaixo.
        </p>
      </div>

      <div className="relative group/qr">
        <div
          className={cn(
            'relative w-64 h-64 bg-white p-4 rounded-2xl shadow-inner transition-all duration-500',
            status === 'expired' && 'opacity-40 grayscale blur-[2px]',
            status === 'success' && 'opacity-20 blur-md grayscale transition-all duration-1000',
          )}
        >
          <div className="w-full h-full bg-slate-950 rounded-lg flex items-center justify-center relative overflow-hidden">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="QR Code da sessão" className="w-full h-full object-contain rounded-lg" />
            ) : (
              <QrCode className="w-48 h-48 text-white/30" />
            )}
          </div>
          {status === 'waiting' && (
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/30 to-transparent h-1 w-full top-0 animate-qr-beam z-10" />
          )}
        </div>

        {status === 'expired' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[1px] rounded-2xl z-20">
            <AlertCircle className="w-12 h-12 text-rose-500 mb-2 drop-shadow-lg" />
            <p className="text-white font-bold text-sm">QR Code Expirado</p>
            <Button variant="link" onClick={handleRefresh} className="text-blue-400 font-bold hover:text-blue-300">
              Atualizar QR
            </Button>
          </div>
        )}

        {status === 'success' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-20 animate-in zoom-in duration-500">
            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center animate-pulse">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 drop-shadow-lg" />
            </div>
            <p className="text-emerald-400 font-bold mt-4 text-lg">Conectado!</p>
          </div>
        )}

        {isGenerating && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm rounded-2xl z-20">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-2" />
            <p className="text-white font-medium text-xs tracking-widest uppercase">Gerando novo código...</p>
          </div>
        )}
      </div>

      <div className="w-full space-y-6">
        {status === 'waiting' && (
          <div className="flex flex-col items-center space-y-4">
            <div className="flex items-center gap-6 text-slate-400 text-xs font-medium uppercase tracking-widest">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-500" />
                <span>
                  Expira em{' '}
                  <span className={cn('text-white font-bold tabular-nums', timeLeft < 30 && 'text-rose-500 animate-pulse')}>
                    {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-blue-500" />
                <span>Aguardando leitura</span>
              </div>
            </div>

            <div className="flex gap-2 w-full">
              <Button variant="outline" className="flex-1 bg-white/5 border-white/10 hover:bg-white/10 text-white border-none h-11 rounded-xl transition-all" onClick={onCancel}>
                Cancelar
              </Button>
              <Button className="flex-1 bg-blue-600 hover:bg-blue-500 text-white border-none h-11 rounded-xl shadow-lg shadow-blue-500/20 transition-all font-bold" onClick={loadQr}>
                Verificar Conexão
              </Button>
            </div>
          </div>
        )}

        {status === 'expired' && (
          <div className="flex gap-2 w-full">
            <Button variant="outline" className="flex-1 bg-white/5 border-white/10 hover:bg-white/10 text-white border-none h-11 rounded-xl transition-all" onClick={onCancel}>
              Voltar
            </Button>
            <Button className="flex-1 bg-blue-600 hover:bg-blue-500 text-white border-none h-11 rounded-xl shadow-lg shadow-blue-500/20 transition-all font-bold" onClick={handleRefresh}>
              <RefreshCcw className="w-4 h-4 mr-2" />
              Novo QR Code
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
