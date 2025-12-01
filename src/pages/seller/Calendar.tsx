import { useState, useEffect, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar as BigCalendar, dateFnsLocalizer, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { MapPin, FileText, Wrench, CheckSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const locales = { 'pt-BR': ptBR };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'visit' | 'demo' | 'service' | 'task';
  resource: any;
}

const eventTypeConfig = {
  visit: { label: 'Visita', icon: MapPin, color: 'bg-info text-info-foreground' },
  demo: { label: 'Demonstração', icon: FileText, color: 'bg-success text-success-foreground' },
  service: { label: 'Serviço', icon: Wrench, color: 'bg-warning text-warning-foreground' },
  task: { label: 'Tarefa', icon: CheckSquare, color: 'bg-primary text-primary-foreground' },
};

export default function Calendar() {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<CalendarEvent[]>([]);
  const [activeFilters, setActiveFilters] = useState<string[]>(['visit', 'demo', 'service', 'task']);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [view, setView] = useState<View>('month');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchEvents();
    }
  }, [user]);

  useEffect(() => {
    setFilteredEvents(events.filter(e => activeFilters.includes(e.type)));
  }, [events, activeFilters]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const allEvents: CalendarEvent[] = [];

      // Buscar visitas
      const { data: visits } = await supabase
        .from('visits')
        .select('*, clients(contact_name)')
        .eq('seller_auth_id', user!.id)
        .not('scheduled_at', 'is', null);

      visits?.forEach(visit => {
        const start = new Date(visit.scheduled_at!);
        allEvents.push({
          id: `visit-${visit.id}`,
          title: `Visita: ${(visit.clients as any)?.contact_name || 'Cliente'}`,
          start,
          end: new Date(start.getTime() + 60 * 60 * 1000),
          type: 'visit',
          resource: visit,
        });
      });

      // Buscar demonstrações
      const { data: demos } = await supabase
        .from('demonstrations')
        .select('*, clients(contact_name)')
        .contains('assigned_users', [user!.id]);

      demos?.forEach(demo => {
        const start = new Date(demo.date);
        allEvents.push({
          id: `demo-${demo.id}`,
          title: `Demo: ${(demo.clients as any)?.contact_name || 'Cliente'}`,
          start,
          end: new Date(start.getTime() + 2 * 60 * 60 * 1000),
          type: 'demo',
          resource: demo,
        });
      });

      // Buscar serviços
      const { data: services } = await supabase
        .from('services')
        .select('*, clients(contact_name)')
        .contains('assigned_users', [user!.id]);

      services?.forEach(service => {
        const start = new Date(service.date);
        allEvents.push({
          id: `service-${service.id}`,
          title: `Serviço: ${(service.clients as any)?.contact_name || 'Cliente'}`,
          start,
          end: new Date(start.getTime() + 3 * 60 * 60 * 1000),
          type: 'service',
          resource: service,
        });
      });

      // Buscar tarefas
      const { data: tasks } = await supabase
        .from('tasks')
        .select('*, clients(contact_name)')
        .contains('assigned_users', [user!.id]);

      tasks?.forEach(task => {
        const start = new Date(task.due_at);
        allEvents.push({
          id: `task-${task.id}`,
          title: task.title,
          start,
          end: new Date(start.getTime() + 30 * 60 * 1000),
          type: 'task',
          resource: task,
        });
      });

      setEvents(allEvents);
    } catch (error) {
      console.error('Erro ao buscar eventos:', error);
      toast.error('Erro ao carregar calendário');
    } finally {
      setLoading(false);
    }
  };

  const toggleFilter = (type: string) => {
    setActiveFilters(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const eventStyleGetter = (event: CalendarEvent) => {
    const config = eventTypeConfig[event.type];
    return {
      style: {
        backgroundColor: 'hsl(var(--primary))',
        borderRadius: '4px',
        opacity: 0.9,
        color: 'white',
        border: 'none',
        display: 'block',
      },
    };
  };

  const messages = {
    today: 'Hoje',
    previous: 'Anterior',
    next: 'Próximo',
    month: 'Mês',
    week: 'Semana',
    day: 'Dia',
    agenda: 'Agenda',
    date: 'Data',
    time: 'Hora',
    event: 'Evento',
    noEventsInRange: 'Nenhum evento neste período',
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Calendário de Atividades</h1>
            <p className="text-muted-foreground">Visão unificada de todas as suas atividades</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
            <CardDescription>Selecione os tipos de atividades para visualizar</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(eventTypeConfig).map(([type, config]) => {
                const Icon = config.icon;
                return (
                  <Button
                    key={type}
                    variant={activeFilters.includes(type) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleFilter(type)}
                    className="gap-2"
                  >
                    <Icon className="h-4 w-4" />
                    {config.label}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div style={{ height: '700px' }}>
              <BigCalendar
                localizer={localizer}
                events={filteredEvents}
                startAccessor="start"
                endAccessor="end"
                view={view}
                onView={setView}
                views={['month', 'week', 'day', 'agenda']}
                messages={messages}
                culture="pt-BR"
                eventPropGetter={eventStyleGetter}
                onSelectEvent={(event) => setSelectedEvent(event)}
              />
            </div>
          </CardContent>
        </Card>

        <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedEvent?.title}</DialogTitle>
              <DialogDescription>
                {selectedEvent && format(selectedEvent.start, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </DialogDescription>
            </DialogHeader>
            {selectedEvent && (
              <div className="space-y-4">
                <Badge className={eventTypeConfig[selectedEvent.type].color}>
                  {eventTypeConfig[selectedEvent.type].label}
                </Badge>
                <div className="text-sm text-muted-foreground">
                  <p>Detalhes completos disponíveis na página específica de cada tipo de atividade.</p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}