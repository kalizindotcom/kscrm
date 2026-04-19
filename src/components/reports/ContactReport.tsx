import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  UserPlus, 
  UserMinus, 
  FileText, 
  MessageSquare, 
  MessageCircle,
  Hash,
  CheckCircle2,
  XCircle,
  Tag,
  Clock,
  Ban,
  Download,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  User,
  Copy,
  Activity
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { reportsService, ContactMetrics } from '@/services/reportsService';
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const data = [
  { name: 'Seg', contatos: 40, mensagens: 2400 },
  { name: 'Ter', contatos: 30, mensagens: 1398 },
  { name: 'Qua', contatos: 20, mensagens: 9800 },
  { name: 'Qui', contatos: 27, mensagens: 3908 },
  { name: 'Sex', contatos: 18, mensagens: 4800 },
  { name: 'Sáb', contatos: 23, mensagens: 3800 },
  { name: 'Dom', contatos: 34, mensagens: 4300 },
];

export const ContactReport = ({ isLoading: globalLoading }: { isLoading: boolean }) => {
  const [metrics, setMetrics] = useState<ContactMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    setLoading(true);
    const data = await reportsService.getContactMetrics();
    setMetrics(data);
    setLoading(false);
  };

  if (loading || globalLoading || !metrics) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  const metricCards = [
    { label: 'Total de Contatos', value: metrics.totalContacts, icon: Users, color: 'text-primary' },
    { label: 'Novos Hoje', value: metrics.addedToday, icon: UserPlus, color: 'text-green-500', trend: '+12%' },
    { label: 'Deletados Hoje', value: metrics.deletedToday, icon: UserMinus, color: 'text-red-500', trend: '-2%' },
    { label: 'Arquivos Importados', value: metrics.totalFiles, icon: FileText, color: 'text-blue-500' },
    { label: 'Msgs Enviadas', value: metrics.messagesSent, icon: MessageSquare, color: 'text-purple-500' },
    { label: 'Msgs Recebidas', value: metrics.messagesReceived, icon: MessageCircle, color: 'text-indigo-500' },
    { label: 'Salvos Manualmente', value: metrics.manualContacts, icon: Hash, color: 'text-orange-500' },
    { label: 'Importados via Arquivo', value: metrics.importedViaFile, icon: FileText, color: 'text-cyan-500' },
  ];

  const secondaryMetrics = [
    { label: 'Duplicados Detectados', value: metrics.duplicatesDetected, icon: Copy, color: 'text-yellow-500' },
    { label: 'Números Inválidos', value: metrics.invalidNumbers, icon: XCircle, color: 'text-red-400' },
    { label: 'Números Válidos', value: metrics.validNumbers, icon: CheckCircle2, color: 'text-green-400' },
    { label: 'Com Nome', value: metrics.withName, icon: User, color: 'text-emerald-500' },
    { label: 'Sem Nome', value: metrics.withoutName, icon: User, color: 'text-slate-400' },
    { label: 'Com Tags', value: metrics.withTags, icon: Tag, color: 'text-violet-500' },
    { label: 'Sem Tags', value: metrics.withoutTags, icon: Tag, color: 'text-zinc-400' },
    { label: 'Ativos (30d)', value: metrics.activeLast30d, icon: Clock, color: 'text-teal-500' },
    { label: 'Inativos (60d+)', value: metrics.inactiveLongTime, icon: Clock, color: 'text-rose-400' },
    { label: 'Bloqueados', value: metrics.blocked, icon: Ban, color: 'text-red-600' },
  ];

  return (
    <div className="space-y-6">
      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {metricCards.map((card, i) => (
          <Card key={i} className="cursor-pointer hover:border-primary/50 transition-all group" onClick={() => setSelectedMetric(card.label)}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className={`p-2 rounded-lg bg-muted/50 ${card.color}`}>
                  <card.icon className="h-5 w-5" />
                </div>
                {card.trend && (
                  <Badge variant={card.trend.startsWith('+') ? 'default' : 'destructive'} className="text-[10px]">
                    {card.trend}
                  </Badge>
                )}
              </div>
              <div className="mt-4">
                <p className="text-sm font-medium text-muted-foreground group-hover:text-primary transition-colors">{card.label}</p>
                <h3 className="text-2xl font-bold">{card.value.toLocaleString()}</h3>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-card/30 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Crescimento de Contatos
            </CardTitle>
            <CardDescription>Evolução da base de dados nos últimos 7 dias</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorContatos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))' }}
                  itemStyle={{ color: 'hsl(var(--primary))' }}
                />
                <Area type="monotone" dataKey="contatos" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorContatos)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-card/30 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-500" />
              Volume de Mensagens
            </CardTitle>
            <CardDescription>Fluxo operacional diário</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                   contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))' }}
                />
                <Bar dataKey="mensagens" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Metrics Table/List */}
      <Card className="border-muted-foreground/10 bg-card/30 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Métricas Detalhadas</CardTitle>
          <CardDescription>Análise de qualidade e segmentação da base</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {secondaryMetrics.map((metric, i) => (
              <div key={i} className="p-4 rounded-lg border bg-muted/20 flex flex-col gap-2 hover:bg-muted/40 transition-colors cursor-pointer" onClick={() => setSelectedMetric(metric.label)}>
                <div className="flex items-center gap-2">
                  <metric.icon className={`h-4 w-4 ${metric.color}`} />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{metric.label}</span>
                </div>
                <div className="text-xl font-bold">{metric.value.toLocaleString()}</div>
                <div className="w-full bg-muted h-1 rounded-full overflow-hidden">
                  <div className={`h-full bg-current ${metric.color}`} style={{ width: `${metrics && metrics.totalContacts > 0 ? Math.min(100, Math.round((metric.value / metrics.totalContacts) * 100)) : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Drill-down Modal */}
      <Dialog open={!!selectedMetric} onOpenChange={() => setSelectedMetric(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Detalhes: {selectedMetric}</DialogTitle>
            <DialogDescription>
              Lista de contatos que compõem a métrica "{selectedMetric}"
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Filtrar nesta listagem..." className="pl-8" />
            </div>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Exportar Lista
            </Button>
          </div>

          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Última Interação</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[1, 2, 3, 4, 5].map((i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">Contato Exemplo {i}</TableCell>
                    <TableCell>551199999000{i}</TableCell>
                    <TableCell>Arquivo Importado</TableCell>
                    <TableCell>{new Date().toLocaleDateString()}</TableCell>
                    <TableCell><Badge variant="outline">Ativo</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// End of file
