import { useState } from 'react';
import { SimplifiedLayout } from '@/components/layout/SimplifiedLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Droplets, Calendar, MapPin, CheckCircle } from 'lucide-react';
import { FloatingActionButton } from '@/components/simplified/FloatingActionButton';
import { EmptyState } from '@/components/simplified/EmptyState';
import { ClientQuickSelect } from '@/components/simplified/ClientQuickSelect';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const DEMO_TYPES = [
  { id: 'field', label: 'Campo' },
  { id: 'equipment', label: 'Equipamento' },
  { id: 'product', label: 'Produto' },
  { id: 'technology', label: 'Tecnologia' }
];

export default function SimplifiedDemonstrations() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [date, setDate] = useState('');
  const [demoTypes, setDemoTypes] = useState<string[]>([]);
  const [crop, setCrop] = useState('');
  const [city, setCity] = useState('');
  const [hectares, setHectares] = useState('');
  const [notes, setNotes] = useState('');
  const [filter, setFilter] = useState<'scheduled' | 'completed' | 'cancelled'>('scheduled');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    }
  });

  const { data: demonstrations = [], isLoading } = useQuery({
    queryKey: ['simplified-demonstrations', user?.id, filter],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('demonstrations')
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
        .eq('status', filter)
        .order('date', { ascending: filter === 'scheduled' });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });

  const createDemoMutation = useMutation({
    mutationFn: async (demoData: any) => {
      const { error } = await supabase
        .from('demonstrations')
        .insert([demoData]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['simplified-demonstrations'] });
      toast({ title: 'Demonstração agendada com sucesso!' });
      resetForm();
      setIsOpen(false);
    },
    onError: () => {
      toast({ title: 'Erro ao agendar demonstração', variant: 'destructive' });
    }
  });

  const updateDemoStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'scheduled' | 'completed' | 'cancelled' | 'in_progress' }) => {
      const { error } = await supabase
        .from('demonstrations')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['simplified-demonstrations'] });
      toast({ title: 'Status atualizado!' });
    }
  });

  const resetForm = () => {
    setSelectedClientId('');
    setDate('');
    setDemoTypes([]);
    setCrop('');
    setCity('');
    setHectares('');
    setNotes('');
  };

  const handleSubmit = () => {
    if (!selectedClientId || !date || demoTypes.length === 0) {
      toast({ title: 'Preencha os campos obrigatórios', variant: 'destructive' });
      return;
    }

    createDemoMutation.mutate({
      client_id: selectedClientId,
      date,
      demo_types: demoTypes,
      crop,
      weather_city: city,
      hectares: hectares ? parseFloat(hectares) : null,
      notes,
      status: 'scheduled',
      assigned_users: [user?.id]
    });
  };

  const toggleDemoType = (type: string) => {
    setDemoTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      scheduled: { label: 'Agendada', color: 'bg-blue-100 text-blue-800' },
      completed: { label: 'Concluída', color: 'bg-green-100 text-green-800' },
      cancelled: { label: 'Cancelada', color: 'bg-red-100 text-red-800' }
    };
    const badge = badges[status as keyof typeof badges] || badges.scheduled;
    return <span className={`px-2 py-1 rounded-full text-xs font-semibold ${badge.color}`}>{badge.label}</span>;
  };

  return (
    <SimplifiedLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Demonstrações</h1>

        {/* Filtros */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <Button
            variant={filter === 'scheduled' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('scheduled')}
          >
            Agendadas
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

        {/* Lista de Demonstrações */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Card key={i} className="p-4 animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </Card>
            ))}
          </div>
        ) : demonstrations.length === 0 ? (
          <EmptyState
            icon={Droplets}
            title="Nenhuma demonstração encontrada"
            description="Agende uma nova demonstração para começar"
            actionLabel="Agendar Demonstração"
            onAction={() => setIsOpen(true)}
          />
        ) : (
          <div className="space-y-3 pb-24">
            {demonstrations.map((demo: any) => (
              <Card key={demo.id} className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold">{demo.clients?.contact_name || 'Cliente'}</h3>
                    {demo.clients?.farm_name && (
                      <p className="text-sm text-muted-foreground">{demo.clients.farm_name}</p>
                    )}
                  </div>
                  {getStatusBadge(demo.status)}
                </div>

                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{format(new Date(demo.date), "dd 'de' MMMM", { locale: ptBR })}</span>
                  </div>
                  {demo.weather_city && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>{demo.weather_city}</span>
                    </div>
                  )}
                  {demo.demo_types && demo.demo_types.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {demo.demo_types.map((type: string) => (
                        <span key={type} className="px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                          {DEMO_TYPES.find(t => t.id === type)?.label || type}
                        </span>
                      ))}
                    </div>
                  )}
                  {demo.crop && (
                    <p className="text-foreground">Cultura: {demo.crop}</p>
                  )}
                  {demo.hectares && (
                    <p className="text-foreground font-medium">{demo.hectares} hectares</p>
                  )}
                </div>

                {demo.status === 'scheduled' && (
                  <Button
                    size="sm"
                    className="w-full mt-4"
                    onClick={() => updateDemoStatusMutation.mutate({ id: demo.id, status: 'completed' })}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Concluir Demonstração
                  </Button>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* Sheet de Nova Demonstração */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Agendar Demonstração</SheetTitle>
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
                <Label>Tipos de Demonstração *</Label>
                <div className="space-y-2 mt-2">
                  {DEMO_TYPES.map(type => (
                    <div key={type.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={type.id}
                        checked={demoTypes.includes(type.id)}
                        onCheckedChange={() => toggleDemoType(type.id)}
                      />
                      <Label htmlFor={type.id} className="cursor-pointer">{type.label}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label>Cultura</Label>
                <Input
                  value={crop}
                  onChange={(e) => setCrop(e.target.value)}
                  placeholder="Ex: Soja, Milho..."
                />
              </div>

              <div>
                <Label>Cidade</Label>
                <Input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Cidade da demonstração"
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
                  placeholder="Detalhes da demonstração..."
                  rows={3}
                />
              </div>

              <Button
                onClick={handleSubmit}
                disabled={createDemoMutation.isPending}
                className="w-full"
              >
                {createDemoMutation.isPending ? 'Agendando...' : 'Agendar Demonstração'}
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        <FloatingActionButton onClick={() => setIsOpen(true)} label="Agendar Demonstração" />
      </div>
    </SimplifiedLayout>
  );
}
