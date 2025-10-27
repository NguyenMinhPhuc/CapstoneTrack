'use client';

import { useEffect } from 'react';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { SystemSettings } from '@/lib/types';

export function ThemeLoader() {
  const firestore = useFirestore();
  const settingsDocRef = useMemoFirebase(() => doc(firestore, 'systemSettings', 'features'), [firestore]);
  const { data: settings } = useDoc<SystemSettings>(settingsDocRef);

  useEffect(() => {
    if (settings) {
      const root = document.documentElement;
      if (settings.themePrimary) {
        root.style.setProperty('--primary', settings.themePrimary);
      } else {
        root.style.removeProperty('--primary');
      }
      if (settings.themePrimaryForeground) {
        root.style.setProperty('--primary-foreground', settings.themePrimaryForeground);
      } else {
        root.style.removeProperty('--primary-foreground');
      }
    }
  }, [settings]);

  return null; // This component doesn't render anything
}
