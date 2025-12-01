import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Brain, TrendingUp, Users, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Prediction {
  predictedRevenue: number;
  predictedSalesCount: number;
  confidence: number;
  trend: string;
  insights: string[];
}

interface TopClient {
  name: string;
  score: number;
  reasons: string[];
  nextAction: string;
}

export default function Insights() {
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [topClients, setTopClients] = useState<TopClient[]>([]);

  const predictSales = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-sales-prediction', {
        body: { action: 'predict_sales' }
      });

      if (error) throw error;

      if (data.success) {
        setPrediction(data.result);
        toast.success('Previsão de vendas gerada com sucesso');
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('Erro na previsão:', error);
      toast.error(error.message || 'Erro ao gerar previsão');
    } finally {
      setLoading(false);
    }
  };

  const identifyPotential = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-sales-prediction', {
        body: { action: 'identify_potential' }
      });

      if (error) throw error;

      if (data.success) {
        setTopClients(data.result.topClients);
        toast.success('Clientes potenciais identificados');
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('Erro na identificação:', error);
      toast.error(error.message || 'Erro ao identificar clientes');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="container max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="h-8 w-8 text-primary" />
            Insights com IA
          </h1>
          <p className="text-muted-foreground">Análises inteligentes para melhorar suas vendas</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Previsão de Vendas
              </CardTitle>
              <CardDescription>Preveja suas vendas do próximo mês com IA</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={predictSales} disabled={loading} className="w-full">
                {loading ? 'Analisando...' : 'Gerar Previsão'}
              </Button>

              {prediction && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Receita Prevista</p>
                      <p className="text-2xl font-bold text-primary">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prediction.predictedRevenue)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Vendas Previstas</p>
                      <p className="text-2xl font-bold">{prediction.predictedSalesCount}</p>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-sm font-medium">Confiança</p>
                      <Badge>{prediction.confidence}%</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">Tendência</p>
                      <Badge variant="outline">{prediction.trend}</Badge>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">Insights</p>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {prediction.insights.map((insight, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          {insight}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Clientes Potenciais
              </CardTitle>
              <CardDescription>Identifique clientes com maior potencial</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={identifyPotential} disabled={loading} className="w-full">
                {loading ? 'Analisando...' : 'Identificar Clientes'}
              </Button>

              {topClients.length > 0 && (
                <div className="space-y-3 pt-4 border-t">
                  {topClients.map((client, i) => (
                    <div key={i} className="p-3 border rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold">{client.name}</p>
                        <Badge className="bg-success text-success-foreground">
                          Score: {client.score}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        {client.reasons.map((reason, j) => (
                          <p key={j}>• {reason}</p>
                        ))}
                      </div>
                      <div className="pt-2 border-t text-sm">
                        <p className="font-medium text-primary">{client.nextAction}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Como Funciona
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              O sistema de insights utiliza IA (Google Gemini) para analisar seu histórico de vendas,
              clientes e atividades, gerando previsões e recomendações personalizadas.
            </p>
            <ul className="space-y-2 ml-4">
              <li>• <strong>Previsão de Vendas:</strong> Analisa tendências dos últimos 6 meses para prever receita do próximo mês</li>
              <li>• <strong>Clientes Potenciais:</strong> Identifica os 5 clientes com maior potencial baseado em engajamento e histórico</li>
              <li>• <strong>Análise de Conversão:</strong> Avalia probabilidade de conversão de oportunidades específicas</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}