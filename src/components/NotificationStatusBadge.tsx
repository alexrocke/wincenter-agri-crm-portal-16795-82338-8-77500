import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MessageSquare, Smartphone, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface NotificationStatusBadgeProps {
  whatsappSent: boolean;
  onesignalSent: boolean;
  hasError: boolean;
}

export default function NotificationStatusBadge({ 
  whatsappSent, 
  onesignalSent, 
  hasError 
}: NotificationStatusBadgeProps) {
  return (
    <TooltipProvider>
      <div className="flex gap-1">
        {/* WhatsApp Status */}
        <Tooltip>
          <TooltipTrigger>
            {whatsappSent ? (
              <Badge variant="outline" className="gap-1 text-green-600 border-green-600">
                <MessageSquare className="h-3 w-3" />
                <CheckCircle className="h-3 w-3" />
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1 text-muted-foreground">
                <MessageSquare className="h-3 w-3" />
                <XCircle className="h-3 w-3" />
              </Badge>
            )}
          </TooltipTrigger>
          <TooltipContent>
            <p>WhatsApp: {whatsappSent ? 'Enviado' : 'Não enviado'}</p>
          </TooltipContent>
        </Tooltip>

        {/* OneSignal Status */}
        <Tooltip>
          <TooltipTrigger>
            {onesignalSent ? (
              <Badge variant="outline" className="gap-1 text-blue-600 border-blue-600">
                <Smartphone className="h-3 w-3" />
                <CheckCircle className="h-3 w-3" />
              </Badge>
            ) : hasError ? (
              <Badge variant="outline" className="gap-1 text-red-600 border-red-600">
                <Smartphone className="h-3 w-3" />
                <AlertTriangle className="h-3 w-3" />
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1 text-muted-foreground">
                <Smartphone className="h-3 w-3" />
                <XCircle className="h-3 w-3" />
              </Badge>
            )}
          </TooltipTrigger>
          <TooltipContent>
            <p>
              OneSignal: {onesignalSent ? 'Enviado' : hasError ? 'Erro no envio' : 'Não enviado'}
            </p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
