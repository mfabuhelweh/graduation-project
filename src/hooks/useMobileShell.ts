import * as React from 'react';
import { Capacitor } from '@capacitor/core';

const QUERY = '(max-width: 767px)';

/** True on Capacitor, or when the viewport is phone-sized (browser). */
export function useMobileShell(): boolean {
  const [narrow, setNarrow] = React.useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(QUERY).matches : false,
  );

  React.useEffect(() => {
    const m = window.matchMedia(QUERY);
    const onChange = () => setNarrow(m.matches);
    onChange();
    m.addEventListener('change', onChange);
    return () => m.removeEventListener('change', onChange);
  }, []);

  return Capacitor.isNativePlatform() || narrow;
}
