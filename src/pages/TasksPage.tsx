import React, { useState, useEffect } from 'react';
import { Plus, Search, Calendar, CheckCircle2, Clock, AlertCircle, Phone, Mail, Users, Edit2, Trash2 } from 'lucide-react';
import { Card, CardContent, Button, Badge } from '../components/ui/shared';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { taskService, type Task, type CreateTaskData } from '../services/taskService';
import { cn, formatDate } from '../lib/utils';

const typeConfig = {
  task: { label: 'Tarefa', icon: CheckCircle2, color: 'bg-blue-500' },
  call: { label: 'Ligação', icon: Phone, color: 'bg-green-500' },
  email: { label: 'Email', icon: Mail, color: 'bg-purple-500' },
  meeting: { label: 'Reunião', icon: Users, color: 'bg-orange-500' },
  follow_up: { label: 'Follow-up', icon: Clock, color: 'bg-pink-500' },
};

const statusConfig = {
  pending: { label: 'Pendente', color: 'bg-gray-500' },
  in_progress: { label: 'Em Progresso', color: 'bg-blue-500' },
  completed: { label: 'Concluída', color: 'bg-green-500' },
  cancelled: { label: 'Cancelada', color: 'bg-red-500' },
};

const priorityConfig = {
  low: { label: 'Baixa', color: 'bg-gray-400' },
  medium: { label: 'Média', color: 'bg-blue-400' },
  high: { label: 'Alta', color: 'bg-orange-400' },
  urgent: { label: 'Urgente', color: 'bg-red-500' },
};

export const TasksPage: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [overdueCount, setOverdueCount] = useState(0);

  const [formData, setFormData] = useState<CreateTaskData>({
    title: '',
    description: '',
    type: 'task',
    status: 'pending',
    priority: 'medium',
  });

  useEffect(() => {
    loadTasks();
    loadOverdue();
  }, [selectedStatus, selectedType]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const response = await taskService.list({
        status: selectedStatus || undefined,
        type: selectedType || undefined,
      });
      setTasks(response.items);
    } catch (error: any) {
      toast.error('Erro ao carregar tarefas: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadOverdue = async () => {
    try {
      const response = await taskService.getOverdue();
      setOverdueCount(response.count);
    } catch (error) {
      console.error('Erro ao carregar tarefas atrasadas:', error);
    }
  };

  const handleCreateTask = async () => {
    try {
      await taskService.create(formData);
      toast.success('Tarefa criada com sucesso!');
      setShowCreateModal(false);
      setFormData({
        title: '',
        description: '',
        type: 'task',
        status: 'pending',
        priority: 'medium',
      });
      loadTasks();
    } catch (error: any) {
      toast.error('Erro ao criar tarefa: ' + error.message);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      await taskService.complete(taskId);
      toast.success('Tarefa concluída!');
      loadTasks();
      loadOverdue();
    } catch (error: any) {
      toast.error('Erro ao concluir tarefa: ' + error.message);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta tarefa?')) return;
    try {
      await taskService.delete(taskId);
      toast.success('Tarefa excluída com sucesso!');
      loadTasks();
    } catch (error: any) {
      toast.error('Erro ao excluir tarefa: ' + error.message);
    }
  };

  const filteredTasks = tasks.filter((task) =>
    task.title.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const isOverdue = (task: Task) => {
    if (!task.dueDate || task.status === 'completed') return false;
    return new Date(task.dueDate) < new Date();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tarefas</h1>
          <p className="text-muted-foreground">Gerencie suas tarefas e atividades</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Tarefa
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{tasks.length}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendentes</p>
                <p className="text-2xl font-bold">
                  {tasks.filter((t) => t.status === 'pending').length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Concluídas</p>
                <p className="text-2xl font-bold">
                  {tasks.filter((t) => t.status === 'completed').length}
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
                <p className="text-sm text-muted-foreground">Atrasadas</p>
                <p className="text-2xl font-bold text-red-500">{overdueCount}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="Buscar tarefas..."
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
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Todos os tipos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos os tipos</SelectItem>
            {Object.entries(typeConfig).map(([key, config]) => (
              <SelectItem key={key} value={key}>
                {config.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tasks List */}
      <div className="space-y-3">
        {loading ? (
          <p className="text-center text-muted-foreground">Carregando...</p>
        ) : filteredTasks.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">Nenhuma tarefa encontrada</p>
            </CardContent>
          </Card>
        ) : (
          filteredTasks.map((task) => (
            <Card key={task.id} className={cn('hover:shadow-md transition-shadow', isOverdue(task) && 'border-red-500')}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      {React.createElement(typeConfig[task.type]?.icon, {
                        className: cn('w-5 h-5', typeConfig[task.type]?.color.replace('bg-', 'text-')),
                      })}
                      <h3 className="font-semibold">{task.title}</h3>
                      {isOverdue(task) && (
                        <Badge variant="destructive" className="text-xs">
                          Atrasada
                        </Badge>
                      )}
                    </div>
                    {task.description && (
                      <p className="text-sm text-muted-foreground">{task.description}</p>
                    )}
                    <div className="flex items-center gap-3 flex-wrap">
                      <Badge variant="outline" className={statusConfig[task.status]?.color}>
                        {statusConfig[task.status]?.label}
                      </Badge>
                      <Badge variant="outline" className={priorityConfig[task.priority]?.color}>
                        {priorityConfig[task.priority]?.label}
                      </Badge>
                      <Badge variant="outline">{typeConfig[task.type]?.label}</Badge>
                      {task.dueDate && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {formatDate(task.dueDate)}
                        </div>
                      )}
                      {task.deal && (
                        <Badge variant="outline" className="text-xs">
                          Deal: {task.deal.title}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {task.status !== 'completed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCompleteTask(task.id)}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteTask(task.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
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
            <DialogTitle>Nova Tarefa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Nome da tarefa"
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detalhes da tarefa"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Tipo</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value as Task['type'] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(typeConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value as Task['status'] })}
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
              <div>
                <Label>Prioridade</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value as Task['priority'] })}
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
            <div>
              <Label>Data de Vencimento</Label>
              <Input
                type="datetime-local"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateTask}>Criar Tarefa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
