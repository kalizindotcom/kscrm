import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Send, 
  Users as UsersIcon, 
  Link as LinkIcon, 
  BarChart3, 
  Settings, 
  Menu,
  X,
  Bell,
  Search,
  LogOut,
  Moon,
  Sun,
  MessageSquare,
  Activity,
  User,
  CreditCard,
  Settings as SettingsIcon,
  ChevronDown,
  Plus,
  Rocket,
  PlusCircle,
  Import,
  Flame
} from 'lucide-react';
import { useAppStore, useAuthStore } from '../../store';
import { cn } from '../../lib/utils';
import { FlameButton } from '../ui/FlameButton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Users, label: 'Contatos', path: '/contacts' },
  { icon: Send, label: 'Campanhas', path: '/campaigns' },
  { icon: Activity, label: 'Live-View', path: '/live-view' },
  { icon: UsersIcon, label: 'Grupos', path: '/groups' },
  { icon: MessageSquare, label: 'Mensagens', path: '/messages' },
  { icon: LinkIcon, label: 'Conectores', path: '/connectors' },
  { icon: Flame, label: 'Aquecimento', path: '/warmup' },
  { icon: BarChart3, label: 'Relatórios', path: '/reports' },
  { icon: Settings, label: 'Configurações', path: '/settings' },
];

