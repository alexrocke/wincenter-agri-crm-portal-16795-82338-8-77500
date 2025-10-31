import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ClientItems {
  drone: boolean;
  baterias: number;
  controle: boolean;
  dongle: boolean;
  carregador_controle: boolean;
  baterias_controle: number;
  base_rtk: boolean;
  misturador: boolean;
  cabo_misturador: boolean;
  carregador: boolean;
  cabo_trifasico: boolean;
  powerbank: boolean;
  tanque_liquido: boolean;
  tanque_solido: boolean;
  gerador: boolean;
  cabo_gerador: boolean;
  observacao: string;
}

interface StartTechnicalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: any;
  clientItems: ClientItems;
  setClientItems: (items: ClientItems) => void;
  onConfirm: () => void;
}

export function StartTechnicalDialog({ 
  open, 
  onOpenChange, 
  service, 
  clientItems, 
  setClientItems, 
  onConfirm 
}: StartTechnicalDialogProps) {
  if (!service) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Iniciar Atendimento Técnico</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            <p><strong>Cliente:</strong> {service.clients?.contact_name}</p>
            <p><strong>Data:</strong> {format(new Date(service.date), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
          </div>

          <div className="space-y-3">
            <Label className="text-base font-semibold">Itens que o Cliente Trouxe</Label>
            <p className="text-sm text-muted-foreground">Registre os itens entregues pelo cliente:</p>
            <div className="grid grid-cols-1 gap-3">
              {[
                { key: 'drone', label: 'Drone', hasQty: false },
                { key: 'baterias', label: 'Baterias', hasQty: true },
                { key: 'controle', label: 'Controle', hasQty: false },
                { key: 'dongle', label: 'Dongle', hasQty: false },
                { key: 'carregador_controle', label: 'Carregador Controle', hasQty: false },
                { key: 'baterias_controle', label: 'Baterias Controle', hasQty: true },
                { key: 'base_rtk', label: 'Base + RTK', hasQty: false },
                { key: 'misturador', label: 'Misturador', hasQty: false },
                { key: 'cabo_misturador', label: 'Cabo Misturador', hasQty: false },
                { key: 'carregador', label: 'Carregador', hasQty: false },
                { key: 'cabo_trifasico', label: 'Cabo Trifásico Carregador', hasQty: false },
                { key: 'powerbank', label: 'PowerBank', hasQty: false },
                { key: 'tanque_liquido', label: 'Tanque de Líquido', hasQty: false },
                { key: 'tanque_solido', label: 'Tanque de Sólido', hasQty: false },
                { key: 'gerador', label: 'Gerador', hasQty: false },
                { key: 'cabo_gerador', label: 'Cabo Gerador Tomada', hasQty: false },
              ].map((item) => (
                <div key={item.key} className="flex items-center space-x-3 p-2 border rounded">
                  <input
                    type="checkbox"
                    checked={item.hasQty ? (clientItems[item.key as keyof ClientItems] as number) > 0 : clientItems[item.key as keyof ClientItems] as boolean}
                    onChange={(e) => {
                      if (item.hasQty) {
                        setClientItems({
                          ...clientItems,
                          [item.key]: e.target.checked ? 1 : 0
                        });
                      } else {
                        setClientItems({
                          ...clientItems,
                          [item.key]: e.target.checked
                        });
                      }
                    }}
                    className="rounded"
                  />
                  <span className="text-sm flex-1">{item.label}</span>
                  {item.hasQty && (clientItems[item.key as keyof ClientItems] as number) > 0 && (
                    <Input
                      type="number"
                      min="0"
                      value={clientItems[item.key as keyof ClientItems] as number}
                      onChange={(e) => setClientItems({
                        ...clientItems,
                        [item.key]: parseInt(e.target.value) || 0
                      })}
                      className="w-20"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-base font-semibold">Observação</Label>
            <Textarea
              placeholder="Ex.: Itens com avarias, falta de acessórios, etc."
              value={clientItems.observacao || ""}
              onChange={(e) => setClientItems({ ...clientItems, observacao: e.target.value })}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={onConfirm} className="bg-orange-600 hover:bg-orange-700">
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirmar Início
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
