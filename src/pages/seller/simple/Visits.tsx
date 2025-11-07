import { useState } from 'react';
import { SimplifiedLayout } from '@/components/layout/SimplifiedLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MapPin, Calendar, Clock, CheckCircle, XCircle } from 'lucide-react';
import { FloatingActionButton } from '@/components/simplified/FloatingActionButton';
import { EmptyState } from '@/components/simplified/EmptyState';
import { ClientQuickSelect } from '@/components/simplified/ClientQuickSelect';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function SimplifiedVisits() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [objective, setObjective] = useState('');
  const [notes, setNotes] = useState('');
  const [filter, setFilter] = useState<'upcoming' | 'completed' | 'cancelled'>('upcoming');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    }
  });

  const { data: visits = [], isLoading } = useQuery({
    queryKey: ['simplified-visits', user?.id, filter],
    queryFn: async () => {
      if (!user?.id) return [];
      
      let query = supabase
        .from('visits')
        .select(`
          *,
          clients (
            contact_name,
            farm_name,
            city,
            phone,
            whatsapp
          )
        `)
        .order('scheduled_at', { ascending: filter === 'upcoming' });

      if (filter !== 'upcoming') {
        query = query.eq('status', filter);
      } else {
        query = query.eq('status', 'scheduled');
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });

  const createVisitMutation = useMutation({
    mutationFn: async (visitData: any) => {
      const { error } = await supabase
        .from('visits')
        .insert([visitData]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['simplified-visits'] });
      toast({ title: 'Visita agendada com sucesso!' });
      resetForm();
      setIsOpen(false);
    },
    onError: () => {
      toast({ title: 'Erro ao agendar visita', variant: 'destructive' });
    }
  });

  const updateVisitStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'scheduled' | 'completed' | 'cancelled' }) => {
      const { error } = await supabase
        .from('visits')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['simplified-visits'] });
      toast({ title: 'Status atualizado!' });
    }
  });

  const resetForm = () => {
    setSelectedClientId('');
    setScheduledAt('');
    setObjective('');
    setNotes('');
  };

  const handleSubmit = () => {
    if (!selectedClientId || !scheduledAt) {
      toast({ title: 'Preencha os campos obrigatórios', variant: 'destructive' });
      return;
    }

    createVisitMutation.mutate({
      client_id: selectedClientId,
      seller_auth_id: user?.id,
      scheduled_at: scheduledAt,
      objective,
      notes,
      status: 'scheduled'
    });
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      scheduled: { label: 'Agendada', color: 'bg-blue-100 text-blue-800' },
      in_progress: { label: 'Em Andamento', color: 'bg-yellow-100 text-yellow-800' },
      completed: { label: 'Concluída', color: 'bg-green-100 text-green-800' },
      cancelled: { label: 'Cancelada', color: 'bg-red-100 text-red-800' }
    };
    const badge = badges[status as keyof typeof badges] || badges.scheduled;
    return <span className={`px-2 py-1 rounded-full text-xs font-semibold ${badge.color}`}>{badge.label}</span>;
  };

  return (
    <SimplifiedLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Visitas</h1>

        {/* Filtros */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <Button
            variant={filter === 'upcoming' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('upcoming')}
          >
            Próximas
          </Button>
          <Button
            variant={filter === 'completed' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('completed')}
          >
            Concluídas
          </Button>
          <Button
            variant={filter === 'cancelled' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('cancelled')}
          >
            Canceladas
          </Button>
        </div>

        {/* Lista de Visitas */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Card key={i} className="p-4 animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </Card>
            ))}
          </div>
        ) : visits.length === 0 ? (
          <EmptyState
            icon={MapPin}
            title="Nenhuma visita encontrada"
            description="Adicione sua primeira visita para começar"
            actionLabel="Agendar Visita"
            onAction={() => setIsOpen(true)}
          />
        ) : (
          <div className="space-y-3 pb-24">
            {visits.map((visit: any) => (
              <Card key={visit.id} className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold">{visit.clients?.contact_name || 'Cliente'}</h3>
                    {visit.clients?.farm_name && (
                      <p className="text-sm text-muted-foreground">{visit.clients.farm_name}</p>
                    )}
                  </div>
                  {getStatusBadge(visit.status)}
                </div>

                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{format(new Date(visit.scheduled_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>{format(new Date(visit.scheduled_at), 'HH:mm')}</span>
                  </div>
                  {visit.clients?.city && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>{visit.clients.city}</span>
                    </div>
                  )}
                  {visit.objective && (
                    <p className="mt-2 text-foreground">{visit.objective}</p>
                  )}
                </div>

                {visit.status === 'scheduled' && (
                  <div className="flex gap-2 mt-4">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => updateVisitStatusMutation.mutate({ id: visit.id, status: 'completed' })}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Concluir
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => updateVisitStatusMutation.mutate({ id: visit.id, status: 'cancelled' })}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Cancelar
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* Sheet de Nova Visita */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <div style={{ display: 'none' }} />
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[90vh]">
            <SheetHeader>
              <SheetTitle>Agendar Nova Visita</SheetTitle>
            </SheetHeader>

            <div className="space-y-4 mt-6">
              <div>
                <Label>Cliente *</Label>
                <ClientQuickSelect
                  onSelect={(client) => setSelectedClientId(client.id)}
                  selectedId={selectedClientId}
                />
              </div>

              <div>
                <Label>Data e Hora *</Label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                />
              </div>

              <div>
                <Label>Objetivo</Label>
                <Textarea
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  placeholder="Ex: Apresentar novos produtos, fazer levantamento de necessidades..."
                  rows={3}
                />
              </div>

              <div>
                <Label>Observações</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Observações adicionais..."
                  rows={2}
                />
              </div>

              <Button
                onClick={handleSubmit}
                disabled={createVisitMutation.isPending}
                className="w-full"
              >
                {createVisitMutation.isPending ? 'Agendando...' : 'Agendar Visita'}
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        <FloatingActionButton onClick={() => setIsOpen(true)} label="Agendar Visita" />
      </div>
    </SimplifiedLayout>
  );
}
