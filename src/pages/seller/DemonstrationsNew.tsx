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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { Plus, Edit, Eye, Trash2, Calendar as CalendarIcon, Filter, Upload, X, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ClientAutocomplete } from "@/components/ClientAutocomplete";

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
  
  // Estados para diálogo de iniciar
  const [startDialogOpen, setStartDialogOpen] = useState(false);
  const [demoToStart, setDemoToStart] = useState<Demonstration | null>(null);
  const [equipmentChecklist, setEquipmentChecklist] = useState({
    drone: false,
    baterias: false,
    controle: false,
    base_rtk: false,
    misturador: false,
    cabo_misturador: false,
    carregador: false,
    cabo_trifasico: false,
    powerbank: false,
    tanque_liquido: false,
    tanque_solido: false,
    gerador: false,
    cabo_gerador: false,
  });
  
  // Estados para diálogo de conclusão
  const [concludeDialogOpen, setConcludeDialogOpen] = useState(false);
  const [demoToComplete, setDemoToComplete] = useState<Demonstration | null>(null);
  const [completionNotes, setCompletionNotes] = useState("");

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
      status: "scheduled",
      notes: "",
      images: [],
      client_evaluation: "",
      assigned_users: [],
    });
    setIsEditing(false);
    setSelectedDemo(null);
  };

  const openStartDialog = (demo: Demonstration) => {
    setDemoToStart(demo);
    setEquipmentChecklist({
      drone: false,
      baterias: false,
      controle: false,
      base_rtk: false,
      misturador: false,
      cabo_misturador: false,
      carregador: false,
      cabo_trifasico: false,
      powerbank: false,
      tanque_liquido: false,
      tanque_solido: false,
      gerador: false,
      cabo_gerador: false,
    });
    setStartDialogOpen(true);
  };

  const handleStartDemo = async () => {
    if (!demoToStart) return;

    try {
      const { error } = await supabase
        .from("demonstrations")
        .update({
          status: "in_progress",
          equipment_checklist: equipmentChecklist,
        })
        .eq("id", demoToStart.id);

      if (error) throw error;
      
      toast.success("Demonstração iniciada com sucesso!");
      fetchDemonstrations();
      setStartDialogOpen(false);
      setDemoToStart(null);
    } catch (error) {
      console.error("Erro ao iniciar demonstração:", error);
      toast.error("Erro ao iniciar demonstração");
    }
  };

  const openConcludeDialog = (demo: Demonstration) => {
    setDemoToComplete(demo);
    setCompletionNotes("");
    setConcludeDialogOpen(true);
  };

  const handleConcludeDemo = async () => {
    if (!demoToComplete) return;

    if (!completionNotes.trim()) {
      toast.error("Informe as observações de conclusão");
      return;
    }

    try {
      const { error } = await supabase
        .from("demonstrations")
        .update({
          status: "completed",
          completion_notes: completionNotes,
        })
        .eq("id", demoToComplete.id);

      if (error) throw error;
      
      toast.success("Demonstração concluída com sucesso!");
      fetchDemonstrations();
      setConcludeDialogOpen(false);
      setDemoToComplete(null);
    } catch (error) {
      console.error("Erro ao concluir demonstração:", error);
      toast.error("Erro ao concluir demonstração");
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      scheduled: { label: "Agendada", variant: "default" as const, className: "" },
      in_progress: { label: "Em Andamento", variant: "default" as const, className: "bg-yellow-500 text-white" },
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
              </div>

              <div className="flex gap-2 flex-wrap">
                {demo.status === "scheduled" && (
                  <Button 
                    variant="default" 
                    size="sm" 
                    onClick={() => openStartDialog(demo)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Iniciar
                  </Button>
                )}
                {demo.status === "in_progress" && (
                  <Button 
                    variant="default" 
                    size="sm" 
                    onClick={() => openConcludeDialog(demo)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Concluir
                  </Button>
                )}
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

      {/* Dialog de Iniciar Demonstração */}
      <Dialog open={startDialogOpen} onOpenChange={setStartDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Iniciar Demonstração</DialogTitle>
          </DialogHeader>
          
          {demoToStart && (
            <div className="space-y-6">
              {/* Info da Demonstração */}
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <p><strong>Cliente:</strong> {demoToStart.clients?.contact_name}</p>
                <p><strong>Data:</strong> {format(new Date(demoToStart.date), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                {demoToStart.demo_types && demoToStart.demo_types.length > 0 && (
                  <p><strong>Tipos:</strong> {demoToStart.demo_types.join(', ')}</p>
                )}
              </div>

              {/* Checklist de Equipamentos */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Checklist de Equipamentos</Label>
                <p className="text-sm text-muted-foreground">Marque os itens que você levou para a demonstração:</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'drone', label: 'Drone' },
                    { key: 'baterias', label: 'Baterias' },
                    { key: 'controle', label: 'Controle' },
                    { key: 'base_rtk', label: 'Base + RTK' },
                    { key: 'misturador', label: 'Misturador' },
                    { key: 'cabo_misturador', label: 'Cabo Misturador' },
                    { key: 'carregador', label: 'Carregador' },
                    { key: 'cabo_trifasico', label: 'Cabo Trifásico Carregador' },
                    { key: 'powerbank', label: 'PowerBank (verificar se está carregada)' },
                    { key: 'tanque_liquido', label: 'Tanque de Líquido' },
                    { key: 'tanque_solido', label: 'Tanque de Sólido' },
                    { key: 'gerador', label: 'Gerador (Verificar se tem gasolina)' },
                    { key: 'cabo_gerador', label: 'Cabo Gerador Tomada (se necessário)' },
                  ].map((item) => (
                    <label key={item.key} className="flex items-center space-x-2 p-2 border rounded hover:bg-muted cursor-pointer">
                      <input
                        type="checkbox"
                        checked={equipmentChecklist[item.key as keyof typeof equipmentChecklist]}
                        onChange={(e) => setEquipmentChecklist(prev => ({
                          ...prev,
                          [item.key]: e.target.checked
                        }))}
                        className="rounded"
                      />
                      <span className="text-sm">{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setStartDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleStartDemo} className="bg-blue-600 hover:bg-blue-700">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirmar Início
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Conclusão */}
      <Dialog open={concludeDialogOpen} onOpenChange={setConcludeDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Concluir Demonstração</DialogTitle>
          </DialogHeader>
          
          {demoToComplete && (
            <div className="space-y-6">
              {/* Info da Demonstração */}
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <p><strong>Cliente:</strong> {demoToComplete.clients?.contact_name}</p>
                <p><strong>Data:</strong> {format(new Date(demoToComplete.date), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                {demoToComplete.demo_types && demoToComplete.demo_types.length > 0 && (
                  <p><strong>Tipos:</strong> {demoToComplete.demo_types.join(', ')}</p>
                )}
              </div>

              {/* Observações de Conclusão */}
              <div className="space-y-2">
                <Label>Observações de Conclusão * <span className="text-xs text-muted-foreground">(informe se ocorreu tudo conforme o planejado ou se houve intercorrências)</span></Label>
                <Textarea
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  placeholder="Ex: Demonstração realizada com sucesso, cliente interessado / Houve problemas técnicos..."
                  rows={4}
                />
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setConcludeDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleConcludeDemo} className="bg-green-600 hover:bg-green-700">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirmar Conclusão
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
