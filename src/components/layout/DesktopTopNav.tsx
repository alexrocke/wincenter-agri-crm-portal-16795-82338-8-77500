import { NavLink, useLocation } from 'react-router-dom';
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
  LogOut,
  ChevronDown,
  MapPin,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { useNotifications } from '@/hooks/useNotifications';
import { Badge } from '@/components/ui/badge';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu';

const sellerDirectLinks = [
  { to: '/seller/dashboard', icon: Home, label: 'Dashboard' },
  { to: '/seller/clients', icon: Users, label: 'Clientes' },
  { to: '/seller/tasks', icon: CheckSquare, label: 'Tarefas' },
  { to: '/seller/products', icon: Package, label: 'Produtos' },
];

const sellerGroups = [
  {
    title: 'Comercial',
    icon: TrendingUp,
    items: [
      { to: '/seller/opportunities', icon: TrendingUp, label: 'Orçamentos' },
      { to: '/seller/sales', icon: ShoppingCart, label: 'Vendas' },
      { to: '/seller/commissions', icon: DollarSign, label: 'Comissões' },
    ],
  },
  {
    title: 'Atendimento',
    icon: Wrench,
    items: [
      { to: '/seller/visits', icon: Calendar, label: 'Visitas' },
      { to: '/seller/services', icon: Droplet, label: 'Serviço' },
      { to: '/seller/demonstrations', icon: Presentation, label: 'Demonstração' },
      { to: '/seller/technical-support', icon: Wrench, label: 'Assistência Técnica' },
    ],
  },
];

const adminDirectLinks = [
  { to: '/admin/dashboard', icon: Home, label: 'Dashboard' },
];

const adminGroups = [
  {
    title: 'Relatórios',
    icon: BarChart3,
    items: [
      { to: '/admin/reports', icon: FileText, label: 'Relatórios' },
      { to: '/admin/sales', icon: ShoppingCart, label: 'Vendas' },
      { to: '/admin/clients-map', icon: MapPin, label: 'Mapa de Clientes' },
    ],
  },
  {
    title: 'Gestão',
    icon: Briefcase,
    items: [
      { to: '/admin/products', icon: Package, label: 'Produtos' },
      { to: '/admin/goals', icon: Target, label: 'Metas' },
      { to: '/admin/company-costs', icon: Receipt, label: 'Custos' },
    ],
  },
  {
    title: 'Comissões',
    icon: DollarSign,
    items: [
      { to: '/admin/commission-rules', icon: Settings, label: 'Regras de Comissão' },
      { to: '/admin/commissions', icon: DollarSign, label: 'Gestão de Comissões' },
    ],
  },
  {
    title: 'Configurações',
    icon: Settings,
    items: [
      { to: '/admin/users-invites', icon: UserPlus, label: 'Convites' },
      { to: '/admin/notifications', icon: Bell, label: 'Notificações' },
      { to: '/admin/site-settings', icon: Sparkles, label: 'Configurações do Site' },
    ],
  },
];

