import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Smartphone, Filter, X } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface ClientAdvancedFiltersProps {
  deviceFilter: 'all' | 'with' | 'without';
  statusFilter: string;
  regionFilter: string;
  onDeviceFilterChange: (filter: 'all' | 'with' | 'without') => void;
  onStatusFilterChange: (status: string) => void;
  onRegionFilterChange: (region: string) => void;
  onClearFilters: () => void;
  totalClients: number;
  clientsWithDevices: number;
  clientsWithoutDevices: number;
  availableRegions: string[];
}

export function ClientAdvancedFilters({
  deviceFilter,
  statusFilter,
  regionFilter,
  onDeviceFilterChange,
  onStatusFilterChange,
  onRegionFilterChange,
  onClearFilters,
  totalClients,
  clientsWithDevices,
  clientsWithoutDevices,
  availableRegions,
}: ClientAdvancedFiltersProps) {
  const hasActiveFilters = deviceFilter !== 'all' || statusFilter !== 'all' || regionFilter !== 'all';

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Filtros</CardTitle>
          </div>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="h-8"
            >
              <X className="h-4 w-4 mr-1" />
              Limpar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Filters - Chips */}
        <div>
          <p className="text-sm font-medium mb-2">Equipamentos</p>
          <div className="flex gap-2 flex-wrap">
            <Badge
              variant={deviceFilter === 'all' ? 'default' : 'outline'}
              className="cursor-pointer transition-colors"
              onClick={() => onDeviceFilterChange('all')}
            >
              Todos ({totalClients})
            </Badge>
            <Badge
              variant={deviceFilter === 'with' ? 'default' : 'outline'}
              className="cursor-pointer transition-colors"
              onClick={() => onDeviceFilterChange('with')}
            >
              <Smartphone className="h-3 w-3 mr-1" />
              Com Dispositivos ({clientsWithDevices})
            </Badge>
            <Badge
              variant={deviceFilter === 'without' ? 'outline' : 'outline'}
              className="cursor-pointer transition-colors"
              onClick={() => onDeviceFilterChange('without')}
            >
              Sem Dispositivos ({clientsWithoutDevices})
            </Badge>
          </div>
        </div>

        <Separator />

        {/* Status Filter */}
        <div>
          <p className="text-sm font-medium mb-2">Status do Relacionamento</p>
          <div className="flex gap-2 flex-wrap">
            <Badge
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              className="cursor-pointer transition-colors"
              onClick={() => onStatusFilterChange('all')}
            >
              Todos
            </Badge>
            <Badge
              variant={statusFilter === 'lead' ? 'default' : 'outline'}
              className="cursor-pointer transition-colors bg-blue-100 text-blue-800 hover:bg-blue-200"
              onClick={() => onStatusFilterChange('lead')}
            >
              Lead
            </Badge>
            <Badge
              variant={statusFilter === 'prospect' ? 'default' : 'outline'}
              className="cursor-pointer transition-colors bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
              onClick={() => onStatusFilterChange('prospect')}
            >
              Prospecto
            </Badge>
            <Badge
              variant={statusFilter === 'customer' ? 'default' : 'outline'}
              className="cursor-pointer transition-colors bg-green-100 text-green-800 hover:bg-green-200"
              onClick={() => onStatusFilterChange('customer')}
            >
              Cliente
            </Badge>
            <Badge
              variant={statusFilter === 'inactive' ? 'default' : 'outline'}
              className="cursor-pointer transition-colors bg-gray-100 text-gray-800 hover:bg-gray-200"
              onClick={() => onStatusFilterChange('inactive')}
            >
              Inativo
            </Badge>
          </div>
        </div>

        {availableRegions.length > 0 && (
          <>
            <Separator />
            {/* Region Filter */}
            <div>
              <p className="text-sm font-medium mb-2">Região</p>
              <Select value={regionFilter} onValueChange={onRegionFilterChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Todas as regiões" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as regiões</SelectItem>
                  {availableRegions.map((region) => (
                    <SelectItem key={region} value={region}>
                      {region}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
