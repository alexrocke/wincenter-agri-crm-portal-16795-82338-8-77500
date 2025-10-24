import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { Plus, Edit, Eye, Trash2, Calendar as CalendarIcon, Filter, Upload, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ClientAutocomplete } from "@/components/ClientAutocomplete";
import { cn } from "@/lib/utils";

interface Service {
  id: string;
  client_id: string;
  date: string;
  status: string;
  crop?: string;
  city?: string;
  property_name?: string;
  hectares?: number;
  value_per_hectare?: number;
  total_value?: number;
  payment_method_1?: string;
  payment_method_2?: string;
  installments?: number;
  installment_dates?: any;
  notes?: string;
  images?: string[];
  invoiced?: boolean;
  invoice_number?: string;
  assigned_users?: string[];
  clients?: {
    contact_name: string;
  };
}

export default function Services() {
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Filtros
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterClient, setFilterClient] = useState<string>("");
  const [filterCity, setFilterCity] = useState<string>("");
  const [filterDateFrom, setFilterDateFrom] = useState<Date | undefined>();
  const [filterDateTo, setFilterDateTo] = useState<Date | undefined>();

  // Form data
  const [formData, setFormData] = useState({
    client_id: "",
    date: new Date(),
    crop: "",
    city: "",
    property_name: "",
    hectares: 0,
    value_per_hectare: 0,
    total_value: 0,
    payment_method_1: "",
    payment_method_2: "",
    installments: 1,
    installment_dates: [] as Date[],
    status: "scheduled",
    notes: "",
    images: [] as string[],
    invoiced: false,
    invoice_number: "",
    assigned_users: [] as string[],
  });

  useEffect(() => {
    fetchServices();
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [services, filterStatus, filterClient, filterCity, filterDateFrom, filterDateTo]);

  useEffect(() => {
    // Auto-calcular valor total
    const total = formData.hectares * formData.value_per_hectare;
    setFormData(prev => ({ ...prev, total_value: total }));
  }, [formData.hectares, formData.value_per_hectare]);

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
        .eq("service_category", "pulverization")
        .order("date", { ascending: false });

      if (error) throw error;
      setServices(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar serviços");
      console.error(error);
    } finally {
      setLoading(false);
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

      const serviceData = {
        ...formData,
        date: formData.date.toISOString(),
        service_type: "spraying" as const,
        service_category: "pulverization",
        created_by: user?.id,
        installment_dates: formData.installment_dates.map(d => d.toISOString()),
        status: formData.status as any,
      };

      if (isEditing && selectedService) {
        const { error } = await supabase
          .from("services")
          .update(serviceData)
          .eq("id", selectedService.id);

        if (error) throw error;
        toast.success("Serviço atualizado com sucesso!");
      } else {
        const { error } = await supabase
          .from("services")
          .insert([serviceData]);

        if (error) throw error;
        toast.success("Serviço criado com sucesso!");
      }

      setDialogOpen(false);
      resetForm();
      fetchServices();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar serviço");
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este serviço?")) return;

    try {
      const { error } = await supabase
        .from("services")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Serviço excluído com sucesso!");
      fetchServices();
    } catch (error: any) {
      toast.error("Erro ao excluir serviço");
      console.error(error);
    }
  };

  const handleView = (service: Service) => {
    setSelectedService(service);
    setViewDialogOpen(true);
  };

  const handleEdit = (service: Service) => {
    setSelectedService(service);
    setIsEditing(true);
    setFormData({
      client_id: service.client_id,
      date: new Date(service.date),
      crop: service.crop || "",
      city: service.city || "",
      property_name: service.property_name || "",
      hectares: service.hectares || 0,
      value_per_hectare: service.value_per_hectare || 0,
      total_value: service.total_value || 0,
      payment_method_1: service.payment_method_1 || "",
      payment_method_2: service.payment_method_2 || "",
      installments: service.installments || 1,
      installment_dates: service.installment_dates || [],
      status: service.status,
      notes: service.notes || "",
      images: service.images || [],
      invoiced: service.invoiced || false,
      invoice_number: service.invoice_number || "",
      assigned_users: service.assigned_users || [],
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      client_id: "",
      date: new Date(),
      crop: "",
      city: "",
      property_name: "",
      hectares: 0,
      value_per_hectare: 0,
      total_value: 0,
      payment_method_1: "",
      payment_method_2: "",
      installments: 1,
      installment_dates: [],
      status: "scheduled",
      notes: "",
      images: [],
      invoiced: false,
      invoice_number: "",
      assigned_users: [],
    });
    setIsEditing(false);
    setSelectedService(null);
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      scheduled: { label: "Agendada", variant: "default" as const },
      completed: { label: "Concluída", variant: "default" as const, className: "bg-success text-success-foreground" },
      cancelled: { label: "Cancelada", variant: "destructive" as const },
      pending_payment: { label: "Pendente Pagamento", variant: "default" as const, className: "bg-warning text-warning-foreground" },
    };

    const config = statusMap[status as keyof typeof statusMap] || { label: status, variant: "secondary" as const, className: "" };
    return <Badge variant={config.variant} className={config.className || ""}>{config.label}</Badge>;
  };

  const uploadImage = async (file: File) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `services/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Erro ao fazer upload da imagem");
      return null;
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const uploadPromises = Array.from(files).map(file => uploadImage(file));
    const urls = await Promise.all(uploadPromises);
    const validUrls = urls.filter(url => url !== null) as string[];

    setFormData(prev => ({
      ...prev,
      images: [...prev.images, ...validUrls]
    }));

    toast.success(`${validUrls.length} imagem(ns) carregada(s)`);
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
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
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">📦 Serviços de Pulverização</h1>
          <p className="text-muted-foreground">Gerencie pulverizações e aplicações</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-primary">
              <Plus className="mr-2 h-4 w-4" />
              Novo Serviço
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{isEditing ? "Editar Serviço" : "Novo Serviço"}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cliente *</Label>
                <ClientAutocomplete
                  value={formData.client_id}
                  onSelect={(clientId) => setFormData(prev => ({ ...prev, client_id: clientId }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Data da Pulverização *</Label>
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
                <Label>Cultura</Label>
                <Input
                  value={formData.crop}
                  onChange={(e) => setFormData(prev => ({ ...prev, crop: e.target.value }))}
                  placeholder="Ex: Soja, Milho, Trigo"
                />
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

              <div className="space-y-2">
                <Label>Hectares Aplicados</Label>
                <Input
                  type="number"
                  value={formData.hectares}
                  onChange={(e) => setFormData(prev => ({ ...prev, hectares: parseFloat(e.target.value) || 0 }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Valor por Hectare (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.value_per_hectare}
                  onChange={(e) => setFormData(prev => ({ ...prev, value_per_hectare: parseFloat(e.target.value) || 0 }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Valor Total (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.total_value}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label>Forma de Pagamento 1</Label>
                <Select
                  value={formData.payment_method_1}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, payment_method_1: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">Pix</SelectItem>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="financiamento">Financiamento</SelectItem>
                    <SelectItem value="parcelado">Parcelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Forma de Pagamento 2 (Opcional)</Label>
                <Select
                  value={formData.payment_method_2}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, payment_method_2: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum</SelectItem>
                    <SelectItem value="pix">Pix</SelectItem>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="financiamento">Financiamento</SelectItem>
                    <SelectItem value="parcelado">Parcelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.payment_method_1 === "parcelado" && (
                <div className="space-y-2">
                  <Label>Número de Parcelas</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.installments}
                    onChange={(e) => setFormData(prev => ({ ...prev, installments: parseInt(e.target.value) || 1 }))}
                  />
                </div>
              )}

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
                    <SelectItem value="scheduled">Agendada</SelectItem>
                    <SelectItem value="completed">Concluída</SelectItem>
                    <SelectItem value="cancelled">Cancelada</SelectItem>
                    <SelectItem value="pending_payment">Pendente Pagamento</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Observações</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Upload de Imagens</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="cursor-pointer"
                  />
                  <Button type="button" variant="outline" size="icon">
                    <Upload className="h-4 w-4" />
                  </Button>
                </div>
                {formData.images.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {formData.images.map((url, index) => (
                      <div key={index} className="relative group">
                        <img src={url} alt={`Upload ${index + 1}`} className="w-full h-20 object-cover rounded" />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100"
                          onClick={() => removeImage(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="invoiced"
                  checked={formData.invoiced}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, invoiced: checked as boolean }))}
                />
                <Label htmlFor="invoiced">Faturado</Label>
              </div>

              {formData.invoiced && (
                <div className="space-y-2">
                  <Label>Nº Nota Fiscal</Label>
                  <Input
                    value={formData.invoice_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, invoice_number: e.target.value }))}
                    placeholder="Número da nota fiscal"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit}>
                {isEditing ? "Atualizar" : "Criar"} Serviço
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
            <CardDescription>Agendadas</CardDescription>
            <CardTitle className="text-3xl text-primary">{stats.scheduled}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Concluídas</CardDescription>
            <CardTitle className="text-3xl text-success">{stats.completed}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Canceladas</CardDescription>
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="scheduled">Agendada</SelectItem>
                  <SelectItem value="completed">Concluída</SelectItem>
                  <SelectItem value="cancelled">Cancelada</SelectItem>
                  <SelectItem value="pending_payment">Pendente Pagamento</SelectItem>
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
                {service.crop && <p><strong>Cultura:</strong> {service.crop}</p>}
                {service.city && <p><strong>Cidade:</strong> {service.city}</p>}
                {service.hectares && <p><strong>Hectares:</strong> {service.hectares} ha</p>}
                {service.total_value && (
                  <p className="text-lg font-bold text-primary">
                    R$ {service.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
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
            <p className="text-muted-foreground">Nenhum serviço encontrado</p>
          </CardContent>
        </Card>
      )}

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Serviço</DialogTitle>
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
                {selectedService.crop && (
                  <div>
                    <Label className="text-muted-foreground">Cultura</Label>
                    <p className="font-medium">{selectedService.crop}</p>
                  </div>
                )}
                {selectedService.city && (
                  <div>
                    <Label className="text-muted-foreground">Cidade</Label>
                    <p className="font-medium">{selectedService.city}</p>
                  </div>
                )}
                {selectedService.property_name && (
                  <div>
                    <Label className="text-muted-foreground">Propriedade</Label>
                    <p className="font-medium">{selectedService.property_name}</p>
                  </div>
                )}
                {selectedService.hectares && (
                  <div>
                    <Label className="text-muted-foreground">Hectares</Label>
                    <p className="font-medium">{selectedService.hectares} ha</p>
                  </div>
                )}
                {selectedService.value_per_hectare && (
                  <div>
                    <Label className="text-muted-foreground">Valor/Hectare</Label>
                    <p className="font-medium">
                      R$ {selectedService.value_per_hectare.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                )}
                {selectedService.total_value && (
                  <div>
                    <Label className="text-muted-foreground">Valor Total</Label>
                    <p className="font-medium text-lg text-primary">
                      R$ {selectedService.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                )}
                {selectedService.payment_method_1 && (
                  <div>
                    <Label className="text-muted-foreground">Forma de Pagamento</Label>
                    <p className="font-medium capitalize">{selectedService.payment_method_1}</p>
                  </div>
                )}
                {selectedService.invoiced !== undefined && (
                  <div>
                    <Label className="text-muted-foreground">Faturado</Label>
                    <p className="font-medium">{selectedService.invoiced ? "Sim" : "Não"}</p>
                  </div>
                )}
                {selectedService.invoice_number && (
                  <div>
                    <Label className="text-muted-foreground">Nº Nota Fiscal</Label>
                    <p className="font-medium">{selectedService.invoice_number}</p>
                  </div>
                )}
              </div>

              {selectedService.notes && (
                <div>
                  <Label className="text-muted-foreground">Observações</Label>
                  <p className="mt-1 whitespace-pre-wrap">{selectedService.notes}</p>
                </div>
              )}

              {selectedService.images && selectedService.images.length > 0 && (
                <div>
                  <Label className="text-muted-foreground">Imagens</Label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {selectedService.images.map((url, index) => (
                      <img
                        key={index}
                        src={url}
                        alt={`Imagem ${index + 1}`}
                        className="w-full h-32 object-cover rounded"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
