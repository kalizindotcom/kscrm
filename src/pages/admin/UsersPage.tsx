import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  Plus,
  MoreHorizontal,
  Eye,
  Edit2,
  Ban,
  Trash2,
  Shield,
  User,
  Clock,
} from 'lucide-react';
import { Card, CardContent, Button, Badge } from '../../components/ui/shared';
import { Input } from '../../components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../../components/ui/popover';
import { adminService } from '../../services/adminService';
import type { AdminUser, PaginatedResponse } from '../../types/admin';
import { toast } from 'sonner';
import { formatDate } from '../../lib/utils';

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

  const handleSuspend = async (id: string) => {
    if (!confirm('Tem certeza que deseja suspender este usuário?')) return;
    try {
      await adminService.suspendUser(id);
      toast.success('Usuário suspenso');
      loadUsers();
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao suspender');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('ATENÇÃO: Isso irá deletar TODOS os dados deste usuário. Confirma?')) return;
    try {
      await adminService.deleteUser(id);
      toast.success('Usuário deletado');
      loadUsers();
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao deletar');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Usuários</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie todos os usuários do sistema
          </p>
        </div>
        <Button onClick={() => navigate('/admin/users/new')}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Usuário
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 flex gap-2">
              <Input
                placeholder="Buscar por nome ou email..."
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

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : !data?.items.length ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Users className="w-12 h-12 mb-4 opacity-50" />
              <p>Nenhum usuário encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-semibold">Usuário</th>
                    <th className="text-left p-4 font-semibold">Organização</th>
                    <th className="text-left p-4 font-semibold">Role</th>
                    <th className="text-left p-4 font-semibold">Status</th>
                    <th className="text-left p-4 font-semibold">Último Login</th>
                    <th className="text-right p-4 font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((user) => {
                    const roleInfo = roleMap[user.role];
                    const RoleIcon = roleInfo?.icon || User;
                    return (
                      <tr key={user.id} className="border-b hover:bg-muted/50 transition-colors">
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
                          <div>
                            <p className="font-medium">{user.organization.name}</p>
                            <p className="text-sm text-muted-foreground">@{user.organization.slug}</p>
                          </div>
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
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-48 p-2">
                                <div className="space-y-1">
                                  <button
                                    onClick={() => navigate(`/admin/users/${user.id}/edit`)}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted rounded"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                    Editar
                                  </button>
                                  <button
                                    onClick={() => navigate(`/admin/users/${user.id}/activity`)}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted rounded"
                                  >
                                    <Clock className="w-4 h-4" />
                                    Ver Atividade
                                  </button>
                                  {user.status !== 'suspended' && (
                                    <button
                                      onClick={() => handleSuspend(user.id)}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted rounded text-yellow-600"
                                    >
                                      <Ban className="w-4 h-4" />
                                      Suspender
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleDelete(user.id)}
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
                    );
                  })}
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
        </div>
      )}
    </div>
  );
};
