import { useState } from 'react';
import { SimplifiedLayout } from '@/components/layout/SimplifiedLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { LifeBuoy, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { FloatingActionButton } from '@/components/simplified/FloatingActionButton';
import { EmptyState } from '@/components/simplified/EmptyState';
import { ClientQuickSelect } from '@/components/simplified/ClientQuickSelect';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function SimplifiedTechnicalSupport() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [date, setDate] = useState('');
  const [equipmentModel, setEquipmentModel] = useState('');
  const [equipmentSerial, setEquipmentSerial] = useState('');
  const [reportedDefect, setReportedDefect] = useState('');
  const [notes, setNotes] = useState('');
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

  const { data: technicalSupports = [], isLoading } = useQuery({
    queryKey: ['simplified-technical-support', user?.id, filter],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('services')
        .select(`
          *,
          clients (
            contact_name,
            farm_name,
            city
          )
        `)
        .in('service_type', ['maintenance', 'revision'])
        .contains('assigned_users', [user.id])
        .eq('status', filter)
        .order('date', { ascending: filter === 'scheduled' });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });

  const createSupportMutation = useMutation({
    mutationFn: async (supportData: any) => {
      const { error } = await supabase
        .from('services')
        .insert([supportData]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['simplified-technical-support'] });
      toast({ title: 'Chamado aberto com sucesso!' });
      resetForm();
      setIsOpen(false);
    },
    onError: () => {
      toast({ title: 'Erro ao abrir chamado', variant: 'destructive' });
    }
  });

  const updateSupportStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'open' }) => {
      const { error } = await supabase
        .from('services')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['simplified-technical-support'] });
      toast({ title: 'Status atualizado!' });
    }
  });

  const resetForm = () => {
    setSelectedClientId('');
    setDate('');
    setEquipmentModel('');
    setEquipmentSerial('');
    setReportedDefect('');
    setNotes('');
  };

  const handleSubmit = () => {
    if (!selectedClientId || !date || !reportedDefect) {
      toast({ title: 'Preencha os campos obrigatórios', variant: 'destructive' });
      return;
    }

    createSupportMutation.mutate({
      client_id: selectedClientId,
      service_type: 'maintenance',
      date,
      equipment_model: equipmentModel,
      equipment_serial: equipmentSerial,
      reported_defect: reportedDefect,
      notes,
      status: 'scheduled',
      created_by: user?.id,
      assigned_users: [user?.id]
    });
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      scheduled: { label: 'Agendado', color: 'bg-blue-100 text-blue-800', icon: Clock },
      in_progress: { label: 'Em Andamento', color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
      completed: { label: 'Concluído', color: 'bg-green-100 text-green-800', icon: CheckCircle }
    };
    const badge = badges[status as keyof typeof badges] || badges.scheduled;
    const Icon = badge.icon;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${badge.color}`}>
        <Icon className="h-3 w-3" />
        {badge.label}
      </span>
    );
  };

  return (
    <SimplifiedLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Assistência Técnica</h1>

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

        {/* Lista de Chamados */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Card key={i} className="p-4 animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </Card>
            ))}
          </div>
        ) : technicalSupports.length === 0 ? (
          <EmptyState
            icon={LifeBuoy}
            title="Nenhum chamado encontrado"
            description="Abra um novo chamado de assistência técnica"
            actionLabel="Abrir Chamado"
            onAction={() => setIsOpen(true)}
          />
        ) : (
          <div className="space-y-3 pb-24">
            {technicalSupports.map((support: any) => (
              <Card key={support.id} className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold">{support.clients?.contact_name || 'Cliente'}</h3>
                    {support.clients?.farm_name && (
                      <p className="text-sm text-muted-foreground">{support.clients.farm_name}</p>
                    )}
                  </div>
                  {getStatusBadge(support.status)}
                </div>

                {support.equipment_model && (
                  <div className="bg-muted/50 p-2 rounded mb-3">
                    <p className="text-sm font-medium">Equipamento: {support.equipment_model}</p>
                    {support.equipment_serial && (
                      <p className="text-xs text-muted-foreground">Série: {support.equipment_serial}</p>
                    )}
                  </div>
                )}

                {support.reported_defect && (
                  <div className="mb-3">
                    <p className="text-sm font-medium text-muted-foreground">Defeito Relatado:</p>
                    <p className="text-sm text-foreground">{support.reported_defect}</p>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  Agendado para: {format(new Date(support.date), "dd/MM/yyyy 'às' HH:mm")}
                </p>

                {support.status === 'scheduled' && (
                  <Button
                    size="sm"
                    className="w-full mt-3"
                    onClick={() => updateSupportStatusMutation.mutate({ id: support.id, status: 'in_progress' })}
                  >
                    Iniciar Atendimento
                  </Button>
                )}

                {support.status === 'in_progress' && (
                  <Button
                    size="sm"
                    className="w-full mt-3"
                    onClick={() => updateSupportStatusMutation.mutate({ id: support.id, status: 'completed' })}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Concluir Atendimento
                  </Button>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* Sheet de Novo Chamado */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Abrir Chamado</SheetTitle>
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
                <Label>Modelo do Equipamento</Label>
                <Input
                  value={equipmentModel}
                  onChange={(e) => setEquipmentModel(e.target.value)}
                  placeholder="Ex: Pulverizador XYZ 3000"
                />
              </div>

              <div>
                <Label>Número de Série</Label>
                <Input
                  value={equipmentSerial}
                  onChange={(e) => setEquipmentSerial(e.target.value)}
                  placeholder="Número de série do equipamento"
                />
              </div>

              <div>
                <Label>Defeito Relatado *</Label>
                <Textarea
                  value={reportedDefect}
                  onChange={(e) => setReportedDefect(e.target.value)}
                  placeholder="Descreva o problema reportado pelo cliente..."
                  rows={4}
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
                disabled={createSupportMutation.isPending}
                className="w-full"
              >
                {createSupportMutation.isPending ? 'Abrindo...' : 'Abrir Chamado'}
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        <FloatingActionButton onClick={() => setIsOpen(true)} label="Abrir Chamado" />
      </div>
    </SimplifiedLayout>
  );
}
