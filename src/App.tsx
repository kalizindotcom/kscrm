import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider } from './contexts/ThemeContext';
import { useAuthStore } from './store';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ContactsPage } from './pages/ContactsPage';
import { CampaignsPage } from './pages/CampaignsPage';
import { GroupsPage } from './pages/GroupsPage';
import { InboxPage } from './pages/InboxPage';
import { ConnectorsPage } from './pages/ConnectorsPage';
import { SettingsPage } from './pages/SettingsPage';
import ReportsPage from './pages/ReportsPage';
import { LiveViewPage } from './pages/LiveViewPage';
import { WarmupPage } from './pages/WarmupPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { OrganizationsPage } from './pages/admin/OrganizationsPage';
import { OrganizationFormPage } from './pages/admin/OrganizationFormPage';
import { OrganizationDetailPage } from './pages/admin/OrganizationDetailPage';
import { UsersPage } from './pages/admin/UsersPage';
import { UserFormPage } from './pages/admin/UserFormPage';
import { UserDetailPage } from './pages/admin/UserDetailPage';
import { PlansPage } from './pages/admin/PlansPage';
import { PlanFormPage } from './pages/admin/PlanFormPage';
import { PlanDetailPage } from './pages/admin/PlanDetailPage';
import { ActivityLogsPage } from './pages/admin/ActivityLogsPage';
import { SessionsPage } from './pages/admin/SessionsPage';
import { SubscriptionsPage } from './pages/admin/SubscriptionsPage';
import { DebugAuthPage } from './pages/DebugAuthPage';

const queryClient = new QueryClient();

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? <DashboardLayout>{children}</DashboardLayout> : <Navigate to="/login" />;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (user?.role !== 'super_admin') return <Navigate to="/" />;
  return <DashboardLayout>{children}</DashboardLayout>;
};

const AppBootstrap: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const hydrateMe = useAuthStore((state) => state.hydrateMe);

  React.useEffect(() => {
    hydrateMe().catch(() => undefined);
  }, [hydrateMe]);

  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AppBootstrap>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
              <Route path="/contacts" element={<PrivateRoute><ContactsPage /></PrivateRoute>} />
              <Route path="/campaigns" element={<PrivateRoute><CampaignsPage /></PrivateRoute>} />
              <Route path="/groups" element={<PrivateRoute><GroupsPage /></PrivateRoute>} />
              <Route path="/live-view" element={<PrivateRoute><LiveViewPage /></PrivateRoute>} />
              <Route path="/messages" element={<PrivateRoute><InboxPage /></PrivateRoute>} />
              <Route path="/connectors" element={<PrivateRoute><ConnectorsPage /></PrivateRoute>} />
              <Route path="/reports" element={<PrivateRoute><ReportsPage /></PrivateRoute>} />
              <Route path="/warmup" element={<PrivateRoute><WarmupPage /></PrivateRoute>} />
              <Route path="/settings" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />

              {/* Admin Routes — only super_admin */}
              <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />

              {/* Organizations */}
              <Route path="/admin/organizations" element={<AdminRoute><OrganizationsPage /></AdminRoute>} />
              <Route path="/admin/organizations/new" element={<AdminRoute><OrganizationFormPage /></AdminRoute>} />
              <Route path="/admin/organizations/:id" element={<AdminRoute><OrganizationDetailPage /></AdminRoute>} />
              <Route path="/admin/organizations/:id/edit" element={<AdminRoute><OrganizationFormPage /></AdminRoute>} />

              {/* Users */}
              <Route path="/admin/users" element={<AdminRoute><UsersPage /></AdminRoute>} />
              <Route path="/admin/users/new" element={<AdminRoute><UserFormPage /></AdminRoute>} />
              <Route path="/admin/users/:id" element={<AdminRoute><UserDetailPage /></AdminRoute>} />
              <Route path="/admin/users/:id/edit" element={<AdminRoute><UserFormPage /></AdminRoute>} />

              {/* Plans */}
              <Route path="/admin/plans" element={<AdminRoute><PlansPage /></AdminRoute>} />
              <Route path="/admin/plans/new" element={<AdminRoute><PlanFormPage /></AdminRoute>} />
              <Route path="/admin/plans/:id" element={<AdminRoute><PlanDetailPage /></AdminRoute>} />
              <Route path="/admin/plans/:id/edit" element={<AdminRoute><PlanFormPage /></AdminRoute>} />

              {/* Sessions */}
              <Route path="/admin/sessions" element={<AdminRoute><SessionsPage /></AdminRoute>} />

              {/* Subscriptions */}
              <Route path="/admin/subscriptions" element={<AdminRoute><SubscriptionsPage /></AdminRoute>} />

              {/* Activity */}
              <Route path="/admin/activity" element={<AdminRoute><ActivityLogsPage /></AdminRoute>} />

              {/* Debug Route - Temporário */}
              <Route path="/debug-auth" element={<PrivateRoute><DebugAuthPage /></PrivateRoute>} />

              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </BrowserRouter>
        </AppBootstrap>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
