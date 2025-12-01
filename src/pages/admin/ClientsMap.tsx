import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Navigation, Route, Filter } from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { toast } from 'sonner';

interface Client {
  id: string;
  contact_name: string;
  city: string | null;
  state: string | null;
  lat: number | null;
  lng: number | null;
  relationship_status: string;
  hectares: number | null;
}

export default function ClientsMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState('');
  const [tokenConfigured, setTokenConfigured] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkMapboxToken();
  }, []);

  useEffect(() => {
    if (tokenConfigured) {
      fetchClients();
    }
  }, [tokenConfigured]);

  useEffect(() => {
    if (tokenConfigured && clients.length > 0 && mapContainer.current && !map.current) {
      initializeMap();
    }
  }, [tokenConfigured, clients]);

  useEffect(() => {
    applyFilters();
  }, [statusFilter, stateFilter, clients]);

  useEffect(() => {
    if (map.current && filteredClients.length > 0) {
      updateMarkers();
    }
  }, [filteredClients]);

  const checkMapboxToken = async () => {
    try {
      // Check if token is in secrets
      const { data, error } = await supabase.functions.invoke('get-mapbox-token');
      
      if (data?.token) {
        setMapboxToken(data.token);
        setTokenConfigured(true);
      }
    } catch (error) {
      console.log('Mapbox token not configured in secrets');
    }
    setLoading(false);
  };

  const handleTokenSubmit = () => {
    if (mapboxToken && mapboxToken.startsWith('pk.')) {
      setTokenConfigured(true);
      toast.success('Token configurado com sucesso');
    } else {
      toast.error('Token inválido. Deve começar com pk.');
    }
  };

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, contact_name, city, state, lat, lng, relationship_status, hectares')
        .not('lat', 'is', null)
        .not('lng', 'is', null)
        .order('contact_name');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error('Erro ao carregar clientes');
    }
  };

  const applyFilters = () => {
    let filtered = [...clients];

    if (statusFilter !== 'all') {
      filtered = filtered.filter(c => c.relationship_status === statusFilter);
    }

    if (stateFilter !== 'all') {
      filtered = filtered.filter(c => c.state === stateFilter);
    }

    setFilteredClients(filtered);
  };

  const initializeMap = () => {
    if (!mapContainer.current) return;

    mapboxgl.accessToken = mapboxToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-47.9292, -15.7801], // Centro do Brasil
      zoom: 4,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');

    updateMarkers();
  };

  const updateMarkers = () => {
    if (!map.current) return;

    // Remove existing markers
    document.querySelectorAll('.mapboxgl-marker').forEach(marker => marker.remove());

    // Add markers for filtered clients
    const bounds = new mapboxgl.LngLatBounds();

    filteredClients.forEach(client => {
      if (client.lat && client.lng) {
        const color = getStatusColor(client.relationship_status);
        
        const el = document.createElement('div');
        el.className = 'custom-marker';
        el.style.backgroundColor = color;
        el.style.width = '24px';
        el.style.height = '24px';
        el.style.borderRadius = '50%';
        el.style.border = '3px solid white';
        el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
        el.style.cursor = 'pointer';

        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div class="p-2">
            <h3 class="font-semibold text-sm">${client.contact_name}</h3>
            <p class="text-xs text-muted-foreground">${client.city}, ${client.state}</p>
            <p class="text-xs mt-1">Status: ${getStatusLabel(client.relationship_status)}</p>
            ${client.hectares ? `<p class="text-xs">Área: ${client.hectares} ha</p>` : ''}
          </div>
        `);

        new mapboxgl.Marker(el)
          .setLngLat([client.lng, client.lat])
          .setPopup(popup)
          .addTo(map.current!);

        bounds.extend([client.lng, client.lat]);
      }
    });

    // Fit map to show all markers
    if (!bounds.isEmpty()) {
      map.current.fitBounds(bounds, { padding: 50 });
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      prospect: '#f59e0b',
      negotiation: '#3b82f6',
      customer: '#10b981',
      lost: '#ef4444',
    };
    return colors[status] || '#6b7280';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      prospect: 'Prospecto',
      negotiation: 'Negociação',
      customer: 'Cliente',
      lost: 'Perdido',
    };
    return labels[status] || status;
  };

  const calculateRoute = async () => {
    if (filteredClients.length < 2) {
      toast.error('Selecione pelo menos 2 clientes para calcular rota');
      return;
    }

    toast.info('Funcionalidade de roteirização em desenvolvimento');
  };

  const uniqueStates = [...new Set(clients.map(c => c.state).filter(Boolean))].sort();

  if (loading) {
    return (
      <AppLayout>
        <div className="container max-w-7xl mx-auto p-4 md:p-6">
          <div className="text-center py-12">Carregando...</div>
        </div>
      </AppLayout>
    );
  }

  if (!tokenConfigured) {
    return (
      <AppLayout>
        <div className="container max-w-4xl mx-auto p-4 md:p-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Mapa de Clientes</h1>
            <p className="text-muted-foreground">Configure o token do Mapbox para visualizar</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Configuração do Mapbox</CardTitle>
              <CardDescription>
                Você precisa de um token público do Mapbox para usar o mapa.
                <br />
                Obtenha seu token em <a href="https://mapbox.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">mapbox.com</a>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Token Público do Mapbox</Label>
                <Input
                  type="text"
                  placeholder="pk.ey..."
                  value={mapboxToken}
                  onChange={(e) => setMapboxToken(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  O token deve começar com "pk." (token público)
                </p>
              </div>

              <Button onClick={handleTokenSubmit} disabled={!mapboxToken}>
                <MapPin className="mr-2 h-4 w-4" />
                Configurar Token
              </Button>

              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  <strong>Nota:</strong> Para uso em produção, adicione o token como secret do Supabase Edge Function com o nome "MAPBOX_TOKEN"
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Mapa de Clientes</h1>
          <p className="text-muted-foreground">
            Visualize e gerencie a localização dos seus clientes
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Status do Cliente</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="prospect">Prospecto</SelectItem>
                    <SelectItem value="negotiation">Negociação</SelectItem>
                    <SelectItem value="customer">Cliente</SelectItem>
                    <SelectItem value="lost">Perdido</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={stateFilter} onValueChange={setStateFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {uniqueStates.map((state) => (
                      <SelectItem key={state} value={state!}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Ações</Label>
                <Button onClick={calculateRoute} variant="outline" className="w-full">
                  <Route className="mr-2 h-4 w-4" />
                  Otimizar Rota
                </Button>
              </div>
            </div>

            <div className="mt-4 text-sm text-muted-foreground">
              Mostrando {filteredClients.length} de {clients.length} clientes
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <div ref={mapContainer} className="w-full h-[600px] rounded-lg" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Legenda</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-[#f59e0b] border-2 border-white" />
                <span className="text-sm">Prospecto</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-[#3b82f6] border-2 border-white" />
                <span className="text-sm">Negociação</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-[#10b981] border-2 border-white" />
                <span className="text-sm">Cliente</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-[#ef4444] border-2 border-white" />
                <span className="text-sm">Perdido</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
