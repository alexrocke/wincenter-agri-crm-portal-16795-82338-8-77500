import { useState, useEffect, useCallback } from 'react';
import { SimplifiedLayout } from '@/components/layout/SimplifiedLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Phone, MessageCircle, MapPin, DollarSign, Users, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { EmptyState } from '@/components/simplified/EmptyState';
import { SearchBar } from '@/components/simplified/SearchBar';
import { FloatingActionButton } from '@/components/simplified/FloatingActionButton';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Client {
  id: string;
  contact_name: string;
  farm_name: string;
  phone: string;
  city: string;
  state: string;
  last_visit?: string;
}

export default function SimplifiedClients() {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [newClientOpen, setNewClientOpen] = useState(false);
  const [newClient, setNewClient] = useState({
    contact_name: '',
    farm_name: '',
    phone: '',
    city: '',
    state: ''
  });

  useEffect(() => {
    if (user?.id) {
      fetchClients();
    }
  }, [user?.id]);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select(`
          id,
          contact_name,
          farm_name,
          phone,
          city,
          state
        `)
        .eq('seller_auth_id', user!.id)
        .order('contact_name');

      if (error) throw error;
      setClients(data || []);
      setFilteredClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error('Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = useCallback((query: string) => {
    if (!query.trim()) {
      setFilteredClients(clients);
      return;
    }
    
    const lowerQuery = query.toLowerCase();
    const filtered = clients.filter(client =>
      client.contact_name.toLowerCase().includes(lowerQuery) ||
      client.farm_name?.toLowerCase().includes(lowerQuery) ||
      client.city?.toLowerCase().includes(lowerQuery)
    );
    setFilteredClients(filtered);
  }, [clients]);

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const handleWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/55${cleanPhone}`, '_blank');
  };

  const handleCreateClient = async () => {
    if (!newClient.contact_name || !newClient.phone) {
      toast.error('Nome e telefone são obrigatórios');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('clients')
        .insert([{
          contact_name: newClient.contact_name,
          farm_name: newClient.farm_name,
          phone: newClient.phone,
          city: newClient.city,
          state: newClient.state,
          seller_auth_id: user!.id,
          relationship_status: 'prospect'
        }])
        .select()
        .single();

      if (error) throw error;
      
      setClients(prev => [...prev, data]);
      setFilteredClients(prev => [...prev, data]);
      setNewClientOpen(false);
      setNewClient({ contact_name: '', farm_name: '', phone: '', city: '', state: '' });
      toast.success('Cliente criado com sucesso!');
    } catch (error) {
      console.error('Error creating client:', error);
      toast.error('Erro ao criar cliente');
    }
  };

  if (loading) {
    return (
      <SimplifiedLayout>
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </SimplifiedLayout>
    );
  }

  if (clients.length === 0) {
    return (
      <SimplifiedLayout>
        <EmptyState
          icon={Users}
          title="Nenhum cliente cadastrado"
          description="Adicione seu primeiro cliente para começar"
          actionLabel="Adicionar Cliente"
          onAction={() => setNewClientOpen(true)}
        />
        <Sheet open={newClientOpen} onOpenChange={setNewClientOpen}>
          <SheetContent side="bottom" className="h-[90vh]">
            <SheetHeader>
              <SheetTitle>Novo Cliente</SheetTitle>
            </SheetHeader>
            <div className="space-y-4 mt-6">
              <div>
                <Label htmlFor="contact_name">Nome do Contato *</Label>
                <Input
                  id="contact_name"
                  value={newClient.contact_name}
                  onChange={(e) => setNewClient({ ...newClient, contact_name: e.target.value })}
                  className="h-12 text-base"
                />
              </div>
              <div>
                <Label htmlFor="farm_name">Nome da Fazenda/Empresa</Label>
                <Input
                  id="farm_name"
                  value={newClient.farm_name}
                  onChange={(e) => setNewClient({ ...newClient, farm_name: e.target.value })}
                  className="h-12 text-base"
                />
              </div>
              <div>
                <Label htmlFor="phone">Telefone *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={newClient.phone}
                  onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                  className="h-12 text-base"
                />
              </div>
              <div>
                <Label htmlFor="city">Cidade</Label>
                <Input
                  id="city"
                  value={newClient.city}
                  onChange={(e) => setNewClient({ ...newClient, city: e.target.value })}
                  className="h-12 text-base"
                />
              </div>
              <div>
                <Label htmlFor="state">Estado</Label>
                <Input
                  id="state"
                  value={newClient.state}
                  onChange={(e) => setNewClient({ ...newClient, state: e.target.value })}
                  maxLength={2}
                  className="h-12 text-base"
                />
              </div>
              <Button onClick={handleCreateClient} size="lg" className="w-full">
                Criar Cliente
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </SimplifiedLayout>
    );
  }

  return (
    <SimplifiedLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Clientes ({filteredClients.length})</h1>
        
        <SearchBar
          placeholder="Buscar clientes..."
          onSearch={handleSearch}
        />

        <div className="space-y-3">
          {filteredClients.map((client) => (
            <Card key={client.id} className="p-4">
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-lg uppercase">{client.contact_name}</h3>
                  {client.farm_name && (
                    <p className="text-sm text-muted-foreground uppercase">{client.farm_name}</p>
                  )}
                  {(client.city || client.state) && (
                    <p className="text-xs text-muted-foreground mt-1 uppercase">
                      {client.city}{client.city && client.state && ', '}{client.state}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => handleCall(client.phone)}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    Ligar
                  </Button>
                  <Button
                    onClick={() => handleWhatsApp(client.phone)}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    WhatsApp
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <FloatingActionButton onClick={() => setNewClientOpen(true)} label="Adicionar Cliente" />

        <Sheet open={newClientOpen} onOpenChange={setNewClientOpen}>
          <SheetContent side="bottom" className="h-[90vh]">
            <SheetHeader>
              <SheetTitle>Novo Cliente</SheetTitle>
            </SheetHeader>
            <div className="space-y-4 mt-6">
              <div>
                <Label htmlFor="contact_name">Nome do Contato *</Label>
                <Input
                  id="contact_name"
                  value={newClient.contact_name}
                  onChange={(e) => setNewClient({ ...newClient, contact_name: e.target.value })}
                  className="h-12 text-base"
                />
              </div>
              <div>
                <Label htmlFor="farm_name">Nome da Fazenda/Empresa</Label>
                <Input
                  id="farm_name"
                  value={newClient.farm_name}
                  onChange={(e) => setNewClient({ ...newClient, farm_name: e.target.value })}
                  className="h-12 text-base"
                />
              </div>
              <div>
                <Label htmlFor="phone">Telefone *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={newClient.phone}
                  onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                  className="h-12 text-base"
                />
              </div>
              <div>
                <Label htmlFor="city">Cidade</Label>
                <Input
                  id="city"
                  value={newClient.city}
                  onChange={(e) => setNewClient({ ...newClient, city: e.target.value })}
                  className="h-12 text-base"
                />
              </div>
              <div>
                <Label htmlFor="state">Estado</Label>
                <Input
                  id="state"
                  value={newClient.state}
                  onChange={(e) => setNewClient({ ...newClient, state: e.target.value })}
                  maxLength={2}
                  className="h-12 text-base"
                />
              </div>
              <Button onClick={handleCreateClient} size="lg" className="w-full">
                Criar Cliente
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </SimplifiedLayout>
  );
}
