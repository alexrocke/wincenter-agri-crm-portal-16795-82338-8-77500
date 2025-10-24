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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { Plus, Edit, Eye, Trash2, Calendar as CalendarIcon, Filter, Upload, X, Cloud } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ClientAutocomplete } from "@/components/ClientAutocomplete";
import { WeatherForecast } from "@/components/WeatherForecast";

interface Demonstration {
  id: string;
  client_id: string;
  date: string;
  status: string;
  demo_types?: string[];
  crop?: string;
  city?: string;
  property_name?: string;
  weather_description?: string;
  weather_temperature?: number;
  notes?: string;
  images?: string[];
  client_evaluation?: string;
  assigned_users?: string[];
  clients?: {
    contact_name: string;
  };
}

export default function DemonstrationsNew() {
  const { user } = useAuth();
  const [demonstrations, setDemonstrations] = useState<Demonstration[]>([]);
  const [filteredDemonstrations, setFilteredDemonstrations] = useState<Demonstration[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedDemo, setSelectedDemo] = useState<Demonstration | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Filtros
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterClient, setFilterClient] = useState<string>("");
  const [filterCity, setFilterCity] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterDateFrom, setFilterDateFrom] = useState<Date | undefined>();
  const [filterDateTo, setFilterDateTo] = useState<Date | undefined>();

  // Form data
  const [formData, setFormData] = useState({
    client_id: "",
    date: new Date(),
    demo_types: [] as string[],
    crop: "",
    city: "",
    property_name: "",
    weather_description: "",
    status: "scheduled",
    notes: "",
    images: [] as string[],
    client_evaluation: "",
    assigned_users: [] as string[],
  });

  const demoTypeOptions = [
    "Herbicida",
    "Inseticida",
    "Fungicida",
    "Semeadura",
    "Pulverização",
    "Adubação",
    "Outro"
  ];

  useEffect(() => {
    fetchDemonstrations();
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [demonstrations, filterStatus, filterClient, filterCity, filterType, filterDateFrom, filterDateTo]);

  const fetchDemonstrations = async () => {
    try {
      const { data, error } = await supabase
        .from("demonstrations")
        .select(`
          *,
          clients (
            contact_name
          )
        `)
        .order("date", { ascending: false });

      if (error) throw error;
      setDemonstrations(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar demonstrações");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...demonstrations];

    if (filterStatus !== "all") {
      filtered = filtered.filter(d => d.status === filterStatus);
    }

    if (filterClient) {
      filtered = filtered.filter(d => 
        d.clients?.contact_name.toLowerCase().includes(filterClient.toLowerCase())
      );
    }

    if (filterCity) {
      filtered = filtered.filter(d => 
        d.city?.toLowerCase().includes(filterCity.toLowerCase())
      );
    }

    if (filterType !== "all") {
      filtered = filtered.filter(d => 
        d.demo_types?.includes(filterType)
      );
    }

    if (filterDateFrom) {
      filtered = filtered.filter(d => new Date(d.date) >= filterDateFrom);
    }

    if (filterDateTo) {
      filtered = filtered.filter(d => new Date(d.date) <= filterDateTo);
    }

    setFilteredDemonstrations(filtered);
  };

  const handleSubmit = async () => {
    try {
      if (!formData.client_id) {
        toast.error("Selecione um cliente");
        return;
      }

      const demoData = {
        ...formData,
        date: formData.date.toISOString(),
        status: formData.status as any,
      };

      if (isEditing && selectedDemo) {
        const { error } = await supabase
          .from("demonstrations")
          .update(demoData)
          .eq("id", selectedDemo.id);

        if (error) throw error;
        toast.success("Demonstração atualizada com sucesso!");
      } else {
        const { error } = await supabase
          .from("demonstrations")
          .insert([demoData]);

        if (error) throw error;
        toast.success("Demonstração criada com sucesso!");
      }

      setDialogOpen(false);
      resetForm();
      fetchDemonstrations();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar demonstração");
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta demonstração?")) return;

    try {
      const { error } = await supabase
        .from("demonstrations")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Demonstração excluída com sucesso!");
      fetchDemonstrations();
    } catch (error: any) {
      toast.error("Erro ao excluir demonstração");
      console.error(error);
    }
  };

  const handleView = (demo: Demonstration) => {
    setSelectedDemo(demo);
    setViewDialogOpen(true);
  };

  const handleEdit = (demo: Demonstration) => {
    setSelectedDemo(demo);
    setIsEditing(true);
    setFormData({
      client_id: demo.client_id,
      date: new Date(demo.date),
      demo_types: demo.demo_types || [],
      crop: demo.crop || "",
      city: demo.city || "",
      property_name: demo.property_name || "",
      weather_description: demo.weather_description || "",
      status: demo.status,
      notes: demo.notes || "",
      images: demo.images || [],
      client_evaluation: demo.client_evaluation || "",
      assigned_users: demo.assigned_users || [],
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      client_id: "",
      date: new Date(),
      demo_types: [],
      crop: "",
      city: "",
      property_name: "",
      weather_description: "",
      status: "scheduled",
      notes: "",
      images: [],
      client_evaluation: "",
      assigned_users: [],
    });
    setIsEditing(false);
    setSelectedDemo(null);
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      scheduled: { label: "Agendada", variant: "default" as const, className: "" },
      completed: { label: "Realizada", variant: "default" as const, className: "bg-success text-success-foreground" },
      cancelled: { label: "Cancelada", variant: "destructive" as const, className: "" },
    };

    const config = statusMap[status as keyof typeof statusMap] || { label: status, variant: "secondary" as const, className: "" };
    return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>;
  };

  const toggleDemoType = (type: string) => {
    setFormData(prev => ({
      ...prev,
      demo_types: prev.demo_types.includes(type)
        ? prev.demo_types.filter(t => t !== type)
        : [...prev.demo_types, type]
    }));
  };

  const uploadImage = async (file: File) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `demonstrations/${fileName}`;

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
    total: filteredDemonstrations.length,
    scheduled: filteredDemonstrations.filter(d => d.status === "scheduled").length,
    completed: filteredDemonstrations.filter(d => d.status === "completed").length,
    cancelled: filteredDemonstrations.filter(d => d.status === "cancelled").length,
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Demonstrações</h1>
          <p className="text-muted-foreground">Gerencie apresentações e testes de produtos</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-primary">
              <Plus className="mr-2 h-4 w-4" />
              Nova Demonstração
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{isEditing ? "Editar Demonstração" : "Nova Demonstração"}</DialogTitle>
            </DialogHeader>
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

              <div className="space-y-2 md:col-span-2">
                <Label>Tipo de Demonstração *</Label>
                <div className="flex flex-wrap gap-2">
                  {demoTypeOptions.map(type => (
                    <Badge
                      key={type}
                      variant={formData.demo_types.includes(type) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleDemoType(type)}
                    >
                      {type}
                    </Badge>
                  ))}
                </div>
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
                <Label>Clima</Label>
                <Input
                  value={formData.weather_description}
                  onChange={(e) => setFormData(prev => ({ ...prev, weather_description: e.target.value }))}
                  placeholder="Ex: Ensolarado, Nublado, Chuvoso"
                />
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
                    <SelectItem value="scheduled">Agendada</SelectItem>
                    <SelectItem value="completed">Realizada</SelectItem>
                    <SelectItem value="cancelled">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
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
                <Label>Resultado / Avaliação do Cliente</Label>
                <Textarea
                  value={formData.client_evaluation}
                  onChange={(e) => setFormData(prev => ({ ...prev, client_evaluation: e.target.value }))}
                  rows={3}
                  placeholder="Como o cliente avaliou a demonstração?"
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

              <div className="md:col-span-2">
                <WeatherForecast showCard={false} selectedDate={formData.date.toISOString()} />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit}>
                {isEditing ? "Atualizar" : "Criar"} Demonstração
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
            <CardDescription>Realizadas</CardDescription>
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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="scheduled">Agendada</SelectItem>
                  <SelectItem value="completed">Realizada</SelectItem>
                  <SelectItem value="cancelled">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {demoTypeOptions.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
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

      {/* Demonstrations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDemonstrations.map((demo) => (
          <Card key={demo.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{demo.clients?.contact_name}</CardTitle>
                  <CardDescription>
                    {format(new Date(demo.date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </CardDescription>
                </div>
                {getStatusBadge(demo.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1 text-sm">
                {demo.demo_types && demo.demo_types.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {demo.demo_types.map(type => (
                      <Badge key={type} variant="secondary" className="text-xs">{type}</Badge>
                    ))}
                  </div>
                )}
                {demo.crop && <p><strong>Cultura:</strong> {demo.crop}</p>}
                {demo.city && <p><strong>Cidade:</strong> {demo.city}</p>}
                {demo.weather_description && (
                  <p className="flex items-center gap-1">
                    <Cloud className="h-4 w-4" />
                    {demo.weather_description}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleView(demo)}>
                  <Eye className="h-4 w-4 mr-1" />
                  Visualizar
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleEdit(demo)}>
                  <Edit className="h-4 w-4 mr-1" />
                  Editar
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(demo.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredDemonstrations.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Nenhuma demonstração encontrada</p>
          </CardContent>
        </Card>
      )}

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Demonstração</DialogTitle>
          </DialogHeader>
          {selectedDemo && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Cliente</Label>
                  <p className="font-medium">{selectedDemo.clients?.contact_name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Data</Label>
                  <p className="font-medium">
                    {format(new Date(selectedDemo.date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedDemo.status)}</div>
                </div>
                {selectedDemo.demo_types && selectedDemo.demo_types.length > 0 && (
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">Tipos</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedDemo.demo_types.map(type => (
                        <Badge key={type} variant="secondary">{type}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {selectedDemo.crop && (
                  <div>
                    <Label className="text-muted-foreground">Cultura</Label>
                    <p className="font-medium">{selectedDemo.crop}</p>
                  </div>
                )}
                {selectedDemo.city && (
                  <div>
                    <Label className="text-muted-foreground">Cidade</Label>
                    <p className="font-medium">{selectedDemo.city}</p>
                  </div>
                )}
                {selectedDemo.property_name && (
                  <div>
                    <Label className="text-muted-foreground">Propriedade</Label>
                    <p className="font-medium">{selectedDemo.property_name}</p>
                  </div>
                )}
                {selectedDemo.weather_description && (
                  <div>
                    <Label className="text-muted-foreground">Clima</Label>
                    <p className="font-medium">{selectedDemo.weather_description}</p>
                  </div>
                )}
              </div>

              {selectedDemo.notes && (
                <div>
                  <Label className="text-muted-foreground">Observações</Label>
                  <p className="mt-1 whitespace-pre-wrap">{selectedDemo.notes}</p>
                </div>
              )}

              {selectedDemo.client_evaluation && (
                <div>
                  <Label className="text-muted-foreground">Avaliação do Cliente</Label>
                  <p className="mt-1 whitespace-pre-wrap">{selectedDemo.client_evaluation}</p>
                </div>
              )}

              {selectedDemo.images && selectedDemo.images.length > 0 && (
                <div>
                  <Label className="text-muted-foreground">Imagens</Label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {selectedDemo.images.map((url, index) => (
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
