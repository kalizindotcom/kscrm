import React, { useState } from 'react';
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
  Smartphone
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Switch } from '../components/ui/switch';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Separator } from '../components/ui/separator';
import { toast } from 'sonner';

export const SettingsPage: React.FC = () => {
  const [autoDeleteMessages, setAutoDeleteMessages] = useState(false);
  const [autoDeleteGroups, setAutoDeleteGroups] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSave = () => {
    setLoading(true);
    // Simulating API call
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
          <TabsTrigger value="messages" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" /> Mensagens
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="w-4 h-4" /> Segurança
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
                <Switch 
                  checked={autoDeleteMessages} 
                  onCheckedChange={setAutoDeleteMessages} 
                />
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
                <Switch 
                  checked={autoDeleteGroups} 
                  onCheckedChange={setAutoDeleteGroups} 
                />
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
