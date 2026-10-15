import { useEffect, useState } from 'react';
import type { LucideIcon, LucideProps } from 'lucide-react';

type IconSet = Record<string, LucideIcon>;

let iconSetPromise: Promise<IconSet> | null = null;
let loadedIcons: IconSet | null = null;

function loadIconSet(): Promise<IconSet> {
  if (!iconSetPromise) {
    iconSetPromise = import('lucide-react').then((mod) => {
      loadedIcons = mod as unknown as IconSet;
      return loadedIcons;
    });
  }
  return iconSetPromise;
}

interface DynamicIconProps extends LucideProps {
  name?: string;
  fallback: LucideIcon;
}

export default function DynamicIcon({ name, fallback: Fallback, ...props }: DynamicIconProps) {
  const [icons, setIcons] = useState<IconSet | null>(loadedIcons);

  useEffect(() => {
    if (!name || icons) return;
    let active = true;
    loadIconSet()
      .then((set) => { if (active) setIcons(set); })
      .catch(() => {});
    return () => { active = false; };
  }, [name, icons]);

  const Icon = (name && icons?.[name]) || Fallback;
  return <Icon {...props} />;
}
