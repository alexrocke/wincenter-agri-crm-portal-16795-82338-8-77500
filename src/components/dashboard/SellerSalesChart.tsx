import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface SalesChartData {
  month: string;
  revenue: number;
  count: number;
}

interface SellerSalesChartProps {
  data: SalesChartData[];
}

export function SellerSalesChart({ data }: SellerSalesChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Evolução de Vendas</CardTitle>
        <CardDescription>Receita e quantidade nos últimos 6 meses</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis 
              dataKey="month" 
              className="text-xs"
              stroke="hsl(var(--muted-foreground))"
            />
            <YAxis 
              className="text-xs"
              stroke="hsl(var(--muted-foreground))"
              tickFormatter={(value) => new Intl.NumberFormat('pt-BR', {
                notation: 'compact',
                compactDisplay: 'short'
              }).format(value)}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 'var(--radius)',
              }}
              formatter={(value: number, name: string) => [
                name === 'revenue' 
                  ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
                  : value,
                name === 'revenue' ? 'Receita' : 'Vendas'
              ]}
            />
            <Legend 
              formatter={(value) => value === 'revenue' ? 'Receita' : 'Vendas'}
              wrapperStyle={{ paddingTop: '20px' }}
            />
            <Line 
              type="monotone" 
              dataKey="revenue" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--primary))' }}
            />
            <Line 
              type="monotone" 
              dataKey="count" 
              stroke="hsl(var(--accent))" 
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--accent))' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}