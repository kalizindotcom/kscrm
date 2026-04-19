import React, { useState, useEffect } from 'react';
import {
  Settings,
  Bell,
  Lock,
  User,
  Trash2,
  Shield,
  Globe,
  Save,
  MessageSquare,
  Users,
  Smartphone,
  Zap,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Switch } from '../components/ui/switch';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Separator } from '../components/ui/separator';
import { toast } from 'sonner';
import { apiClient } from '../services/apiClient';
import { useSessionStore } from '../store/useSessionStore';

export const SettingsPage: React.FC = () => {
  const [autoDeleteMessages, setAutoDeleteMessages] = useState(false);
  const [autoDeleteGroups, setAutoDeleteGroups] = useState(false);
  const [loading, setLoading] = useState(false);
  const [antiBanEnabled, setAntiBanEnabled] = useState(true);
  const [antiBanLoading, setAntiBanLoading] = useState(false);
  const { sessions } = useSessionStore();

  const connectedSessions = sessions.filter((s) => s.status === 'connected');

  useEffect(() => {
    if (connectedSessions.length > 0) {
      const first = connectedSessions[0] as any;
      setAntiBanEnabled(first.antiBanEnabled !== false);
    }
  }, [sessions]);

  const handleAntiBanToggle = async (value: boolean) => {
    setAntiBanEnabled(value);
    setAntiBanLoading(true);
    try {
      for (const session of connectedSessions) {
        await apiClient.patch(`/api/sessions/${session.id}`, { antiBanEnabled: value });
      }
      toast.success(
        value
          ? 'Proteção Anti-Ban ativada. Delays e limites de envio habilitados.'
          : 'Proteção Anti-Ban desativada. Envios sem delay ou limite de taxa.',
      );
    } catch {
      setAntiBanEnabled(!value);
      toast.error('Falha ao salvar configuração. Tente novamente.');
    } finally {
      setAntiBanLoading(false);
    }
  };

  const handleSave = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.success('Configurações salvas com sucesso!');
    }, 1000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">Gerencie as preferências da sua conta e do sistema.</p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <div className="overflow-x-auto custom-scrollbar pb-2">
          <TabsList className="mb-4 inline-flex w-full sm:w-auto">
            <TabsTrigger value="general" className="flex items-center gap-2">
              <Settings className="w-4 h-4" /> Geral
            </TabsTrigger>
            <TabsTrigger value="antiban" className="flex items-center gap-2">
              <Shield className="w-4 h-4" /> Anti-Ban
            </TabsTrigger>
            <TabsTrigger value="messages" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" /> Mensagens
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Lock className="w-4 h-4" /> Segurança
            </TabsTrigger>
            <TabsTrigger value="account" className="flex items-center gap-2">
              <User className="w-4 h-4" /> Conta
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Preferências do Sistema</CardTitle>
              <CardDescription>Configure como o sistema deve se comportar.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Idioma do Sistema</Label>
                  <p className="text-sm text-muted-foreground text-balance">
                    Escolha o idioma principal da interface.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Português (Brasil)</span>
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Notificações no Desktop</Label>
                  <p className="text-sm text-muted-foreground text-balance">
                    Receba alertas sobre novas mensagens e status de campanhas.
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="antiban" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Proteção Anti-Ban
              </CardTitle>
              <CardDescription>
                Controle o sistema de proteção contra banimento do WhatsApp nas suas sessões conectadas.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-primary" />
                    <Label className="text-base font-semibold">Ativar Proteção Anti-Ban</Label>
                    {antiBanLoading && (
                      <span className="text-xs text-muted-foreground animate-pulse">Salvando...</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Quando ativo: delays humanizados entre mensagens, limites de taxa por minuto/hora/dia e
                    indicador de digitação são aplicados em todos os envios (Live-View e Campanhas).
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Quando inativo: mensagens são enviadas imediatamente, sem delays ou limites de taxa.
                  </p>
                </div>
                <Switch
                  checked={antiBanEnabled}
                  onCheckedChange={handleAntiBanToggle}
                  disabled={antiBanLoading || connectedSessions.length === 0}
                />
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={`p-4 rounded-xl border ${antiBanEnabled ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-muted/30 border-muted/30'}`}>
                  <p className="text-xs font-bold uppercase tracking-wider mb-1 text-muted-foreground">Limite por minuto</p>
                  <p className={`text-2xl font-black ${antiBanEnabled ? 'text-emerald-400' : 'text-slate-500 line-through'}`}>
                    8 msg
                  </p>
                  {!antiBanEnabled && <p className="text-xs text-primary font-bold mt-1">SEM LIMITE</p>}
                </div>
                <div className={`p-4 rounded-xl border ${antiBanEnabled ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-muted/30 border-muted/30'}`}>
                  <p className="text-xs font-bold uppercase tracking-wider mb-1 text-muted-foreground">Delay entre envios</p>
                  <p className={`text-2xl font-black ${antiBanEnabled ? 'text-emerald-400' : 'text-slate-500 line-through'}`}>
                    3–8s
                  </p>
                  {!antiBanEnabled && <p className="text-xs text-primary font-bold mt-1">SEM DELAY</p>}
                </div>
                <div className={`p-4 rounded-xl border ${antiBanEnabled ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-muted/30 border-muted/30'}`}>
                  <p className="text-xs font-bold uppercase tracking-wider mb-1 text-muted-foreground">Indicador de digitação</p>
                  <p className={`text-2xl font-black ${antiBanEnabled ? 'text-emerald-400' : 'text-slate-500 line-through'}`}>
                    Ativo
                  </p>
                  {!antiBanEnabled && <p className="text-xs text-primary font-bold mt-1">DESATIVADO</p>}
                </div>
              </div>

              {!antiBanEnabled && (
                <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-amber-400">Atenção: Risco de Banimento</p>
                    <p className="text-xs text-amber-300/80 mt-1">
                      Com a proteção desativada, envios em massa sem delay aumentam significativamente o risco de
                      banimento da sua sessão pelo WhatsApp. Use com cautela.
                    </p>
                  </div>
                </div>
              )}

              {connectedSessions.length === 0 && (
                <div className="bg-muted/30 border border-muted/50 p-4 rounded-xl text-center">
                  <p className="text-sm text-muted-foreground">Nenhuma sessão conectada. Conecte uma sessão para configurar o Anti-Ban.</p>
                </div>
              )}

              {connectedSessions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Sessões afetadas ({connectedSessions.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {connectedSessions.map((s) => (
                      <span key={s.id} className="text-xs bg-primary/10 border border-primary/20 text-primary px-3 py-1 rounded-full font-medium">
                        {s.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="messages" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gerenciamento de Mensagens</CardTitle>
              <CardDescription>Controle a retenção e privacidade das suas conversas.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-muted-foreground" />
                    <Label className="text-base">Deletar automaticamente mensagens (Privado)</Label>
                  </div>
                  <p className="text-sm text-muted-foreground text-balance">
                    Apaga automaticamente as mensagens recebidas de conversas individuais após a leitura/processamento.
                  </p>
                </div>
                <Switch checked={autoDeleteMessages} onCheckedChange={setAutoDeleteMessages} />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <Label className="text-base">Deletar automaticamente mensagens (Grupos)</Label>
                  </div>
                  <p className="text-sm text-muted-foreground text-balance">
                    Apaga automaticamente as mensagens recebidas em grupos para economizar espaço e manter a privacidade.
                  </p>
                </div>
                <Switch checked={autoDeleteGroups} onCheckedChange={setAutoDeleteGroups} />
              </div>

              <div className="bg-muted/50 p-4 rounded-lg flex items-start gap-3 mt-4">
                <Trash2 className="w-5 h-5 text-destructive mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Atenção</p>
                  <p className="text-xs text-muted-foreground">
                    Esta ação é irreversível. Uma vez deletadas do sistema, as mensagens não poderão ser recuperadas através do painel.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Segurança da Conta</CardTitle>
              <CardDescription>Gerencie suas chaves de API e acesso.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Autenticação de Dois Fatores</Label>
                  <p className="text-sm text-muted-foreground">
                    Adicione uma camada extra de segurança à sua conta.
                  </p>
                </div>
                <Button variant="outline" size="sm">Configurar</Button>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Sessões Ativas</Label>
                  <p className="text-sm text-muted-foreground">
                    Gerencie os dispositivos conectados à sua conta.
                  </p>
                </div>
                <Button variant="outline" size="sm">Ver tudo</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Perfil do Usuário</CardTitle>
              <CardDescription>Suas informações pessoais e de faturamento.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome Completo</Label>
                  <div className="p-2 border rounded-md bg-muted/30">Usuário Protótipo</div>
                </div>
                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <div className="p-2 border rounded-md bg-muted/30">contato@exemplo.com.br</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end pt-4">
        <Button onClick={handleSave} disabled={loading} className="gap-2">
          {loading ? 'Salvando...' : (
            <>
              <Save className="w-4 h-4" /> Salvar Alterações
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
