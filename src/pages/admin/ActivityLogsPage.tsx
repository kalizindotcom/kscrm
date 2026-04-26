import React, { useEffect, useState } from 'react';
import {
  Activity,
  Search,
  Filter,
  Download,
  Eye,
  User,
  Building2,
} from 'lucide-react';
import { Card, CardContent, Button, Badge } from '../../components/ui/shared';
import { Input } from '../../components/ui/input';
import { adminService } from '../../services/adminService';
import type { ActivityLog, PaginatedResponse } from '../../types/admin';
import { toast } from 'sonner';
import { formatDate } from '../../lib/utils';

const actionColorMap: Record<string, string> = {
  login: 'text-green-600',
  logout: 'text-gray-600',
  create: 'text-blue-600',
  update: 'text-yellow-600',
  delete: 'text-red-600',
  suspend: 'text-orange-600',
  activate: 'text-green-600',
};

export const ActivityLogsPage: React.FC = () => {
  const [data, setData] = useState<PaginatedResponse<ActivityLog> | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    organizationId: '',
    userId: '',
    action: '',
    module: '',
  });
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadLogs();
  }, [page]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const result = await adminService.getActivity({
        organizationId: filters.organizationId || undefined,
        userId: filters.userId || undefined,
        action: filters.action || undefined,
        module: filters.module || undefined,
        page,
        pageSize: 50,
      });
      setData(result);
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao carregar logs');
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => {
    setPage(1);
    loadLogs();
  };

  const handleExport = () => {
    if (!data?.items.length) {
      toast.error('Nenhum log para exportar');
      return;
    }

    const csv = [
      ['Data/Hora', 'Organização', 'Usuário', 'Ação', 'Módulo', 'Recurso', 'IP', 'User Agent'].join(','),
      ...data.items.map((log) =>
        [
          log.timestamp,
          log.organization?.name || '',
          log.user?.email || '',
          log.action,
          log.module,
          log.resource || '',
          log.ipAddress || '',
          log.userAgent || '',
        ]
          .map((v) => `"${v}"`)
          .join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Logs exportados');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Logs de Atividade</h1>
          <p className="text-muted-foreground mt-1">
            Histórico completo de ações no sistema
          </p>
        </div>
        <Button onClick={handleExport} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Input
              placeholder="ID da Organização"
              value={filters.organizationId}
              onChange={(e) => setFilters({ ...filters, organizationId: e.target.value })}
            />
            <Input
              placeholder="ID do Usuário"
              value={filters.userId}
              onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
            />
            <select
              value={filters.action}
              onChange={(e) => setFilters({ ...filters, action: e.target.value })}
              className="px-3 py-2 rounded-lg border bg-background"
            >
              <option value="">Todas as ações</option>
              <option value="login">Login</option>
              <option value="logout">Logout</option>
              <option value="create">Criar</option>
              <option value="update">Atualizar</option>
              <option value="delete">Deletar</option>
              <option value="suspend">Suspender</option>
              <option value="activate">Ativar</option>
            </select>
            <select
              value={filters.module}
              onChange={(e) => setFilters({ ...filters, module: e.target.value })}
              className="px-3 py-2 rounded-lg border bg-background"
            >
              <option value="">Todos os módulos</option>
              <option value="auth">Auth</option>
              <option value="sessions">Sessões</option>
              <option value="campaigns">Campanhas</option>
              <option value="contacts">Contatos</option>
              <option value="messages">Mensagens</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex justify-end mt-3">
            <Button onClick={handleFilter}>
              <Filter className="w-4 h-4 mr-2" />
              Filtrar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : !data?.items.length ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Activity className="w-12 h-12 mb-4 opacity-50" />
              <p>Nenhum log encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-semibold">Data/Hora</th>
                    <th className="text-left p-4 font-semibold">Organização</th>
                    <th className="text-left p-4 font-semibold">Usuário</th>
                    <th className="text-left p-4 font-semibold">Ação</th>
                    <th className="text-left p-4 font-semibold">Módulo</th>
                    <th className="text-left p-4 font-semibold">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((log) => (
                    <tr key={log.id} className="border-b hover:bg-muted/50 transition-colors">
                      <td className="p-4 text-sm">
                        {formatDate(log.timestamp)}
                      </td>
                      <td className="p-4">
                        {log.organization ? (
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">{log.organization.name}</p>
                              <p className="text-xs text-muted-foreground">@{log.organization.slug}</p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-4">
                        {log.user ? (
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">{log.user.name}</p>
                              <p className="text-xs text-muted-foreground">{log.user.email}</p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Sistema</span>
                        )}
                      </td>
                      <td className="p-4">
                        <Badge
                          variant="outline"
                          className={actionColorMap[log.action] || 'text-gray-600'}
                        >
                          {log.action}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <span className="text-sm font-medium">{log.module}</span>
                        {log.resource && (
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {log.resource}
                          </p>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="text-sm">
                          <p>{log.ipAddress || '-'}</p>
                          {log.userAgent && (
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {log.userAgent}
                            </p>
                          )}
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
            {Math.min(page * data.pageSize, data.total)} de {data.total} logs
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
