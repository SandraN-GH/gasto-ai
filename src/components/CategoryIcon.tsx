import {
  Car,
  GraduationCap,
  Home,
  Sparkles,
  Tag,
  TrendingUp,
  Utensils,
} from 'lucide-react';

interface CategoryIconProps {
  slug?: string;
  color?: string;
  size?: 'sm' | 'md';
}

export function CategoryIcon({
  slug = 'other',
  color = '#64748B',
  size = 'md',
}: CategoryIconProps) {
  const dims = size === 'sm' ? 'w-8 h-8' : 'w-10 h-10';
  const iconSize = size === 'sm' ? 16 : 18;

  const renderIcon = () => {
    switch (slug) {
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
      case 'other':
        return <Home size={iconSize} strokeWidth={1.9} />;
      default:
        return <Tag size={iconSize} strokeWidth={1.9} />;
    }
  };

  return (
    <div
      className={`${dims} rounded-full flex items-center justify-center shrink-0 transition-transform duration-150`}
      style={{
        backgroundColor: `${color}22`,
        color,
        border: `1px solid ${color}33`,
      }}
      aria-hidden="true"
    >
      {renderIcon()}
    </div>
  );
}
