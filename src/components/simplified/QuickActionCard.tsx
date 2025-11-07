import { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface QuickActionCardProps {
  icon: LucideIcon;
  label: string;
  count?: number;
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  onClick: () => void;
}

const colorClasses = {
  primary: 'text-primary bg-primary/10',
  success: 'text-green-600 bg-green-500/10',
  warning: 'text-yellow-600 bg-yellow-500/10',
  danger: 'text-red-600 bg-red-500/10',
  info: 'text-blue-600 bg-blue-500/10',
};

export function QuickActionCard({ 
  icon: Icon, 
  label, 
  count, 
  color = 'primary',
  onClick 
}: QuickActionCardProps) {
  return (
    <Card 
      className="p-4 hover:shadow-md transition-all active:scale-95 cursor-pointer border-2"
      onClick={onClick}
    >
      <div className="flex flex-col items-center gap-2 text-center">
        <div className={cn(
          "h-14 w-14 rounded-2xl flex items-center justify-center",
          colorClasses[color]
        )}>
          <Icon className="h-7 w-7" />
        </div>
        <span className="text-sm font-semibold">{label}</span>
        {count !== undefined && (
          <span className="text-2xl font-bold text-primary">{count}</span>
        )}
      </div>
    </Card>
  );
}
