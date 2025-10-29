import { CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface NotificationStatusBadgeProps {
  fcmSent?: boolean | null;
  fcmSentAt?: string | null;
  fcmError?: string | null;
  whatsappSent?: boolean | null;
  whatsappSentAt?: string | null;
}

export function NotificationStatusBadge({
  fcmSent,
  fcmSentAt,
  fcmError,
  whatsappSent,
  whatsappSentAt,
}: NotificationStatusBadgeProps) {
  const hasFcm = fcmSent !== null && fcmSent !== undefined;
  const hasWhatsapp = whatsappSent !== null && whatsappSent !== undefined;

  if (!hasFcm && !hasWhatsapp) {
    return (
      <Badge variant="outline" className="gap-1">
        <Clock className="h-3 w-3" />
        Pendente
      </Badge>
    );
  }

  return (
    <div className="flex gap-1">
      {hasFcm && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Badge 
                variant={fcmSent ? 'default' : fcmError ? 'destructive' : 'outline'}
                className="gap-1"
              >
                {fcmSent ? (
                  <>
                    <CheckCircle2 className="h-3 w-3" />
                    Push
                  </>
                ) : fcmError ? (
                  <>
                    <XCircle className="h-3 w-3" />
                    Push
                  </>
                ) : (
                  <>
                    <Clock className="h-3 w-3" />
                    Push
                  </>
                )}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              {fcmSent ? (
                <p>Enviado via Push em {new Date(fcmSentAt!).toLocaleString('pt-BR')}</p>
              ) : fcmError ? (
                <p>Erro: {fcmError}</p>
              ) : (
                <p>Aguardando envio Push</p>
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {hasWhatsapp && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Badge 
                variant={whatsappSent ? 'default' : 'outline'}
                className="gap-1"
              >
                {whatsappSent ? (
                  <>
                    <CheckCircle2 className="h-3 w-3" />
                    WhatsApp
                  </>
                ) : (
                  <>
                    <Clock className="h-3 w-3" />
                    WhatsApp
                  </>
                )}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              {whatsappSent ? (
                <p>Enviado via WhatsApp em {new Date(whatsappSentAt!).toLocaleString('pt-BR')}</p>
              ) : (
                <p>Aguardando envio WhatsApp</p>
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}
