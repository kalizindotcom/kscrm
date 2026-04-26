import React, { useEffect, useState } from 'react';
import {
  Activity,
  Filter,
  Eye,
  User,
  Building2,
} from 'lucide-react';
import { Card, CardContent, Button, Badge } from '../../components/ui/shared';
import { adminService } from '../../services/adminService';
import type { ActivityLog, PaginatedResponse } from '../../types/admin';
import { toast } from 'sonner';
import { formatDate } from '../../lib/utils';
import { SearchBar } from '../../components/admin/SearchBar';
import { EmptyState } from '../../components/admin/EmptyState';
import { TableSkeleton } from '../../components/admin/SkeletonLoader';
import { ExportButton } from '../../components/admin/ExportButton';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    organizationId: '',
    userId: '',
    action: '',
    module: '',
  });
  const [showFilters, setShowFilters] = useState(false);
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

  const handleSearch = () => {
    setPage(1);
    loadLogs();
  };

  const handleFilter = () => {
    setPage(1);
    loadLogs();
  };

  const handleClearFilters = () => {
    setFilters({
      organizationId: '',
      userId: '',
      action: '',
      module: '',
    });
    setSearch('');
    setPage(1);
    setTimeout(loadLogs, 100);
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
        <ExportButton
          data={data?.items || []}
          filename="activity-logs"
          headers={['Data/Hora', 'Organização', 'Usuário', 'Ação', 'Módulo', 'Recurso', 'IP', 'User Agent']}
          mapRow={(log) => [
            log.timestamp,
            log.organization?.name || '',
            log.user?.email || '',
            log.action,
            log.module,
            log.resource || '',
            log.ipAddress || '',
            log.userAgent || '',
          ]}
        />
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <SearchBar
                value={search}
                onChange={setSearch}
                onSearch={handleSearch}
                placeholder="Buscar por organização, usuário, ação..."
                debounceMs={500}
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <Filter className="w-4 h-4" />
              Filtros
            </Button>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <motion.div
                  initial={{ y: -20 }}
                  animate={{ y: 0 }}
                  exit={{ y: -20 }}
                  className="pt-4 border-t space-y-3"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <label className="text-sm font-medium mb-1 block">ID da Organização</label>
                      <input
                        type="text"
                        placeholder="ID da Organização"
                        value={filters.organizationId}
                        onChange={(e) => setFilters({ ...filters, organizationId: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border bg-background"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">ID do Usuário</label>
                      <input
                        type="text"
                        placeholder="ID do Usuário"
                        value={filters.userId}
                        onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border bg-background"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Ação</label>
                      <select
                        value={filters.action}
                        onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border bg-background"
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
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Módulo</label>
                      <select
                        value={filters.module}
                        onChange={(e) => setFilters({ ...filters, module: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border bg-background"
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
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={handleClearFilters}>
                      Limpar
                    </Button>
                    <Button size="sm" onClick={handleFilter}>
                      <Filter className="w-4 h-4 mr-2" />
                      Aplicar Filtros
                    </Button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <TableSkeleton rows={10} />
          ) : !data?.items.length ? (
            <EmptyState
              icon={Activity}
              title="Nenhum log encontrado"
              description="Não há registros de atividade com os filtros aplicados"
            />
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
                  {data.items.map((log, index) => (
                    <motion.tr
                      key={log.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03, duration: 0.3 }}
                      className="border-b hover:bg-muted/50 transition-colors"
                    >
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
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {data && data.total > data.pageSize && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
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
        </motion.div>
      )}
    </div>
  );
};
