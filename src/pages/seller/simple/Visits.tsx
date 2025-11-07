import { SimplifiedLayout } from '@/components/layout/SimplifiedLayout';
import { Card } from '@/components/ui/card';
import { MapPin } from 'lucide-react';

export default function SimplifiedVisits() {
  return (
    <SimplifiedLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Visitas</h1>
        
        <Card className="p-8 text-center">
          <MapPin className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">Em desenvolvimento</p>
        </Card>
      </div>
    </SimplifiedLayout>
  );
}
