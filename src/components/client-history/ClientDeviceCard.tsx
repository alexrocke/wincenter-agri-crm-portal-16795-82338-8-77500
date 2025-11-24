import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Smartphone, Eye, Edit, Trash2, Calendar, Key, Cpu } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ClientDeviceCardProps {
  device: {
    id: string;
    name: string;
    login?: string;
    password?: string;
    controller_serial?: string;
    drone_serial?: string;
    controller_version?: string;
    drone_version?: string;
    purchase_date?: string;
  };
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  canDelete?: boolean;
}

export function ClientDeviceCard({ 
  device, 
  onView, 
  onEdit, 
  onDelete,
  canDelete = false 
}: ClientDeviceCardProps) {
  return (
    <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 animate-fade-in border-l-4 border-l-blue-500">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          {/* Ícone do Dispositivo */}
          <div className="h-14 w-14 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
            <Smartphone className="h-7 w-7 text-blue-600" />
          </div>

          {/* Conteúdo */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                <h4 className="font-bold text-lg">{device.name}</h4>
                {device.purchase_date && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Calendar className="h-3 w-3" />
                    Comprado em {format(new Date(device.purchase_date), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
                  </p>
                )}
              </div>
              <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-200">
                <Cpu className="h-3 w-3 mr-1" />
                Dispositivo
              </Badge>
            </div>

            {/* Informações do Dispositivo */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {device.controller_serial && (
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">🎮 Controle</p>
                  <p className="text-sm font-medium font-mono">{device.controller_serial}</p>
                  {device.controller_version && (
                    <p className="text-xs text-muted-foreground mt-1">v{device.controller_version}</p>
                  )}
                </div>
              )}

              {device.drone_serial && (
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">🚁 Drone</p>
                  <p className="text-sm font-medium font-mono">{device.drone_serial}</p>
                  {device.drone_version && (
                    <p className="text-xs text-muted-foreground mt-1">v{device.drone_version}</p>
                  )}
                </div>
              )}
            </div>

            {/* Credenciais */}
            {device.login && (
              <div className="bg-primary/5 p-3 rounded-lg border border-primary/20 mb-4">
                <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                  <Key className="h-3 w-3" />
                  Credenciais de Acesso
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Login</p>
                    <p className="text-sm font-medium font-mono">{device.login}</p>
                  </div>
                  {device.password && (
                    <div>
                      <p className="text-xs text-muted-foreground">Senha</p>
                      <p className="text-sm font-medium font-mono">••••••••</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Ações */}
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onView}
                className="flex-1"
              >
                <Eye className="h-4 w-4 mr-2" />
                Ver Detalhes
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onEdit}
              >
                <Edit className="h-4 w-4" />
              </Button>
              {canDelete && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onDelete}
                  className="text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
