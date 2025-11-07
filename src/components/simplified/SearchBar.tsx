import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useState, useEffect } from 'react';

interface SearchBarProps {
  placeholder?: string;
  onSearch: (query: string) => void;
  debounceMs?: number;
}

export function SearchBar({ placeholder = 'Buscar...', onSearch, debounceMs = 300 }: SearchBarProps) {
  const [value, setValue] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(value);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [value, debounceMs, onSearch]);

  return (
    <div className="relative w-full">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="pl-10 h-12 text-base"
      />
    </div>
  );
}
