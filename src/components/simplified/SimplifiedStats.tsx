import { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface SimplifiedStatsProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: string;
}

export function SimplifiedStats({ 
  icon: Icon, 
  label, 
  value, 
  trend,
  color = 'text-primary'
}: SimplifiedStatsProps) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs text-muted-foreground mb-1">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
          {trend && (
            <p className={cn(
              "text-xs mt-1",
              trend.isPositive ? "text-green-600" : "text-red-600"
            )}>
              {trend.isPositive ? '+' : ''}{trend.value}%
            </p>
          )}
        </div>
        <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center bg-primary/10", color)}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </Card>
  );
}
