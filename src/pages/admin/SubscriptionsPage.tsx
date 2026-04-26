import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  DollarSign,
  Plus,
  Building2,
  Calendar,
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';
import { Card, CardContent, Button, Badge } from '@/components/ui/shared';
import { adminService } from '@/services/adminService';
import type { Subscription, PaginatedResponse } from '@/types/admin';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import { SearchBar } from '@/components/admin/SearchBar';
import { EmptyState } from '@/components/admin/EmptyState';
import { TableSkeleton } from '@/components/admin/SkeletonLoader';
import { ExportButton } from '@/components/admin/ExportButton';

const statusMap: Record<string, { label: string; variant: any }> = {
  active: { label: 'Ativa', variant: 'success' },
  cancelled: { label: 'Cancelada', variant: 'error' },
  expired: { label: 'Expirada', variant: 'outline' },
  pending: { label: 'Pendente', variant: 'warning' },
};

export function SubscriptionsPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<PaginatedResponse<Subscription> | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadSubscriptions();
  }, [page, statusFilter]);

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      const result = await adminService.listSubscriptions({
        status: statusFilter || undefined,
        page,
        pageSize: 20,
      });
      setData(result);
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao carregar assinaturas');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadSubscriptions();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold">Assinaturas</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie todas as assinaturas do sistema
          </p>
        </div>
        <div className="flex gap-2">
          <ExportButton
            data={data?.items || []}
            filename="subscriptions"
            headers={['Organização', 'Plano', 'Status', 'Valor', 'Iniciada em', 'Expira em', 'Método de Pagamento']}
            mapRow={(sub) => [
              sub.organization?.name || '',
              sub.plan.name,
              statusMap[sub.status]?.label,
              `R$ ${Number(sub.amount || sub.plan.price).toFixed(2)}`,
              formatDate(sub.startedAt),
              sub.expiresAt ? formatDate(sub.expiresAt) : 'Sem expiração',
              sub.paymentMethod || 'N/A',
            ]}
          />
          <Button onClick={() => navigate('/admin/subscriptions/new')}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Assinatura
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
                placeholder="Buscar por organização..."
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
                <option value="cancelled">Canceladas</option>
                <option value="expired">Expiradas</option>
                <option value="pending">Pendentes</option>
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
                icon={DollarSign}
                title="Nenhuma assinatura encontrada"
                description="As assinaturas aparecerão aqui quando forem criadas"
                actionLabel="Nova Assinatura"
                onAction={() => navigate('/admin/subscriptions/new')}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="text-left p-4 font-semibold">Organização</th>
                      <th className="text-left p-4 font-semibold">Plano</th>
                      <th className="text-left p-4 font-semibold">Status</th>
                      <th className="text-left p-4 font-semibold">Valor</th>
                      <th className="text-left p-4 font-semibold">Período</th>
                      <th className="text-left p-4 font-semibold">Pagamento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((sub, index) => (
                      <motion.tr
                        key={sub.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="border-b hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/admin/organizations/${sub.organizationId}`)}
                      >
                        <td className="p-4">
                          {sub.organization ? (
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{sub.organization.name}</p>
                                <p className="text-xs text-muted-foreground">@{sub.organization.slug}</p>
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="p-4">
                          <div>
                            <p className="font-medium">{sub.plan.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {sub.plan.interval === 'monthly' ? 'Mensal' : 'Anual'}
                            </p>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge variant={statusMap[sub.status]?.variant}>
                            {statusMap[sub.status]?.label}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <p className="font-semibold">
                            R$ {Number(sub.amount || sub.plan.price).toFixed(2)}
                          </p>
                        </td>
                        <td className="p-4">
                          <div className="text-sm">
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Calendar className="w-3 h-3" />
                              <span>{formatDate(sub.startedAt)}</span>
                            </div>
                            {sub.expiresAt && (
                              <div className="flex items-center gap-1 text-muted-foreground mt-1">
                                <Clock className="w-3 h-3" />
                                <span>{formatDate(sub.expiresAt)}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="text-sm">
                            <div className="flex items-center gap-1">
                              <CreditCard className="w-3 h-3 text-muted-foreground" />
                              <span>{sub.paymentMethod || 'N/A'}</span>
                            </div>
                            {sub.paymentStatus && (
                              <Badge
                                variant={sub.paymentStatus === 'paid' ? 'success' : 'warning'}
                                className="mt-1"
                              >
                                {sub.paymentStatus}
                              </Badge>
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
            {Math.min(page * data.pageSize, data.total)} de {data.total} assinaturas
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
}
