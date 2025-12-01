import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle, Clock, DollarSign } from 'lucide-react';

interface ClientScore {
  total: number;
  engagement: number;
  revenue: number;
  recency: number;
  churnRisk: 'low' | 'medium' | 'high';
  ltv: number;
  metrics: {
    totalSales: number;
    lastInteraction: string | null;
    avgTicket: number;
    totalRevenue: number;
    totalVisits: number;
    totalOpportunities: number;
  };
}

interface ClientScoringCardProps {
  clientId: string;
}

export function ClientScoringCard({ clientId }: ClientScoringCardProps) {
  const [score, setScore] = useState<ClientScore | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    calculateScore();
  }, [clientId]);

  const calculateScore = async () => {
    try {
      // Fetch all client data
      const [salesData, visitsData, oppsData, servicesData] = await Promise.all([
        supabase
          .from('sales')
          .select('gross_value, sold_at')
          .eq('client_id', clientId)
          .eq('status', 'closed'),
        supabase
          .from('visits')
          .select('scheduled_at')
          .eq('client_id', clientId)
          .eq('status', 'completed'),
        supabase
          .from('opportunities')
          .select('created_at, stage')
          .eq('client_id', clientId),
        supabase
          .from('services')
          .select('date')
          .eq('client_id', clientId)
          .eq('status', 'completed'),
      ]);

      const sales = salesData.data || [];
      const visits = visitsData.data || [];
      const opps = oppsData.data || [];
      const services = servicesData.data || [];

      // Calculate metrics
      const totalSales = sales.length;
      const totalRevenue = sales.reduce((sum, s) => sum + Number(s.gross_value), 0);
      const avgTicket = totalSales > 0 ? totalRevenue / totalSales : 0;

      // Get last interaction (most recent: sale, visit, service, opp)
      const allDates = [
        ...sales.map(s => s.sold_at),
        ...visits.map(v => v.scheduled_at),
        ...services.map(s => s.date),
        ...opps.map(o => o.created_at),
      ].filter(Boolean);

      const lastInteraction = allDates.length > 0
        ? allDates.sort().reverse()[0]
        : null;

      // Calculate scores (0-100)
      
      // 1. Revenue Score (30% weight) - Based on total revenue
      const revenueScore = Math.min((totalRevenue / 100000) * 100, 100);

      // 2. Engagement Score (40% weight) - Based on interactions
      const totalInteractions = totalSales + visits.length + services.length + opps.length;
      const engagementScore = Math.min((totalInteractions / 20) * 100, 100);

      // 3. Recency Score (30% weight) - Based on last interaction
      let recencyScore = 0;
      if (lastInteraction) {
        const daysSinceLastInteraction = Math.floor(
          (Date.now() - new Date(lastInteraction).getTime()) / (1000 * 60 * 60 * 24)
        );
        
        if (daysSinceLastInteraction <= 30) recencyScore = 100;
        else if (daysSinceLastInteraction <= 60) recencyScore = 75;
        else if (daysSinceLastInteraction <= 90) recencyScore = 50;
        else if (daysSinceLastInteraction <= 180) recencyScore = 25;
        else recencyScore = 0;
      }

      // Total weighted score
      const totalScore = Math.round(
        (revenueScore * 0.3) + (engagementScore * 0.4) + (recencyScore * 0.3)
      );

      // Calculate churn risk
      let churnRisk: 'low' | 'medium' | 'high' = 'low';
      const daysSinceLastInteraction = lastInteraction
        ? Math.floor((Date.now() - new Date(lastInteraction).getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      if (daysSinceLastInteraction > 180 || totalScore < 30) {
        churnRisk = 'high';
      } else if (daysSinceLastInteraction > 90 || totalScore < 50) {
        churnRisk = 'medium';
      }

      // Calculate LTV (Lifetime Value projection)
      // Simple: avgTicket * expectedPurchasesPerYear * expectedLifetimeYears
      const expectedPurchasesPerYear = totalSales > 0 ? (totalSales / 12) * 12 : 0;
      const ltv = avgTicket * expectedPurchasesPerYear * 3; // 3 years projection

      setScore({
        total: totalScore,
        engagement: Math.round(engagementScore),
        revenue: Math.round(revenueScore),
        recency: Math.round(recencyScore),
        churnRisk,
        ltv,
        metrics: {
          totalSales,
          lastInteraction,
          avgTicket,
          totalRevenue,
          totalVisits: visits.length,
          totalOpportunities: opps.length,
        },
      });
      setLoading(false);
    } catch (error) {
      console.error('Error calculating score:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Score do Cliente</CardTitle>
          <CardDescription>Carregando...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 animate-pulse">
            <div className="h-20 bg-muted rounded" />
            <div className="h-4 bg-muted rounded w-2/3" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!score) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Score do Cliente</CardTitle>
          <CardDescription>Erro ao calcular score</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-success';
    if (score >= 40) return 'text-warning';
    return 'text-destructive';
  };

  const getScoreBg = (score: number) => {
    if (score >= 70) return 'bg-success/10';
    if (score >= 40) return 'bg-warning/10';
    return 'bg-destructive/10';
  };

  const getChurnRiskBadge = (risk: 'low' | 'medium' | 'high') => {
    const variants = {
      low: { variant: 'default' as const, label: 'Baixo Risco', icon: CheckCircle, color: 'text-success' },
      medium: { variant: 'secondary' as const, label: 'Risco Médio', icon: Clock, color: 'text-warning' },
      high: { variant: 'destructive' as const, label: 'Alto Risco', icon: AlertCircle, color: 'text-destructive' },
    };
    const config = variants[risk];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Score do Cliente
          {getChurnRiskBadge(score.churnRisk)}
        </CardTitle>
        <CardDescription>Análise de engajamento e valor</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Score */}
        <div className={`text-center p-6 rounded-lg ${getScoreBg(score.total)}`}>
          <div className={`text-6xl font-bold ${getScoreColor(score.total)}`}>
            {score.total}
          </div>
          <div className="text-sm text-muted-foreground mt-2">Score Geral</div>
        </div>

        {/* Component Scores */}
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Engajamento</span>
              <span className="font-medium">{score.engagement}/100</span>
            </div>
            <Progress value={score.engagement} className="h-2" />
            <div className="text-xs text-muted-foreground mt-1">
              {score.metrics.totalSales} vendas, {score.metrics.totalVisits} visitas
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Receita</span>
              <span className="font-medium">{score.revenue}/100</span>
            </div>
            <Progress value={score.revenue} className="h-2" />
            <div className="text-xs text-muted-foreground mt-1">
              Total: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(score.metrics.totalRevenue)}
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Recência</span>
              <span className="font-medium">{score.recency}/100</span>
            </div>
            <Progress value={score.recency} className="h-2" />
            <div className="text-xs text-muted-foreground mt-1">
              {score.metrics.lastInteraction
                ? `Última interação: ${new Date(score.metrics.lastInteraction).toLocaleDateString('pt-BR')}`
                : 'Sem interações'}
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div>
            <div className="text-xs text-muted-foreground">Ticket Médio</div>
            <div className="text-lg font-semibold">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(score.metrics.avgTicket)}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">LTV Projetado</div>
            <div className="text-lg font-semibold flex items-center gap-1">
              <DollarSign className="h-4 w-4 text-success" />
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(score.ltv)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
