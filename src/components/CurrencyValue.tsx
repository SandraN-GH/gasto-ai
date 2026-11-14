import { formatCurrencyParts } from '../utils/format';

interface CurrencyValueProps {
  value: number;
  size?: 'display' | 'lg' | 'md' | 'sm';
  showPlus?: boolean;
  className?: string;
}

export function CurrencyValue({
  value,
  size = 'md',
  showPlus = false,
  className = '',
}: CurrencyValueProps) {
  const { sign, symbol, number } = formatCurrencyParts(value);
  const prefix = value > 0 && showPlus ? '+' : sign;

  const sizeMap = {
    display: {
      symbol: 'text-[19px] sm:text-[22px] font-medium mr-1.5 opacity-80',
      number: 'text-[32px] sm:text-[40px] leading-none font-bold tracking-[-0.03em]',
    },
    lg: {
      symbol: 'text-[14px] font-medium mr-1 opacity-80',
      number: 'text-[22px] sm:text-[26px] leading-tight font-bold tracking-[-0.02em]',
    },
    md: {
      symbol: 'text-[11px] font-medium mr-1 opacity-75',
      number: 'text-[16px] leading-snug font-semibold tracking-[-0.01em]',
    },
    sm: {
      symbol: 'text-[10px] font-medium mr-0.5 opacity-75',
      number: 'text-[14px] leading-snug font-semibold',
    },
  };

  return (
    <span className={`inline-flex items-baseline tabular-financial font-display ${className}`}>
      {prefix && <span className={sizeMap[size].symbol}>{prefix}</span>}
      <span className={sizeMap[size].symbol}>{symbol}</span>
      <span className={sizeMap[size].number}>{number}</span>
    </span>
  );
}
