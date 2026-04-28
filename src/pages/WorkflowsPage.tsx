import React, { useState, useEffect } from 'react';
import { Plus, Search, Play, Pause, Trash2, Eye, Zap, Activity, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardContent, Button, Badge } from '../components/ui/shared';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { workflowService, type Workflow, type CreateWorkflowData } from '../services/workflowService';
import { cn, formatDate } from '../lib/utils';

const statusConfig = {
  active: { label: 'Ativo', color: 'bg-green-500', icon: CheckCircle2 },
  inactive: { label: 'Inativo', color: 'bg-gray-500', icon: Pause },
  draft: { label: 'Rascunho', color: 'bg-blue-500', icon: Activity },
};

const triggerTypes = [
  { value: 'contact_created', label: 'Contato Criado' },
  { value: 'message_received', label: 'Mensagem Recebida' },
  { value: 'deal_stage_changed', label: 'Estágio do Deal Alterado' },
  { value: 'task_completed', label: 'Tarefa Concluída' },
  { value: 'campaign_completed', label: 'Campanha Concluída' },
];

const actionTypes = [
  { value: 'send_message', label: 'Enviar Mensagem' },
  { value: 'create_task', label: 'Criar Tarefa' },
  { value: 'update_contact', label: 'Atualizar Contato' },
  { value: 'webhook', label: 'Chamar Webhook' },
  { value: 'wait', label: 'Aguardar' },
];

export const WorkflowsPage: React.FC = () => {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);

  const [formData, setFormData] = useState<CreateWorkflowData>({
    name: '',
    description: '',
    status: 'draft',
    trigger: { type: 'contact_created' },
    actions: [{ type: 'send_message', config: {} }],
  });

  useEffect(() => {
    loadWorkflows();
  }, [selectedStatus]);

  const loadWorkflows = async () => {
    try {
      setLoading(true);
      const response = await workflowService.list({ status: selectedStatus || undefined });
      setWorkflows(response.items);
    } catch (error: any) {
      toast.error('Erro ao carregar workflows: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWorkflow = async () => {
    try {
      await workflowService.create(formData);
      toast.success('Workflow criado com sucesso!');
      setShowCreateModal(false);
      setFormData({
        name: '',
        description: '',
        status: 'draft',
        trigger: { type: 'contact_created' },
        actions: [{ type: 'send_message', config: {} }],
      });
      loadWorkflows();
    } catch (error: any) {
      toast.error('Erro ao criar workflow: ' + error.message);
    }
  };

  const handleToggleWorkflow = async (workflowId: string) => {
    try {
      await workflowService.toggle(workflowId);
      toast.success('Status do workflow alterado!');
      loadWorkflows();
    } catch (error: any) {
      toast.error('Erro ao alterar status: ' + error.message);
    }
  };

  const handleTestWorkflow = async (workflowId: string) => {
    try {
      const result = await workflowService.test(workflowId);
      toast.success(result.message);
    } catch (error: any) {
      toast.error('Erro ao testar workflow: ' + error.message);
    }
  };

  const handleDeleteWorkflow = async (workflowId: string) => {
    if (!confirm('Tem certeza que deseja excluir este workflow?')) return;
    try {
      await workflowService.delete(workflowId);
      toast.success('Workflow excluído com sucesso!');
      loadWorkflows();
    } catch (error: any) {
      toast.error('Erro ao excluir workflow: ' + error.message);
    }
  };

  const filteredWorkflows = workflows.filter((workflow) =>
    workflow.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Workflows & Automação</h1>
          <p className="text-muted-foreground">Automatize processos e ações</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Workflow
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{workflows.length}</p>
              </div>
              <Zap className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ativos</p>
                <p className="text-2xl font-bold">
                  {workflows.filter((w) => w.status === 'active').length}
                </p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Execuções</p>
                <p className="text-2xl font-bold">
                  {workflows.reduce((sum, w) => sum + w.executionCount, 0)}
                </p>
              </div>
              <Activity className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="Buscar workflows..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Todos os status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos os status</SelectItem>
            {Object.entries(statusConfig).map(([key, config]) => (
              <SelectItem key={key} value={key}>
                {config.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Workflows List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <p className="col-span-full text-center text-muted-foreground">Carregando...</p>
        ) : filteredWorkflows.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">Nenhum workflow encontrado</p>
            </CardContent>
          </Card>
        ) : (
          filteredWorkflows.map((workflow) => (
            <Card key={workflow.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold">{workflow.name}</h3>
                    {workflow.description && (
                      <p className="text-sm text-muted-foreground mt-1">{workflow.description}</p>
                    )}
                  </div>
                  <Badge className={statusConfig[workflow.status]?.color}>
                    {statusConfig[workflow.status]?.label}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Zap className="w-4 h-4 text-blue-500" />
                    <span className="text-muted-foreground">
                      Trigger: {triggerTypes.find((t) => t.value === workflow.trigger.type)?.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Activity className="w-4 h-4 text-purple-500" />
                    <span className="text-muted-foreground">
                      {workflow.actions.length} ações
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span className="text-muted-foreground">
                      {workflow.executionCount} execuções
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleWorkflow(workflow.id)}
                  >
                    {workflow.status === 'active' ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTestWorkflow(workflow.id)}
                  >
                    <Zap className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedWorkflow(workflow);
                      setShowDetailModal(true);
                    }}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteWorkflow(workflow.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Novo Workflow</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nome do workflow"
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição do workflow"
                rows={2}
              />
            </div>
            <div>
              <Label>Trigger (Gatilho)</Label>
              <Select
                value={formData.trigger.type}
                onValueChange={(value) =>
                  setFormData({ ...formData, trigger: { type: value } })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {triggerTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData({ ...formData, status: value as Workflow['status'] })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateWorkflow}>Criar Workflow</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Modal */}
      {selectedWorkflow && (
        <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{selectedWorkflow.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Descrição</Label>
                <p className="text-sm text-muted-foreground">
                  {selectedWorkflow.description || 'Sem descrição'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Status</Label>
                  <Badge className={statusConfig[selectedWorkflow.status]?.color}>
                    {statusConfig[selectedWorkflow.status]?.label}
                  </Badge>
                </div>
                <div>
                  <Label>Execuções</Label>
                  <p className="text-2xl font-bold">{selectedWorkflow.executionCount}</p>
                </div>
              </div>
              <div>
                <Label>Trigger</Label>
                <p className="text-sm">
                  {triggerTypes.find((t) => t.value === selectedWorkflow.trigger.type)?.label}
                </p>
              </div>
              <div>
                <Label>Ações ({selectedWorkflow.actions.length})</Label>
                <div className="space-y-2 mt-2">
                  {selectedWorkflow.actions.map((action, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-muted rounded">
                      <span className="text-sm font-medium">{idx + 1}.</span>
                      <span className="text-sm">
                        {actionTypes.find((a) => a.value === action.type)?.label}
                      </span>
                      {action.delay && (
                        <Badge variant="outline" className="text-xs">
                          Delay: {action.delay}s
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <Label>Criado em</Label>
                <p className="text-sm">{formatDate(selectedWorkflow.createdAt)}</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDetailModal(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
