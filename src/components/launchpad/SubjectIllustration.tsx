import React from 'react';

interface SubjectIllustrationProps {
  subjectId: string;
  accentHex?: string;
  customIconUrl?: string;
  isLocked?: boolean;
  className?: string;
}

export const LAUNCHPAD_ICON_OPTIONS: { id: string; label: string }[] = [
  { id: 'comm-public-speaking', label: 'Microphone & Waves' },
  { id: 'time-self-management', label: 'Precision Clock' },
  { id: 'digital-ai-literacy', label: 'Digital Lens' },
  { id: 'critical-thinking', label: 'Analytical Prism' },
  { id: 'emotional-intelligence', label: 'Equilibrium Rings' },
  { id: 'financial-literacy', label: 'Ledger Columns' },
  { id: 'collaboration-leadership', label: 'Triad Network' },
  { id: 'adaptability-resilience', label: 'Trajectory Compass' },
];

/**
 * Custom minimalist editorial vector illustrations for Launchpad subjects.
 * Supports built-in geometric SVGs or custom uploaded minimalist icons.
 */
export const SubjectIllustration: React.FC<SubjectIllustrationProps> = ({
  subjectId,
  accentHex = '#4F46E5',
  customIconUrl,
  isLocked = false,
  className = 'w-28 h-28',
}) => {
  if (customIconUrl) {
    return (
      <div
        className={`${className} rounded-2xl flex items-center justify-center overflow-hidden p-2`}
        style={{ backgroundColor: isLocked ? '#F1F5F9' : `${accentHex}14` }}
      >
        <img
          src={customIconUrl}
          alt=""
          className={`w-full h-full object-contain ${isLocked ? 'grayscale opacity-60' : ''}`}
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  const stroke = isLocked ? '#94A3B8' : '#0F172A';
  const accent = isLocked ? '#CBD5E1' : accentHex;
  const softFill = isLocked ? '#F1F5F9' : `${accentHex}18`;

  switch (subjectId) {
    case 'comm-public-speaking':
      // Minimalist editorial podium microphone & radiating sound waves
      return (
        <svg viewBox="0 0 120 120" fill="none" className={className} aria-hidden="true">
          <circle cx="60" cy="60" r="46" fill={softFill} />
          <path d="M84 36C91 43 95 51 95 60C95 69 91 77 84 84" stroke={accent} strokeWidth="2.5" strokeLinecap="round" />
          <path d="M92 28C101 37 106 48 106 60C106 72 101 83 92 92" stroke={accent} strokeWidth="2" strokeLinecap="round" opacity="0.55" />
          <rect x="46" y="28" width="24" height="38" rx="12" fill="#FFFFFF" stroke={stroke} strokeWidth="2.5" />
          <line x1="53" y1="40" x2="63" y2="40" stroke={accent} strokeWidth="2.5" strokeLinecap="round" />
          <line x1="53" y1="48" x2="63" y2="48" stroke={accent} strokeWidth="2.5" strokeLinecap="round" />
          <path d="M38 56C38 67.0457 46.9543 76 58 76C69.0457 76 78 67.0457 78 56" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" />
          <line x1="58" y1="76" x2="58" y2="92" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" />
          <line x1="44" y1="92" x2="72" y2="92" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );

    case 'time-self-management':
      // Architectural precision clock & structured block grid
      return (
        <svg viewBox="0 0 120 120" fill="none" className={className} aria-hidden="true">
          <circle cx="60" cy="60" r="46" fill={softFill} />
          <circle cx="60" cy="60" r="30" fill="#FFFFFF" stroke={stroke} strokeWidth="2.5" />
          <path d="M60 30A30 30 0 0 1 90 60" stroke={accent} strokeWidth="4" strokeLinecap="round" />
          <circle cx="60" cy="60" r="3.5" fill={accent} />
          <line x1="60" y1="60" x2="60" y2="41" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" />
          <line x1="60" y1="60" x2="74" y2="66" stroke={accent} strokeWidth="2.5" strokeLinecap="round" />
          <line x1="52" y1="22" x2="68" y2="22" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" />
          <line x1="60" y1="22" x2="60" y2="30" stroke={stroke} strokeWidth="2.5" />
        </svg>
      );

    case 'digital-ai-literacy':
      // Precision neural node matrix / structured digital lens
      return (
        <svg viewBox="0 0 120 120" fill="none" className={className} aria-hidden="true">
          <circle cx="60" cy="60" r="46" fill={softFill} />
          <rect x="30" y="34" width="60" height="52" rx="10" fill="#FFFFFF" stroke={stroke} strokeWidth="2.5" />
          <line x1="30" y1="48" x2="90" y2="48" stroke={stroke} strokeWidth="2" />
          <circle cx="40" cy="41" r="2" fill={stroke} />
          <circle cx="48" cy="41" r="2" fill={accent} />
          <circle cx="60" cy="66" r="10" stroke={accent} strokeWidth="2.5" />
          <line x1="45" y1="66" x2="50" y2="66" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" />
          <line x1="70" y1="66" x2="75" y2="66" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" />
          <line x1="60" y1="52" x2="60" y2="56" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" />
          <line x1="60" y1="76" x2="60" y2="80" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="60" cy="66" r="3" fill={accent} />
        </svg>
      );

    case 'critical-thinking':
      // Interlocking analytical prism & compass vector
      return (
        <svg viewBox="0 0 120 120" fill="none" className={className} aria-hidden="true">
          <circle cx="60" cy="60" r="46" fill={softFill} />
          <polygon points="60,26 92,84 28,84" fill="#FFFFFF" stroke={stroke} strokeWidth="2.5" strokeLinejoin="round" />
          <polygon points="60,46 76,76 44,76" fill={softFill} stroke={accent} strokeWidth="2.5" strokeLinejoin="round" />
          <circle cx="60" cy="66" r="3.5" fill={accent} />
          <line x1="20" y1="54" x2="36" y2="54" stroke={accent} strokeWidth="2.5" strokeLinecap="round" />
          <line x1="84" y1="50" x2="100" y2="44" stroke={accent} strokeWidth="2" strokeLinecap="round" />
          <line x1="86" y1="60" x2="102" y2="60" stroke={accent} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case 'emotional-intelligence':
      // Balanced concentric equilibrium rings & wave form
      return (
        <svg viewBox="0 0 120 120" fill="none" className={className} aria-hidden="true">
          <circle cx="60" cy="60" r="46" fill={softFill} />
          <circle cx="50" cy="60" r="22" fill="#FFFFFF" stroke={stroke} strokeWidth="2.5" />
          <circle cx="70" cy="60" r="22" fill="none" stroke={accent} strokeWidth="2.5" />
          <path d="M53 60C55.5 55 58 55 60 60C62 65 64.5 65 67 60" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="60" cy="34" r="3" fill={accent} />
          <circle cx="60" cy="86" r="3" fill={accent} />
        </svg>
      );

    case 'financial-literacy':
      // Minimalist ascending ledger columns & balance coin
      return (
        <svg viewBox="0 0 120 120" fill="none" className={className} aria-hidden="true">
          <circle cx="60" cy="60" r="46" fill={softFill} />
          <rect x="30" y="64" width="14" height="26" rx="3" fill="#FFFFFF" stroke={stroke} strokeWidth="2.5" />
          <rect x="53" y="50" width="14" height="40" rx="3" fill="#FFFFFF" stroke={stroke} strokeWidth="2.5" />
          <rect x="76" y="34" width="14" height="56" rx="3" fill={accent} fillOpacity="0.2" stroke={accent} strokeWidth="2.5" />
          <path d="M32 52L58 34L84 24" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="84" cy="24" r="4" fill={accent} />
        </svg>
      );

    case 'collaboration-leadership':
      // Connected triad network converging on a focal apex
      return (
        <svg viewBox="0 0 120 120" fill="none" className={className} aria-hidden="true">
          <circle cx="60" cy="60" r="46" fill={softFill} />
          <line x1="60" y1="36" x2="36" y2="78" stroke={stroke} strokeWidth="2.5" />
          <line x1="60" y1="36" x2="84" y2="78" stroke={stroke} strokeWidth="2.5" />
          <line x1="36" y1="78" x2="84" y2="78" stroke={stroke} strokeWidth="2.5" />
          <circle cx="60" cy="36" r="10" fill={accent} fillOpacity="0.22" stroke={accent} strokeWidth="2.5" />
          <circle cx="36" cy="78" r="9" fill="#FFFFFF" stroke={stroke} strokeWidth="2.5" />
          <circle cx="84" cy="78" r="9" fill="#FFFFFF" stroke={stroke} strokeWidth="2.5" />
          <circle cx="60" cy="63" r="4" fill={accent} />
        </svg>
      );

    case 'adaptability-resilience':
    default:
      // Forward trajectory arc & compass vector
      return (
        <svg viewBox="0 0 120 120" fill="none" className={className} aria-hidden="true">
          <circle cx="60" cy="60" r="46" fill={softFill} />
          <path d="M28 78C40 78 44 52 60 52C76 52 74 34 90 34" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" />
          <path d="M82 28L92 34L84 44" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="32" cy="78" r="5" fill="#FFFFFF" stroke={stroke} strokeWidth="2.5" />
          <circle cx="60" cy="52" r="5" fill="#FFFFFF" stroke={accent} strokeWidth="2.5" />
          <line x1="28" y1="90" x2="92" y2="90" stroke={stroke} strokeWidth="2" strokeDasharray="4 4" strokeLinecap="round" />
        </svg>
      );
  }
};
