import { NavLink, useNavigate } from 'react-router-dom';
import { Home, Receipt, Menu as MenuIcon, Users, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { 
  Package, 
  MapPin, 
  Wrench, 
  Droplets, 
  LifeBuoy, 
  CheckSquare,
  ShoppingCart
} from 'lucide-react';

const mainLinks = [
  { to: '/seller/simple/dashboard', icon: Home, label: 'Início' },
  { to: '/seller/simple/clients', icon: Users, label: 'Clientes' },
  { to: '/seller/simple/notifications', icon: Bell, label: 'Avisos' },
];

const menuItems = [
  { to: '/seller/simple/budgets', icon: Receipt, label: 'Orçamentos', color: 'text-blue-500' },
  { to: '/seller/simple/sales', icon: ShoppingCart, label: 'Vendas', color: 'text-green-500' },
  { to: '/seller/simple/products', icon: Package, label: 'Produtos', color: 'text-purple-500' },
  { to: '/seller/simple/visits', icon: MapPin, label: 'Visitas', color: 'text-orange-500' },
  { to: '/seller/simple/services', icon: Wrench, label: 'Serviços', color: 'text-cyan-500' },
  { to: '/seller/simple/demonstrations', icon: Droplets, label: 'Demonstrações', color: 'text-teal-500' },
  { to: '/seller/simple/technical-support', icon: LifeBuoy, label: 'Assistência', color: 'text-red-500' },
  { to: '/seller/simple/tasks', icon: CheckSquare, label: 'Tarefas', color: 'text-yellow-500' },
];

export function SimplifiedBottomNav() {
  const { unreadCount } = useNotifications();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleMenuItemClick = (to: string) => {
    setMenuOpen(false);
    navigate(to);
  };

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/98 backdrop-blur-md border-t border-border shadow-lg">
        <div className="flex items-center justify-around h-16 px-1 max-w-screen-sm mx-auto">
          {mainLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center flex-1 h-14 gap-1 transition-all rounded-xl mx-0.5 relative',
                  isActive
                    ? 'text-primary bg-primary/10 shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div className="relative">
                    <link.icon className={cn("h-5 w-5", isActive && "stroke-[2.5]")} />
                    {link.to === '/notifications' && unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-4 w-4 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </div>
                  <span className={cn(
                    "text-[11px] font-medium leading-none",
                    isActive && "font-semibold"
                  )}>
                    {link.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}

          {/* Botão Central de Orçamento */}
          <button
            onClick={() => navigate('/seller/simple/budgets?quick=true')}
            className="flex flex-col items-center justify-center h-16 w-16 -mt-8 bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground rounded-full shadow-lg transition-all active:scale-95 border-4 border-background"
          >
            <Receipt className="h-6 w-6 stroke-[2.5]" />
            <span className="text-[10px] font-bold mt-0.5">Orçar</span>
          </button>

          {/* Botão de Menu */}
          <button
            onClick={() => setMenuOpen(true)}
            className="flex flex-col items-center justify-center flex-1 h-14 gap-1 transition-all rounded-xl mx-0.5 text-muted-foreground hover:text-foreground hover:bg-muted/50"
          >
            <MenuIcon className="h-5 w-5" />
            <span className="text-[11px] font-medium leading-none">Menu</span>
          </button>
        </div>
      </nav>

      {/* Menu Sheet */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="bottom" className="h-[60vh] rounded-t-3xl">
          <SheetTitle className="text-center mb-6">Ações Rápidas</SheetTitle>
          <div className="grid grid-cols-2 gap-3 pb-6">
            {menuItems.map((item) => (
              <Button
                key={item.to}
                variant="outline"
                className="h-24 flex flex-col gap-2 text-left justify-center"
                onClick={() => handleMenuItemClick(item.to)}
              >
                <item.icon className={cn("h-7 w-7", item.color)} />
                <span className="text-sm font-medium">{item.label}</span>
              </Button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
