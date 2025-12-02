import { NavLink } from 'react-router-dom';
import {
  Home,
  Users,
  TrendingUp,
  DollarSign,
  Package,
  BarChart3,
  Target,
  Receipt,
  Bell,
  UserPlus,
  Sparkles,
  Calendar,
  Presentation,
  ShoppingCart,
  Droplet,
  Wrench,
  CheckSquare,
  Briefcase,
  FileText,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { useNotifications } from '@/hooks/useNotifications';
import { Badge } from '@/components/ui/badge';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { MenuItemWithSubmenu } from './MenuItemWithSubmenu';
import { ThemeToggle } from '@/components/ThemeToggle';

// Links diretos do vendedor
const sellerDirectLinks = [
  { to: '/seller/dashboard', icon: Home, label: 'Dashboard' },
  { to: '/seller/clients', icon: Users, label: 'Clientes' },
  { to: '/seller/tasks', icon: CheckSquare, label: 'Tarefas' },
  { to: '/seller/products', icon: Package, label: 'Produtos' },
  { to: '/notifications', icon: Bell, label: 'Notificações' },
];

// Grupos de submenus do vendedor
const sellerGroups = [
  {
    title: 'Comercial',
    icon: TrendingUp,
    storageKey: 'sidebar-comercial-open',
    items: [
      { to: '/seller/opportunities', icon: TrendingUp, label: 'Orçamentos' },
      { to: '/seller/sales', icon: ShoppingCart, label: 'Vendas' },
      { to: '/seller/commissions', icon: DollarSign, label: 'Comissões' },
    ],
  },
  {
    title: 'Atendimento',
    icon: Wrench,
    storageKey: 'sidebar-atendimento-open',
    items: [
      { to: '/seller/visits', icon: Calendar, label: 'Visitas' },
      { to: '/seller/services', icon: Droplet, label: 'Serviço' },
      { to: '/seller/demonstrations', icon: Presentation, label: 'Demonstração' },
      { to: '/seller/technical-support', icon: Wrench, label: 'Assistência Técnica' },
    ],
  },
];

// Link direto do admin
const adminDirectLinks = [
  { to: '/admin/dashboard', icon: Home, label: 'Dashboard' },
];

// Grupos de submenus do admin
const adminGroups = [
  {
    title: 'Relatórios & Análises',
    icon: BarChart3,
    storageKey: 'sidebar-relatorios-open',
    items: [
      { to: '/admin/reports', icon: FileText, label: 'Relatórios' },
      { to: '/admin/sales', icon: ShoppingCart, label: 'Vendas' },
    ],
  },
  {
    title: 'Gestão Comercial',
    icon: Briefcase,
    storageKey: 'sidebar-gestao-open',
    items: [
      { to: '/admin/products', icon: Package, label: 'Produtos' },
      { to: '/admin/internal-stock', icon: Wrench, label: 'Estoque Interno' },
      { to: '/admin/service-catalog', icon: Settings, label: 'Catálogo de Serviços' },
      { to: '/admin/goals', icon: Target, label: 'Metas' },
      { to: '/admin/company-costs', icon: Receipt, label: 'Custos' },
    ],
  },
  {
    title: 'Comissões',
    icon: DollarSign,
    storageKey: 'sidebar-comissoes-open',
    items: [
      { to: '/admin/commission-rules', icon: Settings, label: 'Regras de Comissão' },
      { to: '/admin/commissions', icon: DollarSign, label: 'Gestão de Comissões' },
    ],
  },
  {
    title: 'Configurações',
    icon: Settings,
    storageKey: 'sidebar-configuracoes-open',
    items: [
      { to: '/admin/users-invites', icon: UserPlus, label: 'Convites' },
      { to: '/admin/notifications', icon: Bell, label: 'Notificações' },
      { to: '/admin/site-settings', icon: Sparkles, label: 'Configurações do Site' },
    ],
  },
];

interface SidebarContentProps {
  onNavigate?: () => void;
}

export function SidebarContent({ onNavigate }: SidebarContentProps) {
  const { signOut, userRole, userName } = useAuth();
  const { unreadCount } = useNotifications();
  const { settings } = useSiteSettings();

  const handleNavClick = () => {
    onNavigate?.();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-2">
          <img 
            src={settings?.logo_url || '/logo.png'} 
            alt="WinCenter" 
            className="h-10 w-10 rounded-lg object-contain"
          />
          <div>
            <h1 className="text-lg font-bold text-foreground">WinCenter</h1>
            <p className="text-xs text-muted-foreground">Agriculture CRM</p>
            <p className="text-xs text-foreground mt-1">Bem-Vindo <span className="font-bold">{userName}</span></p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {userRole === 'admin' && (
            <div>
              <h3 className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Administração
              </h3>
              <nav className="space-y-1">
                {adminDirectLinks.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    onClick={handleNavClick}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-accent text-accent-foreground'
                          : 'text-foreground hover:bg-accent/50 hover:text-accent-foreground'
                      )
                    }
                  >
                    <link.icon className="h-4 w-4" />
                    {link.label}
                  </NavLink>
                ))}
                {adminGroups.map((group) => (
                  <MenuItemWithSubmenu
                    key={group.storageKey}
                    title={group.title}
                    icon={group.icon}
                    items={group.items}
                    storageKey={group.storageKey}
                    onNavigate={handleNavClick}
                  />
                ))}
              </nav>
            </div>
          )}

          <div>
            <h3 className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {userRole === 'technician' ? 'Técnico' : 'Vendedor'}
            </h3>
            <nav className="space-y-1">
              {sellerDirectLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={handleNavClick}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-accent text-accent-foreground'
                        : 'text-foreground hover:bg-accent/50 hover:text-accent-foreground'
                    )
                  }
                >
                  <link.icon className="h-4 w-4" />
                  <span className="flex-1">{link.label}</span>
                  {link.to === '/notifications' && unreadCount > 0 && (
                    <Badge variant="default" className="h-5 min-w-5 px-1.5 text-xs">
                      {unreadCount}
                    </Badge>
                  )}
                </NavLink>
              ))}
              {sellerGroups.map((group) => (
                <MenuItemWithSubmenu
                  key={group.storageKey}
                  title={group.title}
                  icon={group.icon}
                  items={group.items}
                  storageKey={group.storageKey}
                  onNavigate={handleNavClick}
                />
              ))}
            </nav>
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-border flex items-center gap-2">
        <ThemeToggle />
        <Button
          variant="outline"
          className="flex-1"
          onClick={signOut}
        >
          Sair
        </Button>
      </div>
    </div>
  );
}
