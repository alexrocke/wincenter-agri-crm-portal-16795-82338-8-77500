import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { SimplifiedLayout } from '@/components/layout/SimplifiedLayout';
import { QuickActionCard } from '@/components/simplified/QuickActionCard';
import { SimplifiedStats } from '@/components/simplified/SimplifiedStats';
import { useNavigate } from 'react-router-dom';
import { 
  Receipt, 
  ShoppingCart, 
  Users, 
  Package, 
  MapPin, 
  Wrench,
  Droplets,
  LifeBuoy,
  CheckSquare,
  DollarSign,
  TrendingUp,
  Target
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function SimplifiedDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    monthlySales: 0,
    pendingBudgets: 0,
    conversionRate: 0,
    todayTasks: 0,
  });

  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [user]);

  const loadStats = async () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);

    // Vendas do mês
    const { data: salesData } = await supabase
      .from('sales')
      .select('gross_value')
      .eq('seller_auth_id', user!.id)
      .gte('sold_at', firstDay.toISOString());

    const monthlySales = salesData?.reduce((acc, sale) => acc + Number(sale.gross_value), 0) || 0;

    // Orçamentos pendentes
    const { count: budgetsCount } = await supabase
      .from('opportunities')
      .select('*', { count: 'exact', head: true })
      .eq('seller_auth_id', user!.id)
      .in('stage', ['lead', 'qualified', 'proposal']);

    // Tarefas de hoje
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { count: tasksCount } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .contains('assigned_users', [user!.id])
      .eq('status', 'pending')
      .gte('due_at', today.toISOString())
      .lt('due_at', tomorrow.toISOString());

    setStats({
      monthlySales,
      pendingBudgets: budgetsCount || 0,
      conversionRate: 0,
      todayTasks: tasksCount || 0,
    });
  };

  return (
    <SimplifiedLayout>
      <div className="space-y-6">
        {/* Resumo do Dia */}
        <div>
          <h1 className="text-2xl font-bold mb-1">Olá! 👋</h1>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString('pt-BR', { 
              weekday: 'long', 
              day: 'numeric', 
              month: 'long' 
            })}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3">
          <SimplifiedStats
            icon={DollarSign}
            label="Vendas do Mês"
            value={`R$ ${stats.monthlySales.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            color="text-green-600"
          />
          <SimplifiedStats
            icon={Receipt}
            label="Orçamentos"
            value={stats.pendingBudgets}
            color="text-blue-600"
          />
          <SimplifiedStats
            icon={CheckSquare}
            label="Tarefas Hoje"
            value={stats.todayTasks}
            color="text-yellow-600"
          />
          <SimplifiedStats
            icon={Target}
            label="Conversão"
            value={`${stats.conversionRate}%`}
            color="text-purple-600"
          />
        </div>

        {/* Botão de Orçamento Rápido */}
        <Card className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <div className="text-center space-y-3">
            <div className="h-16 w-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto">
              <Receipt className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Orçamento Rápido</h3>
              <p className="text-sm text-muted-foreground">Crie um orçamento em 2 cliques</p>
            </div>
            <Button 
              size="lg" 
              className="w-full h-12"
              onClick={() => navigate('/seller/simple/budgets?quick=true')}
            >
              Criar Orçamento
            </Button>
          </div>
        </Card>

        {/* Ações Rápidas */}
        <div>
          <h2 className="text-lg font-bold mb-3">Ações Rápidas</h2>
          <div className="grid grid-cols-2 gap-3">
            <QuickActionCard
              icon={ShoppingCart}
              label="Vendas"
              color="success"
              onClick={() => navigate('/seller/simple/sales')}
            />
            <QuickActionCard
              icon={Users}
              label="Clientes"
              color="primary"
              onClick={() => navigate('/seller/simple/clients')}
            />
            <QuickActionCard
              icon={Package}
              label="Produtos"
              color="info"
              onClick={() => navigate('/seller/simple/products')}
            />
            <QuickActionCard
              icon={MapPin}
              label="Visitas"
              color="warning"
              onClick={() => navigate('/seller/simple/visits')}
            />
            <QuickActionCard
              icon={Wrench}
              label="Serviços"
              color="info"
              onClick={() => navigate('/seller/simple/services')}
            />
            <QuickActionCard
              icon={Droplets}
              label="Demos"
              color="primary"
              onClick={() => navigate('/seller/simple/demonstrations')}
            />
            <QuickActionCard
              icon={LifeBuoy}
              label="Assistência"
              color="danger"
              onClick={() => navigate('/seller/simple/technical-support')}
            />
            <QuickActionCard
              icon={CheckSquare}
              label="Tarefas"
              color="warning"
              onClick={() => navigate('/seller/simple/tasks')}
            />
          </div>
        </div>
      </div>
    </SimplifiedLayout>
  );
}
