import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Target, TrendingUp, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface GoalData {
  id: string;
  level: 'team' | 'seller';
  seller_name?: string;
  sales_goal?: number;
  visits_goal?: number;
  proposals_goal?: number;
  current_sales: number;
  current_visits: number;
  current_proposals: number;
  period_ym: string;
}

interface GoalsProgressProps {
  selectedSeller?: string;
}

export function GoalsProgress({ selectedSeller = 'all' }: GoalsProgressProps) {
  const [goals, setGoals] = useState<GoalData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGoals();
  }, [selectedSeller]);

  const fetchGoals = async () => {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7);

      // Fetch goals
      let goalsQuery = supabase
        .from('goals')
        .select('id, level, seller_auth_id, sales_goal, visits_goal, proposals_goal, period_ym')
        .eq('period_ym', currentMonth);

      if (selectedSeller !== 'all') {
        goalsQuery = goalsQuery.or(`seller_auth_id.eq.${selectedSeller},level.eq.team`);
      }

      const { data: goalsData } = await goalsQuery;

      if (!goalsData) {
        setGoals([]);
        setLoading(false);
        return;
      }

      // Fetch seller names
      const sellerIds = goalsData.filter(g => g.seller_auth_id).map(g => g.seller_auth_id);
      const { data: sellersData } = await supabase
        .from('users')
        .select('auth_user_id, name')
        .in('auth_user_id', sellerIds);

      const sellerNames = new Map(sellersData?.map(s => [s.auth_user_id, s.name]) || []);

      // Fetch current progress
      const processedGoals = await Promise.all(
        goalsData.map(async (goal) => {
          let salesQuery = supabase
            .from('sales')
            .select('gross_value')
            .eq('status', 'closed')
            .gte('sold_at', `${currentMonth}-01`)
            .lt('sold_at', `${getNextMonth(currentMonth)}-01`);

          let visitsQuery = supabase
            .from('visits')
            .select('id')
            .eq('status', 'completed')
            .gte('scheduled_at', `${currentMonth}-01`)
            .lt('scheduled_at', `${getNextMonth(currentMonth)}-01`);

          let opportunitiesQuery = supabase
            .from('opportunities')
            .select('id')
            .in('stage', ['proposal', 'closing'])
            .gte('created_at', `${currentMonth}-01`)
            .lt('created_at', `${getNextMonth(currentMonth)}-01`);

          if (goal.level === 'seller' && goal.seller_auth_id) {
            salesQuery = salesQuery.eq('seller_auth_id', goal.seller_auth_id);
            visitsQuery = visitsQuery.eq('seller_auth_id', goal.seller_auth_id);
            opportunitiesQuery = opportunitiesQuery.eq('seller_auth_id', goal.seller_auth_id);
          }

          const [{ data: salesData }, { data: visitsData }, { data: oppsData }] = await Promise.all([
            salesQuery,
            visitsQuery,
            opportunitiesQuery,
          ]);

          const current_sales = salesData?.reduce((sum, s) => sum + Number(s.gross_value), 0) || 0;
          const current_visits = visitsData?.length || 0;
          const current_proposals = oppsData?.length || 0;

          return {
            ...goal,
            seller_name: goal.seller_auth_id ? sellerNames.get(goal.seller_auth_id) : 'Equipe',
            current_sales,
            current_visits,
            current_proposals,
          };
        })
      );

      setGoals(processedGoals);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching goals:', error);
      setLoading(false);
    }
  };

  const getNextMonth = (ym: string) => {
    const [year, month] = ym.split('-').map(Number);
    if (month === 12) {
      return `${year + 1}-01`;
    }
    return `${year}-${String(month + 1).padStart(2, '0')}`;
  };

  const calculateProgress = (current: number, goal?: number) => {
    if (!goal || goal === 0) return 0;
    return Math.min((current / goal) * 100, 100);
  };

  const getProgressStatus = (progress: number) => {
    if (progress >= 100) return { color: 'bg-success', label: 'Atingido', icon: TrendingUp };
    if (progress >= 70) return { color: 'bg-chart-1', label: 'Em progresso', icon: Target };
    return { color: 'bg-warning', label: 'Atenção', icon: AlertCircle };
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Progresso de Metas</CardTitle>
          <CardDescription>Carregando...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="space-y-2 animate-pulse">
                <div className="h-4 bg-muted rounded w-1/3" />
                <div className="h-2 bg-muted rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (goals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Progresso de Metas</CardTitle>
          <CardDescription>Nenhuma meta configurada para este período</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Progresso de Metas</CardTitle>
        <CardDescription>Acompanhamento em tempo real</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {goals.map((goal) => {
            const salesProgress = calculateProgress(goal.current_sales, goal.sales_goal);
            const visitsProgress = calculateProgress(goal.current_visits, goal.visits_goal);
            const proposalsProgress = calculateProgress(goal.current_proposals, goal.proposals_goal);
            const avgProgress = (salesProgress + visitsProgress + proposalsProgress) / 3;
            const status = getProgressStatus(avgProgress);
            const StatusIcon = status.icon;

            return (
              <div key={goal.id} className="space-y-3 p-4 border rounded-lg bg-gradient-card">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StatusIcon className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">{goal.seller_name}</h3>
                  </div>
                  <Badge variant={avgProgress >= 70 ? 'default' : 'secondary'}>
                    {status.label}
                  </Badge>
                </div>

                {goal.sales_goal && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Vendas</span>
                      <span className="font-medium">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(goal.current_sales)} / {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(goal.sales_goal)}
                      </span>
                    </div>
                    <Progress value={salesProgress} className="h-2" />
                    <div className="text-xs text-muted-foreground text-right">
                      {salesProgress.toFixed(0)}%
                    </div>
                  </div>
                )}

                {goal.visits_goal && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Visitas</span>
                      <span className="font-medium">
                        {goal.current_visits} / {goal.visits_goal}
                      </span>
                    </div>
                    <Progress value={visitsProgress} className="h-2" />
                    <div className="text-xs text-muted-foreground text-right">
                      {visitsProgress.toFixed(0)}%
                    </div>
                  </div>
                )}

                {goal.proposals_goal && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Orçamentos</span>
                      <span className="font-medium">
                        {goal.current_proposals} / {goal.proposals_goal}
                      </span>
                    </div>
                    <Progress value={proposalsProgress} className="h-2" />
                    <div className="text-xs text-muted-foreground text-right">
                      {proposalsProgress.toFixed(0)}%
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
