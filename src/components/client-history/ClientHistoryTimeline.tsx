import { useMemo } from 'react';
import { ClientHistoryEvent } from './ClientHistoryEvent';
import { format, startOfMonth, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar } from 'lucide-react';

interface TimelineEvent {
  id: string;
  type: 'visit' | 'demonstration' | 'sale';
  date: Date;
  status: string;
  title?: string;
  description?: string;
  value?: number;
  profit?: number;
  duration?: number;
  notes?: string;
}

interface ClientHistoryTimelineProps {
  events: TimelineEvent[];
  groupByPeriod?: boolean;
}

export function ClientHistoryTimeline({ events, groupByPeriod = true }: ClientHistoryTimelineProps) {
  const groupedEvents = useMemo(() => {
    if (!groupByPeriod) {
      return { 'Todos os eventos': events };
    }

    const now = new Date();
    const groups: Record<string, TimelineEvent[]> = {
      'Esta semana': [],
      'Este mês': []
    };
    
    const olderMonths: Record<string, TimelineEvent[]> = {};

    events.forEach(event => {
      const eventDate = new Date(event.date);
      const daysDiff = Math.floor((now.getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff <= 7) {
        groups['Esta semana'].push(event);
      } else if (isSameMonth(eventDate, now)) {
        groups['Este mês'].push(event);
      } else {
        const monthKey = format(startOfMonth(eventDate), 'MMMM yyyy', { locale: ptBR });
        if (!olderMonths[monthKey]) {
          olderMonths[monthKey] = [];
        }
        olderMonths[monthKey].push(event);
      }
    });

    // Remove grupos vazios
    const filtered: Record<string, TimelineEvent[]> = {};
    if (groups['Esta semana'].length > 0) filtered['Esta semana'] = groups['Esta semana'];
    if (groups['Este mês'].length > 0) filtered['Este mês'] = groups['Este mês'];
    
    Object.entries(olderMonths).forEach(([month, monthEvents]) => {
      if (monthEvents.length > 0) {
        filtered[month] = monthEvents;
      }
    });

    return filtered;
  }, [events, groupByPeriod]);

  if (events.length === 0) {
    return (
      <Card className="animate-fade-in">
        <CardContent className="py-12">
          <div className="text-center space-y-3">
            <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto">
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg">Nenhum evento registrado</h3>
            <p className="text-sm text-muted-foreground">
              O histórico de interações com este cliente aparecerá aqui.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {Object.entries(groupedEvents).map(([period, periodEvents], groupIndex) => (
        <div key={period} className="space-y-4 animate-fade-in" style={{ animationDelay: `${groupIndex * 50}ms` }}>
          {/* Cabeçalho do Período */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
            <div className="flex items-center gap-2 px-3 py-1 bg-muted/50 rounded-full border">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold uppercase tracking-wide">
                {period}
              </span>
              <span className="text-xs text-muted-foreground">
                ({periodEvents.length})
              </span>
            </div>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
          </div>

          {/* Timeline de Eventos */}
          <div className="relative space-y-4 pl-4 md:pl-8">
            {/* Linha Vertical da Timeline */}
            <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-border via-border to-transparent" />
            
            {periodEvents.map((event, index) => (
              <div 
                key={event.id} 
                className="relative animate-fade-in"
                style={{ animationDelay: `${(groupIndex * 100) + (index * 50)}ms` }}
              >
                {/* Ponto na Timeline */}
                <div className={cn(
                  "absolute -left-[4.5px] md:-left-[8.5px] top-8 h-3 w-3 rounded-full border-2 border-background",
                  event.type === 'sale' && "bg-green-500",
                  event.type === 'demonstration' && "bg-blue-500",
                  event.type === 'visit' && "bg-purple-500"
                )} />
                
                <ClientHistoryEvent
                  id={event.id}
                  type={event.type}
                  date={event.date}
                  status={event.status}
                  title={event.title}
                  description={event.description}
                  value={event.value}
                  profit={event.profit}
                  duration={event.duration}
                  notes={event.notes}
                  className="ml-4 md:ml-6"
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
