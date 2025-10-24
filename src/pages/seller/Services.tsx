import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Edit, Eye, Trash2, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ClientAutocomplete } from "@/components/ClientAutocomplete";
import { WeatherForecast, WeatherData } from "@/components/WeatherForecast";

interface Service {
  id: string;
  client_id: string;
  date: string;
  status: string;
  crop?: string;
  city?: string;
  hectares?: number;
  value_per_hectare?: number;
  total_value?: number;
  notes?: string;
  clients?: {
    contact_name: string;
  };
}

interface ProductItem {
  id: string;
  product_id?: string; // ID do produto do banco (opcional)
  name: string;
  dose_per_hectare: string; // mL/ha
}

interface SystemProduct {
  id: string;
  name: string;
  sku?: string;
  category?: string;
}

export default function Services() {
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  const [formData, setFormData] = useState({
    client_id: "",
    date: "",
    crop: "",
    city: "",
    hectares: "",
    vazao_per_hectare: "", // Vazão L/ha
    value_per_hectare: "",
    total_value: "",
    notes: "",
    assigned_users: [] as string[],
  });

  const [products, setProducts] = useState<ProductItem[]>([]);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [systemProducts, setSystemProducts] = useState<SystemProduct[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);

  useEffect(() => {
    fetchServices();
    fetchSystemProducts();
    fetchUsers();
  }, [user]);

  const fetchSystemProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, sku, category")
        .eq("status", "active")
        .order("name");

      if (error) throw error;
      setSystemProducts(data || []);
    } catch (error) {
      console.error("Erro ao carregar produtos:", error);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("auth_user_id, name, role")
        .eq("status", "active")
        .order("name");

      if (error) throw error;
      setAllUsers(data || []);
    } catch (error) {
      console.error("Erro ao carregar usuários:", error);
    }
  };

  // Calcular valor total automaticamente
  useEffect(() => {
    const hectares = parseFloat(formData.hectares) || 0;
    const valuePerHectare = parseFloat(formData.value_per_hectare) || 0;
    const total = hectares * valuePerHectare;
    setFormData(prev => ({ ...prev, total_value: total.toFixed(2) }));
  }, [formData.hectares, formData.value_per_hectare]);

  // Calcular total de calda baseado na vazão
  const hectares = parseFloat(formData.hectares) || 0;
  const vazaoPerHa = parseFloat(formData.vazao_per_hectare) || 0;
  const totalCalda = hectares * vazaoPerHa;

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
        .eq("service_type", "spraying")
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

  const resetForm = () => {
    setFormData({
      client_id: "",
      date: "",
      crop: "",
      city: "",
      hectares: "",
      vazao_per_hectare: "",
      value_per_hectare: "",
      total_value: "",
      notes: "",
      assigned_users: [],
    });
    setProducts([]);
    setWeather(null);
    setSelectedService(null);
  };

  const addProduct = () => {
    setProducts(prev => [...prev, {
      id: crypto.randomUUID(),
      product_id: undefined,
      name: "",
      dose_per_hectare: "",
    }]);
  };

  const addSystemProduct = (productId: string) => {
    const systemProduct = systemProducts.find(p => p.id === productId);
    if (!systemProduct) return;

    setProducts(prev => [...prev, {
      id: crypto.randomUUID(),
      product_id: systemProduct.id,
      name: systemProduct.name,
      dose_per_hectare: "",
    }]);
  };

  const removeProduct = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const updateProduct = (id: string, field: string, value: string) => {
    setProducts(prev => prev.map(product => 
      product.id === id ? { ...product, [field]: value } : product
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.client_id || !formData.date || !formData.hectares || !formData.value_per_hectare) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    try {
      const serviceData = {
        client_id: formData.client_id,
        service_type: "spraying" as const,
        date: formData.date,
        status: "scheduled" as const,
        crop: formData.crop || null,
        city: formData.city || null,
        hectares: parseFloat(formData.hectares),
        value_per_hectare: parseFloat(formData.value_per_hectare),
        notes: formData.notes || null,
        created_by: user?.id,
        assigned_users: formData.assigned_users.length > 0 ? formData.assigned_users : [user?.id],
        weather_temperature: weather?.temperature || null,
        weather_humidity: weather?.humidity || null,
        weather_wind_speed: weather?.windSpeed || null,
        weather_description: weather?.description || null,
        weather_city: formData.city || null,
        weather_fetched_at: weather ? new Date().toISOString() : null,
      };

      if (selectedService) {
        const { error } = await supabase
          .from("services")
          .update(serviceData)
          .eq("id", selectedService.id);

        if (error) throw error;

        // Atualizar produtos
        await supabase
          .from("service_items")
          .delete()
          .eq("service_id", selectedService.id);

        if (products.length > 0) {
          const hectares = parseFloat(formData.hectares) || 0;
          const serviceItems = products.map(p => {
            const dose = parseFloat(p.dose_per_hectare) || 0;
            const volumeTotal = hectares * (dose / 1000); // Converter mL para L
            return {
              service_id: selectedService.id,
              product_id: p.product_id || null,
              product_name: p.name,
              dose_per_hectare: dose,
              volume_total: volumeTotal,
              bottles_qty: null,
              qty: 1,
              unit_price: 0,
              discount_percent: 0,
            };
          });

          await supabase.from("service_items").insert(serviceItems);
        }
        
        toast.success("Pulverização atualizada com sucesso!");
      } else {
        const { data: newService, error } = await supabase
          .from("services")
          .insert([serviceData])
          .select()
          .single();

        if (error) throw error;

        if (products.length > 0 && newService) {
          const hectares = parseFloat(formData.hectares) || 0;
          const serviceItems = products.map(p => {
            const dose = parseFloat(p.dose_per_hectare) || 0;
            const volumeTotal = hectares * (dose / 1000); // Converter mL para L
            return {
              service_id: newService.id,
              product_id: p.product_id || null,
              product_name: p.name,
              dose_per_hectare: dose,
              volume_total: volumeTotal,
              bottles_qty: null,
              qty: 1,
              unit_price: 0,
              discount_percent: 0,
            };
          });

          await supabase.from("service_items").insert(serviceItems);
        }
        
        toast.success("Pulverização criada com sucesso!");
      }

      fetchServices();
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Erro ao salvar pulverização:", error);
      toast.error("Erro ao salvar pulverização");
    }
  };

  const handleConclude = async () => {
    if (!selectedService) return;

    try {
      // Atualizar status para completed
      const { error: updateError } = await supabase
        .from("services")
        .update({ status: "completed" })
        .eq("id", selectedService.id);

      if (updateError) throw updateError;

      // Gerar venda automaticamente
      const saleDescription = `Serviço de pulverização – ${selectedService.crop || 'N/A'} – ${selectedService.city || 'N/A'}`;

      const { error: saleError } = await supabase
        .from("sales")
        .insert([{
          client_id: selectedService.client_id,
          seller_auth_id: user?.id,
          service_id: selectedService.id,
          gross_value: selectedService.total_value || 0,
          total_cost: 0,
          estimated_profit: selectedService.total_value || 0,
          status: "closed",
          sold_at: new Date().toISOString(),
          payment_received: false,
        }]);

      if (saleError) throw saleError;

      toast.success("Venda gerada com base na pulverização concluída!");
      fetchServices();
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Erro ao concluir pulverização:", error);
      toast.error("Erro ao concluir pulverização");
    }
  };

  const handleEdit = (service: Service) => {
    setSelectedService(service);
    setFormData({
      client_id: service.client_id,
      date: service.date,
      crop: service.crop || "",
      city: service.city || "",
      hectares: service.hectares?.toString() || "",
      vazao_per_hectare: "", // Can be added later if needed
      value_per_hectare: service.value_per_hectare?.toString() || "",
      total_value: service.total_value?.toString() || "",
      notes: service.notes || "",
      assigned_users: (service as any).assigned_users || [],
    });

    // Carregar produtos
    const fetchProducts = async () => {
      const { data } = await supabase
        .from("service_items")
        .select("*")
        .eq("service_id", service.id);

      if (data) {
        setProducts(data.map(item => ({
          id: item.id,
          product_id: item.product_id,
          name: item.product_name || "",
          dose_per_hectare: item.dose_per_hectare?.toString() || "",
        })));
      }
    };

    fetchProducts();
    setIsDialogOpen(true);
  };

  const handleView = (service: Service) => {
    setSelectedService(service);
    setViewDialogOpen(true);
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

  const getStatusBadge = (status: string) => {
    const statusMap = {
      scheduled: { label: "Agendada", className: "bg-blue-500" },
      completed: { label: "Concluída", className: "bg-green-500" },
      cancelled: { label: "Cancelada", className: "bg-red-500" },
    };

    const config = statusMap[status as keyof typeof statusMap] || { label: status, className: "bg-gray-500" };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  if (loading) {
    return <div className="p-8">Carregando...</div>;
  }

  const stats = {
    total: services.length,
    scheduled: services.filter(s => s.status === "scheduled").length,
    completed: services.filter(s => s.status === "completed").length,
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Ordens de Pulverização</h1>
            <p className="text-muted-foreground">Sistema técnico de gestão de aplicações</p>
          </div>
          <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="bg-primary">
            <Plus className="mr-2 h-4 w-4" />
            Nova Pulverização
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total</CardDescription>
              <CardTitle className="text-3xl">{stats.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Agendadas</CardDescription>
              <CardTitle className="text-3xl text-blue-500">{stats.scheduled}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Concluídas</CardDescription>
              <CardTitle className="text-3xl text-green-500">{stats.completed}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((service) => (
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
                    Ver
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

        {services.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Nenhuma pulverização encontrada</p>
            </CardContent>
          </Card>
        )}

        {/* Form Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedService ? "Editar Ordem de Pulverização" : "Nova Ordem de Pulverização"}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Seção 1: Informações Gerais */}
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <h3 className="font-semibold text-lg">Informações Gerais da Aplicação</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cliente *</Label>
                    <ClientAutocomplete
                      value={formData.client_id}
                      onChange={(value) => setFormData(prev => ({ ...prev, client_id: value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Data da Pulverização *</Label>
                    <Input
                      type="datetime-local"
                      value={formData.date}
                      onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Cultura</Label>
                    <Input
                      value={formData.crop}
                      onChange={(e) => setFormData(prev => ({ ...prev, crop: e.target.value }))}
                      placeholder="Ex: Soja, Milho, Algodão"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Hectares Aplicados *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.hectares}
                      onChange={(e) => setFormData(prev => ({ ...prev, hectares: e.target.value }))}
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Vazão L/ha *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.vazao_per_hectare}
                      onChange={(e) => setFormData(prev => ({ ...prev, vazao_per_hectare: e.target.value }))}
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Valor por Hectare (R$) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.value_per_hectare}
                      onChange={(e) => setFormData(prev => ({ ...prev, value_per_hectare: e.target.value }))}
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Valor Total (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.total_value}
                      readOnly
                      className="bg-muted font-semibold text-lg"
                    />
                  </div>
                </div>

                <div className="mt-4 p-4 bg-primary/10 rounded-lg border border-primary/20">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground">Vazão L/ha</p>
                      <p className="text-lg font-bold text-primary">{vazaoPerHa.toFixed(3)} L/ha</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Hectares</p>
                      <p className="text-lg font-bold text-primary">{hectares} ha</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total de Calda</p>
                      <p className="text-xl font-bold text-green-600">{totalCalda.toFixed(3)} L</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Seção: Clima */}
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <h3 className="font-semibold text-lg">Previsão do Tempo</h3>
                <WeatherForecast 
                  selectedDate={formData.date}
                  onWeatherChange={setWeather}
                  showCard={false}
                />
              </div>

              {/* Seção: Usuários Atribuídos */}
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <h3 className="font-semibold text-lg">Usuários Responsáveis</h3>
                <div className="space-y-2">
                  <Label>Selecione os Responsáveis</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {allUsers.map(u => (
                      <label key={u.auth_user_id} className="flex items-center space-x-2 p-2 border rounded hover:bg-muted cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.assigned_users.includes(u.auth_user_id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData(prev => ({
                                ...prev,
                                assigned_users: [...prev.assigned_users, u.auth_user_id]
                              }));
                            } else {
                              setFormData(prev => ({
                                ...prev,
                                assigned_users: prev.assigned_users.filter(id => id !== u.auth_user_id)
                              }));
                            }
                          }}
                          className="rounded"
                        />
                        <span className="text-sm">{u.name} ({u.role})</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Seção 2: Produtos / Cálculo de Calda */}
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <div className="flex justify-between items-center gap-2">
                  <h3 className="font-semibold text-lg">Produtos Utilizados / Cálculo de Calda</h3>
                  <div className="flex gap-2">
                    <select
                      className="border rounded px-3 py-1 text-sm"
                      onChange={(e) => {
                        if (e.target.value) {
                          addSystemProduct(e.target.value);
                          e.target.value = "";
                        }
                      }}
                    >
                      <option value="">Adicionar do Sistema</option>
                      {systemProducts.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} {p.sku ? `(${p.sku})` : ''}
                        </option>
                      ))}
                    </select>
                    <Button type="button" onClick={addProduct} size="sm" variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Manual
                    </Button>
                  </div>
                </div>

                {products.length > 0 ? (
                  <div className="space-y-3">
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                         <thead>
                          <tr className="border-b">
                            <th className="text-center p-2 font-medium w-12">#</th>
                            <th className="text-left p-2 font-medium">Produto / Defensivo</th>
                            <th className="text-left p-2 font-medium">mL/ha</th>
                            <th className="text-center p-2 font-medium w-20">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {products.map((product, index) => (
                            <tr key={product.id} className="border-b">
                              <td className="p-2 text-center font-semibold text-primary">
                                {index + 1}
                              </td>
                              <td className="p-2">
                                <Input
                                  value={product.name}
                                  onChange={(e) => updateProduct(product.id, 'name', e.target.value)}
                                  placeholder="Nome do produto"
                                />
                              </td>
                              <td className="p-2">
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={product.dose_per_hectare}
                                  onChange={(e) => updateProduct(product.id, 'dose_per_hectare', e.target.value)}
                                  placeholder="0"
                                />
                              </td>
                              <td className="p-2 text-center">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeProduct(product.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    Nenhum produto adicionado. Clique em "Adicionar Produto" para começar.
                  </p>
                )}
              </div>

              {/* Seção 3: Observações */}
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <h3 className="font-semibold text-lg">Observações</h3>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Observações gerais sobre a aplicação..."
                  rows={4}
                />
              </div>

              {/* Resumo Financeiro */}
              <div className="p-4 bg-primary/10 rounded-lg border-2 border-primary/20">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-sm text-muted-foreground">Hectares</p>
                    <p className="text-2xl font-bold">{formData.hectares || '0'} ha</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Valor/ha</p>
                    <p className="text-2xl font-bold">R$ {parseFloat(formData.value_per_hectare || '0').toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Valor Total</p>
                    <p className="text-3xl font-bold text-primary">R$ {parseFloat(formData.total_value || '0').toFixed(2)}</p>
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {selectedService ? "Atualizar" : "Criar"} Pulverização
                </Button>
                {selectedService && selectedService.status !== 'completed' && (
                  <Button 
                    type="button" 
                    onClick={handleConclude}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Concluir Pulverização (Gerar Venda)
                  </Button>
                )}
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* View Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalhes da Pulverização</DialogTitle>
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
                </div>

                {selectedService.notes && (
                  <div>
                    <Label className="text-muted-foreground">Observações</Label>
                    <p className="mt-1 whitespace-pre-wrap">{selectedService.notes}</p>
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
