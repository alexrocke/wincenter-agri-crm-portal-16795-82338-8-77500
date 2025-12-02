import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Smartphone, Eye, Phone, MessageCircle, ChevronRight } from 'lucide-react';

interface ClientWithDevice {
  id: string;
  farm_name: string;
  contact_name: string;
  phone?: string;
  whatsapp?: string;
  city?: string;
  state?: string;
  device_count: number;
  relationship_status: string;
}

interface ClientsWithDevicesSectionProps {
  clients: ClientWithDevice[];
  onViewClient: (clientId: string) => void;
  onCall?: (phone: string) => void;
  onWhatsApp?: (phone: string) => void;
}

export function ClientsWithDevicesSection({ 
  clients, 
  onViewClient,
  onCall,
  onWhatsApp
}: ClientsWithDevicesSectionProps) {
  const displayClients = clients.slice(0, 5);
  const hasMore = clients.length > 5;

  if (clients.length === 0) {
    return null;
  }

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            <CardTitle>Clientes com Equipamentos ({clients.length})</CardTitle>
          </div>
          {hasMore && (
            <Button variant="ghost" size="sm">
              Ver Todos
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {displayClients.map((client) => (
            <Card 
              key={client.id} 
              className="hover:shadow-md transition-shadow cursor-pointer border-border/50"
              onClick={() => onViewClient(client.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold truncate uppercase">{client.farm_name}</h3>
                      <Badge variant="secondary" className="shrink-0">
                        <Smartphone className="h-3 w-3 mr-1" />
                        {client.device_count} {client.device_count === 1 ? 'dispositivo' : 'dispositivos'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground uppercase">{client.contact_name}</p>
                    {(client.city || client.state) && (
                      <p className="text-xs text-muted-foreground mt-1 uppercase">
                        {client.city}{client.city && client.state ? ', ' : ''}{client.state}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1 ml-2">
                    {client.phone && onCall && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCall(client.phone!);
                        }}
                      >
                        <Phone className="h-4 w-4" />
                      </Button>
                    )}
                    {client.whatsapp && onWhatsApp && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-green-600 hover:text-green-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          onWhatsApp(client.whatsapp!);
                        }}
                      >
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewClient(client.id);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {hasMore && (
            <p className="text-sm text-muted-foreground text-center py-2">
              + {clients.length - 5} clientes com equipamentos
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