export function DesktopTopNav() {
  const { signOut, userRole, userName } = useAuth();
  const { unreadCount } = useNotifications();
  const { settings } = useSiteSettings();
  const location = useLocation();

  const isLinkActive = (path: string) => location.pathname === path;
  const isGroupActive = (items: { to: string }[]) => 
    items.some(item => location.pathname === item.to);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center px-6 gap-6">
        {/* Logo and Company Name */}
        <NavLink to={userRole === 'admin' ? '/admin/dashboard' : '/seller/dashboard'} className="flex items-center gap-2 mr-4">
          <img 
            src={settings?.logo_url || '/logo.png'} 
            alt="WinCenter" 
            className="h-8 w-8 rounded-lg object-contain"
          />
          <div className="hidden lg:block">
            <h1 className="text-sm font-bold text-foreground">WinCenter</h1>
            <p className="text-xs text-muted-foreground">Agriculture CRM</p>
          </div>
        </NavLink>

        {/* Navigation Menu */}
        <nav className="flex-1 flex items-center gap-1">
            {userRole === 'admin' && (
              <>
                {adminDirectLinks.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    className={cn(
                      'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none',
                      isLinkActive(link.to) && 'bg-accent text-accent-foreground'
                    )}
                  >
                    <link.icon className="h-4 w-4 mr-2" />
                    {link.label}
                  </NavLink>
                ))}
                {adminGroups.map((group) => (
                  <NavigationMenu key={group.title}>
                    <NavigationMenuList>
                      <NavigationMenuItem>
                        <NavigationMenuTrigger
                          className={cn(
                            isGroupActive(group.items) && 'bg-accent/50 text-accent-foreground'
                          )}
                        >
                          <group.icon className="h-4 w-4 mr-2" />
                          {group.title}
                        </NavigationMenuTrigger>
                        <NavigationMenuContent>
                          <ul className="w-56 p-2 bg-popover">
                            {group.items.map((item) => (
                              <li key={item.to}>
                                <NavLink
                                  to={item.to}
                                  className={({ isActive }) =>
                                    cn(
                                      'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                                      isActive
                                        ? 'bg-accent text-accent-foreground'
                                        : 'hover:bg-accent/50 hover:text-accent-foreground'
                                    )
                                  }
                                >
                                  <item.icon className="h-4 w-4" />
                                  {item.label}
                                </NavLink>
                              </li>
                            ))}
                          </ul>
                        </NavigationMenuContent>
                      </NavigationMenuItem>
                    </NavigationMenuList>
                  </NavigationMenu>
                ))}
              </>
            )}

            {(userRole === 'seller' || userRole === 'technician') && (
              <>
                {sellerDirectLinks.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    className={cn(
                      'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none',
                      isLinkActive(link.to) && 'bg-accent text-accent-foreground'
                    )}
                  >
                    <link.icon className="h-4 w-4 mr-2" />
                    {link.label}
                  </NavLink>
                ))}
                {sellerGroups.map((group) => (
                  <NavigationMenu key={group.title}>
                    <NavigationMenuList>
                      <NavigationMenuItem>
                        <NavigationMenuTrigger
                          className={cn(
                            isGroupActive(group.items) && 'bg-accent/50 text-accent-foreground'
                          )}
                        >
                          <group.icon className="h-4 w-4 mr-2" />
                          {group.title}
                        </NavigationMenuTrigger>
                        <NavigationMenuContent>
                          <ul className="w-56 p-2 bg-popover">
                            {group.items.map((item) => (
                              <li key={item.to}>
                                <NavLink
                                  to={item.to}
                                  className={({ isActive }) =>
                                    cn(
                                      'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                                      isActive
                                        ? 'bg-accent text-accent-foreground'
                                        : 'hover:bg-accent/50 hover:text-accent-foreground'
                                    )
                                  }
                                >
                                  <item.icon className="h-4 w-4" />
                                  {item.label}
                                </NavLink>
                              </li>
                            ))}
                          </ul>
                        </NavigationMenuContent>
                      </NavigationMenuItem>
                    </NavigationMenuList>
                  </NavigationMenu>
                ))}
              </>
            )}
        </nav>

        {/* Right side - Notifications and User */}
        <div className="flex items-center gap-3">
          <NavLink
            to="/notifications"
            className={({ isActive }) =>
              cn(
                'relative inline-flex items-center justify-center h-10 w-10 rounded-md transition-colors hover:bg-accent hover:text-accent-foreground',
                isActive && 'bg-accent text-accent-foreground'
              )
            }
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 min-w-5 px-1.5 text-xs flex items-center justify-center"
              >
                {unreadCount}
              </Badge>
            )}
          </NavLink>

          <div className="h-8 w-px bg-border" />

          <div className="flex items-center gap-2">
            <span className="text-sm text-foreground hidden lg:inline">
              {userName}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={signOut}
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
