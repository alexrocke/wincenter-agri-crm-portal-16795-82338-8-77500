import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Smartphone, TrendingUp, Package } from 'lucide-react';

interface ClientDeviceStatsProps {
  totalClients: number;
  clientsWithDevices: number;
  totalDevices: number;
}

export function ClientDeviceStats({ totalClients, clientsWithDevices, totalDevices }: ClientDeviceStatsProps) {
  const deviceRate = totalClients > 0 ? ((clientsWithDevices / totalClients) * 100).toFixed(1) : '0';

  return (
    <div className="grid gap-4 md:grid-cols-3 mb-6">
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Clientes com Equipamentos</CardTitle>
          <Smartphone className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{clientsWithDevices} / {totalClients}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {deviceRate}% da carteira
          </p>
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total de Dispositivos</CardTitle>
          <Package className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalDevices}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Equipamentos cadastrados
          </p>
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Média por Cliente</CardTitle>
          <TrendingUp className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {clientsWithDevices > 0 ? (totalDevices / clientsWithDevices).toFixed(1) : '0'}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Dispositivos/cliente com equip.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
