import React, { useState, useEffect } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Smartphone,
  Globe,
  MessageSquare
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/shared';
import { cn } from '../../lib/utils';

interface NumberInput {
  id: string;
  countryCode: string;
  ddd: string;
  number: string;
}

interface NewMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewMessageModal: React.FC<NewMessageModalProps> = ({ isOpen, onClose }) => {
  const [numbers, setNumbers] = useState<NumberInput[]>([
    { id: '1', countryCode: '55', ddd: '', number: '' }
  ]);
  const [lockCountryCode, setLockCountryCode] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{ id: string; success: boolean; message: string }[] | null>(null);

  const addNumber = () => {
    const lastNum = numbers[numbers.length - 1];
    setNumbers([...numbers, { 
      id: Math.random().toString(36).substr(2, 9), 
      countryCode: lockCountryCode ? lastNum.countryCode : '', 
      ddd: lockCountryCode ? lastNum.ddd : '', 
      number: '' 
    }]);
  };

  const removeNumber = (id: string) => {
    if (numbers.length > 1) {
      setNumbers(numbers.filter(n => n.id !== id));
    }
  };

  const updateNumber = (id: string, field: keyof NumberInput, value: string) => {
    setNumbers(numbers.map(n => n.id === id ? { ...n, [field]: value } : n));
  };

  const startConversation = async () => {
    setIsValidating(true);
    setProgress(0);
    setResults(null);

    // Simulate validation process
    for (let i = 1; i <= 100; i++) {
      await new Promise(resolve => setTimeout(resolve, 30));
      setProgress(i);
    }

    const mockResults = numbers.map(n => ({
      id: n.id,
      success: Math.random() > 0.2,
      message: n.number.length < 8 ? 'Número inválido' : 'Sucesso'
    }));

    setResults(mockResults);
    setIsValidating(false);
  };

  const reset = () => {
    setNumbers([{ id: '1', countryCode: '55', ddd: '', number: '' }]);
    setIsValidating(false);
    setProgress(0);
    setResults(null);
  };

