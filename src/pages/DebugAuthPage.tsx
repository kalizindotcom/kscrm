import { useEffect, useState } from 'react';
import { useAuthStore } from '../store';
import { apiClient } from '../services/apiClient';

export function DebugAuthPage() {
  const { user, token } = useAuthStore();
  const [adminCheck, setAdminCheck] = useState<any>(null);
  const [tokenCheck, setTokenCheck] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        // Verificar dados do admin
        const adminData = await apiClient.get('/api/debug/check-admin');
        setAdminCheck(adminData);

        // Verificar token atual
        const tokenData = await apiClient.get('/api/debug/verify-token');
        setTokenCheck(tokenData);
      } catch (error: any) {
        console.error('Erro ao verificar auth:', error);
        setAdminCheck({ error: error.message });
        setTokenCheck({ error: error.message });
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">🔍 Debug de Autenticação</h1>
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">🔍 Debug de Autenticação</h1>

      {/* Usuário atual */}
      <div className="mb-6 p-4 bg-gray-100 dark:bg-gray-800 rounded">
        <h2 className="text-xl font-semibold mb-2">👤 Usuário Atual (Frontend)</h2>
        <pre className="text-sm overflow-auto">
          {JSON.stringify({ user, hasToken: !!token }, null, 2)}
        </pre>
      </div>

      {/* Verificação do Admin no Banco */}
      <div className="mb-6 p-4 bg-gray-100 dark:bg-gray-800 rounded">
        <h2 className="text-xl font-semibold mb-2">💾 Admin no Banco de Dados</h2>
        <pre className="text-sm overflow-auto">
          {JSON.stringify(adminCheck, null, 2)}
        </pre>
        {adminCheck?.roleCheck && (
          <div className="mt-2">
            {adminCheck.roleCheck.isSuperAdmin ? (
              <span className="text-green-600 font-bold">✅ Role correto: super_admin</span>
            ) : (
              <span className="text-red-600 font-bold">
                ❌ Role incorreto: {adminCheck.roleCheck.currentRole}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Verificação do Token */}
      <div className="mb-6 p-4 bg-gray-100 dark:bg-gray-800 rounded">
        <h2 className="text-xl font-semibold mb-2">🔑 Token JWT Atual</h2>
        <pre className="text-sm overflow-auto">
          {JSON.stringify(tokenCheck, null, 2)}
        </pre>
        {tokenCheck?.roleCheck && (
          <div className="mt-2">
            {tokenCheck.roleCheck.isSuperAdmin ? (
              <span className="text-green-600 font-bold">✅ Token com role super_admin</span>
            ) : (
              <span className="text-red-600 font-bold">
                ❌ Token com role: {tokenCheck.roleCheck.currentRole}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Diagnóstico */}
      <div className="p-4 bg-blue-100 dark:bg-blue-900 rounded">
        <h2 className="text-xl font-semibold mb-2">🔬 Diagnóstico</h2>
        <ul className="list-disc list-inside space-y-1">
          <li>
            Usuário no banco:{' '}
            {adminCheck?.user ? (
              <span className="text-green-600">✅ Encontrado</span>
            ) : (
              <span className="text-red-600">❌ Não encontrado</span>
            )}
          </li>
          <li>
            Role no banco:{' '}
            {adminCheck?.roleCheck?.isSuperAdmin ? (
              <span className="text-green-600">✅ super_admin</span>
            ) : (
              <span className="text-red-600">❌ {adminCheck?.roleCheck?.currentRole || 'N/A'}</span>
            )}
          </li>
          <li>
            Token válido:{' '}
            {tokenCheck?.valid ? (
              <span className="text-green-600">✅ Sim</span>
            ) : (
              <span className="text-red-600">❌ Não</span>
            )}
          </li>
          <li>
            Role no token:{' '}
            {tokenCheck?.roleCheck?.isSuperAdmin ? (
              <span className="text-green-600">✅ super_admin</span>
            ) : (
              <span className="text-red-600">❌ {tokenCheck?.roleCheck?.currentRole || 'N/A'}</span>
            )}
          </li>
        </ul>
      </div>
    </div>
  );
}
