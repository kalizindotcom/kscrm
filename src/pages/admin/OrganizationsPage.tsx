import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Plus,
  Eye,
  Edit2,
  Ban,
  CheckCircle2,
  Trash2,
  Users,
  Activity,
} from 'lucide-react';
import { Card, CardContent, Button, Badge } from '../../components/ui/shared';
import { adminService } from '../../services/adminService';
import type { Organization, PaginatedResponse } from '../../types/admin';
import { toast } from 'sonner';
import { formatDate } from '../../lib/utils';
import { SearchBar } from '../../components/admin/SearchBar';
import { AnimatedCheckbox } from '../../components/admin/AnimatedCheckbox';
import { BulkActionsBar } from '../../components/admin/BulkActionsBar';
import { ConfirmDialog } from '../../components/admin/ConfirmDialog';
import { EmptyState } from '../../components/admin/EmptyState';
import { TableSkeleton } from '../../components/admin/SkeletonLoader';
import { ExportButton } from '../../components/admin/ExportButton';
import { motion } from 'framer-motion';

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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    action: 'suspend' | 'activate' | 'delete' | null;
    ids: string[];
  }>({ isOpen: false, action: null, ids: [] });
  const [actionLoading, setActionLoading] = useState(false);

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

  const handleSelectAll = (checked: boolean) => {
    if (checked && data) {
      setSelectedIds(new Set(data.items.map(org => org.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkAction = async () => {
    if (!confirmDialog.action) return;
    try {
      setActionLoading(true);
      const promises = confirmDialog.ids.map(id => {
        switch (confirmDialog.action) {
          case 'suspend':
            return adminService.suspendOrganization(id);
          case 'activate':
            return adminService.activateOrganization(id);
          case 'delete':
            return adminService.deleteOrganization(id);
          default:
            return Promise.resolve();
        }
      });
      await Promise.all(promises);
      toast.success(`${confirmDialog.ids.length} organização(ões) ${
        confirmDialog.action === 'suspend' ? 'suspensa(s)' :
        confirmDialog.action === 'activate' ? 'ativada(s)' : 'deletada(s)'
      }`);
      setSelectedIds(new Set());
      loadOrganizations();
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao executar ação');
    } finally {
      setActionLoading(false);
      setConfirmDialog({ isOpen: false, action: null, ids: [] });
    }
  };

  const allSelected = data?.items.length ? selectedIds.size === data.items.length : false;
  const someSelected = selectedIds.size > 0 && !allSelected;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold">Organizações</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie todos os clientes do sistema
          </p>
        </div>
        <div className="flex gap-2">
          <ExportButton
            data={data?.items || []}
            filename="organizations"
            headers={['Nome', 'Slug', 'Email', 'Plano', 'Status', 'Usuários', 'Sessões', 'Criada em']}
            mapRow={(org) => [
              org.name,
              org.slug,
              org.billingEmail,
              org.plan?.name || 'Sem plano',
              statusMap[org.status]?.label,
              `${org.currentUsers}/${org.maxUsers}`,
              `${org.currentSessions}/${org.maxSessions}`,
              formatDate(org.createdAt),
            ]}
          />
          <Button onClick={() => navigate('/admin/organizations/new')}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Organização
          </Button>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-3">
              <SearchBar
                value={search}
                onChange={setSearch}
                onSearch={handleSearch}
                placeholder="Buscar por nome, slug ou email..."
                className="flex-1"
              />
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
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <TableSkeleton rows={10} />
            ) : !data?.items.length ? (
              <EmptyState
                icon={Building2}
                title="Nenhuma organização encontrada"
                description="Comece criando sua primeira organização no sistema"
                actionLabel="Nova Organização"
                onAction={() => navigate('/admin/organizations/new')}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="text-left p-4 w-12">
                        <AnimatedCheckbox
                          checked={allSelected}
                          indeterminate={someSelected}
                          onChange={handleSelectAll}
                        />
                      </th>
                      <th className="text-left p-4 font-semibold">Organização</th>
                      <th className="text-left p-4 font-semibold">Plano</th>
                      <th className="text-left p-4 font-semibold">Status</th>
                      <th className="text-left p-4 font-semibold">Uso</th>
                      <th className="text-left p-4 font-semibold">Criada em</th>
                      <th className="text-right p-4 font-semibold">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((org, index) => (
                      <motion.tr
                        key={org.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="border-b hover:bg-muted/50 transition-colors"
                      >
                        <td className="p-4">
                          <AnimatedCheckbox
                            checked={selectedIds.has(org.id)}
                            onChange={(checked) => handleSelectOne(org.id, checked)}
                          />
                        </td>
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
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/admin/organizations/${org.id}/edit`)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Pagination */}
      {data && data.total > data.pageSize && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex items-center justify-between"
        >
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
        </motion.div>
      )}

      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedCount={selectedIds.size}
        totalCount={data?.total || 0}
        onClearSelection={() => setSelectedIds(new Set())}
        actions={[
          {
            label: 'Suspender',
            icon: Ban,
            onClick: () => setConfirmDialog({
              isOpen: true,
              action: 'suspend',
              ids: Array.from(selectedIds),
            }),
            variant: 'warning',
          },
          {
            label: 'Ativar',
            icon: CheckCircle2,
            onClick: () => setConfirmDialog({
              isOpen: true,
              action: 'activate',
              ids: Array.from(selectedIds),
            }),
            variant: 'success',
          },
          {
            label: 'Deletar',
            icon: Trash2,
            onClick: () => setConfirmDialog({
              isOpen: true,
              action: 'delete',
              ids: Array.from(selectedIds),
            }),
            variant: 'danger',
          },
        ]}
      />

      {/* Confirm Dialogs */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen && confirmDialog.action === 'suspend'}
        onClose={() => setConfirmDialog({ isOpen: false, action: null, ids: [] })}
        onConfirm={handleBulkAction}
        title={`Suspender ${confirmDialog.ids.length} organização(ões)`}
        description="Tem certeza que deseja suspender estas organizações? Os usuários não poderão acessar o sistema."
        confirmText="Suspender"
        variant="warning"
        loading={actionLoading}
      />

      <ConfirmDialog
        isOpen={confirmDialog.isOpen && confirmDialog.action === 'activate'}
        onClose={() => setConfirmDialog({ isOpen: false, action: null, ids: [] })}
        onConfirm={handleBulkAction}
        title={`Ativar ${confirmDialog.ids.length} organização(ões)`}
        description="Deseja reativar estas organizações? Os usuários voltarão a ter acesso."
        confirmText="Ativar"
        variant="success"
        loading={actionLoading}
      />

      <ConfirmDialog
        isOpen={confirmDialog.isOpen && confirmDialog.action === 'delete'}
        onClose={() => setConfirmDialog({ isOpen: false, action: null, ids: [] })}
        onConfirm={handleBulkAction}
        title={`Deletar ${confirmDialog.ids.length} organização(ões)`}
        description="ATENÇÃO: Esta ação é irreversível! Todos os dados das organizações serão permanentemente deletados."
        confirmText="Deletar Permanentemente"
        variant="danger"
        loading={actionLoading}
      />
    </div>
  );
};
