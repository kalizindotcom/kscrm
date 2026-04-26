import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Search,
  Plus,
  MoreHorizontal,
  Eye,
  Edit2,
  Ban,
  CheckCircle2,
  Trash2,
  Users,
  Activity,
} from 'lucide-react';
import { Card, CardContent, Button, Badge } from '../../components/ui/shared';
import { Input } from '../../components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../../components/ui/popover';
import { adminService } from '../../services/adminService';
import type { Organization, PaginatedResponse } from '../../types/admin';
import { toast } from 'sonner';
import { formatDate } from '../../lib/utils';

const statusMap: Record<string, { label: string; variant: any }> = {
  active: { label: 'Ativa', variant: 'success' },
  trial: { label: 'Trial', variant: 'warning' },
  suspended: { label: 'Suspensa', variant: 'error' },
  cancelled: { label: 'Cancelada', variant: 'outline' },
};

export const OrganizationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<PaginatedResponse<Organization> | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadOrganizations();
  }, [page, statusFilter]);

  const loadOrganizations = async () => {
    try {
      setLoading(true);
      const result = await adminService.listOrganizations({
        search: search || undefined,
        status: statusFilter || undefined,
        page,
        pageSize: 20,
      });
      setData(result);
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao carregar organizações');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadOrganizations();
  };

  const handleSuspend = async (id: string) => {
    if (!confirm('Tem certeza que deseja suspender esta organização?')) return;
    try {
      await adminService.suspendOrganization(id);
      toast.success('Organização suspensa');
      loadOrganizations();
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao suspender');
    }
  };

  const handleActivate = async (id: string) => {
    try {
      await adminService.activateOrganization(id);
      toast.success('Organização ativada');
      loadOrganizations();
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao ativar');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('ATENÇÃO: Isso irá deletar TODOS os dados desta organização. Confirma?')) return;
    try {
      await adminService.deleteOrganization(id);
      toast.success('Organização deletada');
      loadOrganizations();
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao deletar');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Organizações</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie todos os clientes do sistema
          </p>
        </div>
        <Button onClick={() => navigate('/admin/organizations/new')}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Organização
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 flex gap-2">
              <Input
                placeholder="Buscar por nome, slug ou email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1"
              />
              <Button onClick={handleSearch}>
                <Search className="w-4 h-4" />
              </Button>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-lg border bg-background"
            >
              <option value="">Todos os status</option>
              <option value="active">Ativas</option>
              <option value="trial">Trial</option>
              <option value="suspended">Suspensas</option>
              <option value="cancelled">Canceladas</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : !data?.items.length ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Building2 className="w-12 h-12 mb-4 opacity-50" />
              <p>Nenhuma organização encontrada</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-semibold">Organização</th>
                    <th className="text-left p-4 font-semibold">Plano</th>
                    <th className="text-left p-4 font-semibold">Status</th>
                    <th className="text-left p-4 font-semibold">Uso</th>
                    <th className="text-left p-4 font-semibold">Criada em</th>
                    <th className="text-right p-4 font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((org) => (
                    <tr key={org.id} className="border-b hover:bg-muted/50 transition-colors">
                      <td className="p-4">
                        <div>
                          <p className="font-semibold">{org.name}</p>
                          <p className="text-sm text-muted-foreground">@{org.slug}</p>
                          <p className="text-xs text-muted-foreground">{org.billingEmail}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        {org.plan ? (
                          <div>
                            <p className="font-medium">{org.plan.name}</p>
                            <p className="text-sm text-muted-foreground">
                              R$ {Number(org.plan.price).toFixed(2)}/{org.plan.interval === 'monthly' ? 'mês' : 'ano'}
                            </p>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Sem plano</span>
                        )}
                      </td>
                      <td className="p-4">
                        <Badge variant={statusMap[org.status]?.variant}>
                          {statusMap[org.status]?.label}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-2">
                            <Users className="w-3 h-3" />
                            <span>{org.currentUsers}/{org.maxUsers} usuários</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Activity className="w-3 h-3" />
                            <span>{org.currentSessions}/{org.maxSessions} sessões</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {formatDate(org.createdAt)}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/admin/organizations/${org.id}`)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-48 p-2">
                              <div className="space-y-1">
                                <button
                                  onClick={() => navigate(`/admin/organizations/${org.id}/edit`)}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted rounded"
                                >
                                  <Edit2 className="w-4 h-4" />
                                  Editar
                                </button>
                                {org.status === 'suspended' ? (
                                  <button
                                    onClick={() => handleActivate(org.id)}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted rounded text-green-600"
                                  >
                                    <CheckCircle2 className="w-4 h-4" />
                                    Ativar
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleSuspend(org.id)}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted rounded text-yellow-600"
                                  >
                                    <Ban className="w-4 h-4" />
                                    Suspender
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDelete(org.id)}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted rounded text-red-600"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Deletar
                                </button>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {data && data.total > data.pageSize && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {(page - 1) * data.pageSize + 1} a{' '}
            {Math.min(page * data.pageSize, data.total)} de {data.total} organizações
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page * data.pageSize >= data.total}
              onClick={() => setPage(page + 1)}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
