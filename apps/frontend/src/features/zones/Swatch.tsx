import type { ZoneColorToken } from '@garden-guide/shared';
import { ZONE_PALETTE } from './palette';

interface SwatchProps {
  token: ZoneColorToken;
  size: number;
  selected?: boolean;
  onClick?: () => void;
  ariaLabel?: string;
}

export function Swatch({ token, size, selected, onClick, ariaLabel }: SwatchProps) {
  const palette = ZONE_PALETTE[token];
  const style = {
    background: palette.fill,
    borderColor: palette.stroke,
    width: size,
    height: size,
  };
  const ringClass = selected ? 'ring-2 ring-offset-2 ring-ink ring-offset-cream' : '';
  const baseClass = 'rounded-lg border transition';
  if (onClick) {
    return (
      <button
        type="button"
        aria-label={ariaLabel ?? palette.label}
        aria-pressed={selected}
        onClick={onClick}
        className={`${baseClass} ${ringClass} cursor-pointer`}
        style={style}
      />
    );
  }
  return (
    <span
      aria-label={ariaLabel ?? palette.label}
      className={baseClass}
      style={{ ...style, display: 'inline-block' }}
    />
  );
}