  const handleClose = () => {
    onClose();
    setTimeout(reset, 300);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[550px] bg-card/95 backdrop-blur-2xl border-primary/20 shadow-[0_0_50px_-12px_rgba(var(--primary),0.3)] overflow-hidden">
        {/* Glow Background Effect */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-primary/20 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-secondary/20 rounded-full blur-[80px] pointer-events-none" />

        <DialogHeader className="relative z-10">
          <DialogTitle className="text-2xl font-bold flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 text-primary">
              <MessageSquare className="w-6 h-6" />
            </div>
            <span className="text-neon-gradient">Nova Mensagem</span>
          </DialogTitle>
        </DialogHeader>

        {!isValidating && !results && (
          <div className="space-y-6 mt-6 relative z-10">
            <div className="flex items-center justify-between px-1">
              <label className="text-xs font-bold text-muted-foreground flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={lockCountryCode} 
                  onChange={(e) => setLockCountryCode(e.target.checked)}
                  className="rounded border-primary/20 text-primary focus:ring-primary/40 bg-background/50"
                />
                Fixar código do país e DDD
              </label>
              <span className="text-[10px] font-black text-primary uppercase bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                {numbers.length} {numbers.length === 1 ? 'NÚMERO' : 'NÚMEROS'}
              </span>
            </div>

            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {numbers.map((n, index) => (
                <div 
                  key={n.id} 
                  className="flex items-end gap-3 p-4 rounded-2xl bg-muted/20 border border-primary/10 hover:border-primary/30 transition-all group animate-in fade-in slide-in-from-right-4 duration-300 relative"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="grid grid-cols-12 gap-3 flex-1">
                    <div className="col-span-3 space-y-1.5">
                      <label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                        <Globe className="w-3 h-3" /> País
                      </label>
                      <input
                        value={n.countryCode}
                        onChange={(e) => updateNumber(n.id, 'countryCode', e.target.value)}
                        disabled={lockCountryCode && index > 0}
                        className={cn(
                          "w-full bg-background/50 border border-primary/10 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/40 outline-none transition-all",
                          lockCountryCode && index > 0 && "opacity-50 cursor-not-allowed bg-muted/20"
                        )}
                        placeholder="55"
                      />
                    </div>
                    <div className="col-span-3 space-y-1.5">
                      <label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                         DDD
                      </label>
                      <input
                        value={n.ddd}
                        onChange={(e) => updateNumber(n.id, 'ddd', e.target.value)}
                        disabled={lockCountryCode && index > 0}
                        className={cn(
                          "w-full bg-background/50 border border-primary/10 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/40 outline-none transition-all",
                          lockCountryCode && index > 0 && "opacity-50 cursor-not-allowed bg-muted/20"
                        )}
                        placeholder="11"
                      />
                    </div>
                    <div className="col-span-6 space-y-1.5">
                      <label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                        <Smartphone className="w-3 h-3" /> Número
                      </label>
                      <input
                        value={n.number}
                        onChange={(e) => updateNumber(n.id, 'number', e.target.value)}
                        className="w-full bg-background/50 border border-primary/10 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/40 outline-none transition-all"
                        placeholder="99999-9999"
                      />
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => removeNumber(n.id)}
                    className="mb-1 h-9 w-9 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                    disabled={numbers.length === 1}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>

            <Button 
              variant="outline" 
              onClick={addNumber}
              className="w-full border-dashed border-primary/30 hover:border-primary/60 hover:bg-primary/5 py-6 rounded-2xl flex flex-col gap-1 h-auto group"
            >
              <Plus className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
              <span className="text-xs font-semibold text-muted-foreground">Adicionar outro número</span>
            </Button>

            <Button 
              onClick={startConversation}
              className="w-full h-14 rounded-2xl bg-gradient-to-r from-primary to-secondary hover:opacity-90 shadow-[0_4px_20px_-5px_rgba(var(--primary),0.5)] transition-all font-bold text-lg flex items-center gap-3 active:scale-[0.98]"
            >
              <Send className="w-5 h-5" />
              Iniciar Conversas
            </Button>
          </div>
        )}

        {isValidating && (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
            <div className="relative">
              <div className="w-24 h-24 rounded-full border-4 border-primary/10 flex items-center justify-center relative z-10 bg-background/50">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
              </div>
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-bold">Validando Números</h3>
              <p className="text-muted-foreground text-sm">Estamos verificando se os números são válidos no WhatsApp...</p>
            </div>

            <div className="w-full space-y-2">
              <div className="flex justify-between text-xs font-bold px-1">
                <span className="text-primary">{progress}%</span>
                <span className="text-muted-foreground">{numbers.length} números</span>
              </div>
              <div className="h-4 w-full bg-muted/30 rounded-full overflow-hidden border border-primary/10 p-1">
                <div 
                  className="h-full rounded-full transition-all duration-300 river-progress-indicator"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {results && (
          <div className="mt-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {results.map((res, idx) => {
                const num = numbers.find(n => n.id === res.id);
                return (
                  <div 
                    key={res.id} 
                    className={cn(
                      "flex items-center justify-between p-4 rounded-xl border transition-all",
                      res.success 
                        ? "bg-emerald-500/5 border-emerald-500/20" 
                        : "bg-destructive/5 border-destructive/20"
                    )}
                    style={{ animationDelay: `${idx * 100}ms` }}
                  >
                    <div className="flex items-center gap-3">
                      {res.success ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-destructive" />
                      )}
                      <div>
                        <p className="text-sm font-bold">
                          +{num?.countryCode} ({num?.ddd}) {num?.number}
                        </p>
                        <p className={cn("text-[10px] font-medium uppercase", res.success ? "text-emerald-500" : "text-destructive")}>
                          {res.message}
                        </p>
                      </div>
                    </div>
                    {res.success && (
                      <Button size="sm" variant="outline" className="h-8 text-[10px] font-bold uppercase tracking-wider">
                        Ver Chat
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={reset}
                className="flex-1 rounded-xl h-12 font-bold"
              >
                Voltar
              </Button>
              <Button 
                onClick={handleClose}
                className="flex-1 bg-primary hover:bg-primary/90 rounded-xl h-12 font-bold"
              >
                Concluir
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
