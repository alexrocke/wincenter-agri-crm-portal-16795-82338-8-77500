import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, DollarSign, Package, TrendingUp, MapPin, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ClientHistoryEventProps {
  id: string;
  type: 'visit' | 'demonstration' | 'sale';
  date: Date;
  status: string;
  title?: string;
  description?: string;
  value?: number;
  profit?: number;
  duration?: number;
  location?: string;
  notes?: string;
  onViewDetails?: () => void;
  className?: string;
}

export function ClientHistoryEvent({
  type,
  date,
  status,
  title,
  description,
  value,
  profit,
  duration,
  location,
  notes,
  onViewDetails,
  className
}: ClientHistoryEventProps) {
  const getTypeConfig = () => {
    switch (type) {
      case 'sale':
        return {
          icon: DollarSign,
          label: 'VENDA',
          colorClass: 'bg-green-500/10 text-green-700 dark:text-green-400',
          iconBgClass: 'bg-green-500/10',
          iconColorClass: 'text-green-600'
        };
      case 'demonstration':
        return {
          icon: Package,
          label: 'DEMONSTRAÇÃO',
          colorClass: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
          iconBgClass: 'bg-blue-500/10',
          iconColorClass: 'text-blue-600'
        };
      case 'visit':
        return {
          icon: Calendar,
          label: 'VISITA',
          colorClass: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
          iconBgClass: 'bg-purple-500/10',
          iconColorClass: 'text-purple-600'
        };
    }
  };

  const getStatusConfig = (status: string) => {
    const lowerStatus = status.toLowerCase();
    if (lowerStatus.includes('complete') || lowerStatus.includes('conclu') || lowerStatus === 'closed') {
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    }
    if (lowerStatus.includes('cancel')) {
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    }
    if (lowerStatus.includes('scheduled') || lowerStatus.includes('agend')) {
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    }
    return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
  };

  const config = getTypeConfig();
  const Icon = config.icon;

  return (
    <Card className={cn(
      "hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 animate-fade-in border-l-4",
      type === 'sale' && 'border-l-green-500',
      type === 'demonstration' && 'border-l-blue-500',
      type === 'visit' && 'border-l-purple-500',
      className
    )}>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          {/* Ícone Grande */}
          <div className={cn(
            "h-14 w-14 rounded-xl flex items-center justify-center flex-shrink-0",
            config.iconBgClass
          )}>
            <Icon className={cn("h-7 w-7", config.iconColorClass)} />
          </div>

          {/* Conteúdo */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className={cn("text-xs font-semibold", config.colorClass)}>
                    {config.label}
                  </Badge>
                  <Badge className={getStatusConfig(status)}>
                    {status}
                  </Badge>
                </div>
                <h4 className="font-semibold text-lg">
                  {title || format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </h4>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {format(date, "HH:mm", { locale: ptBR })}
                </p>
              </div>
            </div>

            {description && (
              <p className="text-sm text-muted-foreground mb-3">{description}</p>
            )}

            {/* Informações Específicas */}
            <div className="flex flex-wrap gap-4 mb-3">
              {value !== undefined && (
                <div>
                  <p className="text-xs text-muted-foreground">Valor Total</p>
                  <p className="text-xl font-bold text-primary">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(value)}
                  </p>
                </div>
              )}

              {profit !== undefined && profit > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    Lucro Estimado
                  </p>
                  <p className="text-lg font-semibold text-green-600">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(profit)}
                  </p>
                </div>
              )}

              {duration && (
                <div>
                  <p className="text-xs text-muted-foreground">Duração</p>
                  <p className="text-sm font-medium">{duration} minutos</p>
                </div>
              )}

              {location && (
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    Localização
                  </p>
                  <p className="text-sm font-medium">{location}</p>
                </div>
              )}
            </div>

            {notes && (
              <div className="mt-3 p-3 bg-muted/50 rounded-lg border">
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  Observações
                </p>
                <p className="text-sm">{notes}</p>
              </div>
            )}

            {onViewDetails && (
              <div className="mt-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onViewDetails}
                  className="hover-scale"
                >
                  Ver Detalhes
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
