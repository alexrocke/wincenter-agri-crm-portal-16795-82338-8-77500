import { useState } from 'react';
import { SimplifiedLayout } from '@/components/layout/SimplifiedLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Wrench, Calendar, Clock, CheckCircle } from 'lucide-react';
import { FloatingActionButton } from '@/components/simplified/FloatingActionButton';
import { EmptyState } from '@/components/simplified/EmptyState';
import { ClientQuickSelect } from '@/components/simplified/ClientQuickSelect';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function SimplifiedServices() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [serviceType, setServiceType] = useState<string>('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [hectares, setHectares] = useState('');
  const [filter, setFilter] = useState<'scheduled' | 'in_progress' | 'completed'>('scheduled');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    }
  });

  const { data: services = [], isLoading } = useQuery({
    queryKey: ['simplified-services', user?.id, filter],
    queryFn: async () => {
      if (!user?.id) return [];
      
      let query = supabase
        .from('services')
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
        .eq('service_type', 'spraying');

      // Mapear filtro: "Em Andamento" inclui 'open' e 'in_progress'
      if (filter === 'in_progress') {
        query = query.in('status', ['open', 'in_progress']);
      } else {
        query = query.eq('status', filter);
      }

      query = query.order('date', { ascending: filter === 'scheduled' });

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });

  const createServiceMutation = useMutation({
    mutationFn: async (serviceData: any) => {
      const { error } = await supabase
        .from('services')
        .insert([serviceData]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['simplified-services'] });
      toast({ title: 'Serviço agendado com sucesso!' });
      resetForm();
      setIsOpen(false);
    },
    onError: () => {
      toast({ title: 'Erro ao agendar serviço', variant: 'destructive' });
    }
  });

  const updateServiceStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'open' }) => {
      const { error } = await supabase
        .from('services')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['simplified-services'] });
      toast({ title: 'Status atualizado!' });
    }
  });

  const resetForm = () => {
    setSelectedClientId('');
    setServiceType('');
    setDate('');
    setNotes('');
    setHectares('');
  };

  const handleSubmit = () => {
    if (!selectedClientId || !date) {
      toast({ title: 'Preencha os campos obrigatórios', variant: 'destructive' });
      return;
    }

    createServiceMutation.mutate({
      client_id: selectedClientId,
      service_type: 'spraying',
      date,
      notes,
      hectares: hectares ? parseFloat(hectares) : null,
      status: 'scheduled',
      created_by: user?.id,
      assigned_users: [user?.id]
    });
  };

  const getServiceTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      spraying: 'Pulverização',
      maintenance: 'Manutenção',
      revision: 'Revisão'
    };
    return labels[type] || type;
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      scheduled: { label: 'Agendado', color: 'bg-blue-100 text-blue-800' },
      open: { label: 'Em Aberto', color: 'bg-orange-100 text-orange-800' },
      in_progress: { label: 'Em Andamento', color: 'bg-yellow-100 text-yellow-800' },
      completed: { label: 'Concluído', color: 'bg-green-100 text-green-800' }
    };
    const badge = badges[status as keyof typeof badges] || badges.scheduled;
    return <span className={`px-2 py-1 rounded-full text-xs font-semibold ${badge.color}`}>{badge.label}</span>;
  };

  return (
    <SimplifiedLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Serviços</h1>

        {/* Filtros */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <Button
            variant={filter === 'scheduled' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('scheduled')}
          >
            Agendados
          </Button>
          <Button
            variant={filter === 'in_progress' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('in_progress')}
          >
            Em Andamento
          </Button>
          <Button
            variant={filter === 'completed' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('completed')}
          >
            Concluídos
          </Button>
        </div>

        {/* Lista de Serviços */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Card key={i} className="p-4 animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </Card>
            ))}
          </div>
        ) : services.length === 0 ? (
          <EmptyState
            icon={Wrench}
            title="Nenhum serviço encontrado"
            description="Agende um novo serviço para começar"
            actionLabel="Agendar Serviço"
            onAction={() => setIsOpen(true)}
          />
        ) : (
          <div className="space-y-3 pb-24">
            {services.map((service: any) => (
              <Card key={service.id} className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold">{service.clients?.contact_name || 'Cliente'}</h3>
                    <p className="text-sm text-muted-foreground">{getServiceTypeLabel(service.service_type)}</p>
                  </div>
                  {getStatusBadge(service.status)}
                </div>

                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{format(new Date(service.date), "dd 'de' MMMM", { locale: ptBR })}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>{format(new Date(service.date), 'HH:mm')}</span>
                  </div>
                  {service.hectares && (
                    <p className="text-foreground font-medium">{service.hectares} hectares</p>
                  )}
                  {service.notes && (
                    <p className="mt-2 text-foreground">{service.notes}</p>
                  )}
                </div>

                {service.status === 'scheduled' && (
                  <Button
                    size="sm"
                    className="w-full mt-4"
                    onClick={() => updateServiceStatusMutation.mutate({ id: service.id, status: 'open' })}
                  >
                    Iniciar Serviço
                  </Button>
                )}

                {(service.status === 'open' || service.status === 'in_progress') && (
                  <Button
                    size="sm"
                    className="w-full mt-4"
                    onClick={() => updateServiceStatusMutation.mutate({ id: service.id, status: 'completed' })}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Concluir Serviço
                  </Button>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* Sheet de Novo Serviço */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetContent side="bottom" className="h-[90vh]">
            <SheetHeader>
              <SheetTitle>Agendar Novo Serviço</SheetTitle>
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
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                />
              </div>

              <div>
                <Label>Hectares</Label>
                <Input
                  type="number"
                  value={hectares}
                  onChange={(e) => setHectares(e.target.value)}
                  placeholder="Ex: 50"
                  step="0.1"
                />
              </div>

              <div>
                <Label>Observações</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Observações sobre o serviço..."
                  rows={3}
                />
              </div>

              <Button
                onClick={handleSubmit}
                disabled={createServiceMutation.isPending}
                className="w-full"
              >
                {createServiceMutation.isPending ? 'Agendando...' : 'Agendar Serviço'}
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        <FloatingActionButton onClick={() => setIsOpen(true)} label="Agendar Serviço" />
      </div>
    </SimplifiedLayout>
  );
}
