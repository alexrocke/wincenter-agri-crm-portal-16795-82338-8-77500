import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Search, User } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Client {
  id: string;
  contact_name: string;
  farm_name: string;
  phone: string;
}

interface ClientQuickSelectProps {
  onSelect: (client: Client) => void;
  selectedId?: string;
}

export function ClientQuickSelect({ onSelect, selectedId }: ClientQuickSelectProps) {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);

  useEffect(() => {
    if (user) {
      loadClients();
    }
  }, [user]);

  useEffect(() => {
    if (search.trim() === '') {
      setFilteredClients(clients);
    } else {
      const filtered = clients.filter(client =>
        client.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
        client.farm_name?.toLowerCase().includes(search.toLowerCase()) ||
        client.phone?.includes(search)
      );
      setFilteredClients(filtered);
    }
  }, [search, clients]);

  const loadClients = async () => {
    const { data } = await supabase
      .from('clients')
      .select('id, contact_name, farm_name, phone')
      .eq('seller_auth_id', user!.id)
      .order('contact_name');

    if (data) {
      setClients(data);
      setFilteredClients(data);
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Buscar cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 h-12 text-base"
        />
      </div>

      <ScrollArea className="h-[300px]">
        <div className="space-y-2">
          {filteredClients.map((client) => (
            <Card
              key={client.id}
              className={`p-4 cursor-pointer transition-all hover:shadow-md active:scale-98 ${
                selectedId === client.id ? 'border-primary border-2 bg-primary/5' : ''
              }`}
              onClick={() => onSelect(client)}
            >
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{client.contact_name}</p>
                  {client.farm_name && (
                    <p className="text-xs text-muted-foreground truncate">{client.farm_name}</p>
                  )}
                  {client.phone && (
                    <p className="text-xs text-muted-foreground">{client.phone}</p>
                  )}
                </div>
              </div>
            </Card>
          ))}

          {filteredClients.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhum cliente encontrado</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
