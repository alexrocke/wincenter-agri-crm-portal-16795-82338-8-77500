import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ClientQuickSelect } from './ClientQuickSelect';
import { ProductQuickAdd } from './ProductQuickAdd';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Client {
  id: string;
  contact_name: string;
  farm_name: string;
  phone: string;
}

interface ProductItem {
  product_id?: string;
  service_id?: string;
  item_type: 'product' | 'internal' | 'service';
  name: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
}

interface QuickBudgetFlowProps {
  onComplete?: () => void;
}

export function QuickBudgetFlow({ onComplete }: QuickBudgetFlowProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [items, setItems] = useState<ProductItem[]>([]);
  const [creating, setCreating] = useState(false);

  const handleClientSelect = (client: Client) => {
    setSelectedClient(client);
  };

  const handleNextStep = () => {
    if (step === 1 && selectedClient) {
      setStep(2);
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
    }
  };

  const calculateTotal = () => {
    return items.reduce((acc, item) => {
      const subtotal = item.quantity * item.unit_price * (1 - item.discount_percent / 100);
      return acc + subtotal;
    }, 0);
  };

  const handleCreate = async () => {
    if (!selectedClient || items.length === 0 || !user) return;

    setCreating(true);

    try {
      const grossValue = calculateTotal();
      
      const productIds = items
        .filter(item => item.product_id)
        .map(item => item.product_id!);
      
      // Criar oportunidade
      const { data: opp, error: oppError } = await supabase
        .from('opportunities')
        .insert({
          client_id: selectedClient.id,
          seller_auth_id: user.id,
          stage: 'lead' as const,
          gross_value: grossValue,
          probability: 50,
          product_ids: productIds,
        })
        .select()
        .single();

      if (oppError) throw oppError;

      // Criar itens da oportunidade
      const oppItems = items.map(item => ({
        opportunity_id: opp.id,
        product_id: item.product_id || null,
        service_id: item.service_id || null,
        item_type: item.item_type,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_percent: item.discount_percent,
      }));

      const { error: itemsError } = await supabase
        .from('opportunity_items')
        .insert(oppItems);

      if (itemsError) throw itemsError;

      toast({
        title: 'Orçamento criado!',
        description: `Orçamento para ${selectedClient.contact_name} criado com sucesso.`,
      });

      if (onComplete) {
        onComplete();
      } else {
        navigate('/seller/simple/budgets');
      }
    } catch (error) {
      console.error('Erro ao criar orçamento:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o orçamento.',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header com Passos */}
      <div className="flex items-center justify-between mb-4">
        {step === 2 && (
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
        )}
        <div className="flex items-center gap-2 ml-auto">
          <div className={`h-2 w-2 rounded-full ${step === 1 ? 'bg-primary' : 'bg-muted'}`} />
          <div className={`h-2 w-2 rounded-full ${step === 2 ? 'bg-primary' : 'bg-muted'}`} />
        </div>
      </div>

      {/* Passo 1: Selecionar Cliente */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold mb-1">Selecione o Cliente</h2>
            <p className="text-sm text-muted-foreground">Passo 1 de 2</p>
          </div>
          
          <ClientQuickSelect 
            onSelect={handleClientSelect}
            selectedId={selectedClient?.id}
          />

          <Button
            onClick={handleNextStep}
            disabled={!selectedClient}
            className="w-full h-12 text-base"
            size="lg"
          >
            Próximo: Adicionar Produtos
          </Button>
        </div>
      )}

      {/* Passo 2: Adicionar Produtos */}
      {step === 2 && selectedClient && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold mb-1">Adicionar Produtos</h2>
            <p className="text-sm text-muted-foreground">
              Cliente: {selectedClient.contact_name}
            </p>
          </div>

          <ProductQuickAdd items={items} onItemsChange={setItems} />

          {/* Total */}
          {items.length > 0 && (
            <div className="bg-primary/10 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total do Orçamento</span>
                <span className="text-2xl font-bold text-primary">
                  R$ {calculateTotal().toFixed(2)}
                </span>
              </div>
            </div>
          )}

          <Button
            onClick={handleCreate}
            disabled={items.length === 0 || creating}
            className="w-full h-12 text-base"
            size="lg"
          >
            {creating ? (
              'Criando...'
            ) : (
              <>
                <CheckCircle className="h-5 w-5 mr-2" />
                Criar Orçamento
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
