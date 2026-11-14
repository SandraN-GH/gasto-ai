import {
  Briefcase,
  Car,
  Coffee,
  Gamepad2,
  GraduationCap,
  Heart,
  Home,
  ShoppingBag,
  Sparkles,
  Tag,
  Utensils,
  Zap,
} from 'lucide-react';

export const CATEGORY_ICON_OPTIONS = [
  { id: 'utensils', label: 'Alimentação' },
  { id: 'car', label: 'Transporte' },
  { id: 'home', label: 'Casa' },
  { id: 'shopping-bag', label: 'Compras' },
  { id: 'graduation-cap', label: 'Educação' },
  { id: 'heart', label: 'Saúde' },
  { id: 'sparkles', label: 'Lazer' },
  { id: 'coffee', label: 'Café' },
  { id: 'zap', label: 'Contas' },
  { id: 'briefcase', label: 'Trabalho' },
  { id: 'gamepad-2', label: 'Jogos' },
  { id: 'tag', label: 'Outros' },
] as const;

interface CategoryIconProps {
  icon?: string | null;
  color?: string | null;
  size?: 'sm' | 'md';
}

export function CategoryIcon({
  icon = 'tag',
  color = '#64748B',
  size = 'md',
}: CategoryIconProps) {
  const safeColor = color || '#64748B';
  const dims = size === 'sm' ? 'w-8 h-8' : 'w-10 h-10';
  const iconSize = size === 'sm' ? 16 : 18;

  const renderIcon = () => {
    switch (icon) {
      case 'utensils':
        return <Utensils size={iconSize} strokeWidth={1.9} />;
      case 'car':
        return <Car size={iconSize} strokeWidth={1.9} />;
      case 'graduation-cap':
        return <GraduationCap size={iconSize} strokeWidth={1.9} />;
      case 'sparkles':
        return <Sparkles size={iconSize} strokeWidth={1.9} />;
      case 'home':
        return <Home size={iconSize} strokeWidth={1.9} />;
      case 'shopping-bag':
        return <ShoppingBag size={iconSize} strokeWidth={1.9} />;
      case 'heart':
        return <Heart size={iconSize} strokeWidth={1.9} />;
      case 'coffee':
        return <Coffee size={iconSize} strokeWidth={1.9} />;
      case 'zap':
        return <Zap size={iconSize} strokeWidth={1.9} />;
      case 'briefcase':
        return <Briefcase size={iconSize} strokeWidth={1.9} />;
      case 'gamepad-2':
        return <Gamepad2 size={iconSize} strokeWidth={1.9} />;
      default:
        return <Tag size={iconSize} strokeWidth={1.9} />;
    }
  };

  return (
    <div
      className={`${dims} rounded-full flex items-center justify-center shrink-0 transition-transform duration-150`}
      style={{
        backgroundColor: `${safeColor}22`,
        color: safeColor,
        border: `1px solid ${safeColor}33`,
      }}
      aria-hidden="true"
    >
      {renderIcon()}
    </div>
  );
}
