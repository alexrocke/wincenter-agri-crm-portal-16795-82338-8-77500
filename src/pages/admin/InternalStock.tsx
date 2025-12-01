import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { Package, AlertTriangle, TrendingDown, DollarSign, Eye, Calendar } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface InternalProduct {
  id: string;
  name: string;
  sku: string | null;
  internal_category: string | null;
  stock: number;
  cost: number;
  low_stock_threshold: number;
}

interface UsageHistory {
  id: string;
  qty: number;
  charged_to_client: boolean;
  unit_price: number | null;
  created_at: string;
  service: {
    date: string;
    service_type: string;
    client: {
      contact_name: string;
    };
  };
}

interface MonthlyConsumption {
  month: string;
  quantity: number;
}

interface ProductUsage {
  name: string;
  total: number;
}

interface CategoryDistribution {
  category: string;
  count: number;
  value: number;
}

export default function InternalStock() {
  const [products, setProducts] = useState<InternalProduct[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyConsumption[]>([]);
  const [topProducts, setTopProducts] = useState<ProductUsage[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryDistribution[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<InternalProduct | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [usageHistory, setUsageHistory] = useState<UsageHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([
      fetchProducts(),
      fetchMonthlyConsumption(),
      fetchTopProducts(),
      fetchCategoryDistribution(),
    ]);
    setLoading(false);
  };

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, sku, internal_category, stock, cost, low_stock_threshold')
      .eq('is_internal', true)
      .order('name');

    if (!error && data) {
      setProducts(data);
    }
  };

  const fetchMonthlyConsumption = async () => {
    const sixMonthsAgo = subMonths(new Date(), 5);
    
    const { data, error } = await supabase
      .from('service_internal_items')
      .select('qty, created_at')
      .gte('created_at', sixMonthsAgo.toISOString());

    if (!error && data) {
      const monthlyMap = new Map<string, number>();
      
      // Initialize last 6 months
      for (let i = 5; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const key = format(date, 'MMM/yy', { locale: ptBR });
        monthlyMap.set(key, 0);
      }

      // Aggregate data
      data.forEach(item => {
        const key = format(new Date(item.created_at), 'MMM/yy', { locale: ptBR });
        monthlyMap.set(key, (monthlyMap.get(key) || 0) + item.qty);
      });

      const chartData = Array.from(monthlyMap.entries()).map(([month, quantity]) => ({
        month,
        quantity,
      }));

      setMonthlyData(chartData);
    }
  };

  const fetchTopProducts = async () => {
    const { data, error } = await supabase
      .from('service_internal_items')
      .select(`
        qty,
        product_id,
        products!inner(name, is_internal)
      `)
      .eq('products.is_internal', true);

    if (!error && data) {
      const usageMap = new Map<string, number>();
      
      data.forEach((item: any) => {
        const name = item.products.name;
        usageMap.set(name, (usageMap.get(name) || 0) + item.qty);
      });

      const sorted = Array.from(usageMap.entries())
        .map(([name, total]) => ({ name, total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);

      setTopProducts(sorted);
    }
  };

  const fetchCategoryDistribution = async () => {
    const { data: items, error } = await supabase
      .from('service_internal_items')
      .select(`
        qty,
        product_id,
        products!inner(internal_category, is_internal, cost)
      `)
      .eq('products.is_internal', true);

    if (!error && items) {
      const categoryMap = new Map<string, { count: number; value: number }>();
      
      items.forEach((item: any) => {
        const category = item.products.internal_category || 'Sem categoria';
        const existing = categoryMap.get(category) || { count: 0, value: 0 };
        categoryMap.set(category, {
          count: existing.count + item.qty,
          value: existing.value + (item.qty * item.products.cost),
        });
      });

      const chartData = Array.from(categoryMap.entries()).map(([category, data]) => ({
        category,
        count: data.count,
        value: data.value,
      }));

      setCategoryData(chartData);
    }
  };

  const fetchUsageHistory = async (productId: string) => {
    const { data, error } = await supabase
      .from('service_internal_items')
      .select(`
        id,
        qty,
        charged_to_client,
        unit_price,
        created_at,
        service_id,
        services!inner(
          date,
          service_type,
          client_id,
          clients!inner(contact_name)
        )
      `)
      .eq('product_id', productId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      const formatted = data.map((item: any) => ({
        id: item.id,
        qty: item.qty,
        charged_to_client: item.charged_to_client,
        unit_price: item.unit_price,
        created_at: item.created_at,
        service: {
          date: item.services.date,
          service_type: item.services.service_type,
          client: {
            contact_name: item.services.clients.contact_name,
          },
        },
      }));
      setUsageHistory(formatted);
    }
  };

  const handleViewHistory = (product: InternalProduct) => {
    setSelectedProduct(product);
    fetchUsageHistory(product.id);
    setHistoryOpen(true);
  };

  // Statistics
  const totalItems = products.length;
  const lowStockItems = products.filter(p => p.stock <= p.low_stock_threshold);
  const monthlyConsumption = monthlyData[monthlyData.length - 1]?.quantity || 0;
  const monthlyCost = products.reduce((sum, p) => {
    const avgMonthly = monthlyConsumption / (totalItems || 1);
    return sum + (avgMonthly * p.cost);
  }, 0);

  // Prediction
  const getProductPrediction = (product: InternalProduct) => {
    const last30Days = monthlyData.slice(-1)[0]?.quantity || 0;
    const productShare = 1 / (totalItems || 1);
    const avgDaily = (last30Days * productShare) / 30;
    
    if (avgDaily === 0) {
      return { days: Infinity, urgency: 'ok' as const };
    }
    
    const daysUntilEmpty = Math.floor(product.stock / avgDaily);
    
    let urgency: 'critical' | 'warning' | 'ok' = 'ok';
    if (product.stock <= product.low_stock_threshold || daysUntilEmpty < 7) {
      urgency = 'critical';
    } else if (daysUntilEmpty < 14) {
      urgency = 'warning';
    }
    
    return { days: daysUntilEmpty, urgency };
  };

  const COLORS = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
  ];

  const getServiceTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      maintenance: 'Manutenção',
      revision: 'Revisão',
      spraying: 'Pulverização',
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard Estoque Interno</h1>
          <p className="text-muted-foreground mt-1">Gestão e análise de itens internos</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Itens</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{totalItems}</div>
              <p className="text-xs text-muted-foreground mt-1">Itens cadastrados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Estoque Baixo</CardTitle>
              <AlertTriangle className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{lowStockItems.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Necessitam reposição</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Consumo/Mês</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{monthlyConsumption}</div>
              <p className="text-xs text-muted-foreground mt-1">Unidades último mês</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Custo/Mês</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                R$ {monthlyCost.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Estimativa mensal</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Consumo ao Longo do Tempo</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="quantity"
                    name="Quantidade"
                    stroke="hsl(var(--chart-1))"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--chart-1))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top 10 Itens Mais Usados</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topProducts} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                  <YAxis type="category" dataKey="name" width={120} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                    }}
                  />
                  <Bar dataKey="total" name="Total Usado" fill="hsl(var(--chart-2))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  dataKey="count"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(entry) => `${entry.category}: ${entry.count}`}
                >
                  {categoryData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Replenishment Alerts */}
        {lowStockItems.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                Alertas de Reposição
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {lowStockItems.map((product) => {
                  const prediction = getProductPrediction(product);
                  return (
                    <div
                      key={product.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{product.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {product.stock} un (mínimo: {product.low_stock_threshold})
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge
                          variant={
                            prediction.urgency === 'critical'
                              ? 'destructive'
                              : prediction.urgency === 'warning'
                              ? 'default'
                              : 'secondary'
                          }
                        >
                          {prediction.days === Infinity
                            ? 'Sem consumo'
                            : prediction.days < 1
                            ? 'Crítico!'
                            : `${prediction.days} dias`}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Items Table */}
        <Card>
          <CardHeader>
            <CardTitle>Itens Internos</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Estoque</TableHead>
                  <TableHead className="text-right">Consumo/Mês</TableHead>
                  <TableHead className="text-center">Previsão</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => {
                  const prediction = getProductPrediction(product);
                  const productConsumption = Math.floor(monthlyConsumption / (totalItems || 1));

                  return (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell className="text-muted-foreground">{product.sku || '-'}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {product.internal_category || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={
                            product.stock <= product.low_stock_threshold
                              ? 'text-warning font-semibold'
                              : 'text-foreground'
                          }
                        >
                          {product.stock}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {productConsumption}/mês
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={
                            prediction.urgency === 'critical'
                              ? 'destructive'
                              : prediction.urgency === 'warning'
                              ? 'default'
                              : 'secondary'
                          }
                        >
                          {prediction.urgency === 'critical' && '🔴 '}
                          {prediction.urgency === 'warning' && '🟡 '}
                          {prediction.urgency === 'ok' && '🟢 '}
                          {prediction.days === Infinity ? 'OK' : `${prediction.days}d`}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewHistory(product)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Usage History Dialog */}
        <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Histórico: {selectedProduct?.name}</DialogTitle>
              <div className="flex gap-6 text-sm text-muted-foreground mt-2">
                <span>Estoque Atual: <strong className="text-foreground">{selectedProduct?.stock}</strong></span>
                <span>Custo: <strong className="text-foreground">R$ {selectedProduct?.cost.toFixed(2)}</strong></span>
              </div>
            </DialogHeader>
            <div className="space-y-3 mt-4">
              {usageHistory.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhum histórico de uso encontrado</p>
              ) : (
                usageHistory.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 border border-border rounded-lg space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">
                          {format(new Date(item.service.date), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                        <Badge variant="outline">
                          {getServiceTypeLabel(item.service.service_type)}
                        </Badge>
                      </div>
                      <span className="text-sm text-foreground font-semibold">
                        Qtd: {item.qty}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Cliente: <span className="text-foreground">{item.service.client.contact_name}</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Cobrado: {' '}
                      {item.charged_to_client ? (
                        <span className="text-success">Sim (R$ {item.unit_price?.toFixed(2) || '0.00'})</span>
                      ) : (
                        <span className="text-warning">Não</span>
                      )}
                    </p>
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
