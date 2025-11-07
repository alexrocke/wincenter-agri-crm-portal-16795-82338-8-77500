import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Search, Package, Plus, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Product {
  id: string;
  name: string;
  price: number;
  sku: string;
}

interface ProductItem {
  product_id: string;
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
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [showSearch, setShowSearch] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (search.trim() === '') {
      setFilteredProducts(products);
    } else {
      const filtered = products.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku?.toLowerCase().includes(search.toLowerCase())
      );
      setFilteredProducts(filtered);
    }
  }, [search, products]);

  const loadProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('id, name, price, sku')
      .eq('status', 'active')
      .order('name');

    if (data) {
      setProducts(data);
      setFilteredProducts(data);
    }
  };

  const addProduct = (product: Product) => {
    const exists = items.find(item => item.product_id === product.id);
    if (exists) {
      // Incrementa quantidade se já existe
      onItemsChange(
        items.map(item =>
          item.product_id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      onItemsChange([
        ...items,
        {
          product_id: product.id,
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

  const updateItem = (product_id: string, field: keyof ProductItem, value: number) => {
    onItemsChange(
      items.map(item =>
        item.product_id === product_id ? { ...item, [field]: value } : item
      )
    );
  };

  const removeItem = (product_id: string) => {
    onItemsChange(items.filter(item => item.product_id !== product_id));
  };

  return (
    <div className="space-y-4">
      {/* Produtos Adicionados */}
      {items.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Produtos ({items.length})</h3>
          {items.map((item) => {
            const subtotal = item.quantity * item.unit_price * (1 - item.discount_percent / 100);
            return (
              <Card key={item.product_id} className="p-3">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-sm flex-1">{item.name}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(item.product_id)}
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
                        onChange={(e) => updateItem(item.product_id, 'quantity', Number(e.target.value))}
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
                        onChange={(e) => updateItem(item.product_id, 'unit_price', Number(e.target.value))}
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

      {/* Botão para Adicionar Produto */}
      {!showSearch && (
        <Button
          variant="outline"
          onClick={() => setShowSearch(true)}
          className="w-full h-12"
        >
          <Plus className="h-5 w-5 mr-2" />
          Adicionar Produto
        </Button>
      )}

      {/* Busca de Produtos */}
      {showSearch && (
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Buscar produto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-12 text-base"
            />
          </div>

          <ScrollArea className="h-[200px]">
            <div className="space-y-2">
              {filteredProducts.map((product) => (
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
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
