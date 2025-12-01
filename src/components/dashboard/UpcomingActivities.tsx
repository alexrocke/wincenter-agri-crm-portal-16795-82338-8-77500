import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, MapPin, Wrench, FileText, CheckSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Activity {
  id: string;
  type: 'visit' | 'demo' | 'service' | 'task';
  title: string;
  date: string;
  client?: string;
  status?: string;
  priority?: string;
}

interface UpcomingActivitiesProps {
  activities: Activity[];
}

const activityConfig = {
  visit: { icon: MapPin, label: 'Visita', color: 'bg-info text-info-foreground' },
  demo: { icon: FileText, label: 'Demonstração', color: 'bg-success text-success-foreground' },
  service: { icon: Wrench, label: 'Serviço', color: 'bg-warning text-warning-foreground' },
  task: { icon: CheckSquare, label: 'Tarefa', color: 'bg-primary text-primary-foreground' },
};

const priorityColors = {
  high: 'destructive',
  medium: 'default',
  low: 'secondary',
} as const;

export function UpcomingActivities({ activities }: UpcomingActivitiesProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Próximas Atividades</CardTitle>
        <CardDescription>Suas atividades agendadas</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhuma atividade agendada</p>
            </div>
          ) : (
            activities.map((activity) => {
              const config = activityConfig[activity.type];
              const Icon = config.icon;
              
              return (
                <div key={activity.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                  <div className={`p-2 rounded-lg ${config.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-sm truncate">{activity.title}</p>
                      {activity.priority && (
                        <Badge variant={priorityColors[activity.priority as keyof typeof priorityColors]} className="text-xs">
                          {activity.priority === 'high' ? 'Alta' : activity.priority === 'medium' ? 'Média' : 'Baixa'}
                        </Badge>
                      )}
                    </div>
                    {activity.client && (
                      <p className="text-xs text-muted-foreground truncate">{activity.client}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(activity.date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
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