import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Layers, 
  Users, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  RefreshCw,
  History,
  Info,
  ExternalLink,
  MessageCircle,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { reportsService, GroupMetrics } from '@/services/reportsService';
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from 'sonner';

export const GroupReport = ({ isLoading: globalLoading }: { isLoading: boolean }) => {
  const [metrics, setMetrics] = useState<GroupMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    setLoading(true);
    const data = await reportsService.getGroupMetrics();
    setMetrics(data);
    setLoading(false);
  };

  const handleViewDetails = (group: any) => {
    setSelectedGroup(group);
    setIsDetailOpen(true);
  };

  if (loading || globalLoading || !metrics) {
    return <Skeleton className="h-[600px] w-full" />;
  }

  return (
    <div className="space-y-6">
      {/* Group Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Grupos Sincronizados</CardTitle>
            <Layers className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalGroups}</div>
            <p className="text-xs text-muted-foreground">{metrics.activeGroups} ativos no momento</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Membros</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalMembers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Média de {metrics.avgMembers} por grupo</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Sincronizados Hoje</CardTitle>
            <RefreshCw className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.syncedToday}</div>
            <Badge variant="outline" className="text-[10px] text-green-500 border-green-500/20">Sucesso</Badge>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Exportações Recentes</CardTitle>
            <Download className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.exportedRecently}</div>
            <p className="text-xs text-muted-foreground">Grupos com dados extraídos</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Growth Chart */}
        <Card className="border-muted-foreground/10 bg-card/30 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Crescimento de Membros
            </CardTitle>
            <CardDescription>Evolução da audiência total somada</CardDescription>
          </CardHeader>
          <CardContent className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metrics.history}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))' }}
                />
                <Line type="monotone" dataKey="members" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))' }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Group List */}
        <Card className="border-muted-foreground/10 bg-card/30 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Listagem de Grupos</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative w-48">
                  <Search className="absolute left-2 top-2.5 h-3 w-3 text-muted-foreground" />
                  <Input placeholder="Buscar grupo..." className="pl-7 h-8 text-xs" />
                </div>
                <Button variant="outline" size="icon" className="h-8 w-8">
                  <Filter className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead>Grupo</TableHead>
                  <TableHead>Membros</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics && metrics.totalGroups > 0 ? (
                  <TableRow className="text-sm">
                    <TableCell className="font-medium">Total de Grupos</TableCell>
                    <TableCell>{metrics.totalGroups}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">Ativo</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleViewDetails({ id: 1 })}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground text-xs py-6">
                      Nenhum grupo encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Group Detail Modal */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              Detalhes do Grupo
            </DialogTitle>
            <DialogDescription>Dados demográficos e histórico de extração</DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center border-2 border-primary/20">
                  <Layers className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Grupo Marketing Alpha</h3>
                  <p className="text-xs text-muted-foreground font-mono">ID: 1203630283746@g.us</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-lg border bg-muted/20 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Membros</p>
                  <p className="text-xl font-bold">248</p>
                </div>
                <div className="p-3 rounded-lg border bg-muted/20 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Status</p>
                  <Badge className="bg-green-500/10 text-green-500 border-none">Sincronizado</Badge>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-bold flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Timeline
                </h4>
                <div className="text-xs space-y-2 border-l-2 border-muted pl-4">
                  <div className="relative">
                    <div className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-primary" />
                    <p className="font-bold">Hoje às 10:00</p>
                    <p className="text-muted-foreground">Sincronização realizada com sucesso</p>
                  </div>
                  <div className="relative">
                    <div className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-muted-foreground" />
                    <p className="font-bold">Ontem às 15:30</p>
                    <p className="text-muted-foreground">Exportação de 150 contatos iniciada</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-lg border border-yellow-500/20 bg-yellow-500/5">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-yellow-600 dark:text-yellow-500">Notas de Sincronização</p>
                    <p className="text-xs text-yellow-700/80 dark:text-yellow-500/70">
                      Este grupo possui restrições de privacidade. Alguns membros podem não ser exportados.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <Button className="w-full" onClick={() => toast.success('Extração iniciada!')}>
                  <Download className="mr-2 h-4 w-4" />
                  Exportar Membros
                </Button>
                <Button variant="outline" className="w-full" onClick={() => toast.info('Atualizando lista...')}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Sincronizar Agora
                </Button>
                <Button variant="ghost" className="w-full text-xs" onClick={() => window.open('https://chat.whatsapp.com/example', '_blank')}>
                  <ExternalLink className="mr-2 h-3 w-3" />
                  Abrir no WhatsApp
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
