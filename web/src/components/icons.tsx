// Minimalist line icons — 24×24 viewBox
import React from "react";

type Props = { className?: string; size?: number; strokeWidth?: number };

const base = (
  size: number = 16,
  strokeWidth: number = 1.7
): React.SVGAttributes<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

export const IconPanel = ({ className, size, strokeWidth }: Props) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <rect x="3" y="3" width="7" height="9" rx="1" />
    <rect x="14" y="3" width="7" height="5" rx="1" />
    <rect x="14" y="12" width="7" height="9" rx="1" />
    <rect x="3" y="16" width="7" height="5" rx="1" />
  </svg>
);

export const IconCow = ({ className, size, strokeWidth }: Props) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M4 10c0-2 1.5-4 4-4h8c2.5 0 4 2 4 4v3a5 5 0 0 1-5 5h-6a5 5 0 0 1-5-5z" />
    <path d="M8 14h.01M16 14h.01" />
    <path d="M10 18v2M14 18v2" />
    <path d="M5 6l-2-2M19 6l2-2" />
  </svg>
);

export const IconPasture = ({ className, size, strokeWidth }: Props) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M3 20h18" />
    <path d="M5 20c0-3 1-6 2-9M8 20c0-4 1-8 2-11M12 20V6M15 20c-.5-4-1-7-2-10M18 20c-.5-3 0-6 1-9" />
  </svg>
);

export const IconHealth = ({ className, size, strokeWidth }: Props) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M8 4h8l-2 5h3l-8 11 2-8H8z" />
  </svg>
);

export const IconRepro = ({ className, size, strokeWidth }: Props) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <circle cx="12" cy="12" r="7" />
    <path d="M12 5v14M5 12h14" strokeDasharray="2 2" opacity="0.4" />
    <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" />
  </svg>
);

/** Lotes de aves y cerdos: un huevo con su línea de postura. */
export const IconLote = ({ className, size, strokeWidth }: Props) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M12 3c3.5 0 6.5 5 6.5 10a6.5 6.5 0 0 1-13 0C5.5 8 8.5 3 12 3z" />
    <path d="M8.5 14.5c1.2 1 2.2 1.4 3.5 1.4s2.3-.4 3.5-1.4" />
  </svg>
);

export const IconMilk =({ className, size, strokeWidth }: Props) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M9 3h6l-1 3c1.5.6 2.5 2 2.5 3.7V19a2 2 0 0 1-2 2h-5a2 2 0 0 1-2-2V9.7c0-1.7 1-3.1 2.5-3.7z" />
    <path d="M9 12h6" />
  </svg>
);

export const IconScale = ({ className, size, strokeWidth }: Props) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M12 3v18" />
    <path d="M5 21h14" />
    <path d="M8 7h8" />
    <path d="M6 12l2-5 2 5a2 2 0 0 1-4 0z" />
    <path d="M14 12l2-5 2 5a2 2 0 0 1-4 0z" />
  </svg>
);

export const IconMoney = ({ className, size, strokeWidth }: Props) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <rect x="3" y="6" width="18" height="12" rx="1.5" />
    <circle cx="12" cy="12" r="2.5" />
    <path d="M6 9h.01M18 15h.01" />
  </svg>
);

export const IconPlus = ({ className, size, strokeWidth }: Props) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const IconArrowUp = ({ className, size, strokeWidth }: Props) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M7 14l5-5 5 5" />
  </svg>
);

export const IconArrowDown = ({ className, size, strokeWidth }: Props) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M7 10l5 5 5-5" />
  </svg>
);

export const IconCalendar = ({ className, size, strokeWidth }: Props) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <rect x="3" y="5" width="18" height="16" rx="1.5" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </svg>
);

export const IconRefresh = ({ className, size, strokeWidth }: Props) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
    <path d="M3 21v-5h5" />
  </svg>
);

export const IconTask = ({ className, size, strokeWidth }: Props) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <path d="M8 12l3 3 5-6" />
  </svg>
);

export const IconBox = ({ className, size, strokeWidth }: Props) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M3 8l9-5 9 5v8l-9 5-9-5z" />
    <path d="M3 8l9 5 9-5" />
    <path d="M12 13v8" />
  </svg>
);

export const IconUser = ({ className, size, strokeWidth }: Props) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </svg>
);

export const IconLock = ({ className, size, strokeWidth }: Props) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <rect x="4" y="10" width="16" height="10" rx="2" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
  </svg>
);

export const IconLogout = ({ className, size, strokeWidth }: Props) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
    <path d="M10 17l-5-5 5-5" />
    <path d="M15 12H5" />
  </svg>
);

export const IconCheck = ({ className, size, strokeWidth }: Props) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M5 13l4 4L19 7" />
  </svg>
);

export const IconAlert = ({ className, size, strokeWidth }: Props) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M12 3l10 18H2z" />
    <path d="M12 10v5M12 18h.01" />
  </svg>
);

export const IconMenu = ({ className, size, strokeWidth }: Props) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

export const IconClose = ({ className, size, strokeWidth }: Props) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M6 6l12 12M18 6l-12 12" />
  </svg>
);

export const IconDots = ({ className, size, strokeWidth }: Props) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
    <circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none" />
  </svg>
);

export const IconHome = ({ className, size, strokeWidth }: Props) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z" />
  </svg>
);

export const IconBell = ({ className, size, strokeWidth }: Props) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M6 8a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6z" />
    <path d="M10 20a2 2 0 0 0 4 0" />
  </svg>
);

export const IconSparkles = ({ className, size, strokeWidth }: Props) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z" />
    <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" />
  </svg>
);

export const IconFile = ({ className, size, strokeWidth }: Props) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5" />
    <path d="M9 13h6M9 17h6" />
  </svg>
);

export const IconEye = ({ className, size, strokeWidth }: Props) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const IconEyeOff = ({ className, size, strokeWidth }: Props) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M10.6 5.1A10.9 10.9 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.2" />
    <path d="M6.6 6.6C3.6 8.5 2 12 2 12s3.5 7 10 7a9.8 9.8 0 0 0 5.4-1.6" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    <path d="M3 3l18 18" />
  </svg>
);
