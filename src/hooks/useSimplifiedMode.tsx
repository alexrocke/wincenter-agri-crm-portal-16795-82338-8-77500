import { useState, useEffect } from 'react';
import { useIsMobile } from './use-mobile';

const STORAGE_KEY = 'wincenter_simplified_mode';

export function useSimplifiedMode() {
  const isMobile = useIsMobile();
  const [isSimplified, setIsSimplified] = useState<boolean>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'true';
  });

  const toggleMode = () => {
    setIsSimplified(prev => {
      const newValue = !prev;
      localStorage.setItem(STORAGE_KEY, String(newValue));
      return newValue;
    });
  };

  const canUseSimplified = isMobile;

  useEffect(() => {
    // Se não está em mobile e modo simplificado está ativo, desativa
    if (!isMobile && isSimplified) {
      setIsSimplified(false);
      localStorage.setItem(STORAGE_KEY, 'false');
    }
  }, [isMobile, isSimplified]);

  return {
    isMobile,
    isSimplified: isSimplified && isMobile,
    toggleMode,
    canUseSimplified
  };
}
