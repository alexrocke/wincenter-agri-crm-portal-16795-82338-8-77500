import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, TrendingUp, Target, Users, Plus, CheckSquare, Wrench, Presentation, MapPin, Briefcase, Calendar, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function SellerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    monthSales: 0,
    avgTicket: 0,
    conversion: 0,
    pendingCommissions: 0,
  });

  const [activities, setActivities] = useState({
    pendingTasks: 0,
    scheduledDemos: 0,
    scheduledServices: 0,
  });

  useEffect(() => {
    if (user) {
      fetchDashboardData();
      fetchActivities();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7);

      // Fetch sales do mês atual (para métricas de desempenho)
      const { data: sales } = await supabase
        .from('sales')
        .select('gross_value')
        .eq('seller_auth_id', user?.id)
        .gte('sold_at', `${currentMonth}-01`)
        .eq('status', 'closed');

      const totalSales = sales?.reduce((sum, s) => sum + Number(s.gross_value), 0) || 0;
      const avgTicket = sales && sales.length > 0 ? totalSales / sales.length : 0;

      // Fetch TODAS as comissões pendentes (sem filtro de data)
      const { data: commissions } = await supabase
        .from('commissions')
        .select('amount')
        .eq('seller_auth_id', user?.id)
        .eq('pay_status', 'pending');

      const pendingComm = commissions?.reduce((sum, c) => sum + Number(c.amount), 0) || 0;

      setStats({
        monthSales: totalSales,
        avgTicket,
        conversion: 0, // TODO: Calculate from opportunities
        pendingCommissions: pendingComm,
      });
    } catch (error) {
      // Silently handle dashboard data errors - UI will show empty state
    }
  };

  const fetchActivities = async () => {
    try {
      // Fetch tarefas pendentes do usuário
      const { count: tasksCount } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .or(`responsible_auth_id.eq.${user?.id},assigned_users.cs.{${user?.id}}`)
        .eq('status', 'pending');

      // Fetch demonstrações agendadas
      const { count: demosCount } = await supabase
        .from('demonstrations')
        .select('*', { count: 'exact', head: true })
        .contains('assigned_users', [user?.id])
        .eq('status', 'scheduled');

      // Fetch serviços agendados
      const { count: servicesCount } = await supabase
        .from('services')
        .select('*', { count: 'exact', head: true })
        .or(`created_by.eq.${user?.id},assigned_users.cs.{${user?.id}}`)
        .eq('status', 'scheduled');

      setActivities({
        pendingTasks: tasksCount || 0,
        scheduledDemos: demosCount || 0,
        scheduledServices: servicesCount || 0,
      });
    } catch (error) {
      // Silently handle activities data errors
    }
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-3 md:mb-4">Estatísticas</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <Card className="aspect-square">
              <CardContent className="flex flex-col items-center justify-center h-full p-3 md:p-4 text-center">
                <DollarSign className="h-6 w-6 md:h-8 md:w-8 mb-2 text-primary" />
                <div className="text-xs md:text-sm text-muted-foreground mb-1">Vendas do Mês</div>
                <div className="text-base md:text-xl font-bold">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(stats.monthSales)}
                </div>
              </CardContent>
            </Card>

            <Card className="aspect-square">
              <CardContent className="flex flex-col items-center justify-center h-full p-3 md:p-4 text-center">
                <TrendingUp className="h-6 w-6 md:h-8 md:w-8 mb-2 text-primary" />
                <div className="text-xs md:text-sm text-muted-foreground mb-1">Ticket Médio</div>
                <div className="text-base md:text-xl font-bold">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(stats.avgTicket)}
                </div>
              </CardContent>
            </Card>

            <Card className="aspect-square">
              <CardContent className="flex flex-col items-center justify-center h-full p-3 md:p-4 text-center">
                <Target className="h-6 w-6 md:h-8 md:w-8 mb-2 text-primary" />
                <div className="text-xs md:text-sm text-muted-foreground mb-1">Taxa de Conversão</div>
                <div className="text-base md:text-xl font-bold">{stats.conversion}%</div>
              </CardContent>
            </Card>

            <Card className="aspect-square">
              <CardContent className="flex flex-col items-center justify-center h-full p-3 md:p-4 text-center">
                <DollarSign className="h-6 w-6 md:h-8 md:w-8 mb-2 text-primary" />
                <div className="text-xs md:text-sm text-muted-foreground mb-1">Comissões Pendentes</div>
                <div className="text-base md:text-xl font-bold">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(stats.pendingCommissions)}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3 md:mb-4">Minhas Atividades</h2>
          <div className="grid grid-cols-3 gap-3 md:gap-4 mb-6">
            <Card className="aspect-square cursor-pointer transition-all hover:shadow-md hover:scale-105" onClick={() => navigate('/seller/tasks')}>
              <CardContent className="flex flex-col items-center justify-center h-full p-3 md:p-4 text-center">
                <CheckSquare className="h-6 w-6 md:h-8 md:w-8 mb-2 text-primary" />
                <div className="text-xs md:text-sm text-muted-foreground mb-1">Tarefas Pendentes</div>
                <div className="text-xl md:text-2xl font-bold">{activities.pendingTasks}</div>
              </CardContent>
            </Card>

            <Card className="aspect-square cursor-pointer transition-all hover:shadow-md hover:scale-105" onClick={() => navigate('/seller/demonstrations/new')}>
              <CardContent className="flex flex-col items-center justify-center h-full p-3 md:p-4 text-center">
                <Presentation className="h-6 w-6 md:h-8 md:w-8 mb-2 text-primary" />
                <div className="text-xs md:text-sm text-muted-foreground mb-1">Demos Agendadas</div>
                <div className="text-xl md:text-2xl font-bold">{activities.scheduledDemos}</div>
              </CardContent>
            </Card>

            <Card className="aspect-square cursor-pointer transition-all hover:shadow-md hover:scale-105" onClick={() => navigate('/seller/services')}>
              <CardContent className="flex flex-col items-center justify-center h-full p-3 md:p-4 text-center">
                <Briefcase className="h-6 w-6 md:h-8 md:w-8 mb-2 text-primary" />
                <div className="text-xs md:text-sm text-muted-foreground mb-1">Serviços Agendados</div>
                <div className="text-xl md:text-2xl font-bold">{activities.scheduledServices}</div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3 md:mb-4">Links Rápidos</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-4 gap-3 md:gap-4">
            {[
              { icon: CheckSquare, label: 'Tarefas', path: '/seller/tasks' },
              { icon: Wrench, label: 'Assistência', path: '/seller/technical-support' },
              { icon: Presentation, label: 'Demonstração', path: '/seller/demonstrations/new' },
              { icon: MapPin, label: 'Visitas', path: '/seller/visits' },
              { icon: Briefcase, label: 'Serviços', path: '/seller/services' },
              { icon: Users, label: 'Clientes', path: '/seller/clients' },
              { icon: TrendingUp, label: 'Orçamentos', path: '/seller/opportunities' },
              { icon: Plus, label: 'Venda', path: '/seller/sales' },
            ].map((item) => (
              <Card
                key={item.path}
                className="aspect-square cursor-pointer transition-all hover:shadow-md hover:scale-105 active:scale-95"
                onClick={() => navigate(item.path)}
              >
                <CardContent className="flex flex-col items-center justify-center h-full p-3 md:p-4">
                  <item.icon className="h-6 w-6 md:h-8 md:w-8 mb-2 text-primary" />
                  <span className="text-xs md:text-sm font-medium text-center leading-tight">
                    {item.label}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
