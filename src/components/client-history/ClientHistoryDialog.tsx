import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, DollarSign, Package, Smartphone, Plus } from 'lucide-react';
import { ClientRelationshipSummary } from './ClientRelationshipSummary';
import { ClientHistoryTimeline } from './ClientHistoryTimeline';
import { ClientHistoryStats } from './ClientHistoryStats';
import { ClientHistoryFilters } from './ClientHistoryFilters';
import { ClientDeviceCard } from './ClientDeviceCard';
import { subDays, subMonths, subYears } from 'date-fns';

interface ClientHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
  history: {
    visits: any[];
    demonstrations: any[];
    sales: any[];
    devices: any[];
  };
  loading: boolean;
  onAddDevice: () => void;
  onViewDevice: (device: any) => void;
  onEditDevice: (device: any) => void;
  onDeleteDevice: (deviceId: string) => void;
  canDeleteDevice: boolean;
  getVisitStatusLabel: (status: string) => string;
  getDemoStatusLabel: (status: string) => string;
  getSaleStatusLabel: (status: string) => string;
}

export function ClientHistoryDialog({
  open,
  onOpenChange,
  clientName,
  history,
  loading,
  onAddDevice,
  onViewDevice,
  onEditDevice,
  onDeleteDevice,
  canDeleteDevice,
  getVisitStatusLabel,
  getDemoStatusLabel,
  getSaleStatusLabel
}: ClientHistoryDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('recent');
  const [viewMode, setViewMode] = useState<'timeline' | 'tabs'>('timeline');

  const processedEvents = useMemo(() => {
    let events: any[] = [
      ...history.visits.map(v => ({
        id: v.id,
        type: 'visit' as const,
        date: new Date(v.scheduled_at),
        status: getVisitStatusLabel(v.status),
        title: v.objective,
        notes: v.notes,
        duration: v.duration_min
      })),
      ...history.demonstrations.map(d => ({
        id: d.id,
        type: 'demonstration' as const,
        date: new Date(d.date),
        status: getDemoStatusLabel(d.status),
        notes: d.notes
      })),
      ...history.sales.map(s => ({
        id: s.id,
        type: 'sale' as const,
        date: new Date(s.sold_at),
        status: getSaleStatusLabel(s.status),
        value: s.gross_value,
        profit: s.estimated_profit
      }))
    ];

    if (searchQuery) {
      events = events.filter(e => 
        e.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.notes?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (dateFilter !== 'all') {
      const now = new Date();
      const cutoff = dateFilter === 'week' ? subDays(now, 7) :
                     dateFilter === 'month' ? subMonths(now, 1) :
                     dateFilter === 'quarter' ? subMonths(now, 3) :
                     dateFilter === 'year' ? subYears(now, 1) : now;
      events = events.filter(e => e.date >= cutoff);
    }

    events.sort((a, b) => sortOrder === 'recent' ? 
      b.date.getTime() - a.date.getTime() : 
      a.date.getTime() - b.date.getTime()
    );

    return events;
  }, [history, searchQuery, dateFilter, sortOrder]);

  const stats = useMemo(() => {
    const totalSales = history.sales.reduce((s, sale) => s + sale.gross_value, 0);
    const totalProfit = history.sales.reduce((s, sale) => s + sale.estimated_profit, 0);
    const allDates = processedEvents.map(e => e.date);
    const clientSince = allDates.length > 0 ? new Date(Math.min(...allDates.map(d => d.getTime()))) : new Date();
    
    return {
      clientSince,
      totalInteractions: processedEvents.length,
      totalSalesValue: totalSales,
      salesTrend: 0,
      salesHistory: []
    };
  }, [history, processedEvents]);

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl">
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-muted rounded" />
            <div className="h-48 bg-muted rounded" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Histórico de {clientName}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <ClientRelationshipSummary {...stats} />
          
          <ClientHistoryFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            dateFilter={dateFilter}
            onDateFilterChange={setDateFilter}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            sortOrder={sortOrder}
            onSortOrderChange={setSortOrder}
            onReset={() => {
              setSearchQuery('');
              setDateFilter('all');
              setStatusFilter('all');
              setSortOrder('recent');
            }}
          />

          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Histórico de Interações</h3>
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'timeline' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('timeline')}
              >
                Timeline
              </Button>
              <Button
                variant={viewMode === 'tabs' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('tabs')}
              >
                Categorias
              </Button>
            </div>
          </div>

          {viewMode === 'timeline' ? (
            <ClientHistoryTimeline events={processedEvents} groupByPeriod />
          ) : (
            <Tabs defaultValue="sales">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="visits">
                  <Calendar className="h-4 w-4 mr-2" />
                  Visitas ({history.visits.length})
                </TabsTrigger>
                <TabsTrigger value="demonstrations">
                  <Package className="h-4 w-4 mr-2" />
                  Demos ({history.demonstrations.length})
                </TabsTrigger>
                <TabsTrigger value="sales">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Vendas ({history.sales.length})
                </TabsTrigger>
                <TabsTrigger value="devices">
                  <Smartphone className="h-4 w-4 mr-2" />
                  Dispositivos ({history.devices.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="visits">
                <ClientHistoryTimeline 
                  events={processedEvents.filter(e => e.type === 'visit')}
                  groupByPeriod={false}
                />
              </TabsContent>

              <TabsContent value="demonstrations">
                <ClientHistoryTimeline 
                  events={processedEvents.filter(e => e.type === 'demonstration')}
                  groupByPeriod={false}
                />
              </TabsContent>

              <TabsContent value="sales">
                <ClientHistoryTimeline 
                  events={processedEvents.filter(e => e.type === 'sale')}
                  groupByPeriod={false}
                />
              </TabsContent>

              <TabsContent value="devices" className="space-y-4">
                <Button onClick={onAddDevice}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Dispositivo
                </Button>
                {history.devices.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                      Nenhum dispositivo registrado
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {history.devices.map(device => (
                      <ClientDeviceCard
                        key={device.id}
                        device={device}
                        onView={() => onViewDevice(device)}
                        onEdit={() => onEditDevice(device)}
                        onDelete={() => onDeleteDevice(device.id)}
                        canDelete={canDeleteDevice}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
