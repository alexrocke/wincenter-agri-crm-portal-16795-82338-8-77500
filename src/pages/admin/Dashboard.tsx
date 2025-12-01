import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, Users, Package, Target, ShoppingCart } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { SalesChart } from '@/components/dashboard/SalesChart';
import { SalesDistributionChart } from '@/components/dashboard/SalesDistributionChart';
import { ConversionFunnelChart } from '@/components/dashboard/ConversionFunnelChart';
import { RevenueComparisonChart } from '@/components/dashboard/RevenueComparisonChart';
import { GoalsProgress } from '@/components/dashboard/GoalsProgress';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [selectedSeller, setSelectedSeller] = useState<string>('all');
  const [sellers, setSellers] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalSales: 0,
    totalRevenue: 0,
    totalProfit: 0,
    activeSellers: 0,
    totalClients: 0,
    productsInStock: 0,
    pendingCommissions: 0,
    conversionRate: 0,
  });

  const [salesEvolution, setSalesEvolution] = useState<Array<{ month: string; revenue: number; profit: number }>>([]);
  const [salesDistribution, setSalesDistribution] = useState<Array<{ name: string; value: number }>>([]);
  const [conversionFunnel, setConversionFunnel] = useState<Array<{ stage: string; count: number; percentage: number }>>([]);
  const [revenueComparison, setRevenueComparison] = useState<Array<{ name: string; revenue: number; profit: number }>>([]);

  useEffect(() => {
    fetchSellers();
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [selectedSeller]);

  const fetchSellers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, auth_user_id, name')
        .in('role', ['seller', 'admin'])
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setSellers(data || []);
    } catch (error) {
      console.error('Error fetching sellers:', error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7);

      // Fetch sales data with seller filter
      let salesQuery = supabase
        .from('sales')
        .select('gross_value, estimated_profit, status, created_at, seller_auth_id, sold_at')
        .eq('status', 'closed');

      if (selectedSeller !== 'all') {
        salesQuery = salesQuery.eq('seller_auth_id', selectedSeller);
      }

      const { data: sales } = await salesQuery;

      const monthSales = sales?.filter(s => 
        new Date(s.created_at).toISOString().slice(0, 7) === currentMonth
      ) || [];

      const totalRevenue = sales?.reduce((sum, s) => sum + Number(s.gross_value), 0) || 0;
      const totalProfit = sales?.reduce((sum, s) => sum + Number(s.estimated_profit), 0) || 0;

      // Calculate sales evolution (last 6 months)
      const monthsData = new Map<string, { revenue: number; profit: number }>();
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = date.toISOString().slice(0, 7);
        monthsData.set(monthKey, { revenue: 0, profit: 0 });
      }

      sales?.forEach(sale => {
        const monthKey = new Date(sale.sold_at).toISOString().slice(0, 7);
        if (monthsData.has(monthKey)) {
          const data = monthsData.get(monthKey)!;
          data.revenue += Number(sale.gross_value);
          data.profit += Number(sale.estimated_profit);
        }
      });

      const evolution = Array.from(monthsData.entries()).map(([month, data]) => ({
        month: new Date(month + '-01').toLocaleDateString('pt-BR', { month: 'short' }),
        revenue: data.revenue,
        profit: data.profit,
      }));

      setSalesEvolution(evolution);

      // Calculate sales distribution by seller
      const { data: sellersData } = await supabase
        .from('users')
        .select('id, auth_user_id, name')
        .in('role', ['seller', 'admin'])
        .eq('status', 'active');

      const sellerSales = new Map<string, { name: string; value: number }>();
      sellersData?.forEach(seller => {
        sellerSales.set(seller.auth_user_id, { name: seller.name, value: 0 });
      });

      sales?.forEach(sale => {
        if (sellerSales.has(sale.seller_auth_id)) {
          sellerSales.get(sale.seller_auth_id)!.value += Number(sale.gross_value);
        }
      });

      const distribution = Array.from(sellerSales.values())
        .filter(s => s.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

      setSalesDistribution(distribution);

      // Calculate revenue comparison by seller
      const comparison = Array.from(sellerSales.entries())
        .map(([authId, data]) => {
          const sellerProfit = sales?.filter(s => s.seller_auth_id === authId)
            .reduce((sum, s) => sum + Number(s.estimated_profit), 0) || 0;
          return {
            name: data.name,
            revenue: data.value,
            profit: sellerProfit,
          };
        })
        .filter(s => s.revenue > 0)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 6);

      setRevenueComparison(comparison);

      // Fetch users/sellers
      const { data: sellers } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'seller')
        .eq('status', 'active');

      // Fetch clients
      const { data: clients } = await supabase
        .from('clients')
        .select('id');

      // Fetch products
      const { data: products } = await supabase
        .from('products')
        .select('stock')
        .eq('status', 'active')
        .gt('stock', 0);

      // Fetch commissions with seller filter
      let commissionsQuery = supabase
        .from('commissions')
        .select('amount, seller_auth_id')
        .eq('pay_status', 'pending');

      if (selectedSeller !== 'all') {
        commissionsQuery = commissionsQuery.eq('seller_auth_id', selectedSeller);
      }

      const { data: commissions } = await commissionsQuery;

      const pendingComm = commissions?.reduce((sum, c) => sum + Number(c.amount), 0) || 0;

      // Fetch opportunities for conversion rate and funnel with seller filter
      let opportunitiesQuery = supabase
        .from('opportunities')
        .select('stage, seller_auth_id');

      if (selectedSeller !== 'all') {
        opportunitiesQuery = opportunitiesQuery.eq('seller_auth_id', selectedSeller);
      }

      const { data: opportunities } = await opportunitiesQuery;

      const wonOpps = opportunities?.filter(o => o.stage === 'won').length || 0;
      const totalOpps = opportunities?.length || 0;
      const conversionRate = totalOpps > 0 ? (wonOpps / totalOpps) * 100 : 0;

      // Calculate conversion funnel
      const stageLabels: Record<string, string> = {
        lead: 'Lead',
        qualified: 'Qualificado',
        proposal: 'Proposta',
        closing: 'Fechamento',
        won: 'Ganha',
        lost: 'Perdida',
      };

      const stageCounts = new Map<string, number>();
      ['lead', 'qualified', 'proposal', 'closing', 'won'].forEach(stage => {
        stageCounts.set(stage, 0);
      });

      opportunities?.forEach(opp => {
        if (stageCounts.has(opp.stage)) {
          stageCounts.set(opp.stage, stageCounts.get(opp.stage)! + 1);
        }
      });

      const funnel = Array.from(stageCounts.entries()).map(([stage, count]) => ({
        stage: stageLabels[stage],
        count,
        percentage: totalOpps > 0 ? Math.round((count / totalOpps) * 100) : 0,
      }));

      setConversionFunnel(funnel);

      setStats({
        totalSales: sales?.length || 0,
        totalRevenue,
        totalProfit,
        activeSellers: sellers?.length || 0,
        totalClients: clients?.length || 0,
        productsInStock: products?.length || 0,
        pendingCommissions: pendingComm,
        conversionRate,
      });
    } catch (error) {
      // Silently handle dashboard data errors
    }
  };

  return (
    <AppLayout>
      <div className="container max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex flex-col md:flex-row justify-end items-center gap-4">
          <div className="w-full md:w-64">
            <Label htmlFor="seller-filter">Filtrar por Vendedor</Label>
            <Select value={selectedSeller} onValueChange={setSelectedSeller}>
              <SelectTrigger id="seller-filter">
                <SelectValue placeholder="Todos os vendedores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os vendedores</SelectItem>
                {sellers.map((seller) => (
                  <SelectItem key={seller.auth_user_id} value={seller.auth_user_id}>
                    {seller.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(stats.totalRevenue)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.totalSales} vendas totais
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Lucro Estimado</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(stats.totalProfit)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Margem: {stats.totalRevenue > 0 ? ((stats.totalProfit / stats.totalRevenue) * 100).toFixed(1) : 0}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.conversionRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                De orçamentos para vendas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Comissões Pendentes</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(stats.pendingCommissions)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                A pagar aos vendedores
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vendedores Ativos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeSellers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalClients}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Produtos em Estoque</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.productsInStock}</div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <SalesChart data={salesEvolution} />
            <div className="grid gap-4 md:grid-cols-2">
              <SalesDistributionChart data={salesDistribution} />
              <ConversionFunnelChart data={conversionFunnel} />
            </div>
            <RevenueComparisonChart data={revenueComparison} />
          </div>
          <div>
            <GoalsProgress selectedSeller={selectedSeller} />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Gestão Administrativa</CardTitle>
            <CardDescription>Acesse as principais áreas de gerenciamento</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <div 
              onClick={() => navigate('/admin/users-invites')}
              className="flex flex-col gap-2 p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
            >
              <Users className="h-5 w-5 text-primary" />
              <div className="font-medium">Vendedores</div>
              <div className="text-sm text-muted-foreground">Gerenciar equipe</div>
            </div>
            <div 
              onClick={() => navigate('/admin/products')}
              className="flex flex-col gap-2 p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
            >
              <Package className="h-5 w-5 text-primary" />
              <div className="font-medium">Produtos</div>
              <div className="text-sm text-muted-foreground">Catálogo e estoque</div>
            </div>
            <div 
              onClick={() => navigate('/admin/sales')}
              className="flex flex-col gap-2 p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
            >
              <ShoppingCart className="h-5 w-5 text-primary" />
              <div className="font-medium">Vendas</div>
              <div className="text-sm text-muted-foreground">Todas as transações</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
