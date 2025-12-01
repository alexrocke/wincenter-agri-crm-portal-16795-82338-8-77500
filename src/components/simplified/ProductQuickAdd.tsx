import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Search, Package, Plus, Trash2, Wrench as WrenchIcon, Settings } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

interface Product {
  id: string;
  name: string;
  price: number;
  sku: string;
  is_internal?: boolean;
}

interface ServiceCatalogItem {
  id: string;
  name: string;
  description: string | null;
  default_price: number;
  price_type: string;
  status: string;
}

interface ProductItem {
  product_id?: string;
  service_id?: string;
  item_type: 'product' | 'internal' | 'service';
  name: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
}

interface ProductQuickAddProps {
  items: ProductItem[];
  onItemsChange: (items: ProductItem[]) => void;
}

export function ProductQuickAdd({ items, onItemsChange }: ProductQuickAddProps) {
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<ServiceCatalogItem[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [filteredInternals, setFilteredInternals] = useState<Product[]>([]);
  const [filteredServices, setFilteredServices] = useState<ServiceCatalogItem[]>([]);
  const [showSearch, setShowSearch] = useState(true);
  const [activeTab, setActiveTab] = useState<'products' | 'internal' | 'services'>('products');

  useEffect(() => {
    loadProducts();
    loadServices();
  }, []);

  useEffect(() => {
    const normalProducts = products.filter(p => !p.is_internal);
    const internalProducts = products.filter(p => p.is_internal);

    if (search.trim() === '') {
      setFilteredProducts(normalProducts);
      setFilteredInternals(internalProducts);
      setFilteredServices(services);
    } else {
      const filteredNormal = normalProducts.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku?.toLowerCase().includes(search.toLowerCase())
      );
      setFilteredProducts(filteredNormal);

      const filteredInt = internalProducts.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku?.toLowerCase().includes(search.toLowerCase())
      );
      setFilteredInternals(filteredInt);

      const filteredServ = services.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase())
      );
      setFilteredServices(filteredServ);
    }
  }, [search, products, services]);

  const loadProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('id, name, price, sku, is_internal')
      .eq('status', 'active')
      .order('name');

    if (data) {
      setProducts(data);
    }
  };

  const loadServices = async () => {
    const { data } = await supabase
      .from('service_catalog')
      .select('*')
      .eq('status', 'active')
      .order('name');

    if (data) {
      setServices(data);
    }
  };

  const addProduct = (product: Product) => {
    const itemType: 'product' | 'internal' = product.is_internal ? 'internal' : 'product';
    const exists = items.find(item => item.product_id === product.id && item.item_type === itemType);
    
    if (exists) {
      onItemsChange(
        items.map(item =>
          item.product_id === product.id && item.item_type === itemType
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      onItemsChange([
        ...items,
        {
          product_id: product.id,
          item_type: itemType,
          name: product.name,
          quantity: 1,
          unit_price: product.price,
          discount_percent: 0,
        },
      ]);
    }
    setSearch('');
    setShowSearch(false);
  };

  const addService = (service: ServiceCatalogItem) => {
    const exists = items.find(item => item.service_id === service.id);
    
    if (exists) {
      onItemsChange(
        items.map(item =>
          item.service_id === service.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      onItemsChange([
        ...items,
        {
          service_id: service.id,
          item_type: 'service',
          name: service.name,
          quantity: 1,
          unit_price: service.default_price,
          discount_percent: 0,
        },
      ]);
    }
    setSearch('');
    setShowSearch(false);
  };

  const updateItem = (index: number, field: keyof ProductItem, value: number) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    onItemsChange(updated);
  };

  const removeItem = (index: number) => {
    onItemsChange(items.filter((_, i) => i !== index));
  };

  const getItemTypeBadge = (type: 'product' | 'internal' | 'service') => {
    switch (type) {
      case 'product':
        return <Badge variant="default" className="text-xs"><Package className="h-3 w-3 mr-1" />Produto</Badge>;
      case 'internal':
        return <Badge variant="secondary" className="text-xs"><WrenchIcon className="h-3 w-3 mr-1" />Interno</Badge>;
      case 'service':
        return <Badge variant="outline" className="text-xs"><Settings className="h-3 w-3 mr-1" />Serviço</Badge>;
    }
  };

  const productItems = items.filter(i => i.item_type === 'product');
  const internalItems = items.filter(i => i.item_type === 'internal');
  const serviceItems = items.filter(i => i.item_type === 'service');

  const productTotal = productItems.reduce((sum, item) => sum + (item.quantity * item.unit_price * (1 - item.discount_percent / 100)), 0);
  const internalTotal = internalItems.reduce((sum, item) => sum + (item.quantity * item.unit_price * (1 - item.discount_percent / 100)), 0);
  const serviceTotal = serviceItems.reduce((sum, item) => sum + (item.quantity * item.unit_price * (1 - item.discount_percent / 100)), 0);
  const grandTotal = productTotal + internalTotal + serviceTotal;

  return (
    <div className="space-y-4">
      {/* Itens Adicionados */}
      {items.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Itens ({items.length})</h3>
          {items.map((item, index) => {
            const subtotal = item.quantity * item.unit_price * (1 - item.discount_percent / 100);
            return (
              <Card key={index} className="p-3">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {getItemTypeBadge(item.item_type)}
                      </div>
                      <p className="font-semibold text-sm">{item.name}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(index)}
                      className="h-8 w-8 p-0 text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-muted-foreground">Qtd</label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                        className="h-10 text-base"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Preço Un.</label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(e) => updateItem(index, 'unit_price', Number(e.target.value))}
                        className="h-10 text-base"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span className="font-bold text-primary">
                      R$ {subtotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Resumo por Tipo */}
      {items.length > 0 && (
        <Card className="p-4 bg-muted/50">
          <div className="space-y-2 text-sm">
            {productTotal > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">📦 Subtotal Produtos:</span>
                <span className="font-medium">R$ {productTotal.toFixed(2)}</span>
              </div>
            )}
            {internalTotal > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">🔧 Subtotal Internos:</span>
                <span className="font-medium">R$ {internalTotal.toFixed(2)}</span>
              </div>
            )}
            {serviceTotal > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">🛠️ Subtotal Serviços:</span>
                <span className="font-medium">R$ {serviceTotal.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-border">
              <span className="font-bold">TOTAL GERAL:</span>
              <span className="font-bold text-lg text-primary">
                R$ {grandTotal.toFixed(2)}
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* Botão para Adicionar Item */}
      {!showSearch && (
        <Button
          variant="outline"
          onClick={() => setShowSearch(true)}
          className="w-full h-12"
        >
          <Plus className="h-5 w-5 mr-2" />
          Adicionar Item
        </Button>
      )}

      {/* Busca com Tabs */}
      {showSearch && (
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-12 text-base"
            />
          </div>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="products">
                <Package className="h-4 w-4 mr-2" />
                Produtos
              </TabsTrigger>
              <TabsTrigger value="internal">
                <WrenchIcon className="h-4 w-4 mr-2" />
                Internos
              </TabsTrigger>
              <TabsTrigger value="services">
                <Settings className="h-4 w-4 mr-2" />
                Serviços
              </TabsTrigger>
            </TabsList>

            <TabsContent value="products">
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {filteredProducts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      Nenhum produto encontrado
                    </div>
                  ) : (
                    filteredProducts.map((product) => (
                      <Card
                        key={product.id}
                        className="p-3 cursor-pointer transition-all hover:shadow-md active:scale-98"
                        onClick={() => addProduct(product)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Package className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">{product.name}</p>
                            <p className="text-xs text-muted-foreground">{product.sku}</p>
                          </div>
                          <p className="font-bold text-primary text-sm">
                            R$ {product.price.toFixed(2)}
                          </p>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="internal">
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {filteredInternals.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      Nenhum item interno encontrado
                    </div>
                  ) : (
                    filteredInternals.map((product) => (
                      <Card
                        key={product.id}
                        className="p-3 cursor-pointer transition-all hover:shadow-md active:scale-98"
                        onClick={() => addProduct(product)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-secondary/10 flex items-center justify-center flex-shrink-0">
                            <WrenchIcon className="h-5 w-5 text-secondary-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">{product.name}</p>
                            <p className="text-xs text-muted-foreground">{product.sku}</p>
                          </div>
                          <p className="font-bold text-secondary-foreground text-sm">
                            R$ {product.price.toFixed(2)}
                          </p>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="services">
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {filteredServices.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      Nenhum serviço encontrado
                    </div>
                  ) : (
                    filteredServices.map((service) => (
                      <Card
                        key={service.id}
                        className="p-3 cursor-pointer transition-all hover:shadow-md active:scale-98"
                        onClick={() => addService(service)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                            <Settings className="h-5 w-5 text-accent-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">{service.name}</p>
                            {service.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {service.description}
                              </p>
                            )}
                          </div>
                          <p className="font-bold text-accent-foreground text-sm">
                            R$ {service.default_price.toFixed(2)}
                          </p>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
