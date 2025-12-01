import { useState, useEffect } from 'react';
import { SimplifiedLayout } from '@/components/layout/SimplifiedLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Plus, CheckCircle2, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { EmptyState } from '@/components/simplified/EmptyState';
import { FloatingActionButton } from '@/components/simplified/FloatingActionButton';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ClientQuickSelect } from '@/components/simplified/ClientQuickSelect';
import { ProductQuickAdd } from '@/components/simplified/ProductQuickAdd';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Sale {
  id: string;
  client_id: string;
  gross_value: number;
  sold_at: string;
  payment_received: boolean;
  clients: {
    contact_name: string;
    farm_name: string;
  };
}

interface SaleItem {
  product_id: string;
  qty: number;
  unit_price: number;
}

export default function SimplifiedSales() {
  const { user } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSaleOpen, setNewSaleOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [saleValue, setSaleValue] = useState('');
  const [saving, setSaving] = useState(false);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const totalSales = sales.reduce((sum, sale) => sum + Number(sale.gross_value), 0);

  useEffect(() => {
    if (user?.id) {
      fetchSales();
    }
  }, [user?.id]);

  const fetchSales = async () => {
    try {
      const { data, error } = await supabase
        .from('sales')
        .select(`
          id,
          client_id,
          gross_value,
          sold_at,
          payment_received,
          clients (
            contact_name,
            farm_name
          )
        `)
        .eq('seller_auth_id', user!.id)
        .order('sold_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setSales(data || []);
    } catch (error) {
      console.error('Error fetching sales:', error);
      toast.error('Erro ao carregar vendas');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSale = async () => {
    if (!selectedClientId || saleItems.length === 0 || !saleValue) {
      toast.error('Preencha todos os campos');
      return;
    }

    setSaving(true);
    try {
      // Criar venda
      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .insert([{
          client_id: selectedClientId,
          seller_auth_id: user!.id,
          gross_value: parseFloat(saleValue),
          status: 'closed',
          sold_at: new Date().toISOString(),
          payment_received: false
        }])
        .select()
        .single();

      if (saleError) throw saleError;

      // Criar itens da venda
      const itemsToInsert = saleItems.map(item => ({
        sale_id: saleData.id,
        product_id: item.product_id,
        qty: item.qty,
        unit_price: item.unit_price,
        discount_percent: 0
      }));

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      toast.success('Venda registrada com sucesso!');
      setNewSaleOpen(false);
      resetForm();
      fetchSales();
    } catch (error) {
      console.error('Error creating sale:', error);
      toast.error('Erro ao criar venda');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setSelectedClientId('');
    setSaleItems([]);
    setSaleValue('');
  };

  if (loading) {
    return (
      <SimplifiedLayout>
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </SimplifiedLayout>
    );
  }

  if (sales.length === 0) {
    return (
      <SimplifiedLayout>
        <EmptyState
          icon={ShoppingCart}
          title="Nenhuma venda registrada"
          description="Registre sua primeira venda para começar"
          actionLabel="Registrar Venda"
          onAction={() => setNewSaleOpen(true)}
        />
        <Sheet open={newSaleOpen} onOpenChange={(open) => {
          setNewSaleOpen(open);
          if (!open) resetForm();
        }}>
          <SheetContent side="bottom" className="h-[90vh]">
            <SheetHeader>
              <SheetTitle>Nova Venda - Etapa {step}/3</SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              {step === 1 && (
                <div className="space-y-4">
                  <Label>Selecione o Cliente</Label>
                  <ClientQuickSelect
                    onSelect={(client) => {
                      setSelectedClientId(typeof client === 'string' ? client : client.id);
                      setStep(2);
                    }}
                  />
                </div>
              )}
              {step === 2 && (
                <div className="space-y-4">
                  <Label>Adicione os Produtos</Label>
                  <ProductQuickAdd
                    items={saleItems.map(i => ({ 
                      product_id: i.product_id, 
                      item_type: 'product' as const, 
                      name: '', 
                      quantity: i.qty, 
                      unit_price: i.unit_price,
                      discount_percent: 0 
                    }))}
                    onItemsChange={(items) => setSaleItems(items.filter(i => i.product_id).map(i => ({ 
                      product_id: i.product_id!, 
                      qty: i.quantity, 
                      unit_price: i.unit_price, 
                      discount_percent: i.discount_percent 
                    })))}
                  />
                  <Button onClick={() => setStep(3)} size="lg" className="w-full">
                    Continuar
                  </Button>
                </div>
              )}
              {step === 3 && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="sale_value">Valor Total da Venda *</Label>
                    <Input
                      id="sale_value"
                      type="number"
                      step="0.01"
                      value={saleValue}
                      onChange={(e) => setSaleValue(e.target.value)}
                      className="h-12 text-base"
                      placeholder="0.00"
                    />
                  </div>
                  <Button 
                    onClick={handleCreateSale} 
                    size="lg" 
                    className="w-full"
                    disabled={saving}
                  >
                    {saving ? 'Salvando...' : 'Registrar Venda'}
                  </Button>
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </SimplifiedLayout>
    );
  }

  return (
    <SimplifiedLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Vendas</h1>
        
        <Card className="p-4 bg-gradient-to-br from-primary/10 to-primary/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total do Mês</p>
              <p className="text-2xl font-bold text-primary">
                R$ {totalSales.toFixed(2)}
              </p>
            </div>
            <ShoppingCart className="h-10 w-10 text-primary opacity-20" />
          </div>
        </Card>

        <div className="space-y-3">
          {sales.map((sale) => (
            <Card key={sale.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold">{sale.clients?.contact_name || 'Cliente'}</h3>
                  {sale.clients?.farm_name && (
                    <p className="text-sm text-muted-foreground">{sale.clients.farm_name}</p>
                  )}
                  <p className="text-lg font-bold text-primary mt-2">
                    R$ {Number(sale.gross_value).toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(sale.sold_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <Badge variant={sale.payment_received ? 'default' : 'outline'}>
                  {sale.payment_received ? (
                    <><CheckCircle2 className="h-3 w-3 mr-1" /> Pago</>
                  ) : (
                    <><Clock className="h-3 w-3 mr-1" /> Pendente</>
                  )}
                </Badge>
              </div>
            </Card>
          ))}
        </div>

        <FloatingActionButton onClick={() => setNewSaleOpen(true)} label="Nova Venda" />

        <Sheet open={newSaleOpen} onOpenChange={(open) => {
          setNewSaleOpen(open);
          if (!open) resetForm();
        }}>
          <SheetContent side="bottom" className="h-[90vh]">
            <SheetHeader>
              <SheetTitle>Nova Venda - Etapa {step}/3</SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              {step === 1 && (
                <div className="space-y-4">
                  <Label>Selecione o Cliente</Label>
                  <ClientQuickSelect
                    onSelect={(client) => {
                      setSelectedClientId(typeof client === 'string' ? client : client.id);
                      setStep(2);
                    }}
                  />
                </div>
              )}
              {step === 2 && (
                <div className="space-y-4">
                  <Label>Adicione os Produtos</Label>
                  <ProductQuickAdd
                    items={saleItems.map(i => ({ 
                      product_id: i.product_id, 
                      item_type: 'product' as const, 
                      name: '', 
                      quantity: i.qty, 
                      unit_price: i.unit_price,
                      discount_percent: 0 
                    }))}
                    onItemsChange={(items) => setSaleItems(items.filter(i => i.product_id).map(i => ({ 
                      product_id: i.product_id!, 
                      qty: i.quantity, 
                      unit_price: i.unit_price, 
                      discount_percent: i.discount_percent 
                    })))}
                  />
                  <Button onClick={() => setStep(3)} size="lg" className="w-full">
                    Continuar
                  </Button>
                </div>
              )}
              {step === 3 && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="sale_value">Valor Total da Venda *</Label>
                    <Input
                      id="sale_value"
                      type="number"
                      step="0.01"
                      value={saleValue}
                      onChange={(e) => setSaleValue(e.target.value)}
                      className="h-12 text-base"
                      placeholder="0.00"
                    />
                  </div>
                  <Button 
                    onClick={handleCreateSale} 
                    size="lg" 
                    className="w-full"
                    disabled={saving}
                  >
                    {saving ? 'Salvando...' : 'Registrar Venda'}
                  </Button>
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </SimplifiedLayout>
  );
}
