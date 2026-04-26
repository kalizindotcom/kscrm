import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Smartphone,
  Eye,
  Power,
  Trash2,
  Users,
  Building2,
  User,
} from 'lucide-react';
import { Card, CardContent, Button, Badge } from '../../components/ui/shared';
import { adminService } from '../../services/adminService';
import type { PaginatedResponse } from '../../types/admin';
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

interface AdminSession {
  id: string;
  name: string;
  status: string;
  phoneNumber?: string;
  user: {
    id: string;
    name: string;
    email: string;
    organization: {
      id: string;
      name: string;
      slug: string;
    };
  };
  groups: Array<{
    id: string;
    name: string;
    memberCount: number;
    isAdmin: boolean;
  }>;
  _count: {
    conversations: number;
    logs: number;
  };
  createdAt: string;
}

const statusMap: Record<string, { label: string; variant: any }> = {
  connected: { label: 'Conectada', variant: 'success' },
  disconnected: { label: 'Desconectada', variant: 'error' },
  connecting: { label: 'Conectando', variant: 'warning' },
  qr: { label: 'Aguardando QR', variant: 'outline' },
  timeout: { label: 'Timeout', variant: 'error' },
};

export const SessionsPage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<PaginatedResponse<AdminSession> | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [organizationFilter, setOrganizationFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    action: 'disconnect' | 'delete' | null;
    ids: string[];
  }>({ isOpen: false, action: null, ids: [] });
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadSessions();
  }, [page, statusFilter, organizationFilter]);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const result = await adminService.getAllSessions({
        organizationId: organizationFilter || undefined,
        status: statusFilter || undefined,
        page,
        pageSize: 20,
      });
      setData(result);
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao carregar sessões');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadSessions();
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked && data) {
      setSelectedIds(new Set(data.items.map(session => session.id)));
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
          case 'disconnect':
            // TODO: Implement disconnect endpoint
            return Promise.resolve();
          case 'delete':
            // TODO: Implement delete endpoint
            return Promise.resolve();
          default:
            return Promise.resolve();
        }
      });
      await Promise.all(promises);
      toast.success(`${confirmDialog.ids.length} sessão(ões) ${
        confirmDialog.action === 'disconnect' ? 'desconectada(s)' : 'deletada(s)'
      }`);
      setSelectedIds(new Set());
      loadSessions();
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
          <h1 className="text-3xl font-bold">Sessões</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie todas as sessões do WhatsApp no sistema
          </p>
        </div>
        <div className="flex gap-2">
          <ExportButton
            data={data?.items || []}
            filename="sessions"
            headers={['Nome', 'Telefone', 'Usuário', 'Organização', 'Status', 'Grupos', 'Criada em']}
            mapRow={(session) => [
              session.name,
              session.phoneNumber || 'N/A',
              session.user.name,
              session.user.organization.name,
              statusMap[session.status]?.label || session.status,
              session.groups.length.toString(),
              formatDate(session.createdAt),
            ]}
          />
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
                placeholder="Buscar por nome, telefone ou usuário..."
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
                <option value="connected">Conectadas</option>
                <option value="disconnected">Desconectadas</option>
                <option value="connecting">Conectando</option>
                <option value="qr">Aguardando QR</option>
                <option value="timeout">Timeout</option>
              </select>
              <input
                type="text"
                value={organizationFilter}
                onChange={(e) => {
                  setOrganizationFilter(e.target.value);
                  setPage(1);
                }}
                placeholder="Filtrar por organização..."
                className="px-3 py-2 rounded-lg border bg-background"
              />
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
                icon={Smartphone}
                title="Nenhuma sessão encontrada"
                description="Não há sessões cadastradas no sistema"
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
                      <th className="text-left p-4 font-semibold">Nome</th>
                      <th className="text-left p-4 font-semibold">Telefone</th>
                      <th className="text-left p-4 font-semibold">Usuário</th>
                      <th className="text-left p-4 font-semibold">Organização</th>
                      <th className="text-left p-4 font-semibold">Status</th>
                      <th className="text-left p-4 font-semibold">Grupos</th>
                      <th className="text-left p-4 font-semibold">Criada em</th>
                      <th className="text-right p-4 font-semibold">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((session, index) => (
                      <motion.tr
                        key={session.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="border-b hover:bg-muted/50 transition-colors"
                      >
                        <td className="p-4">
                          <AnimatedCheckbox
                            checked={selectedIds.has(session.id)}
                            onChange={(checked) => handleSelectOne(session.id, checked)}
                          />
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Smartphone className="w-4 h-4 text-muted-foreground" />
                            <span className="font-semibold">{session.name}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="text-sm text-muted-foreground">
                            {session.phoneNumber || 'N/A'}
                          </span>
                        </td>
                        <td className="p-4">
                          <div>
                            <p className="font-medium flex items-center gap-2">
                              <User className="w-3 h-3" />
                              {session.user.name}
                            </p>
                            <p className="text-xs text-muted-foreground">{session.user.email}</p>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-3 h-3 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{session.user.organization.name}</p>
                              <p className="text-xs text-muted-foreground">
                                @{session.user.organization.slug}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge variant={statusMap[session.status]?.variant || 'outline'}>
                            {statusMap[session.status]?.label || session.status}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2 text-sm">
                            <Users className="w-3 h-3" />
                            <span>{session.groups.length} grupos</span>
                          </div>
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {formatDate(session.createdAt)}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/admin/sessions/${session.id}`)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {session.status === 'connected' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setConfirmDialog({
                                  isOpen: true,
                                  action: 'disconnect',
                                  ids: [session.id],
                                })}
                              >
                                <Power className="w-4 h-4" />
                              </Button>
                            )}
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
            {Math.min(page * data.pageSize, data.total)} de {data.total} sessões
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
            label: 'Desconectar',
            icon: Power,
            onClick: () => setConfirmDialog({
              isOpen: true,
              action: 'disconnect',
              ids: Array.from(selectedIds),
            }),
            variant: 'warning',
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
        isOpen={confirmDialog.isOpen && confirmDialog.action === 'disconnect'}
        onClose={() => setConfirmDialog({ isOpen: false, action: null, ids: [] })}
        onConfirm={handleBulkAction}
        title={`Desconectar ${confirmDialog.ids.length} sessão(ões)`}
        description="Tem certeza que deseja desconectar estas sessões? Elas precisarão ser reconectadas manualmente."
        confirmText="Desconectar"
        variant="warning"
        loading={actionLoading}
      />

      <ConfirmDialog
        isOpen={confirmDialog.isOpen && confirmDialog.action === 'delete'}
        onClose={() => setConfirmDialog({ isOpen: false, action: null, ids: [] })}
        onConfirm={handleBulkAction}
        title={`Deletar ${confirmDialog.ids.length} sessão(ões)`}
        description="ATENÇÃO: Esta ação é irreversível! Todas as conversas e dados das sessões serão permanentemente deletados."
        confirmText="Deletar Permanentemente"
        variant="danger"
        loading={actionLoading}
      />
    </div>
  );
};
