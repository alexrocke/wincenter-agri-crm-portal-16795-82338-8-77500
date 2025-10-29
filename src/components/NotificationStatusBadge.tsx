import { Badge } from '@/components/ui/badge';
import { MessageSquare, Smartphone, AlertCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface NotificationStatusBadgeProps {
  whatsappSent: boolean | null;
  whatsappSentAt: string | null;
  onesignalSent: boolean | null;
  onesignalSentAt: string | null;
  onesignalError: string | null;
}

export default function NotificationStatusBadge({
  whatsappSent,
  whatsappSentAt,
  onesignalSent,
  onesignalSentAt,
  onesignalError
}: NotificationStatusBadgeProps) {
  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        {/* WhatsApp Status */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant={whatsappSent ? 'default' : 'secondary'}
              className="gap-1"
            >
              <MessageSquare className="h-3 w-3" />
              {whatsappSent ? 'Enviado' : 'Não enviado'}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            {whatsappSent && whatsappSentAt
              ? `WhatsApp enviado em ${new Date(whatsappSentAt).toLocaleString('pt-BR')}`
              : 'WhatsApp não enviado'
            }
          </TooltipContent>
        </Tooltip>

        {/* OneSignal Status */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant={onesignalSent ? 'default' : onesignalError ? 'destructive' : 'secondary'}
              className="gap-1"
            >
              {onesignalError ? (
                <AlertCircle className="h-3 w-3" />
              ) : (
                <Smartphone className="h-3 w-3" />
              )}
              {onesignalSent ? 'Push enviado' : onesignalError ? 'Erro' : 'Não enviado'}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            {onesignalError
              ? `Erro: ${onesignalError}`
              : onesignalSent && onesignalSentAt
              ? `Push enviado em ${new Date(onesignalSentAt).toLocaleString('pt-BR')}`
              : 'Push notification não enviado'
            }
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
