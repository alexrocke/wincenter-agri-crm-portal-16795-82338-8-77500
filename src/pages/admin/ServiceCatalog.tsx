import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Wrench } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface ServiceCatalogItem {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  default_price: number;
  price_type: string;
  estimated_duration_hours: number | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export default function ServiceCatalog() {
  const [services, setServices] = useState<ServiceCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceCatalogItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    default_price: '',
    price_type: 'fixed',
    estimated_duration_hours: '',
    status: 'active',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('service_catalog')
        .select('*')
        .order('name');

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('Error fetching services:', error);
      toast.error('Erro ao carregar serviços');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: '',
      default_price: '',
      price_type: 'fixed',
      estimated_duration_hours: '',
      status: 'active',
    });
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.default_price) {
      toast.error('Nome e preço padrão são obrigatórios');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('service_catalog').insert({
        name: formData.name,
        description: formData.description || null,
        category: formData.category || null,
        default_price: parseFloat(formData.default_price),
        price_type: formData.price_type,
        estimated_duration_hours: formData.estimated_duration_hours ? parseFloat(formData.estimated_duration_hours) : null,
        status: formData.status,
      });

      if (error) throw error;

      toast.success('Serviço criado com sucesso!');
      setDialogOpen(false);
      resetForm();
      fetchServices();
    } catch (error) {
      console.error('Error creating service:', error);
      toast.error('Erro ao criar serviço');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (service: ServiceCatalogItem) => {
    setSelectedService(service);
    setFormData({
      name: service.name,
      description: service.description || '',
      category: service.category || '',
      default_price: String(service.default_price),
      price_type: service.price_type,
      estimated_duration_hours: service.estimated_duration_hours ? String(service.estimated_duration_hours) : '',
      status: service.status,
    });
    setEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedService || !formData.name || !formData.default_price) {
      toast.error('Nome e preço padrão são obrigatórios');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('service_catalog')
        .update({
          name: formData.name,
          description: formData.description || null,
          category: formData.category || null,
          default_price: parseFloat(formData.default_price),
          price_type: formData.price_type,
          estimated_duration_hours: formData.estimated_duration_hours ? parseFloat(formData.estimated_duration_hours) : null,
          status: formData.status,
        })
        .eq('id', selectedService.id);

      if (error) throw error;

      toast.success('Serviço atualizado com sucesso!');
      setEditDialogOpen(false);
      resetForm();
      setSelectedService(null);
      fetchServices();
    } catch (error) {
      console.error('Error updating service:', error);
      toast.error('Erro ao atualizar serviço');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (service: ServiceCatalogItem) => {
    setSelectedService(service);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedService) return;

    try {
      const { error } = await supabase
        .from('service_catalog')
        .delete()
        .eq('id', selectedService.id);

      if (error) throw error;

      toast.success('Serviço excluído com sucesso!');
      setDeleteDialogOpen(false);
      setSelectedService(null);
      fetchServices();
    } catch (error) {
      console.error('Error deleting service:', error);
      toast.error('Erro ao excluir serviço');
    }
  };

  const getPriceTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      fixed: 'Fixo',
      per_hour: 'Por Hora',
      per_hectare: 'Por Hectare',
    };
    return labels[type] || type;
  };

  const getCategoryLabel = (category: string | null) => {
    if (!category) return '-';
    const labels: Record<string, string> = {
      instalacao: 'Instalação',
      manutencao: 'Manutenção',
      treinamento: 'Treinamento',
      revisao: 'Revisão',
      consultoria: 'Consultoria',
    };
    return labels[category] || category;
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Catálogo de Serviços</h1>
            <p className="text-muted-foreground">Gerencie os serviços que podem ser vendidos em orçamentos</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Serviço
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Criar Novo Serviço</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome do Serviço *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ex: Instalação Completa"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Categoria</Label>
                    <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="instalacao">Instalação</SelectItem>
                        <SelectItem value="manutencao">Manutenção</SelectItem>
                        <SelectItem value="treinamento">Treinamento</SelectItem>
                        <SelectItem value="revisao">Revisão</SelectItem>
                        <SelectItem value="consultoria">Consultoria</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descrição detalhada do serviço..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="default_price">Preço Padrão (R$) *</Label>
                    <Input
                      id="default_price"
                      type="number"
                      step="0.01"
                      value={formData.default_price}
                      onChange={(e) => setFormData({ ...formData, default_price: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price_type">Tipo de Preço</Label>
                    <Select value={formData.price_type} onValueChange={(v) => setFormData({ ...formData, price_type: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Fixo</SelectItem>
                        <SelectItem value="per_hour">Por Hora</SelectItem>
                        <SelectItem value="per_hectare">Por Hectare</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="estimated_duration_hours">Duração Est. (h)</Label>
                    <Input
                      id="estimated_duration_hours"
                      type="number"
                      step="0.5"
                      value={formData.estimated_duration_hours}
                      onChange={(e) => setFormData({ ...formData, estimated_duration_hours: e.target.value })}
                      placeholder="Ex: 8"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="inactive">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting}>
                  Cancelar
                </Button>
                <Button onClick={handleCreate} disabled={isSubmitting}>
                  {isSubmitting ? 'Criando...' : 'Criar Serviço'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Serviços Cadastrados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Carregando...</div>
            ) : services.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum serviço cadastrado ainda
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Preço Padrão</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Duração Est.</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services.map((service) => (
                    <TableRow key={service.id}>
                      <TableCell>
                        <div className="font-medium">{service.name}</div>
                        {service.description && (
                          <div className="text-sm text-muted-foreground line-clamp-1">
                            {service.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{getCategoryLabel(service.category)}</TableCell>
                      <TableCell>
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(service.default_price)}
                      </TableCell>
                      <TableCell>{getPriceTypeLabel(service.price_type)}</TableCell>
                      <TableCell>
                        {service.estimated_duration_hours ? `${service.estimated_duration_hours}h` : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={service.status === 'active' ? 'default' : 'secondary'}>
                          {service.status === 'active' ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(service)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteClick(service)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Editar Serviço</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Nome do Serviço *</Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-category">Categoria</Label>
                  <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="instalacao">Instalação</SelectItem>
                      <SelectItem value="manutencao">Manutenção</SelectItem>
                      <SelectItem value="treinamento">Treinamento</SelectItem>
                      <SelectItem value="revisao">Revisão</SelectItem>
                      <SelectItem value="consultoria">Consultoria</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">Descrição</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-default_price">Preço Padrão (R$) *</Label>
                  <Input
                    id="edit-default_price"
                    type="number"
                    step="0.01"
                    value={formData.default_price}
                    onChange={(e) => setFormData({ ...formData, default_price: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-price_type">Tipo de Preço</Label>
                  <Select value={formData.price_type} onValueChange={(v) => setFormData({ ...formData, price_type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Fixo</SelectItem>
                      <SelectItem value="per_hour">Por Hora</SelectItem>
                      <SelectItem value="per_hectare">Por Hectare</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-estimated_duration_hours">Duração Est. (h)</Label>
                  <Input
                    id="edit-estimated_duration_hours"
                    type="number"
                    step="0.5"
                    value={formData.estimated_duration_hours}
                    onChange={(e) => setFormData({ ...formData, estimated_duration_hours: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button onClick={handleUpdate} disabled={isSubmitting}>
                {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir o serviço "{selectedService?.name}"? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
