import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FloatingActionButtonProps {
  onClick: () => void;
  label?: string;
}

export function FloatingActionButton({ onClick, label = 'Adicionar' }: FloatingActionButtonProps) {
  return (
    <Button
      onClick={onClick}
      size="lg"
      className="fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg z-40"
      aria-label={label}
    >
      <Plus className="h-6 w-6" />
    </Button>
  );
}
