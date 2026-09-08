import { Signpost, HardHat, PaintRoller, ShieldCheck, Globe, Wind, Sun, Truck, Sparkles, ChefHat, Sofa, Briefcase, Layers } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const MAP: Record<string, LucideIcon> = { signpost: Signpost, 'hard-hat': HardHat, 'paint-roller': PaintRoller, 'shield-check': ShieldCheck, globe: Globe, wind: Wind, sun: Sun, truck: Truck, sparkles: Sparkles, 'chef-hat': ChefHat, sofa: Sofa, briefcase: Briefcase };

export function CategoryIcon({ icon, className }: { icon: string | null; className?: string }) {
  const I = (icon && MAP[icon]) || Layers;
  return <I className={className} />;
}
