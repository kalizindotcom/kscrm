import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Search, 
  Filter, 
  Download, 
  Eye, 
  History, 
  CheckCircle2, 
  XCircle, 
  Clock,
  MoreVertical,
  Copy,
  RotateCcw,
  Send
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { reportsService, DetailedCampaign, CampaignLog } from '@/services/reportsService';
import { toast } from 'sonner';
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const CampaignReport = ({ isLoading: globalLoading }: { isLoading: boolean }) => {
  const [campaigns, setCampaigns] = useState<DetailedCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState<DetailedCampaign | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isLogsOpen, setIsLogsOpen] = useState(false);

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    setLoading(true);
    try {
      const data = await reportsService.getCampaigns();
      setCampaigns(data);
    } catch (error) {
      toast.error('Erro ao carregar campanhas');
    } finally {
      setLoading(false);
    }
  };

  const filteredCampaigns = campaigns.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleExport = () => {
    reportsService.exportCSV(campaigns, 'relatorio-campanhas');
    toast.success('Relatório exportado com sucesso');
  };

  const handleViewDetails = (campaign: DetailedCampaign) => {
    setSelectedCampaign(campaign);
    setIsDetailOpen(true);
  };

  const handleViewLogs = (campaign: DetailedCampaign) => {
    setSelectedCampaign(campaign);
    setIsLogsOpen(true);
  };

  const handleReSend = (campaign: DetailedCampaign) => {
    toast.promise(new Promise(r => setTimeout(r, 1000)), {
      loading: 'Preparando reenvio...',
      success: 'Reenvio agendado com sucesso!',
      error: 'Erro ao agendar reenvio'
    });
  };

  const handleDuplicate = (campaign: DetailedCampaign) => {
    toast.success('Campanha duplicada com sucesso!');
  };

  if (loading || globalLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Envios</CardTitle>
            <History className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaigns.reduce((acc, c) => acc + c.sentCount, 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">+12% em relação ao mês anterior</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-green-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sucesso Global</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">96.8%</div>
            <p className="text-xs text-muted-foreground">Média de entrega em 30 dias</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-red-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Falhas Críticas</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">2.1%</div>
            <p className="text-xs text-muted-foreground">Números inválidos ou sessões</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-blue-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8m 42s</div>
            <p className="text-xs text-muted-foreground">Tempo médio de processamento</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="border-muted-foreground/10 bg-card/30 backdrop-blur-sm">
        <CardHeader>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <CardTitle>Histórico de Campanhas</CardTitle>
              <CardDescription>Analise o desempenho detalhado de cada disparo realizado.</CardDescription>
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar campanha..."
                  className="pl-8"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                Exportar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campanha</TableHead>
                <TableHead>Data de Envio</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Sucesso</TableHead>
                <TableHead className="text-right">Falha</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCampaigns.map((campaign) => (
                <TableRow key={campaign.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>{campaign.name}</span>
                      <span className="text-xs text-muted-foreground">{campaign.responsibleUser} • {campaign.origin}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{new Date(campaign.createdAt).toLocaleDateString()}</span>
                      <span className="text-xs text-muted-foreground">{new Date(campaign.createdAt).toLocaleTimeString()}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={campaign.status === 'completed' ? 'default' : 'secondary'}>
                      {campaign.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">{campaign.sentCount}</TableCell>
                  <TableCell className="text-right font-mono text-green-500">
                    {campaign.deliveredCount}
                    <div className="text-[10px] text-muted-foreground">
                      {((campaign.deliveredCount / campaign.sentCount) * 100).toFixed(1)}%
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-red-500">
                    {campaign.failedCount}
                    <div className="text-[10px] text-muted-foreground">
                      {((campaign.failedCount / campaign.sentCount) * 100).toFixed(1)}%
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleViewDetails(campaign)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleViewLogs(campaign)}>
                        <History className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleReSend(campaign)}>
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Send className="h-6 w-6 text-primary" />
              Detalhes da Campanha
            </DialogTitle>
            <DialogDescription>
              Resumo operacional completo de {selectedCampaign?.name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedCampaign && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4">
              <div className="md:col-span-2 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Status</p>
                    <Badge variant="default" className="w-fit">{selectedCampaign.status}</Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Data de Envio</p>
                    <p>{new Date(selectedCampaign.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Responsável</p>
                    <p>{selectedCampaign.responsibleUser}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Tempo Total</p>
                    <p>{selectedCampaign.totalProcessingTime}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Progresso de Entrega</span>
                    <span className="text-muted-foreground">
                      {selectedCampaign.deliveredCount} de {selectedCampaign.sentCount}
                    </span>
                  </div>
                  <Progress value={(selectedCampaign.deliveredCount / selectedCampaign.sentCount) * 100} className="h-2" />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Início: {new Date(selectedCampaign.createdAt).toLocaleTimeString()}</span>
                    <span>Término: {new Date(selectedCampaign.updatedAt).toLocaleTimeString()}</span>
                  </div>
                </div>

                <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                  <h4 className="text-sm font-bold flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    Preview do Conteúdo
                  </h4>
                  <div className="text-sm bg-background/50 p-3 rounded border font-mono">
                    Olá [nome], confira nossa nova promoção de verão! Use o cupom VERAO2023.
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-[10px]">Variáveis: [nome]</Badge>
                    <Badge variant="outline" className="text-[10px]">Mídia: Nenhuma</Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <Card className="bg-muted/20 border-none shadow-none">
                  <CardHeader className="p-4">
                    <CardTitle className="text-sm">Distribuição</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-green-500" />
                        <span className="text-xs">Entregues</span>
                      </div>
                      <span className="text-xs font-bold">{selectedCampaign.deliveredCount}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-red-500" />
                        <span className="text-xs">Falhas</span>
                      </div>
                      <span className="text-xs font-bold">{selectedCampaign.failedCount}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-blue-500" />
                        <span className="text-xs">Respostas</span>
                      </div>
                      <span className="text-xs font-bold">{selectedCampaign.responseCount}</span>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-2">
                  <Button className="w-full" onClick={() => handleDuplicate(selectedCampaign)}>
                    <Copy className="mr-2 h-4 w-4" />
                    Duplicar Campanha
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => handleReSend(selectedCampaign)}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reenviar Erros
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Logs Modal */}
      <Dialog open={isLogsOpen} onOpenChange={setIsLogsOpen}>
        <DialogContent className="max-w-5xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Logs de Eventos - {selectedCampaign?.name}
            </DialogTitle>
            <DialogDescription>
              Acompanhamento em tempo real e histórico de envios
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-4 py-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Filtrar logs por contato ou número..." className="pl-8" />
            </div>
            <Tabs defaultValue="all" className="w-auto">
              <TabsList>
                <TabsTrigger value="all" className="text-xs">Todos</TabsTrigger>
                <TabsTrigger value="success" className="text-xs text-green-500">Sucesso</TabsTrigger>
                <TabsTrigger value="failed" className="text-xs text-red-500">Falhas</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <ScrollArea className="flex-1 border rounded-md bg-muted/10">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                <TableRow>
                  <TableHead>Horário</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Número</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Detalhes/Erro</TableHead>
                  <TableHead>Evento ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedCampaign?.logs.map((log) => (
                  <TableRow key={log.id} className="text-xs">
                    <TableCell className="font-mono">{new Date(log.sentAt).toLocaleTimeString()}</TableCell>
                    <TableCell className="font-medium">{log.contactName}</TableCell>
                    <TableCell className="font-mono">{log.phone}</TableCell>
                    <TableCell>
                      <Badge variant={log.status === 'success' ? 'secondary' : 'destructive'} className="text-[10px]">
                        {log.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {log.errorMessage || 'Envio processado'}
                    </TableCell>
                    <TableCell className="font-mono text-muted-foreground">{log.id.split('-').pop()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
          
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => reportsService.exportCSV(selectedCampaign?.logs || [], `logs-${selectedCampaign?.id}`)}>
              <Download className="mr-2 h-4 w-4" />
              Exportar Logs
            </Button>
            <Button onClick={() => setIsLogsOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
