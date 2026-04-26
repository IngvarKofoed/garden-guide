import type { ActionType } from '@garden-guide/shared';

export const ACTION_LABELS: Record<ActionType, string> = {
  prune: 'Prune',
  fertilize: 'Fertilize',
  water: 'Water',
  plant: 'Plant',
  transplant: 'Transplant',
  harvest: 'Harvest',
  sow: 'Sow',
  mulch: 'Mulch',
  treat: 'Treat',
  inspect: 'Inspect',
  custom: 'Note',
};

type ActionTone = {
  bar: string;
  text: string;
  accent: string;
  ring: string;
};

// Desaturated tones drawn from the existing palette plus two earth notes
// (warm amber for harvest, soft soil for mulch). No traffic-light reds.
export const ACTION_TONES: Record<ActionType, ActionTone> = {
  water: {
    bar: 'rgba(98, 138, 152, 0.20)',
    text: '#2C4A55',
    accent: '#5C8A98',
    ring: 'rgba(92, 138, 152, 0.45)',
  },
  fertilize: {
    bar: 'rgba(217, 232, 207, 0.85)',
    text: '#2F5233',
    accent: '#6FA86B',
    ring: 'rgba(111, 168, 107, 0.45)',
  },
  prune: {
    bar: 'rgba(15, 15, 15, 0.07)',
    text: '#0F0F0F',
    accent: '#0F0F0F',
    ring: 'rgba(15, 15, 15, 0.45)',
  },
  plant: {
    bar: 'rgba(47, 82, 51, 0.16)',
    text: '#234027',
    accent: '#2F5233',
    ring: 'rgba(47, 82, 51, 0.45)',
  },
  transplant: {
    bar: 'rgba(47, 82, 51, 0.10)',
    text: '#2F5233',
    accent: '#3F6B45',
    ring: 'rgba(47, 82, 51, 0.40)',
  },
  sow: {
    bar: 'rgba(110, 168, 107, 0.22)',
    text: '#2F5233',
    accent: '#6FA86B',
    ring: 'rgba(111, 168, 107, 0.45)',
  },
  harvest: {
    bar: 'rgba(196, 154, 102, 0.24)',
    text: '#5F411B',
    accent: '#A87B43',
    ring: 'rgba(168, 123, 67, 0.45)',
  },
  mulch: {
    bar: 'rgba(140, 116, 86, 0.20)',
    text: '#4A3A26',
    accent: '#7C6447',
    ring: 'rgba(124, 100, 71, 0.45)',
  },
  treat: {
    bar: 'rgba(120, 90, 90, 0.18)',
    text: '#5A3535',
    accent: '#8E5A5A',
    ring: 'rgba(142, 90, 90, 0.45)',
  },
  inspect: {
    bar: 'rgba(168, 177, 160, 0.32)',
    text: '#3F4D3D',
    accent: '#6B7A60',
    ring: 'rgba(107, 122, 96, 0.45)',
  },
  custom: {
    bar: 'rgba(108, 107, 102, 0.18)',
    text: '#3F3F3F',
    accent: '#6B6B66',
    ring: 'rgba(107, 107, 102, 0.45)',
  },
};

interface IconProps {
  type: ActionType;
  className?: string;
}

export function ActionIcon({ type, className = 'h-4 w-4' }: IconProps) {
  const props = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    'aria-hidden': true,
  };

  switch (type) {
    case 'water':
      return (
        <svg {...props}>
          <path d="M12 3.5c2.6 3 5.5 6.3 5.5 9.5a5.5 5.5 0 1 1-11 0c0-3.2 2.9-6.5 5.5-9.5z" />
          <path d="M9.5 13.5c0 1.6 1 2.7 2.5 2.9" opacity="0.55" />
        </svg>
      );
    case 'prune':
      return (
        <svg {...props}>
          <circle cx="6" cy="17" r="2.4" />
          <circle cx="18" cy="17" r="2.4" />
          <path d="M8.1 16 21 4M15.9 16 3 4" />
        </svg>
      );
    case 'fertilize':
      return (
        <svg {...props}>
          <path d="M12 5.5v-2M8.5 8 7 6.5M15.5 8 17 6.5" />
          <circle cx="9.5" cy="13" r="0.9" />
          <circle cx="14.5" cy="13" r="0.9" />
          <circle cx="12" cy="16" r="0.9" />
          <circle cx="8" cy="17.5" r="0.9" />
          <circle cx="16" cy="17.5" r="0.9" />
          <path d="M5 20.5h14" />
        </svg>
      );
    case 'plant':
      return (
        <svg {...props}>
          <path d="M12 21v-9" />
          <path d="M12 12c-2.6 0-5-2-5-5 2.6 0 5 2 5 5z" />
          <path d="M12 12c0-3 2.4-5.5 5.5-5.5 0 3-2.4 5.5-5.5 5.5z" />
          <path d="M5 21h14" />
        </svg>
      );
    case 'transplant':
      return (
        <svg {...props}>
          <path d="M12 12V6" />
          <path d="M12 6c-2 0-4-1.5-4-3.5 2 0 4 1.5 4 3.5z" />
          <path d="M12 6c0-2 1.6-4 4-4 0 2-1.6 4-4 4z" />
          <path d="M5 16h14l-1.5 5h-11L5 16z" />
          <path d="M9 12h6" />
        </svg>
      );
    case 'harvest':
      return (
        <svg {...props}>
          <path d="M4 11h16l-2 9.5H6L4 11z" />
          <path d="M8 11c0-3 2-5.5 4-5.5s4 2.5 4 5.5" />
          <path d="M12 5.5V3.5" />
        </svg>
      );
    case 'sow':
      return (
        <svg {...props}>
          <path d="M5 20.5h14" />
          <circle cx="8" cy="14.5" r="0.9" />
          <circle cx="12.5" cy="11" r="0.9" />
          <circle cx="16.5" cy="14.5" r="0.9" />
          <circle cx="10" cy="6.5" r="0.9" />
          <circle cx="14.5" cy="9" r="0.9" />
          <circle cx="6.5" cy="9.5" r="0.9" opacity="0.6" />
        </svg>
      );
    case 'mulch':
      return (
        <svg {...props}>
          <path d="M3 8c2-1 4-1 6 0s4 1 6 0 4-1 6 0" />
          <path d="M3 13c2-1 4-1 6 0s4 1 6 0 4-1 6 0" />
          <path d="M3 18c2-1 4-1 6 0s4 1 6 0 4-1 6 0" />
        </svg>
      );
    case 'treat':
      return (
        <svg {...props}>
          <path d="M12 3l8 3v5c0 4.8-3.5 8.4-8 9.8-4.5-1.4-8-5-8-9.8V6l8-3z" />
          <path d="M9.5 11.5l1.8 1.8 3.5-3.5" />
        </svg>
      );
    case 'inspect':
      return (
        <svg {...props}>
          <circle cx="11" cy="11" r="6" />
          <path d="M15.5 15.5 20 20" />
        </svg>
      );
    case 'custom':
    default:
      return (
        <svg {...props}>
          <path d="M5 21c4-3 8-3 12-9 0-4-3-7-7-7-3 0-5 2-5 5s2 5 4 5" />
          <path d="M5 21c1-2 3-4 6-5" opacity="0.6" />
        </svg>
      );
  }
}
