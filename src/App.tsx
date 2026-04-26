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
import { UsersPage } from './pages/admin/UsersPage';
import { PlansPage } from './pages/admin/PlansPage';
import { ActivityLogsPage } from './pages/admin/ActivityLogsPage';

const queryClient = new QueryClient();

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? <DashboardLayout>{children}</DashboardLayout> : <Navigate to="/login" />;
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

              {/* Admin Routes */}
              <Route path="/admin" element={<PrivateRoute><AdminDashboard /></PrivateRoute>} />
              <Route path="/admin/organizations" element={<PrivateRoute><OrganizationsPage /></PrivateRoute>} />
              <Route path="/admin/users" element={<PrivateRoute><UsersPage /></PrivateRoute>} />
              <Route path="/admin/plans" element={<PrivateRoute><PlansPage /></PrivateRoute>} />
              <Route path="/admin/activity" element={<PrivateRoute><ActivityLogsPage /></PrivateRoute>} />

              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </BrowserRouter>
        </AppBootstrap>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
