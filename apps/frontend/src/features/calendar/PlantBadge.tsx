import { plantIconUrl } from '../../lib/api';

interface PlantBadgeProps {
  plantId: string | null;
  iconPhotoId: string | null;
  plantName: string | null;
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

  if (plantId && iconPhotoId) {
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

  // No icon — show either the plant name's initial, or a "no plant" glyph for
  // free-floating journal entries.
  const fontSize = Math.max(9, Math.round(size * 0.42));
  const trimmed = plantName?.trim() ?? '';
  const initial = trimmed.charAt(0).toUpperCase();

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
      {initial || (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ width: Math.round(size * 0.52), height: Math.round(size * 0.52) }}
        >
          <path d="M5 4h11l3 3v13H5z" />
          <path d="M8 9h8M8 13h8M8 17h5" opacity="0.7" />
        </svg>
      )}
    </span>
  );
}
