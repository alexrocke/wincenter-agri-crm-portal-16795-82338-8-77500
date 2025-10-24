import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { Plus, Edit, Eye, Trash2, Calendar as CalendarIcon, Filter, Upload, X, Wrench } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ClientAutocomplete } from "@/components/ClientAutocomplete";

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

export default function TechnicalSupport() {
  const { user } = useAuth();
  const [services, setServices] = useState<TechnicalService[]>([]);
  const [filteredServices, setFilteredServices] = useState<TechnicalService[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<TechnicalService | null>(null);
  const [isEditing, setIsEditing] = useState(false);

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
    status: "open",
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
  }, [user]);

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

      const serviceData = {
        ...formData,
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
        toast.success("Atendimento atualizado com sucesso!");
      } else {
        const { error } = await supabase
          .from("services")
          .insert([serviceData]);

        if (error) throw error;
        toast.success("Atendimento criado com sucesso!");
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

  const handleView = (service: TechnicalService) => {
    setSelectedService(service);
    setViewDialogOpen(true);
  };

  const handleEdit = (service: TechnicalService) => {
    setSelectedService(service);
    setIsEditing(true);
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
      status: "open",
      notes: "",
      images: [],
      client_signature: "",
      technical_checklist: "",
      followup_objective: "",
      followup_results: "",
      client_present: false,
      assigned_users: [],
    });
    setIsEditing(false);
    setSelectedService(null);
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      open: { label: "Aberto", variant: "default" as const, className: "" },
      in_progress: { label: "Em Andamento", variant: "default" as const, className: "bg-warning text-warning-foreground" },
      completed: { label: "Concluído", variant: "default" as const, className: "bg-success text-success-foreground" },
      awaiting_part: { label: "Aguardando Peça", variant: "default" as const, className: "bg-secondary text-secondary-foreground" },
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

  const uploadImage = async (file: File) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `technical/${fileName}`;

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
    open: filteredServices.filter(s => s.status === "open").length,
    in_progress: filteredServices.filter(s => s.status === "in_progress").length,
    completed: filteredServices.filter(s => s.status === "completed").length,
    awaiting_part: filteredServices.filter(s => s.status === "awaiting_part").length,
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
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="general">Dados Gerais</TabsTrigger>
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
                        <SelectItem value="open">Aberto</SelectItem>
                        <SelectItem value="in_progress">Em Andamento</SelectItem>
                        <SelectItem value="completed">Concluído</SelectItem>
                        <SelectItem value="awaiting_part">Aguardando Peça</SelectItem>
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
                    <Label>Upload de Imagens (peças quebradas, erros, etc.)</Label>
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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Abertos</CardDescription>
            <CardTitle className="text-3xl text-primary">{stats.open}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Em Andamento</CardDescription>
            <CardTitle className="text-3xl text-warning">{stats.in_progress}</CardTitle>
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
            <CardDescription>Aguardando Peça</CardDescription>
            <CardTitle className="text-3xl text-secondary">{stats.awaiting_part}</CardTitle>
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
                  <SelectItem value="open">Aberto</SelectItem>
                  <SelectItem value="in_progress">Em Andamento</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                  <SelectItem value="awaiting_part">Aguardando Peça</SelectItem>
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
    </AppLayout>
  );
}
