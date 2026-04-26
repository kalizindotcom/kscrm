import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Plus,
  Eye,
  Edit2,
  Ban,
  Trash2,
  Shield,
  User,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, Button, Badge } from '../../components/ui/shared';
import { adminService } from '../../services/adminService';
import type { AdminUser, PaginatedResponse } from '../../types/admin';
import { toast } from 'sonner';
import { formatDate } from '../../lib/utils';
import { SearchBar } from '../../components/admin/SearchBar';
import { AnimatedCheckbox } from '../../components/admin/AnimatedCheckbox';
import { BulkActionsBar } from '../../components/admin/BulkActionsBar';
import { ConfirmDialog } from '../../components/admin/ConfirmDialog';
import { EmptyState } from '../../components/admin/EmptyState';
import { TableSkeleton } from '../../components/admin/SkeletonLoader';
import { ExportButton } from '../../components/admin/ExportButton';
import { CreateTrialUserModal } from '../../components/admin/CreateTrialUserModal';
import { TrialCredentialsModal } from '../../components/admin/TrialCredentialsModal';
import { motion } from 'framer-motion';

const roleMap: Record<string, { label: string; icon: any; color: string }> = {
  super_admin: { label: 'Super Admin', icon: Shield, color: 'text-red-500' },
  admin: { label: 'Admin', icon: Shield, color: 'text-blue-500' },
  user: { label: 'Usuário', icon: User, color: 'text-green-500' },
  viewer: { label: 'Visualizador', icon: Eye, color: 'text-gray-500' },
};

const statusMap: Record<string, { label: string; variant: any }> = {
  active: { label: 'Ativo', variant: 'success' },
  suspended: { label: 'Suspenso', variant: 'error' },
  invited: { label: 'Convidado', variant: 'warning' },
};

