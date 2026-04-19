import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Link2, 
  Activity, 
  Wifi, 
  WifiOff, 
  AlertTriangle, 
  RefreshCw,
  Search,
  Filter,
  History,
  Settings,
  Zap,
  Clock,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { reportsService, SessionMetrics } from '@/services/reportsService';
import { toast } from 'sonner';
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

export const ConnectorReport = ({ isLoading: globalLoading }: { isLoading: boolean }) => {
  const [metrics, setMetrics] = useState<SessionMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<any>(null);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    setLoading(true);
    const data = await reportsService.getSessionMetrics();
    setMetrics(data);
    setLoading(false);
  };

  const handleTestConnector = () => {
    toast.promise(new Promise(r => setTimeout(r, 1500)), {
      loading: 'Testando conexão...',
      success: 'Conector operacional!',
      error: 'Falha na conexão'
    });
  };

  const handleViewDetails = (session: any) => {
    setSelectedSession(session);
    setIsDetailOpen(true);
  };

  if (loading || globalLoading || !metrics) {
    return <Skeleton className="h-[600px] w-full" />;
  }

  return (
    <div className="space-y-6">
      {/* Session Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Sessões Ativas</p>
              <Wifi className="h-4 w-4 text-green-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <h3 className="text-2xl font-bold">{metrics.activeSessions}</h3>
              <span className="text-xs text-muted-foreground">de {metrics.totalSessions}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Disponibilidade</p>
              <ShieldCheck className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <h3 className="text-2xl font-bold">{metrics.availabilityRate}%</h3>
              <span className="text-xs text-green-500">SLA OK</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Uptime Total</p>
              <Clock className="h-4 w-4 text-blue-500" />
            </div>
            <div className="mt-2">
              <h3 className="text-2xl font-bold">{metrics.uptime}</h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Erros (24h)</p>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <h3 className="text-2xl font-bold">{metrics.errorSessions}</h3>
              <span className="text-xs text-red-500">+1 crítico</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Session List */}
        <Card className="md:col-span-2 border-muted-foreground/10 bg-card/30 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Sessões & Dispositivos</CardTitle>
                <CardDescription>Status em tempo real de todos os conectores</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={loadMetrics}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Atualizar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Identificador</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Estabilidade</TableHead>
                  <TableHead>Última Sinc.</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[1, 2, 3].map((i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">WhatsApp Instância {i}</span>
                        <span className="text-[10px] font-mono text-muted-foreground">ID: wpp_00{i}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={i === 3 ? 'destructive' : 'default'} className="gap-1">
                        {i === 3 ? <WifiOff className="h-3 w-3" /> : <Wifi className="h-3 w-3" />}
                        {i === 3 ? 'Erro' : 'Conectado'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={90 - i * 5} className="w-16 h-1" />
                        <span className="text-xs">{90 - i * 5}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">Hoje às 14:3{i}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleViewDetails({ id: i })}>
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={handleTestConnector}>
                          <Zap className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Operational Logs */}
        <Card className="border-muted-foreground/10 bg-card/30 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <History className="h-4 w-4" />
              Logs de Conexão
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {metrics.logs.map((log, i) => (
                  <div key={i} className="flex gap-3 border-l-2 border-primary/20 pl-4 py-1">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">{log.action}</span>
                        <span className="text-[10px] text-muted-foreground">{new Date(log.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{log.details}</p>
                      <Badge variant="outline" className="text-[9px] h-4">
                        {log.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Session Details Modal */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Conector</DialogTitle>
            <DialogDescription>Configurações técnicas e histórico de estabilidade</DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-4">
              <div className="p-4 rounded-lg border bg-muted/20">
                <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2 tracking-widest">Informações Gerais</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span>Tipo:</span> <span className="font-medium">WhatsApp Business API</span></div>
                  <div className="flex justify-between"><span>Versão:</span> <span className="font-medium">2.4.1</span></div>
                  <div className="flex justify-between"><span>Online desde:</span> <span className="font-medium">08/11/2023</span></div>
                </div>
              </div>
              <div className="p-4 rounded-lg border bg-muted/20">
                <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2 tracking-widest">Performance</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span>Throughput:</span> <span className="font-medium">45 msg/min</span></div>
                  <div className="flex justify-between"><span>Latência Média:</span> <span className="font-medium">240ms</span></div>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 rounded-lg border bg-muted/20 flex flex-col items-center justify-center text-center">
                <Wifi className="h-8 w-8 text-green-500 mb-2" />
                <h4 className="text-lg font-bold">Estável</h4>
                <p className="text-xs text-muted-foreground">A conexão está operando dentro dos parâmetros normais.</p>
              </div>
              <div className="flex flex-col gap-2">
                <Button className="w-full" variant="outline" onClick={() => toast.info('Sincronizando...')}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Sincronizar Novamente
                </Button>
                <Button className="w-full" variant="destructive" onClick={() => toast.error('Sessão encerrada')}>
                  Encerrar Sessão
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
