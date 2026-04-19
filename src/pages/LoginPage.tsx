import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store';
import { Button, Card, CardContent, CardHeader, CardTitle } from '../components/ui/shared';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { User, Lock, Loader2, UserPlus } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('admin@kscsm.com');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(username, password);
      navigate('/');
    } catch {
      setError('Credenciais inválidas. Verifique e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 dark">
      <div className="absolute inset-0 z-[-1] bg-[radial-gradient(circle_at_50%_50%,hsl(230,50%,10%),transparent_70%)] opacity-50" />
      <Card className="w-full max-w-md bg-card/40 backdrop-blur-xl border-primary/20 shadow-2xl shadow-primary/5 rounded-[2rem] overflow-hidden">
        <CardHeader className="text-center space-y-4 pt-8">
          <div className="mx-auto w-16 h-16 bg-neon-gradient rounded-2xl flex items-center justify-center mb-2 shadow-lg shadow-primary/20 animate-float">
            <span className="text-primary-foreground font-bold text-2xl drop-shadow-md">S</span>
          </div>
          <div>
            <CardTitle className="text-3xl font-bold text-neon-gradient">Ks Leads</CardTitle>
            <p className="text-muted-foreground mt-2 text-sm">Gerencie seus contatos com inteligência</p>
          </div>
        </CardHeader>
        <CardContent className="pb-8">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8 bg-primary/10 rounded-xl p-1">
              <TabsTrigger value="login" className="rounded-lg py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                Login
              </TabsTrigger>
              <TabsTrigger value="register" className="rounded-lg py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                Registro
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="p-4 text-sm bg-destructive/10 text-destructive border border-destructive/20 rounded-xl animate-shake">
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-sm font-medium ml-1">Usuário</label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-primary/5 border border-primary/10 rounded-2xl py-3 pl-12 pr-4 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 focus:bg-primary/10 transition-all text-foreground"
                      placeholder="Seu usuário"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between ml-1">
                    <label className="text-sm font-medium">Senha</label>
                    <a href="#" className="text-xs text-primary hover:text-secondary transition-colors">Esqueceu a senha?</a>
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-primary/5 border border-primary/10 rounded-2xl py-3 pl-12 pr-4 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 focus:bg-primary/10 transition-all text-foreground"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full py-6 bg-neon-gradient hover:opacity-90 transition-all rounded-2xl text-lg font-bold shadow-lg shadow-primary/20"
                  disabled={loading}
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                  Entrar
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <div className="text-center space-y-4 py-8">
                <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-primary">
                  <UserPlus className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="font-bold text-lg">Criar nova conta</h4>
                  <p className="text-sm text-muted-foreground max-w-[240px] mx-auto mt-1">
                    O registro está desativado no momento. Entre em contato com o administrador.
                  </p>
                </div>
                <Button variant="outline" className="w-full rounded-2xl py-6" onClick={() => (document.querySelector('[value="login"]') as HTMLElement)?.click()}>
                  Voltar para o Login
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          <div className="mt-8 text-center text-xs text-muted-foreground">
            Dica: use <span className="text-primary font-bold">admin@kscsm.com</span> / <span className="text-primary font-bold">admin123</span> no primeiro acesso
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
