import {
  Utensils,
  Car,
  GraduationCap,
  Sparkles,
  Home,
  TrendingUp,
} from 'lucide-react';
import { CATEGORY_MAP } from '../data/initialData';
import type { CategoryId } from '../types/finance';

interface CategoryIconProps {
  category: CategoryId;
  size?: 'sm' | 'md';
}

export function CategoryIcon({ category, size = 'md' }: CategoryIconProps) {
  const meta = CATEGORY_MAP[category];
  const dims = size === 'sm' ? 'w-8 h-8' : 'w-10 h-10';
  const iconSize = size === 'sm' ? 16 : 18;

  const renderIcon = () => {
    switch (category) {
      case 'food':
        return <Utensils size={iconSize} strokeWidth={1.9} />;
      case 'transport':
        return <Car size={iconSize} strokeWidth={1.9} />;
      case 'education':
        return <GraduationCap size={iconSize} strokeWidth={1.9} />;
      case 'leisure':
        return <Sparkles size={iconSize} strokeWidth={1.9} />;
      case 'income':
        return <TrendingUp size={iconSize} strokeWidth={1.9} />;
      default:
        return <Home size={iconSize} strokeWidth={1.9} />;
    }
  };

  return (
    <div
      className={`${dims} rounded-full flex items-center justify-center shrink-0 transition-transform duration-150`}
      style={{
        backgroundColor: meta.bgTint,
        color: meta.color,
        border: `1px solid ${meta.color}28`,
      }}
      aria-hidden="true"
    >
      {renderIcon()}
    </div>
  );
}