export const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { sidebarOpen, toggleSidebar, theme, setTheme, isFiring } = useAppStore();
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const handleLogout = async () => {
    await logout().catch(() => undefined);
    navigate('/login');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchValue.trim()) return;
    
    setIsSearching(true);
    // Simulating search behavior
    console.log("Searching for:", searchValue);
    setTimeout(() => setIsSearching(false), 800);
  };

  return (
    <div className={cn("min-h-screen bg-background text-foreground flex overflow-hidden", "dark")}>
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-[45] bg-background/60 backdrop-blur-sm lg:hidden animate-in fade-in duration-300" 
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-card/40 backdrop-blur-xl border-r border-primary/20 transition-all duration-300 lg:static lg:translate-x-0",
        !sidebarOpen && "-translate-x-full lg:w-20"
      )}>
        <div className="flex flex-col h-full">
          <div className="h-16 flex items-center justify-between px-4 border-b border-primary/20 bg-primary/5">
            <Link to="/" className="flex items-center gap-2 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-neon-gradient flex-shrink-0 flex items-center justify-center shadow-lg shadow-primary/20">
                <Rocket className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className={cn("font-bold text-neon-gradient truncate text-xl drop-shadow-[0_0_15px_hsla(var(--primary),0.3)] transition-all", !sidebarOpen && "lg:hidden")}>
                Ks Leads
              </span>
            </Link>
            <button onClick={toggleSidebar} className="p-1.5 rounded-lg hover:bg-primary/20 lg:hidden transition-colors">
              <X className="w-5 h-5 text-primary" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1.5 custom-scrollbar">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              const isCampaigns = item.label === 'Campanhas';
              const showCampaignRiver = isCampaigns && isFiring;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative",
                    isActive && !showCampaignRiver
                      ? "bg-primary/10 text-primary shadow-[0_0_20px_hsla(var(--primary),0.05)] border border-primary/20" 
                      : !showCampaignRiver && "hover:bg-primary/5 text-muted-foreground hover:text-primary",
                    showCampaignRiver && "river-sidebar-active scale-105",
                    !sidebarOpen && "lg:justify-center"
                  )}
                  title={!sidebarOpen ? item.label : undefined}
                >
                  <div className="relative flex items-center justify-center w-8 h-8 z-10">
                    <item.icon className={cn(
                      "w-5 h-5 flex-shrink-0 z-10 transition-transform duration-300 group-hover:scale-110", 
                      isActive && !showCampaignRiver && "text-primary",
                      showCampaignRiver && "text-white drop-shadow-[0_0_6px_hsl(var(--secondary))]"
                    )} />
                  </div>
                  <div className="flex items-center flex-1 min-w-0 z-10">
                    <span className={cn(
                      "truncate font-medium z-10 relative ml-2 transition-all duration-300", 
                      !sidebarOpen && "lg:hidden",
                      showCampaignRiver && "drop-shadow-[0_0_6px_hsl(var(--secondary))]"
                    )}>
                      {item.label}
                    </span>
                  </div>
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-primary/20 bg-primary/5">
            <button
              onClick={handleLogout}
              className={cn(
                "flex items-center gap-3 w-full px-3 py-2.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all active:scale-95",
                !sidebarOpen && "lg:justify-center"
              )}
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              <span className={cn("truncate font-medium", !sidebarOpen && "lg:hidden")}>Sair</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <header className="h-16 border-b border-primary/20 bg-card/40 backdrop-blur-md flex items-center justify-between px-2 sm:px-4 sticky top-0 z-40 transition-all duration-300">
          <div className="flex items-center gap-2 sm:gap-4">
            <button 
              onClick={toggleSidebar} 
              className="p-2 rounded-xl hover:bg-primary/10 transition-all active:scale-95"
              aria-label="Toggle Sidebar"
            >
              <Menu className="w-5 h-5 text-foreground/80" />
            </button>
            
            <form onSubmit={handleSearch} className="relative hidden lg:block w-64 xl:w-80 group">
              <Search className={cn(
                "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors duration-200",
                isSearching ? "text-primary animate-pulse" : "group-focus-within:text-primary"
              )} />
              <input
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Busca rápida..."
                className="w-full bg-primary/5 border border-primary/20 rounded-xl py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/40 focus:bg-primary/10 transition-all outline-none"
              />
            </form>

            <div className="flex">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl text-sm font-semibold transition-all active:scale-95 border border-primary/20 shadow-sm shadow-primary/10 group">
                    <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
                    <span className="hidden xs:inline">Ações Rápidas</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56 bg-card border-primary/20 backdrop-blur-xl animate-in zoom-in-95 duration-200">
                  <DropdownMenuLabel>Atalhos</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-primary/10" />
                  <DropdownMenuItem className="gap-2 cursor-pointer focus:bg-primary/10 py-2.5" onClick={() => navigate('/campaigns')}>
                    <Send className="w-4 h-4 text-primary" />
                    <span>Nova Campanha</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2 cursor-pointer focus:bg-primary/10 py-2.5" onClick={() => navigate('/contacts')}>
                    <PlusCircle className="w-4 h-4 text-primary" />
                    <span>Novo Contato</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2 cursor-pointer focus:bg-primary/10 py-2.5" onClick={() => navigate('/contacts')}>
                    <Import className="w-4 h-4 text-primary" />
                    <span>Importar Lista</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="p-2.5 rounded-xl hover:bg-primary/10 transition-all active:scale-95 group"
              title={theme === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'}
            >
              {theme === 'light' ? (
                <Moon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              ) : (
                <Sun className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              )}
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2.5 rounded-xl hover:bg-primary/10 relative transition-all active:scale-95 group">
                  <Bell className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-secondary rounded-full border-2 border-background animate-pulse shadow-[0_0_8px_hsl(var(--secondary))]"></span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 bg-card border-primary/20 backdrop-blur-xl animate-in zoom-in-95 duration-200">
                <DropdownMenuLabel className="flex items-center justify-between">
                  <span>Notificações</span>
                  <span className="text-[10px] font-normal text-primary hover:underline cursor-pointer">Marcar como lidas</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-primary/10" />
                <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                  {[
                    { title: "Nova campanha criada", time: "Há 5 min", type: "success" },
                    { title: "Conector desconectado", time: "Há 12 min", type: "error" },
                    { title: "Limite de envios próximo", time: "Há 1 hora", type: "warning" },
                    { title: "Relatório mensal pronto", time: "Há 3 horas", type: "info" }
                  ].map((notif, i) => (
                    <DropdownMenuItem key={i} className="flex flex-col items-start gap-1 p-3 cursor-pointer focus:bg-primary/10 rounded-lg mx-1 my-1 transition-colors">
                      <div className="flex items-center justify-between w-full">
                        <span className="font-medium text-sm">{notif.title}</span>
                        <span className="text-[10px] text-muted-foreground">{notif.time}</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">Clique para ver mais detalhes sobre esta atividade.</p>
                    </DropdownMenuItem>
                  ))}
                </div>
                <DropdownMenuSeparator className="bg-primary/10" />
                <DropdownMenuItem className="justify-center text-primary text-xs font-semibold py-2 cursor-pointer focus:bg-primary/10">
                  Ver todas as notificações
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="w-[1px] h-8 bg-primary/20 mx-2 self-center hidden sm:block"></div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-primary/10 transition-all active:scale-95 group">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-semibold leading-none text-foreground group-hover:text-primary transition-colors">{user?.name || "Usuário"}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1 font-medium">{user?.role || "Administrador"}</p>
                  </div>
                  <div className="relative group-hover:scale-105 transition-transform">
                    <div className="w-9 h-9 rounded-xl bg-neon-gradient flex items-center justify-center text-primary-foreground font-bold shadow-lg shadow-primary/20">
                      {user?.name?.[0] || "U"}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-background rounded-full shadow-sm"></div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors hidden sm:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-card border-primary/20 backdrop-blur-xl animate-in zoom-in-95 duration-200">
                <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-primary/10" />
                <DropdownMenuItem className="gap-2 cursor-pointer focus:bg-primary/10 py-2.5" onClick={() => navigate('/settings')}>
                  <User className="w-4 h-4 text-primary" />
                  <span>Meu Perfil</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2 cursor-pointer focus:bg-primary/10 py-2.5" onClick={() => navigate('/settings')}>
                  <SettingsIcon className="w-4 h-4 text-primary" />
                  <span>Configurações</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2 cursor-pointer focus:bg-primary/10 py-2.5">
                  <CreditCard className="w-4 h-4 text-primary" />
                  <span>Assinatura</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-primary/10" />
                <DropdownMenuItem 
                  className="gap-2 text-destructive focus:bg-destructive/10 cursor-pointer py-2.5 font-medium" 
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sair do Sistema</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 lg:p-8 animate-fade-in custom-scrollbar">
          {children}
        </main>
      </div>
    </div>
  );
};