export const UsersPage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<PaginatedResponse<AdminUser> | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    action: 'suspend' | 'delete' | null;
    ids: string[];
  }>({ isOpen: false, action: null, ids: [] });
  const [actionLoading, setActionLoading] = useState(false);
  const [showTrialModal, setShowTrialModal] = useState(false);
  const [trialCredentials, setTrialCredentials] = useState<{
    name: string;
    email: string;
    password: string;
    expiresAt: string;
  } | null>(null);

  useEffect(() => {
    loadUsers();
  }, [page, roleFilter, statusFilter]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const result = await adminService.listUsers({
        search: search || undefined,
        role: roleFilter || undefined,
        status: statusFilter || undefined,
        page,
        pageSize: 20,
      });
      setData(result);
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadUsers();
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked && data) {
      setSelectedIds(new Set(data.items.map(user => user.id)));
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
            return adminService.suspendUser(id);
          case 'delete':
            return adminService.deleteUser(id);
          default:
            return Promise.resolve();
        }
      });
      await Promise.all(promises);
      toast.success(`${confirmDialog.ids.length} usuário(s) ${
        confirmDialog.action === 'suspend' ? 'suspenso(s)' : 'deletado(s)'
      }`);
      setSelectedIds(new Set());
      loadUsers();
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
          <h1 className="text-3xl font-bold">Usuários</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie todos os usuários do sistema
          </p>
        </div>
        <div className="flex gap-2">
          <ExportButton
            data={data?.items || []}
            filename="users"
            headers={['Nome', 'Email', 'Organização', 'Role', 'Status', 'Último Login', 'IP', 'Criado em']}
            mapRow={(user) => [
              user.name,
              user.email,
              user.organization?.name || 'Sistema',
              roleMap[user.role]?.label,
              statusMap[user.status]?.label,
              user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Nunca',
              user.lastLoginIp || '-',
              formatDate(user.createdAt),
            ]}
          />
          <Button onClick={() => navigate('/admin/users/new')}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Usuário
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
                placeholder="Buscar por nome ou email..."
                className="flex-1"
              />
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 rounded-lg border bg-background"
              >
                <option value="">Todas as roles</option>
                <option value="super_admin">Super Admin</option>
                <option value="admin">Admin</option>
                <option value="user">Usuário</option>
                <option value="viewer">Visualizador</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 rounded-lg border bg-background"
              >
                <option value="">Todos os status</option>
                <option value="active">Ativos</option>
                <option value="suspended">Suspensos</option>
                <option value="invited">Convidados</option>
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
                icon={Users}
                title="Nenhum usuário encontrado"
                description="Comece criando seu primeiro usuário no sistema"
                actionLabel="Novo Usuário"
                onAction={() => navigate('/admin/users/new')}
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
                      <th className="text-left p-4 font-semibold">Usuário</th>
                      <th className="text-left p-4 font-semibold">Organização</th>
                      <th className="text-left p-4 font-semibold">Role</th>
                      <th className="text-left p-4 font-semibold">Status</th>
                      <th className="text-left p-4 font-semibold">Último Login</th>
                      <th className="text-right p-4 font-semibold">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((user, index) => {
                      const roleInfo = roleMap[user.role];
                      const RoleIcon = roleInfo?.icon || User;
                      return (
                        <motion.tr
                          key={user.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="border-b hover:bg-muted/50 transition-colors"
                        >
                          <td className="p-4">
                            <AnimatedCheckbox
                              checked={selectedIds.has(user.id)}
                              onChange={(checked) => handleSelectOne(user.id, checked)}
                            />
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              {user.avatar ? (
                                <img
                                  src={user.avatar}
                                  alt={user.name}
                                  className="w-10 h-10 rounded-full"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                  <User className="w-5 h-5 text-primary" />
                                </div>
                              )}
                              <div>
                                <p className="font-semibold">{user.name}</p>
                                <p className="text-sm text-muted-foreground">{user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            {user.organization ? (
                              <div>
                                <p className="font-medium">{user.organization.name}</p>
                                <p className="text-sm text-muted-foreground">@{user.organization.slug}</p>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">Sistema</span>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <RoleIcon className={`w-4 h-4 ${roleInfo?.color}`} />
                              <span className="text-sm">{roleInfo?.label}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <Badge variant={statusMap[user.status]?.variant}>
                              {statusMap[user.status]?.label}
                            </Badge>
                          </td>
                          <td className="p-4">
                            {user.lastLoginAt ? (
                              <div className="text-sm">
                                <p>{formatDate(user.lastLoginAt)}</p>
                                {user.lastLoginIp && (
                                  <p className="text-xs text-muted-foreground">{user.lastLoginIp}</p>
                                )}
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">Nunca</span>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/admin/users/${user.id}`)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/admin/users/${user.id}/edit`)}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
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
            {Math.min(page * data.pageSize, data.total)} de {data.total} usuários
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
        title={`Suspender ${confirmDialog.ids.length} usuário(s)`}
        description="Tem certeza que deseja suspender estes usuários? Eles não poderão acessar o sistema."
        confirmText="Suspender"
        variant="warning"
        loading={actionLoading}
      />

      <ConfirmDialog
        isOpen={confirmDialog.isOpen && confirmDialog.action === 'delete'}
        onClose={() => setConfirmDialog({ isOpen: false, action: null, ids: [] })}
        onConfirm={handleBulkAction}
        title={`Deletar ${confirmDialog.ids.length} usuário(s)`}
        description="ATENÇÃO: Esta ação é irreversível! Todos os dados dos usuários serão permanentemente deletados."
        confirmText="Deletar Permanentemente"
        variant="danger"
        loading={actionLoading}
      />

      {/* Trial Modals */}
      <CreateTrialUserModal
        isOpen={showTrialModal}
        onClose={() => setShowTrialModal(false)}
        onSuccess={(credentials) => {
          setShowTrialModal(false);
          setTrialCredentials(credentials as any);
          loadUsers();
        }}
      />

      {trialCredentials && (
        <TrialCredentialsModal
          isOpen={!!trialCredentials}
          onClose={() => setTrialCredentials(null)}
          credentials={trialCredentials}
        />
      )}
    </div>
  );
};
