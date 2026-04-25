import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FlaskConical, Plus, TrendingUp, Users, MessageSquare, Target, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ABTestVariant {
  id: string;
  name: string;
  content: string;
  weight: number;
  sent: number;
  delivered: number;
  read: number;
  replied: number;
  conversionRate: number;
}

interface ABTest {
  id: string;
  name: string;
  status: 'draft' | 'running' | 'completed';
  variants: ABTestVariant[];
  totalSent: number;
  startedAt?: string;
  completedAt?: string;
}

export const ABTestingPanel: React.FC = () => {
  const [tests, setTests] = useState<ABTest[]>([
    {
      id: '1',
      name: 'Teste de Saudação',
      status: 'running',
      totalSent: 1500,
      startedAt: new Date().toISOString(),
      variants: [
        {
          id: 'a',
          name: 'Variante A - Formal',
          content: 'Olá! Como podemos ajudá-lo hoje?',
          weight: 50,
          sent: 750,
          delivered: 720,
          read: 680,
          replied: 340,
          conversionRate: 45.3,
        },
        {
          id: 'b',
          name: 'Variante B - Casual',
          content: 'E aí! Tudo bem? Em que posso te ajudar?',
          weight: 50,
          sent: 750,
          delivered: 730,
          read: 700,
          replied: 420,
          conversionRate: 56.0,
        },
      ],
    },
  ]);

  const [showCreateModal, setShowCreateModal] = useState(false);

  const getWinningVariant = (test: ABTest) => {
    return test.variants.reduce((prev, current) =>
      current.conversionRate > prev.conversionRate ? current : prev
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <FlaskConical className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">A/B Testing</h2>
            <p className="text-xs text-slate-500 font-medium">Teste diferentes mensagens e otimize suas campanhas</p>
          </div>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs px-4 py-2 rounded-xl flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Novo Teste
        </Button>
      </div>

      <div className="grid gap-4">
        {tests.map((test) => {
          const winner = getWinningVariant(test);
          return (
            <Card key={test.id} className="bg-card/40 backdrop-blur-md border-primary/10 p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-black text-white">{test.name}</h3>
                    <span className={cn(
                      "text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg",
                      test.status === 'running' && "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20",
                      test.status === 'completed' && "bg-primary/10 text-primary border border-primary/20",
                      test.status === 'draft' && "bg-slate-500/10 text-slate-500 border border-slate-500/20"
                    )}>
                      {test.status === 'running' ? 'Em execução' : test.status === 'completed' ? 'Concluído' : 'Rascunho'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    {test.totalSent.toLocaleString()} mensagens enviadas
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="text-xs">
                    Ver Detalhes
                  </Button>
                  {test.status === 'running' && (
                    <Button variant="outline" size="sm" className="text-xs text-rose-500 border-rose-500/20">
                      Pausar
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {test.variants.map((variant, idx) => {
                  const isWinner = variant.id === winner.id;
                  return (
                    <motion.div
                      key={variant.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className={cn(
                        "p-4 rounded-xl border transition-all",
                        isWinner
                          ? "bg-primary/10 border-primary/30 shadow-lg shadow-primary/5"
                          : "bg-white/5 border-white/10"
                      )}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-white">{variant.name}</span>
                          {isWinner && (
                            <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-primary text-primary-foreground">
                              Vencedor
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-500 font-bold">{variant.weight}%</span>
                      </div>

                      <div className="bg-black/20 rounded-lg p-3 mb-4">
                        <p className="text-xs text-slate-300 leading-relaxed">{variant.content}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="bg-black/20 rounded-lg p-2">
                          <div className="flex items-center gap-1.5 mb-1">
                            <MessageSquare className="w-3 h-3 text-slate-500" />
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Enviadas</span>
                          </div>
                          <p className="text-lg font-black text-white">{variant.sent}</p>
                        </div>
                        <div className="bg-black/20 rounded-lg p-2">
                          <div className="flex items-center gap-1.5 mb-1">
                            <Users className="w-3 h-3 text-slate-500" />
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Lidas</span>
                          </div>
                          <p className="text-lg font-black text-white">{variant.read}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Target className="w-4 h-4 text-primary" />
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Taxa de Conversão</span>
                        </div>
                        <span className={cn(
                          "text-xl font-black",
                          isWinner ? "text-primary" : "text-white"
                        )}>
                          {variant.conversionRate}%
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {test.status === 'running' && (
                <div className="mt-4 p-4 bg-primary/5 border border-primary/10 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    <span className="text-xs font-black text-primary uppercase tracking-widest">Análise em Tempo Real</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    A <strong className="text-white">{winner.name}</strong> está performando {(winner.conversionRate - test.variants.find(v => v.id !== winner.id)!.conversionRate).toFixed(1)}% melhor.
                    Continue o teste para obter resultados mais precisos.
                  </p>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {tests.length === 0 && (
        <Card className="bg-card/40 backdrop-blur-md border-primary/10 p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
            <FlaskConical className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-black text-white mb-2">Nenhum teste criado</h3>
          <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">
            Crie seu primeiro teste A/B para descobrir quais mensagens geram mais engajamento com seus contatos.
          </p>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs px-6 py-3 rounded-xl"
          >
            <Plus className="w-4 h-4 mr-2" />
            Criar Primeiro Teste
          </Button>
        </Card>
      )}
    </div>
  );
};
