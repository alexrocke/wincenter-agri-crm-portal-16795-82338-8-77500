import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatItem {
  label: string;
  value: string | number;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  suffix?: string;
}

interface ClientHistoryStatsProps {
  stats: StatItem[];
  className?: string;
}

export function ClientHistoryStats({ stats, className }: ClientHistoryStatsProps) {
  return (
    <div className={cn("grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4", className)}>
      {stats.map((stat, index) => (
        <Card key={index} className="hover:shadow-md transition-shadow animate-fade-in">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-2">{stat.label}</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold">
                {stat.value}
              </p>
              {stat.suffix && (
                <p className="text-sm text-muted-foreground">{stat.suffix}</p>
              )}
            </div>
            {stat.trend && (
              <div className="flex items-center gap-1 mt-1">
                {stat.trend.isPositive ? (
                  <TrendingUp className="h-3 w-3 text-green-600" />
                ) : stat.trend.value === 0 ? (
                  <Minus className="h-3 w-3 text-muted-foreground" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-600" />
                )}
                <p className={cn(
                  "text-xs font-medium",
                  stat.trend.isPositive ? "text-green-600" : 
                  stat.trend.value === 0 ? "text-muted-foreground" : "text-red-600"
                )}>
                  {stat.trend.isPositive ? '+' : ''}{stat.trend.value}%
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
