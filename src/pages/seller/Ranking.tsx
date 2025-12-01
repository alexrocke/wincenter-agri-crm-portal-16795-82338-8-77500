import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Trophy, TrendingUp, Target, Users, Award } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface SellerStats {
  auth_user_id: string;
  name: string;
  totalRevenue: number;
  totalSales: number;
  visitsCount: number;
  conversionRate: number;
  newClients: number;
  achievements: string[];
}

const achievementConfig = {
  top_seller: { label: 'Top Vendedor', icon: Trophy, color: 'bg-warning text-warning-foreground' },
  goal_achieved: { label: 'Meta Atingida', icon: Target, color: 'bg-success text-success-foreground' },
  best_conversion: { label: 'Melhor Conversão', icon: TrendingUp, color: 'bg-primary text-primary-foreground' },
  growth: { label: 'Crescimento', icon: TrendingUp, color: 'bg-accent text-accent-foreground' },
  explorer: { label: 'Explorador', icon: Users, color: 'bg-info text-info-foreground' },
};

export default function Ranking() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<string>('month');
  const [rankings, setRankings] = useState<SellerStats[]>([]);
  const [myStats, setMyStats] = useState<SellerStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRankings();
  }, [period]);

  const fetchRankings = async () => {
    setLoading(true);
    try {
      const now = new Date();
      let startDate: Date;

      if (period === 'week') {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (period === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      } else {
        startDate = new Date(now.getFullYear(), 0, 1);
      }

      // Buscar todos os vendedores
      const { data: sellers } = await supabase
        .from('users')
        .select('auth_user_id, name')
        .in('role', ['seller', 'admin'])
        .eq('status', 'active');

      if (!sellers) return;

      const stats: SellerStats[] = [];

      for (const seller of sellers) {
        // Vendas
        const { data: sales } = await supabase
          .from('sales')
          .select('gross_value, client_id')
          .eq('seller_auth_id', seller.auth_user_id)
          .gte('sold_at', startDate.toISOString())
          .eq('status', 'closed');

        // Visitas
        const { data: visits } = await supabase
          .from('visits')
          .select('id')
          .eq('seller_auth_id', seller.auth_user_id)
          .gte('scheduled_at', startDate.toISOString())
          .eq('status', 'completed');

        // Oportunidades
        const { data: opps } = await supabase
          .from('opportunities')
          .select('stage')
          .eq('seller_auth_id', seller.auth_user_id)
          .gte('created_at', startDate.toISOString());

        // Novos clientes
        const { data: clients } = await supabase
          .from('clients')
          .select('id')
          .eq('seller_auth_id', seller.auth_user_id)
          .gte('created_at', startDate.toISOString());

        const totalRevenue = sales?.reduce((sum, s) => sum + Number(s.gross_value), 0) || 0;
        const wonOpps = opps?.filter(o => o.stage === 'won').length || 0;
        const totalOpps = opps?.length || 0;
        const conversionRate = totalOpps > 0 ? (wonOpps / totalOpps) * 100 : 0;

        // Determinar conquistas
        const achievements: string[] = [];
        if (conversionRate > 50) achievements.push('best_conversion');
        if (visits && visits.length >= 10) achievements.push('explorer');

        stats.push({
          auth_user_id: seller.auth_user_id,
          name: seller.name,
          totalRevenue,
          totalSales: sales?.length || 0,
          visitsCount: visits?.length || 0,
          conversionRate,
          newClients: clients?.length || 0,
          achievements,
        });
      }

      // Ordenar por receita
      stats.sort((a, b) => b.totalRevenue - a.totalRevenue);

      // Adicionar conquista de top seller
      if (stats[0]) stats[0].achievements.unshift('top_seller');

      setRankings(stats);
      setMyStats(stats.find(s => s.auth_user_id === user?.id) || null);
    } catch (error) {
      console.error('Erro ao buscar ranking:', error);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">🏆 Ranking de Vendedores</h1>
            <p className="text-muted-foreground">Acompanhe o desempenho da equipe</p>
          </div>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Esta Semana</SelectItem>
              <SelectItem value="month">Este Mês</SelectItem>
              <SelectItem value="year">Este Ano</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {myStats && (
          <Card className="border-primary shadow-glow">
            <CardHeader>
              <CardTitle>Sua Posição</CardTitle>
              <CardDescription>Seu desempenho no período selecionado</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary text-primary-foreground text-2xl font-bold">
                  #{rankings.findIndex(r => r.auth_user_id === user?.id) + 1}
                </div>
                <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Receita</p>
                    <p className="text-lg font-bold">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(myStats.totalRevenue)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Vendas</p>
                    <p className="text-lg font-bold">{myStats.totalSales}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Conversão</p>
                    <p className="text-lg font-bold">{myStats.conversionRate.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Visitas</p>
                    <p className="text-lg font-bold">{myStats.visitsCount}</p>
                  </div>
                </div>
              </div>
              {myStats.achievements.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {myStats.achievements.map(achievement => {
                    const config = achievementConfig[achievement as keyof typeof achievementConfig];
                    const Icon = config.icon;
                    return (
                      <Badge key={achievement} className={`${config.color} gap-1`}>
                        <Icon className="h-3 w-3" />
                        {config.label}
                      </Badge>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Leaderboard</CardTitle>
            <CardDescription>Top vendedores do período</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {rankings.map((seller, index) => (
                <div
                  key={seller.auth_user_id}
                  className={`flex items-center gap-4 p-4 rounded-lg border ${
                    seller.auth_user_id === user?.id ? 'bg-accent/50 border-primary' : 'bg-card'
                  }`}
                >
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted text-xl font-bold">
                    {index === 0 && <Trophy className="h-6 w-6 text-warning" />}
                    {index === 1 && <Award className="h-5 w-5 text-muted-foreground" />}
                    {index === 2 && <Award className="h-5 w-5 text-muted-foreground/70" />}
                    {index > 2 && `#${index + 1}`}
                  </div>
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>{getInitials(seller.name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-semibold">{seller.name}</p>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-1">
                      <span>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(seller.totalRevenue)}
                      </span>
                      <span>{seller.totalSales} vendas</span>
                      <span>{seller.conversionRate.toFixed(1)}% conversão</span>
                      <span>{seller.visitsCount} visitas</span>
                    </div>
                  </div>
                  {seller.achievements.length > 0 && (
                    <div className="flex gap-1">
                      {seller.achievements.slice(0, 3).map(achievement => {
                        const config = achievementConfig[achievement as keyof typeof achievementConfig];
                        const Icon = config.icon;
                        return (
                          <div key={achievement} className={`p-2 rounded-full ${config.color}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}