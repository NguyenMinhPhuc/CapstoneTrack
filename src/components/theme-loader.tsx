'use client';

import { useEffect } from 'react';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { SystemSettings } from '@/lib/types';

// Helper to convert hex to HSL string
const hexToHslString = (hex: string): string => {
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex[1] + hex[2], 16);
    g = parseInt(hex[3] + hex[4], 16);
    b = parseInt(hex[5] + hex[6], 16);
  }
  
  r /= 255;
  g /= 255;
  b /= 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  
  h = Math.round(h * 360);
  s = Math.round(s * 100);
  l = Math.round(l * 100);
  
  return `${h} ${s}% ${l}%`;
};


export function ThemeLoader() {
  const firestore = useFirestore();
  const settingsDocRef = useMemoFirebase(() => doc(firestore, 'systemSettings', 'features'), [firestore]);
  const { data: settings } = useDoc<SystemSettings>(settingsDocRef);

  useEffect(() => {
    if (settings) {
      const root = document.documentElement;
      
      const themeProperties: (keyof SystemSettings)[] = [
        'themePrimary', 'themePrimaryForeground',
        'themeAccent', 'themeAccentForeground',
        'themeBackground', 'themeForeground'
      ];
      
      const cssVariableMap: Record<string, string> = {
        themePrimary: '--primary',
        themePrimaryForeground: '--primary-foreground',
        themeBackground: '--background',
        themeForeground: '--foreground',
        themeAccent: '--accent',
        themeAccentForeground: '--accent-foreground'
      };

      themeProperties.forEach(prop => {
        const value = settings[prop];
        const cssVar = cssVariableMap[prop];
        
        if (value) {
            // Assume value is a hex color string like #RRGGBB
            root.style.setProperty(cssVar, hexToHslString(value as string));
        } else {
            root.style.removeProperty(cssVar);
        }
      });
    }
  }, [settings]);

  return null; // This component doesn't render anything
}
