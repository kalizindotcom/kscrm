import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, MoreHorizontal, TrendingUp, DollarSign, Users, Target, Edit2, Trash2, Eye } from 'lucide-react';
import { Card, CardContent, Button, Badge } from '../components/ui/shared';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { dealService, type Deal, type CreateDealData } from '../services/dealService';
import { cn, formatDate } from '../lib/utils';

const stageConfig = {
  lead: { label: 'Lead', color: 'bg-gray-500', icon: Users },
  qualified: { label: 'Qualificado', color: 'bg-blue-500', icon: Target },
  proposal: { label: 'Proposta', color: 'bg-purple-500', icon: TrendingUp },
  negotiation: { label: 'Negociação', color: 'bg-orange-500', icon: DollarSign },
  won: { label: 'Ganho', color: 'bg-green-500', icon: TrendingUp },
  lost: { label: 'Perdido', color: 'bg-red-500', icon: TrendingUp },
};

const priorityConfig = {
  low: { label: 'Baixa', color: 'bg-gray-400' },
  medium: { label: 'Média', color: 'bg-blue-400' },
  high: { label: 'Alta', color: 'bg-orange-400' },
  urgent: { label: 'Urgente', color: 'bg-red-500' },
};

export const DealsPage: React.FC = () => {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStage, setSelectedStage] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [pipelineStats, setPipelineStats] = useState<any>(null);

  const [formData, setFormData] = useState<CreateDealData>({
    title: '',
    description: '',
    value: 0,
    stage: 'lead',
    priority: 'medium',
    probability: 0,
  });

  useEffect(() => {
    loadDeals();
    loadPipelineStats();
  }, [selectedStage]);

  const loadDeals = async () => {
    try {
      setLoading(true);
      const response = await dealService.list({ stage: selectedStage || undefined });
      setDeals(response.items);
    } catch (error: any) {
      toast.error('Erro ao carregar deals: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadPipelineStats = async () => {
    try {
      const stats = await dealService.getPipelineStats();
      setPipelineStats(stats);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const handleCreateDeal = async () => {
    try {
      await dealService.create(formData);
      toast.success('Deal criado com sucesso!');
      setShowCreateModal(false);
      setFormData({
        title: '',
        description: '',
        value: 0,
        stage: 'lead',
        priority: 'medium',
        probability: 0,
      });
      loadDeals();
      loadPipelineStats();
    } catch (error: any) {
      toast.error('Erro ao criar deal: ' + error.message);
    }
  };

  const handleMoveStage = async (dealId: string, newStage: Deal['stage']) => {
    try {
      await dealService.moveStage(dealId, newStage);
      toast.success('Deal movido com sucesso!');
      loadDeals();
      loadPipelineStats();
    } catch (error: any) {
      toast.error('Erro ao mover deal: ' + error.message);
    }
  };

  const handleDeleteDeal = async (dealId: string) => {
    if (!confirm('Tem certeza que deseja excluir este deal?')) return;
    try {
      await dealService.delete(dealId);
      toast.success('Deal excluído com sucesso!');
      loadDeals();
      loadPipelineStats();
    } catch (error: any) {
      toast.error('Erro ao excluir deal: ' + error.message);
    }
  };

  const filteredDeals = deals.filter((deal) =>
    deal.title.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const groupedDeals = Object.keys(stageConfig).reduce((acc, stage) => {
    acc[stage] = filteredDeals.filter((d) => d.stage === stage);
    return acc;
  }, {} as Record<string, Deal[]>);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pipeline de Vendas</h1>
          <p className="text-muted-foreground">Gerencie seus deals e oportunidades</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Deal
        </Button>
      </div>

      {/* Stats */}
      {pipelineStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {pipelineStats.stats.slice(0, 4).map((stat: any) => (
            <Card key={stat.stage}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stageConfig[stat.stage as keyof typeof stageConfig]?.label}</p>
                    <p className="text-2xl font-bold">{stat.count}</p>
                    <p className="text-xs text-muted-foreground">
                      R$ {stat.totalValue.toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <div className={cn('w-12 h-12 rounded-full flex items-center justify-center', stageConfig[stat.stage as keyof typeof stageConfig]?.color)}>
                    {React.createElement(stageConfig[stat.stage as keyof typeof stageConfig]?.icon, { className: 'w-6 h-6 text-white' })}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="Buscar deals..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
        <Select value={selectedStage} onValueChange={setSelectedStage}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Todos os estágios" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos os estágios</SelectItem>
            {Object.entries(stageConfig).map(([key, config]) => (
              <SelectItem key={key} value={key}>
                {config.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Object.entries(stageConfig).map(([stage, config]) => (
          <div key={stage} className="space-y-3">
            <div className="flex items-center gap-2">
              <div className={cn('w-3 h-3 rounded-full', config.color)} />
              <h3 className="font-semibold">{config.label}</h3>
              <Badge variant="outline">{groupedDeals[stage]?.length || 0}</Badge>
            </div>
            <div className="space-y-2">
              {groupedDeals[stage]?.map((deal) => (
                <Card key={deal.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-start justify-between">
                      <h4 className="font-medium text-sm">{deal.title}</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedDeal(deal);
                          setShowDetailModal(true);
                        }}
                      >
                        <Eye className="w-3 h-3" />
                      </Button>
                    </div>
                    {deal.value && (
                      <p className="text-lg font-bold text-green-600">
                        R$ {deal.value.toLocaleString('pt-BR')}
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={cn('text-xs', priorityConfig[deal.priority]?.color)}>
                        {priorityConfig[deal.priority]?.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{deal.probability}%</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Novo Deal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Nome do deal"
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detalhes do deal"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Valor (R$)</Label>
                <Input
                  type="number"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Probabilidade (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.probability}
                  onChange={(e) => setFormData({ ...formData, probability: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Estágio</Label>
                <Select
                  value={formData.stage}
                  onValueChange={(value) => setFormData({ ...formData, stage: value as Deal['stage'] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(stageConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Prioridade</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value as Deal['priority'] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(priorityConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateDeal}>Criar Deal</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Modal */}
      {selectedDeal && (
        <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{selectedDeal.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Valor</Label>
                  <p className="text-2xl font-bold text-green-600">
                    R$ {selectedDeal.value?.toLocaleString('pt-BR') || '0'}
                  </p>
                </div>
                <div>
                  <Label>Probabilidade</Label>
                  <p className="text-2xl font-bold">{selectedDeal.probability}%</p>
                </div>
              </div>
              <div>
                <Label>Descrição</Label>
                <p className="text-sm text-muted-foreground">{selectedDeal.description || 'Sem descrição'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Estágio</Label>
                  <Badge className={stageConfig[selectedDeal.stage]?.color}>
                    {stageConfig[selectedDeal.stage]?.label}
                  </Badge>
                </div>
                <div>
                  <Label>Prioridade</Label>
                  <Badge className={priorityConfig[selectedDeal.priority]?.color}>
                    {priorityConfig[selectedDeal.priority]?.label}
                  </Badge>
                </div>
              </div>
              <div>
                <Label>Criado em</Label>
                <p className="text-sm">{formatDate(selectedDeal.createdAt)}</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => handleDeleteDeal(selectedDeal.id)}>
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </Button>
              <Button onClick={() => setShowDetailModal(false)}>Fechar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
