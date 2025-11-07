import { useState, useEffect, useCallback } from 'react';
import { SimplifiedLayout } from '@/components/layout/SimplifiedLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { EmptyState } from '@/components/simplified/EmptyState';
import { SearchBar } from '@/components/simplified/SearchBar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  stock: number;
  low_stock_threshold: number;
  description: string;
  image_url: string | null;
}

export default function SimplifiedProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setProducts(data || []);
      setFilteredProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = useCallback((query: string) => {
    if (!query.trim()) {
      setFilteredProducts(products);
      return;
    }
    
    const lowerQuery = query.toLowerCase();
    const filtered = products.filter(product =>
      product.name.toLowerCase().includes(lowerQuery) ||
      product.sku.toLowerCase().includes(lowerQuery) ||
      product.category?.toLowerCase().includes(lowerQuery)
    );
    setFilteredProducts(filtered);
  }, [products]);

  const getStockStatus = (product: Product) => {
    if (product.stock === 0) {
      return { label: 'Sem Estoque', variant: 'destructive' as const };
    }
    if (product.stock <= product.low_stock_threshold) {
      return { label: 'Estoque Baixo', variant: 'outline' as const };
    }
    return { label: 'Disponível', variant: 'default' as const };
  };

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setDetailsOpen(true);
  };

  if (loading) {
    return (
      <SimplifiedLayout>
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        </div>
      </SimplifiedLayout>
    );
  }

  if (products.length === 0) {
    return (
      <SimplifiedLayout>
        <EmptyState
          icon={Package}
          title="Nenhum produto disponível"
          description="Não há produtos cadastrados no momento"
        />
      </SimplifiedLayout>
    );
  }

  return (
    <SimplifiedLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Produtos ({filteredProducts.length})</h1>
        
        <SearchBar
          placeholder="Buscar produtos..."
          onSearch={handleSearch}
        />

        <div className="grid grid-cols-2 gap-3">
          {filteredProducts.map((product) => {
            const stockStatus = getStockStatus(product);
            return (
              <Card
                key={product.id}
                className="p-3 cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => handleProductClick(product)}
              >
                <div className="space-y-2">
                  {product.image_url ? (
                    <div className="aspect-square rounded-md overflow-hidden bg-muted">
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="aspect-square rounded-md bg-muted flex items-center justify-center">
                      <Package className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                  
                  <div className="space-y-1">
                    <Badge variant={stockStatus.variant} className="text-xs">
                      {stockStatus.label}
                    </Badge>
                    <h3 className="font-semibold text-sm line-clamp-2">{product.name}</h3>
                    <p className="text-lg font-bold text-primary">
                      R$ {product.price.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Estoque: {product.stock}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
          <SheetContent side="bottom" className="h-[80vh]">
            {selectedProduct && (
              <>
                <SheetHeader>
                  <SheetTitle>{selectedProduct.name}</SheetTitle>
                </SheetHeader>
                <div className="space-y-4 mt-6">
                  {selectedProduct.image_url && (
                    <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                      <img
                        src={selectedProduct.image_url}
                        alt={selectedProduct.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">SKU</p>
                      <p className="font-medium">{selectedProduct.sku}</p>
                    </div>
                    
                    {selectedProduct.category && (
                      <div>
                        <p className="text-sm text-muted-foreground">Categoria</p>
                        <p className="font-medium">{selectedProduct.category}</p>
                      </div>
                    )}
                    
                    <div>
                      <p className="text-sm text-muted-foreground">Preço</p>
                      <p className="text-2xl font-bold text-primary">
                        R$ {selectedProduct.price.toFixed(2)}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-muted-foreground">Estoque</p>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{selectedProduct.stock} unidades</p>
                        <Badge variant={getStockStatus(selectedProduct).variant}>
                          {getStockStatus(selectedProduct).label}
                        </Badge>
                      </div>
                    </div>
                    
                    {selectedProduct.description && (
                      <div>
                        <p className="text-sm text-muted-foreground">Descrição</p>
                        <p className="text-sm">{selectedProduct.description}</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </SimplifiedLayout>
  );
}
