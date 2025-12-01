import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, TrendingUp, TrendingDown } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Report {
  period: { month: number; year: number; monthName: string };
  seller: { name: string; email: string };
  summary: {
    totalRevenue: number;
    totalProfit: number;
    profitMargin: number;
    salesCount: number;
    averageTicket: number;
    revenueGrowth: number;
    profitGrowth: number;
  };
  activities: {
    visits: number;
    demos: number;
    services: number;
    clientsServed: number;
  };
  opportunities: {
    total: number;
    won: number;
    conversionRate: number;
    pipelineValue: number;
  };
  commissions: {
    total: number;
    paid: number;
    pending: number;
  };
  salesByCategory: Array<{ category: string; value: number; percentage: number }>;
  topClients: Array<{ name: string; city: string; state: string; revenue: number; salesCount: number }>;
}

export default function Reports() {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [month, setMonth] = useState<string>(String(new Date().getMonth() + 1));
  const [year, setYear] = useState<string>(String(new Date().getFullYear()));

  const generateReport = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-seller-report', {
        body: { month: Number(month), year: Number(year) }
      });

      if (error) throw error;

      if (data.success) {
        setReport(data.report);
        toast.success('Relatório gerado com sucesso');
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('Erro ao gerar relatório:', error);
      toast.error(error.message || 'Erro ao gerar relatório');
    } finally {
      setLoading(false);
    }
  };

  const months = [
    { value: '1', label: 'Janeiro' },
    { value: '2', label: 'Fevereiro' },
    { value: '3', label: 'Março' },
    { value: '4', label: 'Abril' },
    { value: '5', label: 'Maio' },
    { value: '6', label: 'Junho' },
    { value: '7', label: 'Julho' },
    { value: '8', label: 'Agosto' },
    { value: '9', label: 'Setembro' },
    { value: '10', label: 'Outubro' },
    { value: '11', label: 'Novembro' },
    { value: '12', label: 'Dezembro' },
  ];

  const years = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - i));

  return (
    <AppLayout>
      <div className="container max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8 text-primary" />
            Relatórios Individuais
          </h1>
          <p className="text-muted-foreground">Visualize seu desempenho mensal detalhado</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Gerar Relatório</CardTitle>
            <CardDescription>Selecione o período desejado</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Mês</label>
                <Select value={month} onValueChange={setMonth}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map(m => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Ano</label>
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map(y => (
                      <SelectItem key={y} value={y}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={generateReport} disabled={loading} className="w-full">
              {loading ? 'Gerando...' : 'Gerar Relatório'}
            </Button>
          </CardContent>
        </Card>

        {report && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Resumo Executivo - {report.period.monthName}/{report.period.year}</CardTitle>
                <CardDescription>{report.seller.name}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Receita Total</p>
                    <p className="text-2xl font-bold">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(report.summary.totalRevenue)}
                    </p>
                    <div className="flex items-center gap-1 text-sm">
                      {report.summary.revenueGrowth >= 0 ? (
                        <TrendingUp className="h-4 w-4 text-success" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-destructive" />
                      )}
                      <span className={report.summary.revenueGrowth >= 0 ? 'text-success' : 'text-destructive'}>
                        {Math.abs(report.summary.revenueGrowth).toFixed(1)}% vs mês anterior
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Lucro Estimado</p>
                    <p className="text-2xl font-bold">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(report.summary.totalProfit)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Margem: {report.summary.profitMargin.toFixed(1)}%
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Ticket Médio</p>
                    <p className="text-2xl font-bold">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(report.summary.averageTicket)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {report.summary.salesCount} vendas
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Atividades</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Visitas Realizadas</span>
                    <span className="font-bold">{report.activities.visits}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Demonstrações</span>
                    <span className="font-bold">{report.activities.demos}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Serviços</span>
                    <span className="font-bold">{report.activities.services}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-muted-foreground">Clientes Atendidos</span>
                    <span className="font-bold">{report.activities.clientsServed}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Pipeline de Oportunidades</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Oportunidades Criadas</span>
                    <span className="font-bold">{report.opportunities.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ganhas</span>
                    <span className="font-bold text-success">{report.opportunities.won}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Taxa de Conversão</span>
                    <span className="font-bold">{report.opportunities.conversionRate.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-muted-foreground">Valor em Pipeline</span>
                    <span className="font-bold">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(report.opportunities.pipelineValue)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Top 10 Clientes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {report.topClients.map((client, i) => (
                    <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{client.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {client.city}, {client.state} • {client.salesCount} vendas
                        </p>
                      </div>
                      <p className="font-bold">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(client.revenue)}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}