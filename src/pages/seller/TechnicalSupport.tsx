import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { Plus, Edit, Eye, Trash2, Calendar as CalendarIcon, Filter, Upload, X, Wrench, Download, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ClientAutocomplete } from "@/components/ClientAutocomplete";
import { MediaUpload } from "@/components/MediaUpload";
import { MediaViewer } from "@/components/MediaViewer";

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  cost: number;
}

interface ProductItem {
  product_id: string;
  product_name: string;
  unit_price: number;
  qty: number;
  discount_percent: number;
}

interface TechnicalService {
  id: string;
  client_id: string;
  date: string;
  status: string;
  service_category?: string;
  equipment_model?: string;
  equipment_serial?: string;
  equipment_year?: number;
  city?: string;
  property_name?: string;
  reported_defect?: string;
  total_value?: number;
  under_warranty?: boolean;
  notes?: string;
  images?: string[];
  client_signature?: string;
  technical_checklist?: string;
  followup_objective?: string;
  followup_results?: string;
  client_present?: boolean;
  assigned_users?: string[];
  clients?: {
    contact_name: string;
  };
}

interface User {
  auth_user_id: string;
  name: string;
  email: string;
}

export default function TechnicalSupport() {
  const { user } = useAuth();
  const [services, setServices] = useState<TechnicalService[]>([]);
  const [filteredServices, setFilteredServices] = useState<TechnicalService[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<TechnicalService | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [productItems, setProductItems] = useState<ProductItem[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [mediaFiles, setMediaFiles] = useState<any[]>([]);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  
  // Estados para diálogo de conclusão
  const [concludeDialogOpen, setConcludeDialogOpen] = useState(false);
  const [serviceToComplete, setServiceToComplete] = useState<TechnicalService | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
  const [otherPaymentMethod, setOtherPaymentMethod] = useState("");
  const [paymentValues, setPaymentValues] = useState<Record<string, string>>({});

  // Filtros
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterClient, setFilterClient] = useState<string>("");
  const [filterCity, setFilterCity] = useState<string>("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterDateFrom, setFilterDateFrom] = useState<Date | undefined>();
  const [filterDateTo, setFilterDateTo] = useState<Date | undefined>();

  // Form data
  const [formData, setFormData] = useState({
    client_id: "",
    date: new Date(),
    service_category: "maintenance",
    equipment_model: "",
    equipment_serial: "",
    equipment_year: new Date().getFullYear(),
    city: "",
    property_name: "",
    reported_defect: "",
      total_value: 0,
      under_warranty: false,
      status: "scheduled",
      notes: "",
    images: [] as string[],
    client_signature: "",
    technical_checklist: "",
    followup_objective: "",
    followup_results: "",
    client_present: false,
    assigned_users: [] as string[],
  });

  useEffect(() => {
    fetchServices();
    fetchProducts();
    fetchUsers();
  }, [user]);

  useEffect(() => {
    if (isEditing && selectedService) {
      fetchServiceItems(selectedService.id);
    }
  }, [isEditing, selectedService]);

  useEffect(() => {
    applyFilters();
  }, [services, filterStatus, filterClient, filterCity, filterCategory, filterDateFrom, filterDateTo]);

  useEffect(() => {
    if (formData.under_warranty) {
      setFormData(prev => ({ ...prev, total_value: 0 }));
    }
  }, [formData.under_warranty]);

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from("services")
        .select(`
          *,
          clients (
            contact_name
          )
        `)
        .in("service_category", ["maintenance", "revision", "warranty", "followup"])
        .order("date", { ascending: false });

      if (error) throw error;
      setServices(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar atendimentos");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, stock, cost")
        .eq("status", "active")
        .order("name");

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar produtos:", error);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("auth_user_id, name, email")
        .eq("status", "active")
        .order("name");

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar usuários:", error);
    }
  };

  const fetchServiceItems = async (serviceId: string) => {
    try {
      const { data, error } = await supabase
        .from("service_items")
        .select("*, products(name)")
        .eq("service_id", serviceId);

      if (error) throw error;
      
      const items = (data || []).map(item => ({
        product_id: item.product_id,
        product_name: item.products?.name || "",
        unit_price: item.unit_price,
        qty: item.qty,
        discount_percent: item.discount_percent
      }));
      
      setProductItems(items);
    } catch (error: any) {
      console.error("Erro ao carregar itens do serviço:", error);
    }
  };

  const applyFilters = () => {
    let filtered = [...services];

    if (filterStatus !== "all") {
      filtered = filtered.filter(s => s.status === filterStatus);
    }

    if (filterClient) {
      filtered = filtered.filter(s => 
        s.clients?.contact_name.toLowerCase().includes(filterClient.toLowerCase())
      );
    }

    if (filterCity) {
      filtered = filtered.filter(s => 
        s.city?.toLowerCase().includes(filterCity.toLowerCase())
      );
    }

    if (filterCategory !== "all") {
      filtered = filtered.filter(s => s.service_category === filterCategory);
    }

    if (filterDateFrom) {
      filtered = filtered.filter(s => new Date(s.date) >= filterDateFrom);
    }

    if (filterDateTo) {
      filtered = filtered.filter(s => new Date(s.date) <= filterDateTo);
    }

    setFilteredServices(filtered);
  };

  const handleSubmit = async () => {
    try {
      if (!formData.client_id) {
        toast.error("Selecione um cliente");
        return;
      }

      // Validar estoque dos produtos
      for (const item of productItems) {
        const product = products.find(p => p.id === item.product_id);
        if (product && product.stock < item.qty) {
          toast.error(`Estoque insuficiente para ${item.product_name}`);
          return;
        }
      }

      // Remover campos que não devem ser enviados diretamente
      const { total_value, ...formDataWithoutTotal } = formData;
      
      const serviceData = {
        ...formDataWithoutTotal,
        date: formData.date.toISOString(),
        service_type: "maintenance" as const,
        created_by: user?.id,
        status: formData.status as any,
      };

      if (isEditing && selectedService) {
        const { error } = await supabase
          .from("services")
          .update(serviceData)
          .eq("id", selectedService.id);

        if (error) throw error;

        // Deletar itens antigos e inserir novos
        const { error: deleteError } = await supabase
          .from("service_items")
          .delete()
          .eq("service_id", selectedService.id);

        if (deleteError) throw deleteError;

        // Inserir novos itens se houver
        if (productItems.length > 0) {
          const serviceItems = productItems.map(item => ({
            service_id: selectedService.id,
            product_id: item.product_id,
            qty: item.qty,
            unit_price: item.unit_price,
            discount_percent: item.discount_percent
          }));

          const { error: itemsError } = await supabase
            .from("service_items")
            .insert(serviceItems);

          if (itemsError) throw itemsError;
        }

        // Atualizar arquivos de mídia - deletar existentes e inserir novos
        const { error: deleteFilesError } = await supabase
          .from('service_files')
          .delete()
          .eq('service_id', selectedService.id);

        if (deleteFilesError) console.error('Error deleting old files:', deleteFilesError);

        if (mediaFiles.length > 0) {
          const fileRecords = mediaFiles.map(file => ({
            service_id: selectedService.id,
            file_path: file.file_path,
            file_name: file.file_name,
            file_type: file.file_type,
            file_size: file.file_size,
            uploaded_by: user?.id
          }));

          const { error: filesError } = await supabase
            .from('service_files')
            .insert(fileRecords);

          if (filesError) console.error('Error saving files:', filesError);
        }

        toast.success("Atendimento atualizado com sucesso!");
      } else {
        // Criar serviço
        const { data: newService, error: serviceError } = await supabase
          .from("services")
          .insert([serviceData])
          .select()
          .single();

        if (serviceError) throw serviceError;

        // Salvar arquivos de mídia no banco
        if (mediaFiles.length > 0) {
          const fileRecords = mediaFiles.map(file => ({
            service_id: newService.id,
            file_path: file.file_path,
            file_name: file.file_name,
            file_type: file.file_type,
            file_size: file.file_size,
            uploaded_by: user?.id
          }));

          const { error: filesError } = await supabase
            .from('service_files')
            .insert(fileRecords);

          if (filesError) {
            console.error('Error saving files:', filesError);
          }
        }

        // Salvar produtos do serviço
        if (productItems.length > 0) {
          const serviceItems = productItems.map(item => ({
            service_id: newService.id,
            product_id: item.product_id,
            qty: item.qty,
            unit_price: item.unit_price,
            discount_percent: item.discount_percent
          }));

          const { error: serviceItemsError } = await supabase
            .from("service_items")
            .insert(serviceItems);

          if (serviceItemsError) throw serviceItemsError;

          // Processar baixa de estoque ou venda
          if (formData.under_warranty) {
            // Garantia: apenas baixar estoque
            for (const item of productItems) {
              const product = products.find(p => p.id === item.product_id);
              if (!product) continue;
              
              const { error: stockError } = await supabase
                .from('products')
                .update({ stock: product.stock - item.qty })
                .eq('id', item.product_id);
              
              if (stockError) throw stockError;
            }
            toast.success("Atendimento criado e estoque atualizado!");
          } else {
            // Não é garantia: criar venda
            const totalGross = productItems.reduce((sum, item) => {
              const itemTotal = item.unit_price * item.qty;
              const discount = itemTotal * (item.discount_percent / 100);
              return sum + (itemTotal - discount);
            }, 0);

            const totalCost = productItems.reduce((sum, item) => {
              const product = products.find(p => p.id === item.product_id);
              return sum + ((product?.cost || 0) * item.qty);
            }, 0);

            // Criar venda
            const { data: newSale, error: saleError } = await supabase
              .from("sales")
              .insert([{
                client_id: formData.client_id,
                seller_auth_id: user?.id,
                service_id: newService.id,
                gross_value: totalGross,
                total_cost: totalCost,
                estimated_profit: totalGross - totalCost,
                status: 'closed',
                sold_at: formData.date.toISOString(),
                payment_received: false
              }])
              .select()
              .single();

            if (saleError) throw saleError;

            // Criar itens da venda
            const saleItems = productItems.map(item => ({
              sale_id: newSale.id,
              product_id: item.product_id,
              qty: item.qty,
              unit_price: item.unit_price,
              discount_percent: item.discount_percent
            }));

            const { error: itemsError } = await supabase
              .from("sale_items")
              .insert(saleItems);

            if (itemsError) throw itemsError;

            toast.success("Atendimento criado e venda gerada com sucesso!");
          }
        } else {
          toast.success("Atendimento criado com sucesso!");
        }
      }

      setDialogOpen(false);
      resetForm();
      fetchServices();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar atendimento");
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este atendimento?")) return;

    try {
      const { error } = await supabase
        .from("services")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Atendimento excluído com sucesso!");
      fetchServices();
    } catch (error: any) {
      toast.error("Erro ao excluir atendimento");
      console.error(error);
    }
  };

  const openConcludeDialog = async (service: TechnicalService) => {
    setServiceToComplete(service);
    setPaymentMethods([]);
    setOtherPaymentMethod("");
    setPaymentValues({});
    
    // Carregar produtos do serviço
    await fetchServiceItems(service.id);
    
    setConcludeDialogOpen(true);
  };

  const handleConclude = async () => {
    if (!serviceToComplete) return;

    // Validações
    if (paymentMethods.length === 0) {
      toast.error("Selecione pelo menos uma forma de pagamento");
      return;
    }

    if (paymentMethods.includes("outro") && !otherPaymentMethod.trim()) {
      toast.error("Informe a outra forma de pagamento");
      return;
    }

    const totalValue = serviceToComplete.total_value || 0;

    // Validar valores quando há múltiplas formas de pagamento
    if (paymentMethods.length > 1) {
      const totalInformado = paymentMethods.reduce((sum, method) => {
        const value = parseFloat(paymentValues[method] || "0");
        return sum + value;
      }, 0);

      if (Math.abs(totalInformado - totalValue) > 0.01) {
        toast.error(
          `Soma dos pagamentos (R$ ${totalInformado.toFixed(2)}) difere do valor total (R$ ${totalValue.toFixed(2)})`
        );
        return;
      }
    }

    try {
      const serviceId = serviceToComplete.id;

      // Preparar formas de pagamento e valores
      const finalPaymentMethods = paymentMethods.map(m => 
        m === "outro" ? otherPaymentMethod : m
      );
      
      const payment_method_1 = finalPaymentMethods[0] || null;
      const payment_method_2 = finalPaymentMethods[1] || null;
      
      // Se tem apenas 1 forma, valor total vai para payment_value_1
      // Se tem 2+, usar os valores informados
      const payment_value_1 = paymentMethods.length === 1 
        ? totalValue 
        : parseFloat(paymentValues[paymentMethods[0]] || "0");
      const payment_value_2 = paymentMethods.length > 1 
        ? parseFloat(paymentValues[paymentMethods[1]] || "0") 
        : null;

      // Atualizar serviço para concluído
      const { error: updateError } = await supabase
        .from("services")
        .update({ 
          status: "completed",
        })
        .eq("id", serviceId);
        
      if (updateError) {
        console.error("Erro ao atualizar serviço:", updateError);
        throw updateError;
      }

      // Calcular custos dos produtos
      const totalCost = productItems.reduce((sum, item) => {
        const product = products.find(p => p.id === item.product_id);
        return sum + ((product?.cost || 0) * item.qty);
      }, 0);

      // Gerar venda automaticamente
      const { error: saleError } = await supabase
        .from("sales")
        .insert([{ 
          client_id: serviceToComplete.client_id,
          seller_auth_id: user?.id,
          service_id: serviceId,
          gross_value: totalValue,
          total_cost: totalCost,
          estimated_profit: totalValue - totalCost,
          status: "closed",
          sold_at: new Date().toISOString(),
          payment_received: false,
          payment_method_1: payment_method_1,
          payment_method_2: payment_method_2,
          payment_value_1: payment_value_1,
          payment_value_2: payment_value_2,
        }]);
        
      if (saleError) {
        console.error("Erro ao criar venda:", saleError);
        throw saleError;
      }

      toast.success("Atendimento concluído e venda gerada com sucesso!");
      fetchServices();
      setConcludeDialogOpen(false);
      setServiceToComplete(null);
      setProductItems([]);
    } catch (error) {
      console.error("Erro ao concluir atendimento:", error);
      toast.error("Erro ao concluir atendimento");
    }
  };

  const handleView = async (service: TechnicalService) => {
    setSelectedService(service);
    
    // Carregar arquivos de mídia
    const { data: files } = await supabase
      .from('service_files')
      .select('*')
      .eq('service_id', service.id);
    
    if (files) {
      const filesWithUrls = files.map(file => ({
        ...file,
        url: supabase.storage.from('technical-support').getPublicUrl(file.file_path).data.publicUrl
      }));
      setMediaFiles(filesWithUrls);
    }
    
    setViewDialogOpen(true);
  };

  const handleEdit = async (service: TechnicalService) => {
    setSelectedService(service);
    setIsEditing(true);
    
    // Limpar produtos antes de carregar
    setProductItems([]);
    setProductSearch("");
    
    setFormData({
      client_id: service.client_id,
      date: new Date(service.date),
      service_category: service.service_category || "maintenance",
      equipment_model: service.equipment_model || "",
      equipment_serial: service.equipment_serial || "",
      equipment_year: service.equipment_year || new Date().getFullYear(),
      city: service.city || "",
      property_name: service.property_name || "",
      reported_defect: service.reported_defect || "",
      total_value: service.total_value || 0,
      under_warranty: service.under_warranty || false,
      status: service.status,
      notes: service.notes || "",
      images: service.images || [],
      client_signature: service.client_signature || "",
      technical_checklist: service.technical_checklist || "",
      followup_objective: service.followup_objective || "",
      followup_results: service.followup_results || "",
      client_present: service.client_present || false,
      assigned_users: service.assigned_users || [],
    });
    
    // Carregar arquivos de mídia
    const { data: files } = await supabase
      .from('service_files')
      .select('*')
      .eq('service_id', service.id);
    
    if (files) {
      const filesWithUrls = files.map(file => ({
        ...file,
        url: supabase.storage.from('technical-support').getPublicUrl(file.file_path).data.publicUrl
      }));
      setMediaFiles(filesWithUrls);
    }
    
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      client_id: "",
      date: new Date(),
      service_category: "maintenance",
      equipment_model: "",
      equipment_serial: "",
      equipment_year: new Date().getFullYear(),
      city: "",
      property_name: "",
      reported_defect: "",
      total_value: 0,
      under_warranty: false,
      status: "scheduled",
      notes: "",
      images: [],
      client_signature: "",
      technical_checklist: "",
      followup_objective: "",
      followup_results: "",
      client_present: false,
      assigned_users: [],
    });
    setProductItems([]);
    setProductSearch("");
    setMediaFiles([]);
    setIsEditing(false);
    setSelectedService(null);
  };

  const addProductItem = () => {
    if (products.length === 0) {
      toast.error("Nenhum produto disponível");
      return;
    }
    
    const firstProduct = products[0];
    setProductItems([...productItems, {
      product_id: firstProduct.id,
      product_name: firstProduct.name,
      unit_price: firstProduct.price,
      qty: 1,
      discount_percent: 0
    }]);
  };

  const removeProductItem = (index: number) => {
    setProductItems(productItems.filter((_, i) => i !== index));
  };

  const updateProductItem = (index: number, field: keyof ProductItem, value: any) => {
    const newItems = [...productItems];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Se mudou o produto, atualizar nome e preço
    if (field === 'product_id') {
      const product = products.find(p => p.id === value);
      if (product) {
        newItems[index].product_name = product.name;
        newItems[index].unit_price = product.price;
      }
    }
    
    setProductItems(newItems);
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      scheduled: { label: "Agendado", variant: "default" as const, className: "" },
      completed: { label: "Concluído", variant: "default" as const, className: "bg-success text-success-foreground" },
      cancelled: { label: "Cancelado", variant: "destructive" as const, className: "" },
    };

    const config = statusMap[status as keyof typeof statusMap] || { label: status, variant: "secondary" as const, className: "" };
    return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>;
  };

  const getCategoryLabel = (category: string) => {
    const categoryMap: Record<string, string> = {
      maintenance: "Manutenção",
      revision: "Revisão",
      warranty: "Garantia",
      followup: "Acompanhamento",
    };
    return categoryMap[category] || category;
  };

  if (loading) {
    return <div className="p-8">Carregando...</div>;
  }

  const stats = {
    total: filteredServices.length,
    scheduled: filteredServices.filter(s => s.status === "scheduled").length,
    completed: filteredServices.filter(s => s.status === "completed").length,
    cancelled: filteredServices.filter(s => s.status === "cancelled").length,
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Assistência Técnica</h1>
          <p className="text-muted-foreground">Gerencie manutenções, revisões e garantias</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-primary">
              <Plus className="mr-2 h-4 w-4" />
              Novo Atendimento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{isEditing ? "Editar Atendimento" : "Novo Atendimento"}</DialogTitle>
            </DialogHeader>
            
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="general">Dados Gerais</TabsTrigger>
                <TabsTrigger value="products">Produtos</TabsTrigger>
                <TabsTrigger value="equipment">Equipamento</TabsTrigger>
                <TabsTrigger value="checklist">Checklist</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cliente *</Label>
                    <ClientAutocomplete
                      value={formData.client_id}
                      onChange={(clientId) => setFormData(prev => ({ ...prev, client_id: clientId }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Data e Hora *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(formData.date, "PPP", { locale: ptBR })}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent>
                        <Calendar
                          mode="single"
                          selected={formData.date}
                          onSelect={(date) => date && setFormData(prev => ({ ...prev, date }))}
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>Tipo de Atendimento *</Label>
                    <Select
                      value={formData.service_category}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, service_category: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="maintenance">Manutenção</SelectItem>
                        <SelectItem value="revision">Revisão</SelectItem>
                        <SelectItem value="warranty">Garantia</SelectItem>
                        <SelectItem value="followup">Acompanhamento</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="scheduled">Agendado</SelectItem>
                        <SelectItem value="completed">Concluído</SelectItem>
                        <SelectItem value="cancelled">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Cidade</Label>
                    <Input
                      value={formData.city}
                      onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                      placeholder="Cidade"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Propriedade</Label>
                    <Input
                      value={formData.property_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, property_name: e.target.value }))}
                      placeholder="Nome da propriedade"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label>Descrição do Problema / Motivo da Visita</Label>
                    <Textarea
                      value={formData.reported_defect}
                      onChange={(e) => setFormData(prev => ({ ...prev, reported_defect: e.target.value }))}
                      rows={3}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="under_warranty"
                      checked={formData.under_warranty}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, under_warranty: checked as boolean }))}
                    />
                    <Label htmlFor="under_warranty">Sob Garantia (valor = R$ 0,00)</Label>
                  </div>

                  <div className="space-y-2">
                    <Label>Valor do Serviço (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.total_value}
                      onChange={(e) => setFormData(prev => ({ ...prev, total_value: parseFloat(e.target.value) || 0 }))}
                      disabled={formData.under_warranty}
                      className={formData.under_warranty ? "bg-muted" : ""}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label>Observações Gerais</Label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label>Usuários Vinculados</Label>
                    <div className="border rounded-md p-4 max-h-48 overflow-y-auto space-y-2 bg-background">
                      {users.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nenhum usuário disponível</p>
                      ) : (
                        users.map((u) => (
                          <div key={u.auth_user_id} className="flex items-center space-x-3">
                            <Checkbox
                              id={`user-${u.auth_user_id}`}
                              checked={formData.assigned_users.includes(u.auth_user_id)}
                              onCheckedChange={(checked) => {
                                const current = formData.assigned_users;
                                const updated = checked
                                  ? [...current, u.auth_user_id]
                                  : current.filter((id) => id !== u.auth_user_id);
                                setFormData(prev => ({ ...prev, assigned_users: updated }));
                              }}
                            />
                            <Label 
                              htmlFor={`user-${u.auth_user_id}`}
                              className="font-normal cursor-pointer"
                            >
                              {u.name} ({u.email})
                            </Label>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {formData.service_category === "followup" && (
                    <>
                      <div className="space-y-2 md:col-span-2">
                        <Label>Objetivo do Acompanhamento</Label>
                        <Textarea
                          value={formData.followup_objective}
                          onChange={(e) => setFormData(prev => ({ ...prev, followup_objective: e.target.value }))}
                          rows={2}
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label>Resultados Observados</Label>
                        <Textarea
                          value={formData.followup_results}
                          onChange={(e) => setFormData(prev => ({ ...prev, followup_results: e.target.value }))}
                          rows={2}
                        />
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="client_present"
                          checked={formData.client_present}
                          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, client_present: checked as boolean }))}
                        />
                        <Label htmlFor="client_present">Cliente Presente</Label>
                      </div>
                    </>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="products" className="space-y-4">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label>Produtos Utilizados na Assistência</Label>
                    <Button type="button" onClick={addProductItem} size="sm">
                      <Plus className="h-4 w-4 mr-1" />
                      Adicionar Produto
                    </Button>
                  </div>

                  {productItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum produto adicionado
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {productItems.map((item, index) => (
                        <div key={index} className="grid grid-cols-12 gap-2 items-end p-3 border rounded-lg">
                          <div className="col-span-4 space-y-1">
                            <Label className="text-xs">Produto</Label>
                            <Select
                              value={item.product_id}
                              onValueChange={(value) => updateProductItem(index, 'product_id', value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent position="popper" className="z-[9999]">
                                <div className="p-2 border-b sticky top-0 bg-background">
                                  <Input
                                    placeholder="Buscar produto..."
                                    value={productSearch}
                                    onChange={(e) => setProductSearch(e.target.value)}
                                    className="h-8"
                                  />
                                </div>
                                {products
                                  .filter(product => 
                                    product.name.toLowerCase().includes(productSearch.toLowerCase())
                                  )
                                  .map((product) => (
                                    <SelectItem key={product.id} value={product.id}>
                                      {product.name} (Est: {product.stock})
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="col-span-2 space-y-1">
                            <Label className="text-xs">Qtd</Label>
                            <Input
                              type="number"
                              min="1"
                              value={item.qty}
                              onChange={(e) => updateProductItem(index, 'qty', parseInt(e.target.value) || 1)}
                            />
                          </div>

                          <div className="col-span-2 space-y-1">
                            <Label className="text-xs">Preço Unit.</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={item.unit_price}
                              onChange={(e) => updateProductItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                            />
                          </div>

                          <div className="col-span-2 space-y-1">
                            <Label className="text-xs">Desc. %</Label>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={item.discount_percent}
                              onChange={(e) => updateProductItem(index, 'discount_percent', parseFloat(e.target.value) || 0)}
                            />
                          </div>

                          <div className="col-span-1 space-y-1">
                            <Label className="text-xs">Total</Label>
                            <p className="text-sm font-bold">
                              R$ {((item.unit_price * item.qty) * (1 - item.discount_percent / 100)).toFixed(2)}
                            </p>
                          </div>

                          <div className="col-span-1">
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              onClick={() => removeProductItem(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}

                      <div className="space-y-2">
                        {/* Total dos Produtos */}
                        <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                          <span className="font-semibold">Total dos Produtos:</span>
                          <span className="text-lg font-bold text-primary">
                            R$ {productItems.reduce((sum, item) => {
                              const itemTotal = item.unit_price * item.qty;
                              const discount = itemTotal * (item.discount_percent / 100);
                              return sum + (itemTotal - discount);
                            }, 0).toFixed(2)}
                          </span>
                        </div>

                        {/* Total da Venda (Produtos + Serviço) */}
                        {formData.total_value > 0 && (
                          <>
                            <div className="flex justify-between items-center px-3 py-2 text-sm">
                              <span className="text-muted-foreground">+ Valor do Serviço:</span>
                              <span className="font-medium">
                                R$ {formData.total_value.toFixed(2)}
                              </span>
                            </div>
                            
                            <div className="flex justify-between items-center p-4 bg-primary/10 rounded-lg border-2 border-primary">
                              <span className="font-bold text-lg">Total da Venda:</span>
                              <span className="text-2xl font-bold text-primary">
                                R$ {(
                                  productItems.reduce((sum, item) => {
                                    const itemTotal = item.unit_price * item.qty;
                                    const discount = itemTotal * (item.discount_percent / 100);
                                    return sum + (itemTotal - discount);
                                  }, 0) + (formData.total_value || 0)
                                ).toFixed(2)}
                              </span>
                            </div>
                          </>
                        )}

                        {/* Mensagens de garantia/venda */}
                        {formData.under_warranty ? (
                          <p className="text-sm text-warning bg-warning/10 p-2 rounded">
                            ⚠️ Garantia: Os produtos serão apenas baixados do estoque, sem gerar venda.
                          </p>
                        ) : (
                          <p className="text-sm text-success bg-success/10 p-2 rounded">
                            ✓ Será gerada uma venda automaticamente com estes produtos.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="equipment" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Modelo do Equipamento</Label>
                    <Input
                      value={formData.equipment_model}
                      onChange={(e) => setFormData(prev => ({ ...prev, equipment_model: e.target.value }))}
                      placeholder="Ex: Drone XYZ-1000"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Número de Série</Label>
                    <Input
                      value={formData.equipment_serial}
                      onChange={(e) => setFormData(prev => ({ ...prev, equipment_serial: e.target.value }))}
                      placeholder="Número de série"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Ano do Equipamento</Label>
                    <Input
                      type="number"
                      value={formData.equipment_year}
                      onChange={(e) => setFormData(prev => ({ ...prev, equipment_year: parseInt(e.target.value) || new Date().getFullYear() }))}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label>Upload de Imagens e Vídeos</Label>
                    <MediaUpload
                      serviceId={selectedService?.id}
                      onFilesChange={setMediaFiles}
                      existingFiles={mediaFiles}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="checklist" className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label>Checklist Técnico</Label>
                    <Textarea
                      value={formData.technical_checklist}
                      onChange={(e) => setFormData(prev => ({ ...prev, technical_checklist: e.target.value }))}
                      rows={8}
                      placeholder="Liste os itens verificados e procedimentos realizados..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Assinatura do Cliente (texto ou URL)</Label>
                    <Input
                      value={formData.client_signature}
                      onChange={(e) => setFormData(prev => ({ ...prev, client_signature: e.target.value }))}
                      placeholder="Nome do cliente ou URL da assinatura"
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit}>
                {isEditing ? "Atualizar" : "Criar"} Atendimento
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Agendados</CardDescription>
            <CardTitle className="text-3xl text-primary">{stats.scheduled}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Concluídos</CardDescription>
            <CardTitle className="text-3xl text-success">{stats.completed}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Cancelados</CardDescription>
            <CardTitle className="text-3xl text-destructive">{stats.cancelled}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="mr-2 h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="scheduled">Agendado</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="maintenance">Manutenção</SelectItem>
                  <SelectItem value="revision">Revisão</SelectItem>
                  <SelectItem value="warranty">Garantia</SelectItem>
                  <SelectItem value="followup">Acompanhamento</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Cliente</Label>
              <Input
                placeholder="Nome do cliente"
                value={filterClient}
                onChange={(e) => setFilterClient(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Cidade</Label>
              <Input
                placeholder="Cidade"
                value={filterCity}
                onChange={(e) => setFilterCity(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Período</Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      {filterDateFrom ? format(filterDateFrom, "dd/MM") : "De"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent>
                    <Calendar
                      mode="single"
                      selected={filterDateFrom}
                      onSelect={setFilterDateFrom}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      {filterDateTo ? format(filterDateTo, "dd/MM") : "Até"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent>
                    <Calendar
                      mode="single"
                      selected={filterDateTo}
                      onSelect={setFilterDateTo}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredServices.map((service) => (
          <Card key={service.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{service.clients?.contact_name}</CardTitle>
                  <CardDescription>
                    {format(new Date(service.date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </CardDescription>
                </div>
                {getStatusBadge(service.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1 text-sm">
                {service.service_category && (
                  <p className="flex items-center gap-1">
                    <Wrench className="h-4 w-4" />
                    <strong>{getCategoryLabel(service.service_category)}</strong>
                  </p>
                )}
                {service.equipment_model && <p><strong>Equipamento:</strong> {service.equipment_model}</p>}
                {service.city && <p><strong>Cidade:</strong> {service.city}</p>}
                {service.under_warranty && (
                  <Badge variant="secondary" className="mt-1">Sob Garantia</Badge>
                )}
                {service.total_value !== undefined && service.total_value > 0 && (
                  <p className="text-lg font-bold text-primary">
                    R$ {service.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                )}
              </div>

              <div className="flex gap-2 flex-wrap">
                {service.status === "scheduled" && (
                  <Button 
                    variant="default" 
                    size="sm" 
                    onClick={() => openConcludeDialog(service)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Concluir
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => handleView(service)}>
                  <Eye className="h-4 w-4 mr-1" />
                  Visualizar
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleEdit(service)}>
                  <Edit className="h-4 w-4 mr-1" />
                  Editar
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(service.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredServices.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Nenhum atendimento encontrado</p>
          </CardContent>
        </Card>
      )}

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Atendimento</DialogTitle>
          </DialogHeader>
          {selectedService && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Cliente</Label>
                  <p className="font-medium">{selectedService.clients?.contact_name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Data</Label>
                  <p className="font-medium">
                    {format(new Date(selectedService.date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedService.status)}</div>
                </div>
                {selectedService.service_category && (
                  <div>
                    <Label className="text-muted-foreground">Tipo</Label>
                    <p className="font-medium">{getCategoryLabel(selectedService.service_category)}</p>
                  </div>
                )}
                {selectedService.equipment_model && (
                  <div>
                    <Label className="text-muted-foreground">Equipamento</Label>
                    <p className="font-medium">{selectedService.equipment_model}</p>
                  </div>
                )}
                {selectedService.equipment_serial && (
                  <div>
                    <Label className="text-muted-foreground">Número de Série</Label>
                    <p className="font-medium">{selectedService.equipment_serial}</p>
                  </div>
                )}
                {selectedService.city && (
                  <div>
                    <Label className="text-muted-foreground">Cidade</Label>
                    <p className="font-medium">{selectedService.city}</p>
                  </div>
                )}
                {selectedService.under_warranty !== undefined && (
                  <div>
                    <Label className="text-muted-foreground">Garantia</Label>
                    <p className="font-medium">{selectedService.under_warranty ? "Sim" : "Não"}</p>
                  </div>
                )}
                {selectedService.total_value !== undefined && (
                  <div>
                    <Label className="text-muted-foreground">Valor</Label>
                    <p className="font-medium text-lg text-primary">
                      R$ {selectedService.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                )}
              </div>

              {selectedService.reported_defect && (
                <div>
                  <Label className="text-muted-foreground">Problema Relatado</Label>
                  <p className="mt-1 whitespace-pre-wrap">{selectedService.reported_defect}</p>
                </div>
              )}

              {selectedService.notes && (
                <div>
                  <Label className="text-muted-foreground">Observações</Label>
                  <p className="mt-1 whitespace-pre-wrap">{selectedService.notes}</p>
                </div>
              )}

              {selectedService.technical_checklist && (
                <div>
                  <Label className="text-muted-foreground">Checklist Técnico</Label>
                  <p className="mt-1 whitespace-pre-wrap">{selectedService.technical_checklist}</p>
                </div>
              )}

              {selectedService.client_signature && (
                <div>
                  <Label className="text-muted-foreground">Assinatura do Cliente</Label>
                  <p className="mt-1">{selectedService.client_signature}</p>
                </div>
              )}

              {selectedService.service_category === "followup" && (
                <>
                  {selectedService.followup_objective && (
                    <div>
                      <Label className="text-muted-foreground">Objetivo do Acompanhamento</Label>
                      <p className="mt-1 whitespace-pre-wrap">{selectedService.followup_objective}</p>
                    </div>
                  )}
                  {selectedService.followup_results && (
                    <div>
                      <Label className="text-muted-foreground">Resultados</Label>
                      <p className="mt-1 whitespace-pre-wrap">{selectedService.followup_results}</p>
                    </div>
                  )}
                  {selectedService.client_present !== undefined && (
                    <div>
                      <Label className="text-muted-foreground">Cliente Presente</Label>
                      <p className="mt-1">{selectedService.client_present ? "Sim" : "Não"}</p>
                    </div>
                  )}
                </>
              )}

              {selectedService.images && selectedService.images.length > 0 && (
                <div>
                  <Label className="text-muted-foreground">Imagens (antigas)</Label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {selectedService.images.map((url, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={url}
                          alt={`Imagem ${index + 1}`}
                          className="w-full h-32 object-cover rounded cursor-pointer hover:opacity-80"
                          onClick={() => setSelectedImageUrl(url)}
                        />
                        <Button
                          size="icon"
                          variant="secondary"
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              const response = await fetch(url);
                              const blob = await response.blob();
                              const blobUrl = window.URL.createObjectURL(blob);
                              const link = document.createElement('a');
                              link.href = blobUrl;
                              link.download = `imagem-${index + 1}.jpg`;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                              window.URL.revokeObjectURL(blobUrl);
                            } catch (error) {
                              console.error('Erro ao baixar imagem:', error);
                              toast.error('Erro ao baixar imagem');
                            }
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {mediaFiles.length > 0 && (
                <div>
                  <Label className="text-muted-foreground">Fotos e Vídeos</Label>
                  <div className="mt-2">
                    <MediaViewer files={mediaFiles} />
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Image Preview Dialog */}
      <Dialog open={!!selectedImageUrl} onOpenChange={() => setSelectedImageUrl(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Visualizar Imagem</DialogTitle>
          </DialogHeader>
          <div className="relative">
            <img
              src={selectedImageUrl || ""}
              alt="Preview"
              className="w-full h-auto max-h-[70vh] object-contain"
            />
            <Button
              size="icon"
              variant="secondary"
              className="absolute top-2 right-2"
              onClick={async () => {
                if (selectedImageUrl) {
                  try {
                    const response = await fetch(selectedImageUrl);
                    const blob = await response.blob();
                    const blobUrl = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = blobUrl;
                    link.download = 'imagem.jpg';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(blobUrl);
                  } catch (error) {
                    console.error('Erro ao baixar imagem:', error);
                    toast.error('Erro ao baixar imagem');
                  }
                }
              }}
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Conclusão */}
      <Dialog open={concludeDialogOpen} onOpenChange={setConcludeDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Concluir Atendimento Técnico</DialogTitle>
          </DialogHeader>
          
          {serviceToComplete && (
            <div className="space-y-6">
              {/* Info do Serviço */}
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <p><strong>Cliente:</strong> {serviceToComplete.clients?.contact_name}</p>
                <p><strong>Data:</strong> {format(new Date(serviceToComplete.date), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                {serviceToComplete.service_category && (
                  <p><strong>Tipo:</strong> {getCategoryLabel(serviceToComplete.service_category)}</p>
                )}
                {serviceToComplete.equipment_model && (
                  <p><strong>Equipamento:</strong> {serviceToComplete.equipment_model}</p>
                )}
                {serviceToComplete.total_value !== undefined && (
                  <p className="text-lg font-semibold text-primary">
                    Valor: R$ {serviceToComplete.total_value.toFixed(2)}
                  </p>
                )}
              </div>

              {/* Formas de Pagamento */}
              <div className="space-y-3">
                <Label>Formas de Pagamento * <span className="text-xs text-muted-foreground">(selecione uma ou mais)</span></Label>
                <div className="space-y-2">
                  {["pix", "dinheiro", "cartao", "outro"].map((method) => (
                    <div key={method} className="space-y-2">
                      <label className="flex items-center space-x-2 p-2 border rounded hover:bg-muted cursor-pointer">
                        <input
                          type="checkbox"
                          checked={paymentMethods.includes(method)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setPaymentMethods([...paymentMethods, method]);
                            } else {
                              setPaymentMethods(paymentMethods.filter(m => m !== method));
                              const newValues = { ...paymentValues };
                              delete newValues[method];
                              setPaymentValues(newValues);
                            }
                          }}
                          className="rounded"
                        />
                        <span className="capitalize">{method === "pix" ? "PIX" : method === "cartao" ? "Cartão" : method === "outro" ? "Outro" : method}</span>
                      </label>

                      {/* Campo de valor aparece apenas se 2+ formas selecionadas */}
                      {paymentMethods.includes(method) && paymentMethods.length >= 2 && (
                        <div className="ml-6 space-y-1">
                          <Label className="text-sm">Valor - {method === "pix" ? "PIX" : method === "cartao" ? "Cartão" : method === "outro" ? "Outro" : method}</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={paymentValues[method] || ""}
                            onChange={(e) => setPaymentValues({ ...paymentValues, [method]: e.target.value })}
                            placeholder="0.00"
                          />
                        </div>
                      )}

                      {/* Campo "Especifique" para "Outro" */}
                      {method === "outro" && paymentMethods.includes("outro") && (
                        <div className="ml-6 space-y-1">
                          <Label className="text-sm">Especifique a forma de pagamento</Label>
                          <Input
                            value={otherPaymentMethod}
                            onChange={(e) => setOtherPaymentMethod(e.target.value)}
                            placeholder="Ex: Boleto, Cheque..."
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Resumo */}
              <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                <h4 className="font-semibold mb-3">Resumo</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-lg font-bold text-primary pt-2 border-t">
                    <span>Valor do Atendimento:</span>
                    <span>R$ {(serviceToComplete.total_value || 0).toFixed(2)}</span>
                  </div>
                  {paymentMethods.length > 0 && (
                    <div className="pt-2 border-t">
                      <span className="font-semibold">Formas de Pagamento:</span>
                      {paymentMethods.length === 1 ? (
                        <div className="mt-1">
                          {paymentMethods[0] === "pix" ? "PIX" : 
                           paymentMethods[0] === "cartao" ? "Cartão" : 
                           paymentMethods[0] === "outro" ? otherPaymentMethod || "Outro" : 
                           paymentMethods[0]} - R$ {(serviceToComplete.total_value || 0).toFixed(2)}
                        </div>
                      ) : (
                        <div className="mt-1 space-y-1">
                          {paymentMethods.map(m => {
                            const methodLabel = m === "pix" ? "PIX" : m === "cartao" ? "Cartão" : m === "outro" ? otherPaymentMethod || "Outro" : m;
                            const value = parseFloat(paymentValues[m] || "0");
                            return (
                              <div key={m} className="flex justify-between">
                                <span>{methodLabel}:</span>
                                <span className="font-medium">R$ {value.toFixed(2)}</span>
                              </div>
                            );
                          })}
                          <div className="flex justify-between font-bold text-primary pt-1 border-t">
                            <span>Total Informado:</span>
                            <span>R$ {paymentMethods.reduce((sum, m) => sum + parseFloat(paymentValues[m] || "0"), 0).toFixed(2)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setConcludeDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleConclude} className="bg-green-600 hover:bg-green-700">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirmar Conclusão
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </AppLayout>
  );
}
