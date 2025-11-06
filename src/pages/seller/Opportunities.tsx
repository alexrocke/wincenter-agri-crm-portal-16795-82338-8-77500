import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, TrendingUp, DollarSign, Edit, Trash2, ShoppingCart, X, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { ClientAutocomplete } from '@/components/ClientAutocomplete';
import { ProductAutocomplete } from '@/components/ProductAutocomplete';

interface Opportunity {
  id: string;
  stage: string;
  probability: number;
  gross_value: number;
  estimated_margin: number;
  expected_close_date: string;
  client_id: string;
  seller_auth_id: string;
  product_ids?: string[];
  clients?: {
    farm_name: string;
    contact_name: string;
  };
  seller_name?: string;
}

interface ProposalProduct {
  id: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  subtotal: number;
}

export default function Opportunities() {
  const { user, userRole } = useAuth();
  const navigate = useNavigate();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    client_id: '',
    stage: 'lead',
    probability: '10',
    gross_value: '',
    estimated_margin: '',
    expected_close_date: '',
    history: '',
    product_ids: [] as string[],
  });
  const [paymentData, setPaymentData] = useState({
    payment_method_1: '',
    payment_method_2: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Multi-product state
  const [proposalProducts, setProposalProducts] = useState<ProposalProduct[]>([]);
  const [selectedNewProduct, setSelectedNewProduct] = useState('');
  const [newProductQty, setNewProductQty] = useState(1);
  const [newProductPrice, setNewProductPrice] = useState(0);
  const [newProductDiscount, setNewProductDiscount] = useState(0);
  const [newProductOriginalPrice, setNewProductOriginalPrice] = useState(0);
  const [valueAdjustment, setValueAdjustment] = useState(0);

  useEffect(() => {
    fetchOpportunities();
    fetchClients();
    fetchProducts();
    if (userRole === 'admin') {
      fetchSellers();
    }
  }, [user, userRole]);

  const fetchClients = async () => {
    try {
      let query = supabase.from('clients').select('id, farm_name, contact_name');
      
      if (userRole === 'seller' || userRole === 'technician') {
        query = query.or(`seller_auth_id.eq.${user?.id},owner_user_id.eq.${user?.id}`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, sku, price, category')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchSellers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, auth_user_id, name')
        .in('role', ['seller', 'admin', 'technician'])
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setSellers(data || []);
    } catch (error) {
      console.error('Error fetching sellers:', error);
    }
  };

  const fetchOpportunities = async () => {
    try {
      let query = supabase
        .from('opportunities')
        .select(`
          *,
          clients (
            farm_name,
            contact_name
          )
        `)
        .not('stage', 'in', '(won,lost)')
        .order('created_at', { ascending: false });

      if (userRole === 'seller' || userRole === 'technician') {
        query = query.eq('seller_auth_id', user?.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      const sellerIds = [...new Set((data || []).map(o => o.seller_auth_id).filter(Boolean))];
      
      let sellersMap: Record<string, string> = {};
      
      if (sellerIds.length > 0) {
        const { data: usersData } = await supabase
          .from('users')
          .select('auth_user_id, name')
          .in('auth_user_id', sellerIds);
        
        if (usersData) {
          sellersMap = usersData.reduce((acc, user) => {
            acc[user.auth_user_id] = user.name;
            return acc;
          }, {} as Record<string, string>);
        }
      }
      
      const opportunitiesWithSeller = (data || []).map((opp: any) => ({
        ...opp,
        seller_name: sellersMap[opp.seller_auth_id] || 'N/A',
      }));
      
      setOpportunities(opportunitiesWithSeller);
    } catch (error) {
      console.error('Error fetching opportunities:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper para cálculo preciso de subtotal
  const calculateItemSubtotal = (quantity: number, unitPrice: number, discountPercent: number): number => {
    return Math.round(quantity * unitPrice * (1 - discountPercent / 100) * 100) / 100;
  };

  const addProposalProduct = () => {
    if (!selectedNewProduct) {
      toast.error('Selecione um produto');
      return;
    }

    if (newProductQty < 1) {
      toast.error('Quantidade deve ser maior que 0');
      return;
    }

    if (newProductPrice <= 0) {
      toast.error('Preço deve ser maior que 0');
      return;
    }

    if (newProductDiscount < 0 || newProductDiscount > 100) {
      toast.error('Desconto deve estar entre 0 e 100%');
      return;
    }

    const product = products.find(p => p.id === selectedNewProduct);
    if (!product) return;

    const subtotal = calculateItemSubtotal(newProductQty, newProductPrice, newProductDiscount);

    const newProduct: ProposalProduct = {
      id: crypto.randomUUID(),
      product_id: product.id,
      product_name: product.name,
      product_sku: product.sku,
      quantity: newProductQty,
      unit_price: newProductPrice,
      discount_percent: newProductDiscount,
      subtotal,
    };

    setProposalProducts([...proposalProducts, newProduct]);
    setSelectedNewProduct('');
    setNewProductQty(1);
    setNewProductPrice(0);
    setNewProductDiscount(0);
    setNewProductOriginalPrice(0);
    updateProposalGrossValue([...proposalProducts, newProduct], valueAdjustment);
  };

  const removeProposalProduct = (id: string) => {
    const updated = proposalProducts.filter(p => p.id !== id);
    setProposalProducts(updated);
    updateProposalGrossValue(updated, valueAdjustment);
  };

  const calculateProposalTotal = (products: ProposalProduct[]) => {
    return products.reduce((sum, p) => sum + p.subtotal, 0);
  };

  const calculateFinalTotal = (products: ProposalProduct[], adjustment: number) => {
    return calculateProposalTotal(products) + adjustment;
  };

  const updateProposalGrossValue = (products: ProposalProduct[], adjustment: number = valueAdjustment) => {
    const total = calculateFinalTotal(products, adjustment);
    setFormData(prev => ({ ...prev, gross_value: String(total) }));
  };

  const getStageLabel = (stage: string) => {
    const labels: Record<string, string> = {
      lead: 'Lead',
      qualified: 'Qualificado',
      proposal: 'Proposta',
      closing: 'Fechamento',
      won: 'Ganha',
      lost: 'Perdida'
    };
    return labels[stage] || stage;
  };

  const handleDownloadPDF = async (opp: Opportunity) => {
    try {
      // Fetch client details
      const { data: client } = await supabase
        .from('clients')
        .select('*')
        .eq('id', opp.client_id)
        .single();

      // Fetch opportunity items with product details
      const { data: oppItems } = await supabase
        .from('opportunity_items')
        .select(`
          *,
          products (
            name,
            sku
          )
        `)
        .eq('opportunity_id', opp.id);

      const productsData = oppItems || [];

      // Create PDF
      const doc = new jsPDF();
      
      // Title
      doc.setFontSize(20);
      doc.text('PROPOSTA COMERCIAL', 105, 20, { align: 'center' });
      
      // Client info
      doc.setFontSize(12);
      doc.text('DADOS DO CLIENTE', 14, 35);
      doc.setFontSize(10);
      doc.text(`Fazenda: ${client?.farm_name || 'N/A'}`, 14, 45);
      doc.text(`Contato: ${client?.contact_name || 'N/A'}`, 14, 52);
      doc.text(`Telefone: ${client?.phone || 'N/A'}`, 14, 59);
      doc.text(`Email: ${client?.email || 'N/A'}`, 14, 66);
      
      // Products table
      if (productsData.length > 0) {
        const tableData = productsData.map((item: any) => {
          const subtotal = calculateItemSubtotal(item.quantity, item.unit_price, item.discount_percent);
          return [
            item.products?.name || 'Produto',
            item.products?.sku || '-',
            item.quantity.toString(),
            new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.unit_price),
            `${item.discount_percent}%`,
            new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(subtotal)
          ];
        });

        autoTable(doc, {
          startY: 80,
          head: [['Produto', 'SKU', 'Qtd', 'Valor Unit.', 'Desc.', 'Subtotal']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [66, 66, 66] },
        });
      }

      // Total
      const finalY = (doc as any).lastAutoTable?.finalY || 115;
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text(
        `Valor Total: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(opp.gross_value)}`,
        14,
        finalY + 15
      );

      // Footer
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.text('Esta proposta tem validade de 30 dias a partir da data de emissão.', 105, 280, { align: 'center' });
      
      // Save PDF
      const fileName = `Proposta_${client?.farm_name?.replace(/\s+/g, '_') || 'Cliente'}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      toast.success('PDF gerado com sucesso!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erro ao gerar PDF');
    }
  };

  const getStageInfo = (stage: string) => {
    const stages: Record<string, { label: string; color: string }> = {
      lead: { label: 'Lead', color: 'bg-blue-100 text-blue-800' },
      qualified: { label: 'Qualificado', color: 'bg-purple-100 text-purple-800' },
      proposal: { label: 'Proposta', color: 'bg-yellow-100 text-yellow-800' },
      closing: { label: 'Fechamento', color: 'bg-orange-100 text-orange-800' },
      won: { label: 'Ganha', color: 'bg-green-100 text-green-800' },
      lost: { label: 'Perdida', color: 'bg-red-100 text-red-800' },
    };
    return stages[stage] || { label: stage, color: 'bg-gray-100 text-gray-800' };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;

    if (proposalProducts.length === 0 && !formData.gross_value) {
      toast.error('Adicione pelo menos um produto ou informe o valor bruto');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const calculatedGrossValue = proposalProducts.length > 0 
        ? calculateFinalTotal(proposalProducts, valueAdjustment)
        : Number(formData.gross_value);

      const oppData: any = {
        client_id: formData.client_id,
        seller_auth_id: user?.id,
        stage: formData.stage,
        probability: Number(formData.probability),
        gross_value: calculatedGrossValue,
        estimated_margin: Number(formData.estimated_margin) || null,
        expected_close_date: formData.expected_close_date || null,
        history: formData.history || null,
        product_ids: proposalProducts.length > 0 ? proposalProducts.map(p => p.product_id) : null,
      };

      const { data: newOpp, error } = await supabase
        .from('opportunities')
        .insert([oppData])
        .select()
        .single();

      if (error) throw error;

      // Insert opportunity items
      if (proposalProducts.length > 0 && newOpp) {
        const items = proposalProducts.map(p => ({
          opportunity_id: newOpp.id,
          product_id: p.product_id,
          quantity: p.quantity,
          unit_price: p.unit_price,
          discount_percent: p.discount_percent,
        }));

        const { error: itemsError } = await supabase
          .from('opportunity_items')
          .insert(items);

        if (itemsError) throw itemsError;
      }

      toast.success('Proposta criada com sucesso!');
      setDialogOpen(false);
      resetForm();
      fetchOpportunities();
    } catch (error: any) {
      console.error('Error creating proposal:', error);
      toast.error('Erro ao criar proposta: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      client_id: '',
      stage: 'lead',
      probability: '10',
      gross_value: '',
      estimated_margin: '',
      expected_close_date: '',
      history: '',
      product_ids: [],
    });
    setProposalProducts([]);
    setSelectedNewProduct('');
    setNewProductQty(1);
    setNewProductPrice(0);
    setNewProductDiscount(0);
    setNewProductOriginalPrice(0);
    setValueAdjustment(0);
  };

  const handleEdit = async (opp: Opportunity) => {
    setSelectedOpp(opp);
    setFormData({
      client_id: opp.client_id,
      stage: opp.stage,
      probability: String(opp.probability || 0),
      gross_value: String(opp.gross_value || 0),
      estimated_margin: String(opp.estimated_margin || 0),
      expected_close_date: opp.expected_close_date || '',
      history: '',
      product_ids: opp.product_ids || [],
    });

    // Load products from opportunity_items first, fallback to product_ids for backward compatibility
    const { data: oppItems } = await supabase
      .from('opportunity_items')
      .select(`
        *,
        products (
          name,
          sku
        )
      `)
      .eq('opportunity_id', opp.id);

    if (oppItems && oppItems.length > 0) {
      // New system: load from opportunity_items
      const loadedProducts: ProposalProduct[] = oppItems.map((item: any) => ({
        id: crypto.randomUUID(),
        product_id: item.product_id,
        product_name: item.products?.name || 'Produto',
        product_sku: item.products?.sku || '',
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_percent: item.discount_percent,
        subtotal: calculateItemSubtotal(item.quantity, item.unit_price, item.discount_percent),
      }));
      setProposalProducts(loadedProducts);
      
      const productsTotal = loadedProducts.reduce((sum, p) => sum + p.subtotal, 0);
      const adjustment = opp.gross_value - productsTotal;
      setValueAdjustment(adjustment);
    } else if (opp.product_ids && opp.product_ids.length > 0) {
      // Backward compatibility: load from product_ids
      const { data: productsData } = await supabase
        .from('products')
        .select('*')
        .in('id', opp.product_ids);

      if (productsData) {
        const loadedProducts: ProposalProduct[] = productsData.map(p => ({
          id: crypto.randomUUID(),
          product_id: p.id,
          product_name: p.name,
          product_sku: p.sku,
          quantity: 1,
          unit_price: p.price,
          discount_percent: 0,
          subtotal: calculateItemSubtotal(1, p.price, 0),
        }));
        setProposalProducts(loadedProducts);
        
        const productsTotal = loadedProducts.reduce((sum, p) => sum + p.subtotal, 0);
        const adjustment = opp.gross_value - productsTotal;
        setValueAdjustment(adjustment);
      }
    } else {
      setProposalProducts([]);
      setValueAdjustment(0);
    }

    setEditDialogOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOpp || isSubmitting) return;

    if (proposalProducts.length === 0 && !formData.gross_value) {
      toast.error('Adicione pelo menos um produto ou informe o valor bruto');
      return;
    }

    setIsSubmitting(true);

    try {
      const calculatedGrossValue = proposalProducts.length > 0 
        ? calculateFinalTotal(proposalProducts, valueAdjustment)
        : Number(formData.gross_value);

      const { error } = await supabase
        .from('opportunities')
        .update({
          client_id: formData.client_id,
          stage: formData.stage as any,
          probability: Number(formData.probability),
          gross_value: calculatedGrossValue,
          estimated_margin: Number(formData.estimated_margin) || null,
          expected_close_date: formData.expected_close_date || null,
          product_ids: proposalProducts.length > 0 ? proposalProducts.map(p => p.product_id) : null,
        })
        .eq('id', selectedOpp.id);

      if (error) throw error;

      // Delete existing items and insert new ones
      await supabase
        .from('opportunity_items')
        .delete()
        .eq('opportunity_id', selectedOpp.id);

      if (proposalProducts.length > 0) {
        const items = proposalProducts.map(p => ({
          opportunity_id: selectedOpp.id,
          product_id: p.product_id,
          quantity: p.quantity,
          unit_price: p.unit_price,
          discount_percent: p.discount_percent,
        }));

        const { error: itemsError } = await supabase
          .from('opportunity_items')
          .insert(items);

        if (itemsError) throw itemsError;
      }

      toast.success('Proposta atualizada!');
      setEditDialogOpen(false);
      setSelectedOpp(null);
      resetForm();
      fetchOpportunities();
    } catch (error: any) {
      toast.error('Erro ao atualizar: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedOpp) return;

    try {
      const { error } = await supabase
        .from('opportunities')
        .delete()
        .eq('id', selectedOpp.id);

      if (error) throw error;

      toast.success('Proposta excluída!');
      setDeleteDialogOpen(false);
      setSelectedOpp(null);
      fetchOpportunities();
    } catch (error: any) {
      toast.error('Erro ao excluir: ' + error.message);
    }
  };

  const handleConvertToSale = (opp: Opportunity) => {
    setSelectedOpp(opp);
    setPaymentData({
      payment_method_1: '',
      payment_method_2: '',
    });
    setConvertDialogOpen(true);
  };

  const handleConfirmConvertToSale = async () => {
    if (!selectedOpp) return;

    try {
      const saleData = {
        client_id: selectedOpp.client_id,
        seller_auth_id: user?.id,
        status: 'closed' as const,
        gross_value: selectedOpp.gross_value,
        total_cost: 0,
        estimated_profit: selectedOpp.gross_value * (selectedOpp.estimated_margin / 100 || 0),
        payment_method_1: paymentData.payment_method_1 || null,
        payment_method_2: paymentData.payment_method_2 || null,
        sold_at: new Date().toISOString(),
      };

      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert([saleData])
        .select()
        .single();

      if (saleError) throw saleError;

      // Create sale items with proper quantities and discounts
      if (selectedOpp.product_ids && selectedOpp.product_ids.length > 0) {
        const saleItems = selectedOpp.product_ids.map(productId => {
          const product = products.find(p => p.id === productId);
          return {
            sale_id: sale.id,
            product_id: productId,
            qty: 1, // Default for backward compatibility
            unit_price: product?.price || 0,
            discount_percent: 0,
          };
        });

        const { error: itemsError } = await supabase
          .from('sale_items')
          .insert(saleItems);

        if (itemsError) throw itemsError;
      }

      const { error: oppError } = await supabase
        .from('opportunities')
        .update({ stage: 'won' })
        .eq('id', selectedOpp.id);

      if (oppError) throw oppError;

      toast.success('Proposta convertida em venda com sucesso!');
      setConvertDialogOpen(false);
      setSelectedOpp(null);
      fetchOpportunities();
    } catch (error: any) {
      console.error('Error converting proposal to sale:', error);
      toast.error('Erro ao converter proposta: ' + error.message);
    }
  };

  const getProductsSummary = (productIds?: string[]) => {
    if (!productIds || productIds.length === 0) return '-';
    
    const productNames = productIds
      .map(id => products.find(p => p.id === id)?.name)
      .filter(Boolean);

    if (productNames.length === 0) return '-';
    if (productNames.length === 1) return productNames[0];
    return `${productNames[0]} +${productNames.length - 1}`;
  };

  const statsByStage = opportunities.reduce((acc, opp) => {
    if (!acc[opp.stage]) {
      acc[opp.stage] = { count: 0, value: 0 };
    }
    acc[opp.stage].count++;
    acc[opp.stage].value += Number(opp.gross_value || 0);
    return acc;
  }, {} as Record<string, { count: number; value: number }>);

  const totalValue = opportunities.reduce((sum, opp) => sum + Number(opp.gross_value || 0), 0);
  const activeOpps = opportunities.filter(o => !['won', 'lost'].includes(o.stage));
  const closingOpps = opportunities.filter(o => o.stage === 'closing');

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
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
            <h1 className="text-3xl font-bold">Propostas de Vendas</h1>
            <p className="text-muted-foreground">Gerencie suas propostas comerciais</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nova Proposta
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nova Proposta</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="client_id">Cliente *</Label>
                  <ClientAutocomplete
                    value={formData.client_id}
                    onChange={(value) => setFormData({ ...formData, client_id: value })}
                    userRole={userRole}
                    userId={user?.id}
                    sellers={sellers}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stage">Estágio *</Label>
                  <Select
                    value={formData.stage}
                    onValueChange={(value) => setFormData({ ...formData, stage: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lead">Lead</SelectItem>
                      <SelectItem value="qualified">Qualificado</SelectItem>
                      <SelectItem value="proposal">Proposta</SelectItem>
                      <SelectItem value="closing">Fechamento</SelectItem>
                      <SelectItem value="won">Ganha</SelectItem>
                      <SelectItem value="lost">Perdida</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Products Section */}
                <div className="border rounded-lg p-4 space-y-4">
                  <Label className="text-base font-semibold">Produtos da Proposta</Label>
                  
                  <div className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-4 space-y-2">
                      <Label className="text-xs">Produto</Label>
                      <ProductAutocomplete
                        value={selectedNewProduct}
                        onChange={(productId) => {
                          setSelectedNewProduct(productId);
                          const product = products.find(p => p.id === productId);
                          if (product) {
                            setNewProductPrice(product.price);
                            setNewProductOriginalPrice(product.price);
                            setNewProductDiscount(0);
                          }
                        }}
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label className="text-xs">Qtd</Label>
                      <Input
                        type="number"
                        min="1"
                        value={newProductQty}
                        onChange={(e) => setNewProductQty(Number(e.target.value))}
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label className="text-xs">Valor Unit. (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={newProductPrice}
                        onChange={(e) => {
                          const newPrice = Number(e.target.value);
                          setNewProductPrice(newPrice);
                          // Auto-calculate discount percentage
                          if (newProductOriginalPrice > 0) {
                            const discountPercent = ((newProductOriginalPrice - newPrice) / newProductOriginalPrice) * 100;
                            setNewProductDiscount(Math.max(0, Math.round(discountPercent * 100) / 100));
                          }
                        }}
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label className="text-xs">Desc. (%)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={newProductDiscount}
                        onChange={(e) => {
                          const discount = Number(e.target.value);
                          setNewProductDiscount(discount);
                          // Auto-calculate price from discount
                          if (newProductOriginalPrice > 0) {
                            const newPrice = newProductOriginalPrice * (1 - discount / 100);
                            setNewProductPrice(Math.round(newPrice * 100) / 100);
                          }
                        }}
                      />
                    </div>
                    <div className="col-span-2">
                      <Button
                        type="button"
                        onClick={addProposalProduct}
                        disabled={!selectedNewProduct}
                        className="w-full"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {proposalProducts.length > 0 && (
                    <div className="border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Produto</TableHead>
                            <TableHead className="text-right">Qtd</TableHead>
                            <TableHead className="text-right">Preço Unit.</TableHead>
                            <TableHead className="text-right">Desc.</TableHead>
                            <TableHead className="text-right">Subtotal</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {proposalProducts.map((product) => (
                            <TableRow key={product.id}>
                              <TableCell>
                                <div className="font-medium">{product.product_name}</div>
                                <div className="text-xs text-muted-foreground">{product.product_sku}</div>
                              </TableCell>
                              <TableCell className="text-right">{product.quantity}</TableCell>
                              <TableCell className="text-right">
                                {new Intl.NumberFormat('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL',
                                }).format(product.unit_price)}
                              </TableCell>
                              <TableCell className="text-right">{product.discount_percent}%</TableCell>
                              <TableCell className="text-right font-medium">
                                {new Intl.NumberFormat('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL',
                                }).format(product.subtotal)}
                              </TableCell>
                              <TableCell>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeProposalProduct(product.id)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      <div className="p-4 border-t bg-muted/50 space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span>Subtotal dos Produtos:</span>
                          <span>
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            }).format(calculateProposalTotal(proposalProducts))}
                          </span>
                        </div>
                        {valueAdjustment !== 0 && (
                          <div className="flex justify-between items-center text-sm">
                            <span>Ajuste de Valor:</span>
                            <span className={valueAdjustment > 0 ? 'text-green-600' : 'text-red-600'}>
                              {valueAdjustment > 0 ? '+' : ''}
                              {new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                              }).format(valueAdjustment)}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between items-center font-semibold text-lg pt-2 border-t">
                          <span>Total da Proposta:</span>
                          <span>
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            }).format(calculateFinalTotal(proposalProducts, valueAdjustment))}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {proposalProducts.length === 0 && (
                    <div className="text-center py-6 text-muted-foreground text-sm border rounded-md bg-muted/20">
                      Nenhum produto adicionado. Use o formulário acima para adicionar produtos.
                    </div>
                  )}
                </div>

                {/* Value adjustment - only if there are products */}
                {proposalProducts.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="value_adjustment">Ajuste de Valor (R$)</Label>
                    <Input
                      id="value_adjustment"
                      type="number"
                      step="0.01"
                      value={valueAdjustment}
                      onChange={(e) => {
                        const adjustment = Number(e.target.value);
                        setValueAdjustment(adjustment);
                        updateProposalGrossValue(proposalProducts, adjustment);
                      }}
                      placeholder="0.00"
                    />
                    <p className="text-xs text-muted-foreground">
                      Use valores positivos para acréscimos ou negativos para descontos adicionais
                    </p>
                  </div>
                )}

                {/* Manual value - only if no products */}
                {proposalProducts.length === 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="gross_value">Valor Bruto Manual (R$) *</Label>
                    <Input
                      id="gross_value"
                      type="number"
                      step="0.01"
                      value={formData.gross_value}
                      onChange={(e) => setFormData({ ...formData, gross_value: e.target.value })}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Informe um valor apenas se não adicionar produtos
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="probability">Probabilidade (%)</Label>
                    <Input
                      id="probability"
                      type="number"
                      min="0"
                      max="100"
                      value={formData.probability}
                      onChange={(e) => setFormData({ ...formData, probability: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="estimated_margin">Margem Estimada (%)</Label>
                    <Input
                      id="estimated_margin"
                      type="number"
                      value={formData.estimated_margin}
                      onChange={(e) => setFormData({ ...formData, estimated_margin: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expected_close_date">Previsão de Fechamento</Label>
                  <Input
                    id="expected_close_date"
                    type="date"
                    value={formData.expected_close_date}
                    onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="history">Histórico/Observações</Label>
                  <Textarea
                    id="history"
                    value={formData.history}
                    onChange={(e) => setFormData({ ...formData, history: e.target.value })}
                    rows={3}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? 'Criando...' : 'Criar Proposta'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total de Propostas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{opportunities.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {activeOpps.length} em andamento
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                  notation: 'compact',
                }).format(totalValue)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Ganhas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {statsByStage.won?.count || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                  notation: 'compact',
                }).format(statsByStage.won?.value || 0)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Em Fechamento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {closingOpps.length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                  notation: 'compact',
                }).format(statsByStage.closing?.value || 0)}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Pipeline de Propostas</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Produtos</TableHead>
                  <TableHead>Estágio</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Probabilidade</TableHead>
                  <TableHead>Margem Est.</TableHead>
                  <TableHead>Previsão</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {opportunities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      Nenhuma proposta encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  opportunities.map((opp) => {
                    const stageInfo = getStageInfo(opp.stage);
                    return (
                      <TableRow key={opp.id} className="hover:bg-muted/50">
                        <TableCell>
                          <div className="font-medium">
                            {opp.clients?.farm_name || 'Cliente não informado'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {opp.clients?.contact_name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">
                            {opp.seller_name || 'N/A'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm" title={opp.product_ids?.map(id => products.find(p => p.id === id)?.name).join(', ')}>
                            {getProductsSummary(opp.product_ids)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={stageInfo.color}>
                            {stageInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3 text-muted-foreground" />
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            }).format(opp.gross_value || 0)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary transition-all"
                                style={{ width: `${opp.probability || 0}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium">{opp.probability || 0}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3 text-muted-foreground" />
                            {opp.estimated_margin || 0}%
                          </div>
                        </TableCell>
                        <TableCell>
                          {opp.expected_close_date
                            ? new Date(opp.expected_close_date).toLocaleDateString('pt-BR')
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadPDF(opp)}
                              title="Baixar PDF"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            {!['won', 'lost'].includes(opp.stage) && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleConvertToSale(opp)}
                                title="Transformar em Venda"
                              >
                                <ShoppingCart className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(opp)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedOpp(opp);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => {
        setEditDialogOpen(open);
        if (!open) {
          resetForm();
          setSelectedOpp(null);
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Proposta</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit_client_id">Cliente *</Label>
              <Select
                value={formData.client_id}
                onValueChange={(value) => setFormData({ ...formData, client_id: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.farm_name} - {client.contact_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_stage">Estágio *</Label>
              <Select
                value={formData.stage}
                onValueChange={(value) => setFormData({ ...formData, stage: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="qualified">Qualificado</SelectItem>
                  <SelectItem value="proposal">Proposta</SelectItem>
                  <SelectItem value="closing">Fechamento</SelectItem>
                  <SelectItem value="won">Ganha</SelectItem>
                  <SelectItem value="lost">Perdida</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Products Section (same as create) */}
            <div className="border rounded-lg p-4 space-y-4">
              <Label className="text-base font-semibold">Produtos da Proposta</Label>
              
                  <div className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-4 space-y-2">
                      <Label className="text-xs">Produto</Label>
                      <ProductAutocomplete
                        value={selectedNewProduct}
                        onChange={(productId) => {
                          setSelectedNewProduct(productId);
                          const product = products.find(p => p.id === productId);
                          if (product) {
                            setNewProductPrice(product.price);
                            setNewProductOriginalPrice(product.price);
                            setNewProductDiscount(0);
                          }
                        }}
                        excludeIds={proposalProducts.map(p => p.product_id)}
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label className="text-xs">Qtd</Label>
                      <Input
                        type="number"
                        min="1"
                        value={newProductQty}
                        onChange={(e) => setNewProductQty(Number(e.target.value))}
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label className="text-xs">Valor Unit. (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={newProductPrice}
                        onChange={(e) => {
                          const newPrice = Number(e.target.value);
                          setNewProductPrice(newPrice);
                          // Auto-calculate discount percentage
                          if (newProductOriginalPrice > 0) {
                            const discountPercent = ((newProductOriginalPrice - newPrice) / newProductOriginalPrice) * 100;
                            setNewProductDiscount(Math.max(0, Math.round(discountPercent * 100) / 100));
                          }
                        }}
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label className="text-xs">Desc. (%)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={newProductDiscount}
                        onChange={(e) => {
                          const discount = Number(e.target.value);
                          setNewProductDiscount(discount);
                          // Auto-calculate price from discount
                          if (newProductOriginalPrice > 0) {
                            const newPrice = newProductOriginalPrice * (1 - discount / 100);
                            setNewProductPrice(Math.round(newPrice * 100) / 100);
                          }
                        }}
                      />
                    </div>
                    <div className="col-span-2">
                      <Button
                        type="button"
                        onClick={addProposalProduct}
                        disabled={!selectedNewProduct}
                        className="w-full"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

              {proposalProducts.length > 0 && (
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead className="text-right">Qtd</TableHead>
                        <TableHead className="text-right">Preço Unit.</TableHead>
                        <TableHead className="text-right">Desc.</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {proposalProducts.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell>
                            <div className="font-medium">{product.product_name}</div>
                            <div className="text-xs text-muted-foreground">{product.product_sku}</div>
                          </TableCell>
                          <TableCell className="text-right">{product.quantity}</TableCell>
                          <TableCell className="text-right">
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            }).format(product.unit_price)}
                          </TableCell>
                          <TableCell className="text-right">{product.discount_percent}%</TableCell>
                          <TableCell className="text-right font-medium">
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            }).format(product.subtotal)}
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeProposalProduct(product.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                      <div className="p-4 border-t bg-muted/50 space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span>Subtotal dos Produtos:</span>
                          <span>
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            }).format(calculateProposalTotal(proposalProducts))}
                          </span>
                        </div>
                        {valueAdjustment !== 0 && (
                          <div className="flex justify-between items-center text-sm">
                            <span>Ajuste de Valor:</span>
                            <span className={valueAdjustment > 0 ? 'text-green-600' : 'text-red-600'}>
                              {valueAdjustment > 0 ? '+' : ''}
                              {new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                              }).format(valueAdjustment)}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between items-center font-semibold text-lg pt-2 border-t">
                          <span>Total da Proposta:</span>
                          <span>
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            }).format(calculateFinalTotal(proposalProducts, valueAdjustment))}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {proposalProducts.length === 0 && (
                    <div className="text-center py-6 text-muted-foreground text-sm border rounded-md bg-muted/20">
                      Nenhum produto adicionado. Use o formulário acima para adicionar produtos.
                    </div>
                  )}
                </div>

                {/* Value adjustment for edit - only if there are products */}
                {proposalProducts.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="edit_value_adjustment">Ajuste de Valor (R$)</Label>
                    <Input
                      id="edit_value_adjustment"
                      type="number"
                      step="0.01"
                      value={valueAdjustment}
                      onChange={(e) => {
                        const adjustment = Number(e.target.value);
                        setValueAdjustment(adjustment);
                        updateProposalGrossValue(proposalProducts, adjustment);
                      }}
                      placeholder="0.00"
                    />
                    <p className="text-xs text-muted-foreground">
                      Use valores positivos para acréscimos ou negativos para descontos adicionais
                    </p>
                  </div>
                )}

                {proposalProducts.length === 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="edit_gross_value">Valor Bruto Manual (R$) *</Label>
                    <Input
                      id="edit_gross_value"
                      type="number"
                      step="0.01"
                      value={formData.gross_value}
                      onChange={(e) => setFormData({ ...formData, gross_value: e.target.value })}
                      required
                    />
                  </div>
                )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_probability">Probabilidade (%)</Label>
                <Input
                  id="edit_probability"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.probability}
                  onChange={(e) => setFormData({ ...formData, probability: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_estimated_margin">Margem Estimada (%)</Label>
                <Input
                  id="edit_estimated_margin"
                  type="number"
                  value={formData.estimated_margin}
                  onChange={(e) => setFormData({ ...formData, estimated_margin: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_expected_close_date">Previsão de Fechamento</Label>
              <Input
                id="edit_expected_close_date"
                type="date"
                value={formData.expected_close_date}
                onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })}
              />
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)} className="flex-1">
                Cancelar
              </Button>
              <Button type="submit" className="flex-1">
                Salvar Alterações
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta proposta? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Convert to Sale Dialog */}
      <Dialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transformar em Venda</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Você está prestes a converter esta proposta em uma venda confirmada.
            </p>
            <div className="space-y-2">
              <Label htmlFor="payment_method_1">Forma de Pagamento 1 *</Label>
              <Select
                value={paymentData.payment_method_1}
                onValueChange={(value) => setPaymentData({ ...paymentData, payment_method_1: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="PIX">PIX</SelectItem>
                  <SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem>
                  <SelectItem value="Cartão de Débito">Cartão de Débito</SelectItem>
                  <SelectItem value="Boleto">Boleto</SelectItem>
                  <SelectItem value="Transferência">Transferência</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment_method_2">Forma de Pagamento 2 (Opcional)</Label>
              <Select
                value={paymentData.payment_method_2}
                onValueChange={(value) => setPaymentData({ ...paymentData, payment_method_2: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="PIX">PIX</SelectItem>
                  <SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem>
                  <SelectItem value="Cartão de Débito">Cartão de Débito</SelectItem>
                  <SelectItem value="Boleto">Boleto</SelectItem>
                  <SelectItem value="Transferência">Transferência</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setConvertDialogOpen(false)} className="flex-1">
                Cancelar
              </Button>
              <Button 
                onClick={handleConfirmConvertToSale} 
                className="flex-1"
                disabled={!paymentData.payment_method_1}
              >
                Converter em Venda
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
