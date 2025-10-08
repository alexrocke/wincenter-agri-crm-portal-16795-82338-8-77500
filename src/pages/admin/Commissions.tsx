import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DollarSign, Clock, CheckCircle, XCircle, Edit, RefreshCw } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface Commission {
  id: string;
  base: string;
  percent: number;
  amount: number;
  pay_status: string;
  pay_status_date: string | null;
  notes: string | null;
  receipt_url: string | null;
  created_at: string;
  sale_id: string;
  seller_auth_id: string;
  sales?: {
    sold_at: string;
    gross_value: number;
    clients?: {
      farm_name: string;
    };
  };
}

export default function AdminCommissions() {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeller, setSelectedSeller] = useState<string>('all');
  const [sellers, setSellers] = useState<any[]>([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedCommission, setSelectedCommission] = useState<Commission | null>(null);
  const [editData, setEditData] = useState({
    pay_status: '',
    notes: '',
  });

  useEffect(() => {
    fetchSellers();
  }, []);

  useEffect(() => {
    fetchCommissions();
  }, [selectedSeller]);

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

  const fetchCommissions = async () => {
    try {
      let query = supabase
        .from('commissions')
        .select(`
          *,
          sales (
            sold_at,
            gross_value,
            clients (
              farm_name,
              contact_name
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (selectedSeller !== 'all') {
        query = query.eq('seller_auth_id', selectedSeller);
      }

      const { data, error } = await query;

      if (error) throw error;
      setCommissions(data || []);
    } catch (error) {
      console.error('Error fetching commissions:', error);
      toast.error('Erro ao carregar comissões');
    } finally {
      setLoading(false);
    }
  };

  const processAllSales = async () => {
    try {
      setLoading(true);
      toast.info('Processando vendas...');

      // Buscar todas as vendas fechadas
      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select('id')
        .eq('status', 'closed');

      if (salesError) throw salesError;

      // Chamar função para cada venda
      for (const sale of sales || []) {
        const { error } = await supabase.rpc('create_commission_for_sale', {
          p_sale_id: sale.id
        });
        
        if (error) {
          console.error('Error processing sale:', sale.id, error);
        }
      }

      toast.success(`${sales?.length || 0} vendas processadas com sucesso!`);
      fetchCommissions();
    } catch (error: any) {
      console.error('Error processing sales:', error);
      toast.error('Erro ao processar vendas: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (commission: Commission) => {
    setSelectedCommission(commission);
    setEditData({
      pay_status: commission.pay_status,
      notes: commission.notes || '',
    });
    setEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedCommission) return;

    try {
      const updateData: any = {
        pay_status: editData.pay_status,
        notes: editData.notes || null,
      };

      // Se estiver marcando como pago ou cancelado, adicionar data
      if (editData.pay_status === 'paid' || editData.pay_status === 'canceled') {
        updateData.pay_status_date = new Date().toISOString();
      } else {
        updateData.pay_status_date = null;
      }

      const { error } = await supabase
        .from('commissions')
        .update(updateData)
        .eq('id', selectedCommission.id);

      if (error) throw error;

      toast.success('Comissão atualizada com sucesso!');
      setEditDialogOpen(false);
      fetchCommissions();
    } catch (error: any) {
      console.error('Error updating commission:', error);
      toast.error('Erro ao atualizar comissão');
    }
  };

  const getStatusInfo = (status: string) => {
    const statuses: Record<string, { label: string; color: string; icon: any }> = {
      pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      paid: { label: 'Pago', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      canceled: { label: 'Cancelado', color: 'bg-red-100 text-red-800', icon: XCircle },
    };
    return statuses[status] || { label: status, color: 'bg-gray-100 text-gray-800', icon: Clock };
  };

  const getBaseLabel = (base: string) => {
    const bases: Record<string, string> = {
      gross: 'Valor Bruto',
      profit: 'Lucro',
    };
    return bases[base] || base;
  };

  const totalPending = commissions
    .filter(c => c.pay_status === 'pending')
    .reduce((sum, c) => sum + Number(c.amount), 0);

  const totalPaid = commissions
    .filter(c => c.pay_status === 'paid')
    .reduce((sum, c) => sum + Number(c.amount), 0);

  const totalCanceled = commissions
    .filter(c => c.pay_status === 'canceled')
    .reduce((sum, c) => sum + Number(c.amount), 0);

  const totalAmount = commissions.reduce((sum, c) => sum + Number(c.amount), 0);

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
            <h1 className="text-3xl font-bold">Gestão de Comissões</h1>
            <p className="text-muted-foreground">Gerencie e acompanhe todas as comissões</p>
          </div>
          <Button onClick={processAllSales} variant="outline" className="gap-2" disabled={loading}>
            <RefreshCw className="h-4 w-4" />
            Processar Vendas
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium">Total Acumulado</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(totalAmount)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {commissions.length} comissões registradas
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium">Pendente</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(totalPending)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {commissions.filter(c => c.pay_status === 'pending').length} pendentes
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium">Pago</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(totalPaid)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {commissions.filter(c => c.pay_status === 'paid').length} pagas
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium">Cancelado</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(totalCanceled)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {commissions.filter(c => c.pay_status === 'canceled').length} canceladas
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Todas as Comissões</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Base</TableHead>
                  <TableHead>%</TableHead>
                  <TableHead>Valor da Venda</TableHead>
                  <TableHead>Comissão</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commissions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      <p className="mb-2">Nenhuma comissão encontrada.</p>
                      <p className="text-xs">Clique em "Processar Vendas" para gerar comissões das vendas existentes.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  commissions.map((commission) => {
                    const statusInfo = getStatusInfo(commission.pay_status);
                    const StatusIcon = statusInfo.icon;

                    return (
                      <TableRow key={commission.id} className="hover:bg-muted/50">
                        <TableCell>
                          {commission.sales?.sold_at
                            ? new Date(commission.sales.sold_at).toLocaleDateString('pt-BR')
                            : new Date(commission.created_at).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {commission.sales?.clients?.farm_name || 'Cliente não informado'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{getBaseLabel(commission.base)}</Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{commission.percent}%</span>
                        </TableCell>
                        <TableCell>
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(commission.sales?.gross_value || 0)}
                        </TableCell>
                        <TableCell>
                          <span className="font-bold text-green-600">
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            }).format(commission.amount)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusInfo.color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(commission)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Dialog de Edição */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Comissão</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Status *</Label>
                <Select
                  value={editData.pay_status}
                  onValueChange={(value) => setEditData({ ...editData, pay_status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="paid">Pago</SelectItem>
                    <SelectItem value="canceled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea
                  value={editData.notes}
                  onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                  placeholder="Adicione observações sobre esta comissão..."
                  rows={4}
                />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="flex-1">
                  Cancelar
                </Button>
                <Button onClick={handleUpdate} className="flex-1">
                  Salvar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}