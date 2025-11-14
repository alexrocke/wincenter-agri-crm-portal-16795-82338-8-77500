import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, DollarSign, TrendingUp, ShoppingCart, Trash2, User, CheckCircle2, Clock, FileText, Edit, AlertTriangle } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ClientAutocomplete } from '@/components/ClientAutocomplete';

interface Sale {
  id: string;
  sold_at: string;
  gross_value: number;
  estimated_profit: number;
  total_cost: number;
  status: string;
  tax_percent: number;
  region: string;
  client_id: string;
  seller_auth_id: string;
  payment_received: boolean;
  payment_method_1: string | null;
  payment_method_2: string | null;
  service_id: string | null;
  final_discount_percent: number;
  clients?: {
    farm_name: string;
    contact_name: string;
  };
}

interface Product {
  id: string;
  name: string;
  price: number;
  cost: number;
  max_discount_percent: number;
}

interface SaleItem {
  product_id: string;
  product_name: string;
  qty: number;
  unit_price: number;
  cost: number;
  discount_percent: number;
  max_discount: number;
}

interface Seller {
  id: string;
  auth_user_id: string;
  name: string;
}

export default function Sales() {
  const { user, userRole } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [itemQty, setItemQty] = useState('1');
  const [itemDiscount, setItemDiscount] = useState('0');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'received' | 'pending'>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    client_id: '',
    seller_auth_id: user?.id || '',
    sold_at: new Date().toISOString().split('T')[0],
    status: 'closed',
    tax_percent: '',
    region: '',
    payment_method_1: '',
    payment_method_2: '',
    payment_received: false,
    final_discount_percent: '0',
  });

  useEffect(() => {
    fetchSales();
    fetchClients();
    fetchProducts();
    if (userRole === 'admin') {
      fetchSellers();
    }
  }, [user, userRole]);

  const fetchClients = async () => {
    try {
      let query = supabase.from('clients').select('id, farm_name, contact_name');
      
      // Admin e técnicos veem todos os clientes
      // Sellers veem apenas seus clientes ou clientes que eles criaram (owner_user_id)
      if (userRole === 'seller' && user?.id) {
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
        .select('id, name, price, cost, max_discount_percent')
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
        .in('role', ['seller', 'admin'])
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setSellers(data || []);
    } catch (error) {
      console.error('Error fetching sellers:', error);
    }
  };

  const fetchSales = async () => {
    try {
      let query = supabase
        .from('sales')
        .select(`
          *,
          clients (
            farm_name,
            contact_name
          )
        `)
        .order('sold_at', { ascending: false });

      if (userRole === 'seller' || userRole === 'technician') {
        query = query.eq('seller_auth_id', user?.id);
      }

      const { data, error } = await query;
      if (error) throw error;

      const baseSales = data || [];

      // Fetch related services to correct spraying totals immediately on UI
      const serviceIds = baseSales.map((s: any) => s.service_id).filter(Boolean);
      let servicesById = new Map<string, { id: string; service_type: string; total_value: number | null }>();
      if (serviceIds.length > 0) {
        const { data: servicesData, error: servicesError } = await supabase
          .from('services')
          .select('id, service_type, total_value')
          .in('id', serviceIds);
        if (!servicesError && servicesData) {
          servicesById = new Map(servicesData.map((sv: any) => [sv.id, sv]));
        }
      }

      const corrected = baseSales.map((sale: any) => {
        const sv = sale.service_id ? servicesById.get(sale.service_id) : undefined;
        if (sv && sv.service_type === 'spraying' && sv.total_value != null) {
          return {
            ...sale,
            gross_value: sv.total_value,
            total_cost: 0,
            estimated_profit: sv.total_value,
          };
        }
        return sale;
      });

      setSales(corrected);
    } catch (error) {
      console.error('Error fetching sales:', error);
    } finally {
      setLoading(false);
    }
  };


  const handleTogglePayment = async (saleId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('sales')
        .update({ payment_received: !currentStatus })
        .eq('id', saleId);

      if (error) throw error;

      toast.success(currentStatus ? 'Pagamento marcado como pendente' : 'Pagamento confirmado!');
      fetchSales();
    } catch (error) {
      console.error('Error updating payment status:', error);
      toast.error('Erro ao atualizar status de pagamento');
    }
  };

  const fetchSaleItems = async (saleId: string) => {
    try {
      const { data, error } = await supabase
        .from('sale_items')
        .select(`
          *,
          products (
            name,
            sku
          )
        `)
        .eq('sale_id', saleId);
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching sale items:', error);
      return [];
    }
  };

  const handleGeneratePDF = async (sale: Sale) => {
    try {
      const saleItems = await fetchSaleItems(sale.id);
      
      // Verificar se há itens
      if (!saleItems || saleItems.length === 0) {
        toast.error('Esta venda não possui produtos. Não é possível gerar o PDF.');
        return;
      }

      // Buscar informações da empresa
      const { data: siteSettings } = await supabase
        .from('site_settings')
        .select('*')
        .single();
      
      const doc = new jsPDF();
      let yPos = 20;

      // Logo da empresa (se existir)
      if (siteSettings?.logo_url) {
        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = siteSettings.logo_url;
          await new Promise((resolve) => {
            img.onload = () => {
              doc.addImage(img, 'PNG', 14, yPos, 30, 30);
              resolve(true);
            };
            img.onerror = () => resolve(false);
          });
          yPos += 35;
        } catch (error) {
          console.log('Erro ao carregar logo:', error);
          yPos += 5;
        }
      }
      
      // Nome da empresa e cabeçalho
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('COMPROVANTE DE VENDA', 14, yPos);
      yPos += 10;
      
      // Linha separadora
      doc.setDrawColor(0, 102, 204);
      doc.setLineWidth(0.5);
      doc.line(14, yPos, 196, yPos);
      yPos += 8;
      
      // Informações da venda
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`Data: ${new Date(sale.sold_at).toLocaleDateString('pt-BR')}`, 14, yPos);
      yPos += 6;
      doc.text(`Cliente: ${sale.clients?.farm_name || 'N/A'}`, 14, yPos);
      yPos += 6;
      doc.text(`Contato: ${sale.clients?.contact_name || 'N/A'}`, 14, yPos);
      yPos += 6;
      
      if (sale.region) {
        doc.text(`Região: ${sale.region}`, 14, yPos);
        yPos += 6;
      }
      
      yPos += 4;
      
      // Tabela de produtos
      const tableData = saleItems.map((item: any) => {
        const itemSubtotal = item.unit_price * item.qty;
        const itemTotal = itemSubtotal * (1 - item.discount_percent / 100);
        return [
          item.products?.name || 'Produto',
          item.qty.toString(),
          new Intl.NumberFormat('pt-BR', { 
            style: 'currency', 
            currency: 'BRL' 
          }).format(item.unit_price),
          `${item.discount_percent}%`,
          new Intl.NumberFormat('pt-BR', { 
            style: 'currency', 
            currency: 'BRL' 
          }).format(itemTotal)
        ];
      });
      
      // Calcular valores
      const subtotal = saleItems.reduce((sum: number, item: any) => {
        return sum + (item.unit_price * item.qty);
      }, 0);
      
      const discountFromItems = saleItems.reduce((sum: number, item: any) => {
        return sum + (item.unit_price * item.qty * item.discount_percent / 100);
      }, 0);
      
      const totalAfterItemDiscounts = subtotal - discountFromItems;
      
      const finalDiscountAmount = sale.final_discount_percent 
        ? totalAfterItemDiscounts * (sale.final_discount_percent / 100)
        : 0;
      
      const totalDiscountAmount = discountFromItems + finalDiscountAmount;
      
      autoTable(doc, {
        startY: yPos,
        head: [['Produto', 'Qtd', 'Preço Unit.', 'Desc.', 'Total']],
        body: tableData,
        theme: 'striped',
        headStyles: { 
          fillColor: [0, 102, 204],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 10
        },
        styles: {
          fontSize: 9,
          cellPadding: 3
        },
        columnStyles: {
          0: { cellWidth: 80 },
          1: { halign: 'center', cellWidth: 20 },
          2: { halign: 'right', cellWidth: 30 },
          3: { halign: 'center', cellWidth: 20 },
          4: { halign: 'right', cellWidth: 35 }
        }
      });
      
      // Resumo financeiro
      yPos = (doc as any).lastAutoTable.finalY + 10;
      
      // Box para resumo
      doc.setDrawColor(200, 200, 200);
      doc.setFillColor(248, 249, 250);
      doc.rect(14, yPos - 5, 182, 58, 'FD');
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('RESUMO FINANCEIRO', 18, yPos);
      yPos += 8;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Subtotal (produtos):`, 18, yPos);
      doc.text(new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(subtotal), 190, yPos, { align: 'right' });
      yPos += 6;
      
      if (totalDiscountAmount > 0) {
        doc.setTextColor(220, 53, 69);
        doc.text(`Desconto Total:`, 18, yPos);
        doc.text(`- ${new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }).format(totalDiscountAmount)}`, 190, yPos, { align: 'right' });
        doc.setTextColor(0, 0, 0);
        yPos += 6;
      }
      
      // Linha separadora
      doc.setDrawColor(0, 102, 204);
      doc.setLineWidth(0.8);
      doc.line(18, yPos, 192, yPos);
      yPos += 7;
      
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('VALOR TOTAL:', 18, yPos);
      doc.text(new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(sale.gross_value), 190, yPos, { align: 'right' });
      yPos += 8;
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(`Custo Total: ${new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(sale.total_cost)}`, 18, yPos);
      yPos += 5;
      
      const profitPercent = sale.gross_value > 0 
        ? ((sale.estimated_profit / sale.gross_value) * 100).toFixed(1)
        : '0.0';
      
      doc.setTextColor(40, 167, 69);
      doc.text(`Lucro Estimado: ${new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(sale.estimated_profit)} (${profitPercent}%)`, 18, yPos);
      doc.setTextColor(0, 0, 0);
      
      yPos += 10;
      
      // Informações de pagamento
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('INFORMAÇÕES DE PAGAMENTO', 14, yPos);
      yPos += 7;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      if (sale.payment_method_1) {
        doc.text(`Forma de Pagamento: ${sale.payment_method_1}`, 14, yPos);
        yPos += 6;
      }
      if (sale.payment_method_2) {
        doc.text(`Forma de Pagamento 2: ${sale.payment_method_2}`, 14, yPos);
        yPos += 6;
      }
      
      // Status do pagamento com cor
      if (sale.payment_received) {
        doc.setTextColor(40, 167, 69);
        doc.setFont('helvetica', 'bold');
        doc.text('✓ Pagamento Recebido', 14, yPos);
      } else {
        doc.setTextColor(255, 193, 7);
        doc.setFont('helvetica', 'bold');
        doc.text('⏱ Pagamento Pendente', 14, yPos);
      }
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      
      // Rodapé
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`,
        105,
        280,
        { align: 'center' }
      );
      
      // Salvar PDF
      const fileName = `venda_${sale.clients?.farm_name?.replace(/\s+/g, '_') || 'cliente'}_${new Date(sale.sold_at).toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`;
      doc.save(fileName);
      
      toast.success('PDF gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF da venda');
    }
  };

  const handleAddProduct = () => {
    if (!selectedProduct || !itemQty) {
      toast.error('Selecione um produto e informe a quantidade');
      return;
    }

    const product = products.find(p => p.id === selectedProduct);
    if (!product) return;

    const discount = Number(itemDiscount) || 0;
    if (discount > product.max_discount_percent) {
      toast.error(`Desconto máximo permitido: ${product.max_discount_percent}%`);
      return;
    }

    const newItem: SaleItem = {
      product_id: product.id,
      product_name: product.name,
      qty: Number(itemQty),
      unit_price: product.price,
      cost: product.cost,
      discount_percent: discount,
      max_discount: product.max_discount_percent,
    };

    setSaleItems([...saleItems, newItem]);
    setSelectedProduct('');
    setItemQty('1');
    setItemDiscount('0');
  };

  const handleRemoveProduct = (index: number) => {
    setSaleItems(saleItems.filter((_, i) => i !== index));
  };

  const handleUpdateSaleItem = (index: number, field: 'qty' | 'unit_price' | 'discount_percent', value: string) => {
    const numValue = parseFloat(value) || 0;
    
    // Validação
    if (field === 'qty' && numValue <= 0) return;
    if (field === 'unit_price' && numValue < 0) return;
    if (field === 'discount_percent' && (numValue < 0 || numValue > 100)) return;
    
    const updatedItems = [...saleItems];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: numValue,
    };
    
    setSaleItems(updatedItems);
  };

  const calculateTotals = () => {
    let totalGross = 0;
    let totalCost = 0;

    saleItems.forEach(item => {
      const itemGross = item.unit_price * item.qty * (1 - item.discount_percent / 100);
      const itemCost = item.cost * item.qty;
      totalGross += itemGross;
      totalCost += itemCost;
    });

    // Aplicar desconto final sobre o total
    const finalDiscount = Number(formData.final_discount_percent) || 0;
    const grossAfterDiscount = totalGross * (1 - finalDiscount / 100);

    return {
      gross: totalGross,
      grossAfterDiscount: grossAfterDiscount,
      cost: totalCost,
      profit: grossAfterDiscount - totalCost,
      finalDiscount: totalGross - grossAfterDiscount
    };
  };

  const totals = calculateTotals();

  const handleEdit = async (sale: Sale) => {
    setIsEditing(true);
    setEditingSaleId(sale.id);
    
    // Carregar dados da venda
    setFormData({
      client_id: sale.client_id,
      seller_auth_id: sale.seller_auth_id,
      sold_at: new Date(sale.sold_at).toISOString().split('T')[0],
      status: sale.status,
      tax_percent: sale.tax_percent?.toString() || '',
      region: sale.region || '',
      payment_method_1: sale.payment_method_1 || '',
      payment_method_2: sale.payment_method_2 || '',
      payment_received: sale.payment_received,
      final_discount_percent: sale.final_discount_percent?.toString() || '0',
    });
    
    // Carregar itens da venda
    try {
      const items = await fetchSaleItems(sale.id);
      const formattedItems: SaleItem[] = items.map((item: any) => ({
        product_id: item.product_id,
        product_name: item.products?.name || 'Produto',
        qty: item.qty,
        unit_price: item.unit_price,
        cost: 0, // Will be recalculated
        discount_percent: item.discount_percent,
        max_discount: 100,
      }));
      
      setSaleItems(formattedItems);
      setDialogOpen(true);
    } catch (error) {
      console.error('Error loading sale items:', error);
      toast.error('Erro ao carregar itens da venda');
    }
  };

  const handleDelete = async () => {
    if (!saleToDelete) return;
    
    try {
      // Primeiro deletar os itens
      const { error: itemsError } = await supabase
        .from('sale_items')
        .delete()
        .eq('sale_id', saleToDelete);
      
      if (itemsError) throw itemsError;
      
      // Depois deletar a venda
      const { error: saleError } = await supabase
        .from('sales')
        .delete()
        .eq('id', saleToDelete);
      
      if (saleError) throw saleError;
      
      toast.success('Venda excluída com sucesso!');
      setDeleteDialogOpen(false);
      setSaleToDelete(null);
      fetchSales();
    } catch (error: any) {
      console.error('Error deleting sale:', error);
      toast.error('Erro ao excluir venda: ' + error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      client_id: '',
      seller_auth_id: user?.id || '',
      sold_at: new Date().toISOString().split('T')[0],
      status: 'closed',
      tax_percent: '',
      region: '',
      payment_method_1: '',
      payment_method_2: '',
      payment_received: false,
      final_discount_percent: '0',
    });
    setSaleItems([]);
    setIsEditing(false);
    setEditingSaleId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (saleItems.length === 0) {
      toast.error('Adicione pelo menos um produto à venda');
      return;
    }

    if (totals.gross <= 0) {
      toast.error('O valor total da venda não pode ser zero');
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const saleData: any = {
        client_id: formData.client_id,
        seller_auth_id: formData.seller_auth_id || user?.id,
        sold_at: new Date(formData.sold_at).toISOString(),
        status: formData.status,
        tax_percent: formData.tax_percent ? Number(formData.tax_percent) : null,
        region: formData.region || null,
        gross_value: Number(totals.grossAfterDiscount),
        total_cost: Number(totals.cost),
        estimated_profit: Number(totals.profit),
        payment_method_1: formData.payment_method_1 || null,
        payment_method_2: formData.payment_method_2 || null,
        payment_received: formData.payment_received,
        final_discount_percent: Number(formData.final_discount_percent) || 0,
      };

      if (isEditing && editingSaleId) {
        // Atualizar venda existente
        const { error: saleError } = await supabase
          .from('sales')
          .update(saleData)
          .eq('id', editingSaleId);

        if (saleError) throw saleError;

        // Deletar itens antigos
        const { error: deleteError } = await supabase
          .from('sale_items')
          .delete()
          .eq('sale_id', editingSaleId);

        if (deleteError) throw deleteError;

        // Inserir novos itens
        const itemsData = saleItems.map(item => ({
          sale_id: editingSaleId,
          product_id: item.product_id,
          qty: item.qty,
          unit_price: item.unit_price,
          discount_percent: item.discount_percent,
        }));

        const { error: itemsError } = await supabase
          .from('sale_items')
          .insert(itemsData);

        if (itemsError) throw itemsError;

        toast.success('Venda atualizada com sucesso!');
      } else {
        // Criar nova venda
        console.log('📝 Criando venda...', saleData);
        
        const { data: sale, error: saleError } = await supabase
          .from('sales')
          .insert([saleData])
          .select()
          .single();

        if (saleError) {
          console.error('❌ Erro ao criar venda:', saleError);
          throw new Error(`Erro ao criar venda: ${saleError.message}`);
        }

        console.log('✅ Venda criada com sucesso:', sale);

        // Criar os itens da venda
        const itemsData = saleItems.map(item => ({
          sale_id: sale.id,
          product_id: item.product_id,
          qty: item.qty,
          unit_price: item.unit_price,
          discount_percent: item.discount_percent,
        }));

        console.log('📦 Inserindo itens da venda:', itemsData);

        const { error: itemsError, data: insertedItems } = await supabase
          .from('sale_items')
          .insert(itemsData)
          .select();

        if (itemsError) {
          console.error('❌ Erro ao inserir itens:', itemsError);
          
          // Rollback: deletar a venda criada
          console.log('🔄 Executando rollback: deletando venda criada...');
          await supabase.from('sales').delete().eq('id', sale.id);
          
          throw new Error(`Erro ao adicionar produtos: ${itemsError.message}`);
        }

        console.log('✅ Itens inseridos com sucesso:', insertedItems);
        toast.success('Venda criada com sucesso!');
      }

      setDialogOpen(false);
      resetForm();
      fetchSales();
    } catch (error: any) {
      console.error('💥 Erro ao salvar venda:', error);
      toast.error(error.message || `Erro ao ${isEditing ? 'atualizar' : 'criar'} venda`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthSales = sales.filter(s => 
    s.sold_at.slice(0, 7) === currentMonth && s.status === 'closed'
  );

  const totalRevenue = sales
    .filter(s => s.status === 'closed')
    .reduce((sum, s) => sum + Number(s.gross_value), 0);

  const totalProfit = sales
    .filter(s => s.status === 'closed')
    .reduce((sum, s) => sum + Number(s.estimated_profit), 0);

  const monthRevenue = monthSales.reduce((sum, s) => sum + Number(s.gross_value), 0);

  // Cálculos de recebimento
  const receivedSales = sales.filter(s => s.status === 'closed' && s.payment_received);
  const pendingSales = sales.filter(s => s.status === 'closed' && !s.payment_received);
  
  const totalReceived = receivedSales.reduce((sum, s) => sum + Number(s.gross_value), 0);
  const totalPending = pendingSales.reduce((sum, s) => sum + Number(s.gross_value), 0);

  // Aplicar filtro de pagamento
  const filteredSales = sales.filter(sale => {
    if (paymentFilter === 'received') return sale.payment_received;
    if (paymentFilter === 'pending') return !sale.payment_received;
    return true;
  });

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
            <h1 className="text-3xl font-bold">Vendas</h1>
            <p className="text-muted-foreground">Histórico e gestão de vendas</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nova Venda
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{isEditing ? 'Editar Venda' : 'Registrar Nova Venda'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
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
                  {userRole === 'admin' && (
                    <div className="space-y-2">
                      <Label htmlFor="seller_auth_id">Vendedor *</Label>
                      <Select
                        value={formData.seller_auth_id}
                        onValueChange={(value) => setFormData({ ...formData, seller_auth_id: value })}
                        required
                      >
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Selecione um vendedor" />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-[100]">
                          {sellers.map((seller) => (
                            <SelectItem key={seller.auth_user_id} value={seller.auth_user_id}>
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                {seller.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sold_at">Data da Venda *</Label>
                    <Input
                      id="sold_at"
                      type="date"
                      value={formData.sold_at}
                      onChange={(e) => setFormData({ ...formData, sold_at: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status *</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger className="bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-[100]">
                        <SelectItem value="closed">Fechada</SelectItem>
                        <SelectItem value="canceled">Cancelada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tax_percent">Impostos (%)</Label>
                    <Input
                      id="tax_percent"
                      type="number"
                      step="0.01"
                      value={formData.tax_percent}
                      onChange={(e) => setFormData({ ...formData, tax_percent: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="region">Região</Label>
                    <Input
                      id="region"
                      value={formData.region}
                      onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    />
                  </div>
                </div>

                {/* Formas de Pagamento */}
                <div className="border-t pt-4 space-y-4">
                  <h3 className="font-semibold">Forma de Pagamento</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="payment_method_1">Forma de Pagamento 1</Label>
                      <Select
                        value={formData.payment_method_1}
                        onValueChange={(value) => setFormData({ ...formData, payment_method_1: value })}
                      >
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-[100]">
                          <SelectItem value="dinheiro">Dinheiro</SelectItem>
                          <SelectItem value="pix">Pix</SelectItem>
                          <SelectItem value="financiamento">Financiamento</SelectItem>
                          <SelectItem value="cheque">Cheque</SelectItem>
                          <SelectItem value="troca">Troca</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="payment_method_2">Forma de Pagamento 2 (Opcional)</Label>
                      <Select
                        value={formData.payment_method_2}
                        onValueChange={(value) => setFormData({ ...formData, payment_method_2: value })}
                      >
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-[100]">
                          <SelectItem value="dinheiro">Dinheiro</SelectItem>
                          <SelectItem value="pix">Pix</SelectItem>
                          <SelectItem value="financiamento">Financiamento</SelectItem>
                          <SelectItem value="cheque">Cheque</SelectItem>
                          <SelectItem value="troca">Troca</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="payment_received"
                      checked={formData.payment_received}
                      onChange={(e) => setFormData({ ...formData, payment_received: e.target.checked })}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="payment_received" className="cursor-pointer">
                      Pagamento Recebido
                    </Label>
                  </div>
                </div>

                {/* Adicionar Produtos */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Produtos da Venda *</h3>
                  <div className="grid grid-cols-12 gap-2 mb-3">
                    <div className="col-span-5 space-y-2">
                      <Label>Produto</Label>
                      <Select
                        value={selectedProduct}
                        onValueChange={setSelectedProduct}
                      >
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Selecione um produto" />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-[100]">
                          {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} - {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(product.price)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label>Quantidade</Label>
                      <Input
                        type="number"
                        min="1"
                        placeholder="1"
                        value={itemQty}
                        onChange={(e) => setItemQty(e.target.value)}
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label>Desconto (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0"
                        value={itemDiscount}
                        onChange={(e) => setItemDiscount(e.target.value)}
                      />
                    </div>
                    <div className="col-span-3 space-y-2">
                      <Label className="opacity-0">Ação</Label>
                      <Button
                        type="button"
                        onClick={handleAddProduct}
                        className="w-full"
                        variant="outline"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Adicionar
                      </Button>
                    </div>
                  </div>

                  {/* Lista de Produtos Adicionados */}
                  {saleItems.length > 0 && (
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Produto</TableHead>
                            <TableHead className="text-right">Qtd</TableHead>
                            <TableHead className="text-right">Preço Un.</TableHead>
                            <TableHead className="text-right">Desc %</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="w-12"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {saleItems.map((item, index) => {
                            const itemTotal = item.unit_price * item.qty * (1 - item.discount_percent / 100);
                            return (
                              <TableRow key={index}>
                                <TableCell className="font-medium">{item.product_name}</TableCell>
                                <TableCell className="text-right">
                                  <Input
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={item.qty}
                                    onChange={(e) => handleUpdateSaleItem(index, 'qty', e.target.value)}
                                    className="w-20 text-right h-8"
                                  />
                                </TableCell>
                                <TableCell className="text-right">
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={item.unit_price}
                                    onChange={(e) => handleUpdateSaleItem(index, 'unit_price', e.target.value)}
                                    className="w-28 text-right h-8"
                                  />
                                </TableCell>
                                <TableCell className="text-right">
                                  <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.1"
                                    value={item.discount_percent}
                                    onChange={(e) => handleUpdateSaleItem(index, 'discount_percent', e.target.value)}
                                    className="w-20 text-right h-8"
                                  />
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                  {new Intl.NumberFormat('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL',
                                  }).format(itemTotal)}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveProduct(index)}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {/* Desconto Final */}
                  {saleItems.length > 0 && (
                    <div className="border-t pt-4">
                      <div className="space-y-2">
                        <Label htmlFor="final_discount_percent">Desconto Final (%)</Label>
                        <Input
                          id="final_discount_percent"
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={formData.final_discount_percent}
                          onChange={(e) => setFormData({ ...formData, final_discount_percent: e.target.value })}
                          placeholder="0"
                        />
                      </div>
                    </div>
                  )}

                  {/* Totais */}
                  {saleItems.length > 0 && (
                    <div className="mt-4 p-4 bg-muted/50 rounded-lg space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal:</span>
                        <span className="font-medium">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(totals.gross)}
                        </span>
                      </div>
                      {totals.finalDiscount > 0 && (
                        <div className="flex justify-between text-sm text-orange-600">
                          <span>Desconto Final ({formData.final_discount_percent}%):</span>
                          <span className="font-medium">
                            - {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            }).format(totals.finalDiscount)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between text-lg font-bold border-t pt-2">
                        <span>Valor Total:</span>
                        <span className="text-primary">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(totals.grossAfterDiscount)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Custo Total:</span>
                        <span className="font-medium text-red-600">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(totals.cost)}
                        </span>
                      </div>
                      <div className="flex justify-between text-lg font-bold border-t pt-2">
                        <span>Lucro Estimado:</span>
                        <span className="text-green-600">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(totals.profit)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={saleItems.length === 0 || isSubmitting}>
                  {isSubmitting ? (isEditing ? 'Atualizando...' : 'Criando...') : (isEditing ? 'Atualizar Venda' : 'Criar Venda')}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium">Vendas do Mês</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{monthSales.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                  notation: 'compact',
                }).format(monthRevenue)}
              </p>
            </CardContent>
          </Card>
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
                  notation: 'compact',
                }).format(totalRevenue)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {sales.filter(s => s.status === 'closed').length} vendas fechadas
              </p>
            </CardContent>
          </Card>
          {userRole === 'admin' && (
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium">Lucro Total</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                    notation: 'compact',
                  }).format(totalProfit)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Margem: {totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0}%
                </p>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                  notation: 'compact',
                }).format(
                  sales.filter(s => s.status === 'closed').length > 0
                    ? totalRevenue / sales.filter(s => s.status === 'closed').length
                    : 0
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cards de Recebimento - apenas admin */}
        {userRole === 'admin' && (
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium">Recebido</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(totalReceived)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {receivedSales.length} vendas recebidas
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium">A Receber</CardTitle>
                <Clock className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(totalPending)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {pendingSales.length} vendas pendentes
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium">Taxa de Recebimento</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {sales.filter(s => s.status === 'closed').length > 0
                    ? ((receivedSales.length / sales.filter(s => s.status === 'closed').length) * 100).toFixed(1)
                    : 0}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Do total de vendas
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Histórico de Vendas</CardTitle>
              {userRole === 'admin' && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={paymentFilter === 'all' ? 'default' : 'outline'}
                    onClick={() => setPaymentFilter('all')}
                    className="flex-shrink-0"
                  >
                    Todas
                  </Button>
                  <Button
                    size="sm"
                    variant={paymentFilter === 'received' ? 'default' : 'outline'}
                    onClick={() => setPaymentFilter('received')}
                    className="flex-shrink-0"
                  >
                    Recebidas
                  </Button>
                  <Button
                    size="sm"
                    variant={paymentFilter === 'pending' ? 'default' : 'outline'}
                    onClick={() => setPaymentFilter('pending')}
                    className="flex-shrink-0"
                  >
                    Pendentes
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="w-full">
              <div className="min-w-[1200px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Valor Bruto</TableHead>
                      {userRole === 'admin' && (
                        <>
                          <TableHead>Custo</TableHead>
                          <TableHead>Lucro</TableHead>
                          <TableHead>Margem</TableHead>
                      <TableHead>Pagamento</TableHead>
                        </>
                      )}
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSales.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={userRole === 'admin' ? 8 : 4} className="text-center py-8 text-muted-foreground">
                          Nenhuma venda encontrada
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSales.map((sale) => {
                        const margin = sale.gross_value > 0
                          ? ((sale.estimated_profit / sale.gross_value) * 100).toFixed(1)
                          : 0;

                        return (
                          <TableRow key={sale.id} className="cursor-pointer hover:bg-muted/50">
                            <TableCell>
                              {new Date(sale.sold_at).toLocaleDateString('pt-BR')}
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">
                                {sale.clients?.farm_name || 'Cliente não informado'}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {sale.clients?.contact_name}
                              </div>
                            </TableCell>
                            <TableCell>
                              {new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                              }).format(sale.gross_value)}
                            </TableCell>
                            {userRole === 'admin' && (
                              <>
                                <TableCell className="text-red-600">
                                  {new Intl.NumberFormat('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL',
                                  }).format(sale.total_cost)}
                                </TableCell>
                                <TableCell className="text-green-600 font-medium">
                                  {new Intl.NumberFormat('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL',
                                  }).format(sale.estimated_profit)}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">{margin}%</Badge>
                                </TableCell>
                                <TableCell>
                                  {sale.payment_received ? (
                                    <Badge className="bg-green-100 text-green-800">
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                      Recebido
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-orange-100 text-orange-800">
                                      <Clock className="h-3 w-3 mr-1" />
                                      Pendente
                                    </Badge>
                                  )}
                                </TableCell>
                              </>
                            )}
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleGeneratePDF(sale)}
                                  title="Baixar PDF"
                                >
                                  <FileText className="h-4 w-4" />
                                </Button>
                                {(!sale.service_id || userRole === 'admin') && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleEdit(sale)}
                                      title="Editar venda"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setSaleToDelete(sale.id);
                                        setDeleteDialogOpen(true);
                                      }}
                                      title="Excluir venda"
                                    >
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </>
                                )}
                                {userRole === 'admin' && (
                                  <Button
                                    size="sm"
                                    variant={sale.payment_received ? 'outline' : 'default'}
                                    onClick={() => handleTogglePayment(sale.id, sale.payment_received)}
                                  >
                                    {sale.payment_received ? 'Marcar Pendente' : 'Confirmar Recebimento'}
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirmar Exclusão
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta venda? Esta ação não pode ser desfeita e todos os itens da venda também serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSaleToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
