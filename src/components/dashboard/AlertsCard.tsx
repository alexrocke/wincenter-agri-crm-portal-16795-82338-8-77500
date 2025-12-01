import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Package, Calendar, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

interface Alert {
  id: string;
  type: 'stock' | 'task' | 'budget' | 'visit';
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  count?: number;
  link?: string;
}

interface AlertsCardProps {
  alerts: Alert[];
}

const alertConfig = {
  stock: { icon: Package, color: 'text-destructive' },
  task: { icon: Clock, color: 'text-warning' },
  budget: { icon: Calendar, color: 'text-info' },
  visit: { icon: AlertTriangle, color: 'text-warning' },
};

const severityVariants = {
  high: 'destructive',
  medium: 'default',
  low: 'secondary',
} as const;

export function AlertsCard({ alerts }: AlertsCardProps) {
  const navigate = useNavigate();

  const handleAlertClick = (link?: string) => {
    if (link) navigate(link);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Alertas Importantes</CardTitle>
        <CardDescription>Itens que precisam de atenção</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {alerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum alerta no momento</p>
            </div>
          ) : (
            alerts.map((alert) => {
              const config = alertConfig[alert.type];
              const Icon = config.icon;
              
              return (
                <div
                  key={alert.id}
                  onClick={() => handleAlertClick(alert.link)}
                  className={`flex items-start gap-3 p-3 border rounded-lg ${
                    alert.link ? 'cursor-pointer hover:bg-accent/50' : ''
                  } transition-colors`}
                >
                  <Icon className={`h-5 w-5 mt-0.5 ${config.color}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-sm">{alert.title}</p>
                      {alert.count !== undefined && (
                        <Badge variant={severityVariants[alert.severity]}>
                          {alert.count}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{alert.description}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}