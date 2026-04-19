import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  BarChart3, 
  Users, 
  Send, 
  Link2, 
  Filter, 
  Download, 
  RefreshCw,
  Search,
  ChevronRight,
  Info,
  Layers,
  Activity,
  Calendar
} from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { GlowProgressBar } from '@/components/ui/GlowProgressBar';
import { CampaignReport } from '@/components/reports/CampaignReport';
import { ContactReport } from '@/components/reports/ContactReport';
import { ConnectorReport } from '@/components/reports/ConnectorReport';
import { GroupReport } from '@/components/reports/GroupReport';
import { toast } from 'sonner';

const ReportsPage = () => {
  const [activeTab, setActiveTab] = useState('campaigns');
  const [isLoading, setIsLoading] = useState(false);
  const [dateRange, setDateRange] = useState('7d');

  const handleRefresh = async () => {
    setIsLoading(true);
    // Simulate loading
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsLoading(false);
    toast.success('Dados atualizados com sucesso');
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <GlowProgressBar isAnimating={isLoading} />
      
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 sm:gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
            Relatórios Avançados
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Visão analítica e operacional completa do seu sistema.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <div className="flex flex-wrap items-center bg-muted/50 border rounded-lg p-1 w-full sm:w-auto">
            <Button 
              variant={dateRange === '7d' ? 'secondary' : 'ghost'} 
              size="sm" 
              onClick={() => setDateRange('7d')}
              className="flex-1 sm:flex-none h-8 text-[10px] sm:text-xs"
            >
              7 Dias
            </Button>
            <Button 
              variant={dateRange === '30d' ? 'secondary' : 'ghost'} 
              size="sm" 
              onClick={() => setDateRange('30d')}
              className="flex-1 sm:flex-none h-8 text-[10px] sm:text-xs"
            >
              30 Dias
            </Button>
            <Button 
              variant={dateRange === 'custom' ? 'secondary' : 'ghost'} 
              size="sm" 
              onClick={() => setDateRange('custom')}
              className="flex-1 sm:flex-none h-8 text-[10px] sm:text-xs"
            >
              <Calendar className="mr-1 sm:mr-2 h-3 w-3" />
              Custom
            </Button>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button onClick={handleRefresh} disabled={isLoading} size="sm" className="flex-1 sm:flex-none h-9 text-xs">
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Sincronizar
            </Button>
            <Button variant="outline" size="sm" className="flex-1 sm:flex-none h-9 text-xs">
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="campaigns" className="space-y-4" onValueChange={setActiveTab}>
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-2 border-b overflow-x-auto custom-scrollbar">
          <TabsList className="bg-muted/50 p-1 w-full sm:w-auto inline-flex whitespace-nowrap">
            <TabsTrigger value="campaigns" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Send className="mr-2 h-4 w-4" />
              Campanhas
            </TabsTrigger>
            <TabsTrigger value="contacts" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Users className="mr-2 h-4 w-4" />
              Contatos
            </TabsTrigger>
            <TabsTrigger value="connectors" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Link2 className="mr-2 h-4 w-4" />
              Sessões & Conectores
            </TabsTrigger>
            <TabsTrigger value="groups" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Layers className="mr-2 h-4 w-4" />
              Grupos
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="campaigns" className="space-y-4 outline-none">
          <CampaignReport isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="contacts" className="space-y-4 outline-none">
          <ContactReport isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="connectors" className="space-y-4 outline-none">
          <ConnectorReport isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="groups" className="space-y-4 outline-none">
          <GroupReport isLoading={isLoading} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReportsPage;
