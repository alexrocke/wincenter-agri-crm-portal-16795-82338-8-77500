import { Badge } from '@/components/ui/badge';
import { Info, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';

interface NotificationKindBadgeProps {
  kind: string;
}

export default function NotificationKindBadge({ kind }: NotificationKindBadgeProps) {
  const getKindStyles = (kind: string) => {
    switch (kind) {
      case 'info':
        return {
          icon: <Info className="h-3 w-3" />,
          label: 'Info',
          className: 'bg-blue-100 text-blue-800 border-blue-300'
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="h-3 w-3" />,
          label: 'Warning',
          className: 'bg-yellow-100 text-yellow-800 border-yellow-300'
        };
      case 'success':
        return {
          icon: <CheckCircle className="h-3 w-3" />,
          label: 'Success',
          className: 'bg-green-100 text-green-800 border-green-300'
        };
      case 'alert':
        return {
          icon: <AlertCircle className="h-3 w-3" />,
          label: 'Alert',
          className: 'bg-red-100 text-red-800 border-red-300'
        };
      default:
        return {
          icon: <Info className="h-3 w-3" />,
          label: kind,
          className: 'bg-gray-100 text-gray-800 border-gray-300'
        };
    }
  };

  const styles = getKindStyles(kind);

  return (
    <Badge variant="outline" className={`gap-1 ${styles.className}`}>
      {styles.icon}
      {styles.label}
    </Badge>
  );
}
