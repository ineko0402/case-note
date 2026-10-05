import { useEffect, useState } from 'react';

export function useSmallScreen() {
  const [small, setSmall] = useState(() => window.matchMedia('(max-width: 650px)').matches);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 650px)');
    const update = () => setSmall(query.matches);
    query.addEventListener('change', update);
    update();
    return () => query.removeEventListener('change', update);
  }, []);
  return small;
}
