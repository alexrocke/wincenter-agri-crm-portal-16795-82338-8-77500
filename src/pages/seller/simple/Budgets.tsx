import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { SimplifiedLayout } from '@/components/layout/SimplifiedLayout';
import { QuickBudgetFlow } from '@/components/simplified/QuickBudgetFlow';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { useSearchParams } from 'react-router-dom';
import { FileText, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Opportunity {
  id: string;
  client_id: string;
  stage: string;
  gross_value: number;
  created_at: string;
  clients: {
    contact_name: string;
    farm_name: string;
  };
}

const stageLabels: Record<string, string> = {
  lead: 'Inicial',
  qualified: 'Qualificado',
  proposal: 'Orçamento',
  closing: 'Fechamento',
  won: 'Ganho',
  lost: 'Perdido',
};

const stageColors: Record<string, string> = {
  lead: 'bg-blue-500/10 text-blue-700',
  qualified: 'bg-cyan-500/10 text-cyan-700',
  proposal: 'bg-purple-500/10 text-purple-700',
  closing: 'bg-orange-500/10 text-orange-700',
  won: 'bg-green-500/10 text-green-700',
  lost: 'bg-red-500/10 text-red-700',
};

export default function SimplifiedBudgets() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const showQuick = searchParams.get('quick') === 'true';
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadOpportunities();
    }
  }, [user]);

  const loadOpportunities = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('opportunities')
      .select(`
        id,
        client_id,
        stage,
        gross_value,
        created_at,
        clients (
          contact_name,
          farm_name
        )
      `)
      .eq('seller_auth_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) {
      setOpportunities(data as unknown as Opportunity[]);
    }
    setLoading(false);
  };

  const handleCloseQuick = () => {
    setSearchParams({});
  };

  const handleComplete = () => {
    setSearchParams({});
    loadOpportunities();
  };

  return (
    <SimplifiedLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Orçamentos</h1>
          <Button onClick={() => setSearchParams({ quick: 'true' })}>
            Criar Rápido
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        ) : opportunities.length === 0 ? (
          <Card className="p-8 text-center">
            <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground mb-4">Nenhum orçamento encontrado</p>
            <Button onClick={() => setSearchParams({ quick: 'true' })}>
              Criar Primeiro Orçamento
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {opportunities.map((opp) => (
              <Card key={opp.id} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">
                        {opp.clients.contact_name}
                      </p>
                      {opp.clients.farm_name && (
                        <p className="text-xs text-muted-foreground truncate">
                          {opp.clients.farm_name}
                        </p>
                      )}
                    </div>
                    <Badge className={stageColors[opp.stage] || ''}>
                      {stageLabels[opp.stage] || opp.stage}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-primary">
                        R$ {Number(opp.gross_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(opp.created_at), 'dd MMM yyyy', { locale: ptBR })}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Criação Rápida */}
      <Sheet open={showQuick} onOpenChange={handleCloseQuick}>
        <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl">
          <SheetTitle className="mb-4">Criar Orçamento</SheetTitle>
          <QuickBudgetFlow onComplete={handleComplete} />
        </SheetContent>
      </Sheet>
    </SimplifiedLayout>
  );
}
