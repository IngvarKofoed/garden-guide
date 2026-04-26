import { plantIconUrl } from '../../lib/api';

interface PlantBadgeProps {
  plantId: string;
  iconPhotoId: string | null;
  plantName: string;
  /** px, drives both width/height and inner type sizing */
  size: number;
  /** Optional ring color (typically the action tone accent) */
  ring?: string;
  /** Fallback background and text color when no icon is set */
  fallbackBg?: string;
  fallbackText?: string;
  className?: string;
}

export function PlantBadge({
  plantId,
  iconPhotoId,
  plantName,
  size,
  ring,
  fallbackBg = 'rgba(15,15,15,0.06)',
  fallbackText = '#0F0F0F',
  className = '',
}: PlantBadgeProps) {
  const baseStyle = {
    width: size,
    height: size,
    boxShadow: ring ? `0 0 0 1.5px ${ring}, 0 0 0 2.5px rgba(242,239,230,0.95)` : undefined,
  } as const;

  if (iconPhotoId) {
    return (
      <span
        className={`inline-flex shrink-0 overflow-hidden rounded-full bg-cream ${className}`}
        style={baseStyle}
        aria-hidden
      >
        <img
          src={plantIconUrl(plantId, iconPhotoId)}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
      </span>
    );
  }

  const initial = plantName.trim().charAt(0).toUpperCase() || '·';
  const fontSize = Math.max(9, Math.round(size * 0.42));

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold leading-none ${className}`}
      style={{
        ...baseStyle,
        backgroundColor: fallbackBg,
        color: fallbackText,
        fontSize,
        letterSpacing: '-0.01em',
      }}
      aria-hidden
    >
      {initial}
    </span>
  );
}
