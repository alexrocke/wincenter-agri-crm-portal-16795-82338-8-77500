import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';

interface MenuItem {
  to: string;
  icon: LucideIcon;
  label: string;
  badge?: number;
}

interface MenuItemWithSubmenuProps {
  title: string;
  icon: LucideIcon;
  items: MenuItem[];
  storageKey: string;
  onNavigate?: () => void;
}

export function MenuItemWithSubmenu({
  title,
  icon: Icon,
  items,
  storageKey,
  onNavigate,
}: MenuItemWithSubmenuProps) {
  const location = useLocation();
  const isActiveGroup = items.some(item => location.pathname === item.to);
  
  const [isOpen, setIsOpen] = useState(() => {
    const stored = localStorage.getItem(storageKey);
    return stored !== null ? stored === 'true' : isActiveGroup;
  });

  useEffect(() => {
    if (isActiveGroup && !isOpen) {
      setIsOpen(true);
    }
  }, [isActiveGroup, isOpen]);

  useEffect(() => {
    localStorage.setItem(storageKey, String(isOpen));
  }, [isOpen, storageKey]);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm font-medium text-foreground hover:bg-accent/50 hover:text-accent-foreground transition-colors">
        <Icon className="h-4 w-4" />
        <span className="flex-1 text-left">{title}</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-1 pt-1">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 pl-10 pr-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-foreground hover:bg-accent/50 hover:text-accent-foreground'
              )
            }
          >
            <item.icon className="h-4 w-4" />
            <span className="flex-1">{item.label}</span>
            {item.badge !== undefined && item.badge > 0 && (
              <Badge variant="default" className="h-5 min-w-5 px-1.5 text-xs">
                {item.badge}
              </Badge>
            )}
          </NavLink>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
