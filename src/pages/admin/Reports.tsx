import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, TrendingUp, Users, DollarSign, Target, Package } from 'lucide-react';

export default function Reports() {
  const [salesData, setSalesData] = useState({
    totalRevenue: 0,
    totalProfit: 0,
    totalSales: 0,
    avgTicket: 0,
  });

  const [sellerData, setSellerData] = useState<any[]>([]);
  const [productData, setProductData] = useState<any[]>([]);

  useEffect(() => {
    fetchReportsData();
  }, []);

  const fetchReportsData = async () => {
    try {
      // Fetch sales overview
      const { data: sales } = await supabase
        .from('sales')
        .select('gross_value, estimated_profit, status')
        .eq('status', 'closed');

      const totalRevenue = sales?.reduce((sum, s) => sum + Number(s.gross_value), 0) || 0;
      const totalProfit = sales?.reduce((sum, s) => sum + Number(s.estimated_profit), 0) || 0;

      setSalesData({
        totalRevenue,
        totalProfit,
        totalSales: sales?.length || 0,
        avgTicket: sales && sales.length > 0 ? totalRevenue / sales.length : 0,
      });

      // Fetch seller performance
      const { data: sellers } = await supabase
        .from('users')
        .select('id, name, email, auth_user_id')
        .eq('role', 'seller')
        .eq('status', 'active');

      if (sellers && sellers.length > 0) {
        const sellerAuthIds = sellers.map(s => s.auth_user_id).filter(Boolean);
        
        const { data: allSales } = await supabase
          .from('sales')
          .select('seller_auth_id, gross_value, estimated_profit, status')
          .in('seller_auth_id', sellerAuthIds)
          .eq('status', 'closed');

        const sellerStats = sellers.map(seller => {
          const sellerSales = allSales?.filter(s => s.seller_auth_id === seller.auth_user_id) || [];
          return {
            name: seller.name,
            email: seller.email,
            totalSales: sellerSales.length,
            totalRevenue: sellerSales.reduce((sum, s) => sum + Number(s.gross_value), 0),
            totalProfit: sellerSales.reduce((sum, s) => sum + Number(s.estimated_profit), 0),
          };
        });

        setSellerData(sellerStats.sort((a, b) => b.totalRevenue - a.totalRevenue));
      }

      // Fetch product performance
      const { data: saleItems } = await supabase
        .from('sale_items')
        .select(`
          product_id,
          qty,
          unit_price,
          discount_percent,
          products (
            name,
            category
          )
        `);

      const productStats = saleItems?.reduce((acc: any, item: any) => {
        const productId = item.product_id;
        if (!acc[productId]) {
          acc[productId] = {
            name: item.products?.name || 'Produto desconhecido',
            category: item.products?.category || 'Sem categoria',
            totalQty: 0,
            totalRevenue: 0,
          };
        }
        acc[productId].totalQty += item.qty;
        acc[productId].totalRevenue += item.unit_price * item.qty * (1 - item.discount_percent / 100);
        return acc;
      }, {});

      const productArray = Object.values(productStats || {}).sort((a: any, b: any) => b.totalRevenue - a.totalRevenue);
      setProductData(productArray);

    } catch (error) {
      console.error('Error fetching reports:', error);
    }
  };

  return (
    <AppLayout>
      <div className="container max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Relatórios</h1>
          <p className="text-muted-foreground">Análises e indicadores de desempenho</p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(salesData.totalRevenue)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium">Lucro Total</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(salesData.totalProfit)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Margem: {salesData.totalRevenue > 0 ? ((salesData.totalProfit / salesData.totalRevenue) * 100).toFixed(1) : 0}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium">Total de Vendas</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{salesData.totalSales}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(salesData.avgTicket)}
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="sellers" className="space-y-4">
          <TabsList>
            <TabsTrigger value="sellers">
              <Users className="h-4 w-4 mr-2" />
              Desempenho de Vendedores
            </TabsTrigger>
            <TabsTrigger value="products">
              <Package className="h-4 w-4 mr-2" />
              Produtos Mais Vendidos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sellers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Ranking de Vendedores</CardTitle>
                <CardDescription>Desempenho por vendedor no período</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {sellerData.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhum dado de vendedor disponível
                    </p>
                  ) : (
                    sellerData.map((seller, index) => (
                      <div key={seller.email} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-medium">{seller.name}</div>
                            <div className="text-sm text-muted-foreground">{seller.email}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            }).format(seller.totalRevenue)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {seller.totalSales} vendas • Lucro: {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            }).format(seller.totalProfit)}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Produtos Mais Vendidos</CardTitle>
                <CardDescription>Ranking por volume de vendas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {productData.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhum dado de produto disponível
                    </p>
                  ) : (
                    productData.slice(0, 10).map((product: any, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-medium">{product.name}</div>
                            <div className="text-sm text-muted-foreground">{product.category}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            }).format(product.totalRevenue)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {product.totalQty} unidades vendidas
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
