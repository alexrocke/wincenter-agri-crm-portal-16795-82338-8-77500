import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Calendar, Activity, DollarSign, Target } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface ClientRelationshipSummaryProps {
  clientSince: Date;
  totalInteractions: number;
  totalSalesValue: number;
  lastInteraction?: {
    type: string;
    date: Date;
  };
  nextScheduled?: {
    type: string;
    date: Date;
  };
  salesTrend: number;
  salesHistory?: { value: number }[];
}

export function ClientRelationshipSummary({
  clientSince,
  totalInteractions,
  totalSalesValue,
  lastInteraction,
  nextScheduled,
  salesTrend,
  salesHistory = []
}: ClientRelationshipSummaryProps) {
  const daysSince = Math.floor((new Date().getTime() - clientSince.getTime()) / (1000 * 60 * 60 * 24));
  
  return (
    <Card className="bg-gradient-to-br from-primary/5 via-background to-background border-primary/20 animate-fade-in">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Visão Geral do Relacionamento
            </h3>
            <p className="text-sm text-muted-foreground">Resumo da jornada do cliente</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Tempo de Relacionamento */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Cliente há
            </p>
            <p className="text-2xl font-bold">{daysSince}</p>
            <p className="text-xs text-muted-foreground">dias</p>
          </div>

          {/* Total de Interações */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Activity className="h-3 w-3" />
              Interações
            </p>
            <p className="text-2xl font-bold">{totalInteractions}</p>
            <p className="text-xs text-muted-foreground">total</p>
          </div>

          {/* Valor Total em Vendas */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              Vendas
            </p>
            <p className="text-2xl font-bold">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
              }).format(totalSalesValue)}
            </p>
            <div className="flex items-center gap-1">
              {salesTrend > 0 ? (
                <TrendingUp className="h-3 w-3 text-green-600" />
              ) : salesTrend < 0 ? (
                <TrendingDown className="h-3 w-3 text-red-600" />
              ) : null}
              <p className={`text-xs ${salesTrend > 0 ? 'text-green-600' : salesTrend < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                {salesTrend > 0 ? '+' : ''}{salesTrend}%
              </p>
            </div>
          </div>

          {/* Mini Gráfico de Tendência */}
          {salesHistory.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Tendência</p>
              <ResponsiveContainer width="100%" height={40}>
                <LineChart data={salesHistory}>
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Última Interação e Próxima Ação */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4 pt-4 border-t">
          {lastInteraction && (
            <div className="flex items-start gap-2">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Última Interação</p>
                <p className="text-xs text-muted-foreground truncate">
                  {lastInteraction.type} • {formatDistanceToNow(lastInteraction.date, { addSuffix: true, locale: ptBR })}
                </p>
              </div>
            </div>
          )}
          
          {nextScheduled && (
            <div className="flex items-start gap-2">
              <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
                <Target className="h-5 w-5 text-accent-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Próxima Ação</p>
                <p className="text-xs text-muted-foreground truncate">
                  {nextScheduled.type} • {formatDistanceToNow(nextScheduled.date, { addSuffix: true, locale: ptBR })}
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
