interface IconProps {
  className?: string;
  active?: boolean;
}

export function ShieldLifeSvg({ className = 'w-6 h-6', active = true }: IconProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
      style={{ opacity: active ? 1 : 0.25, filter: active ? 'none' : 'grayscale(100%)' }}
    >
      <path
        d="M16 3L5 7.5V15.2C5 22.1 9.7 27.6 16 29.5C22.3 27.6 27 22.1 27 15.2V7.5L16 3Z"
        fill={active ? '#0284c7' : '#334155'}
        stroke={active ? '#7dd3fc' : '#64748b'}
        strokeWidth="2"
      />
      <path
        d="M16 8.5L17.9 12.6L22.4 13.1L19 16.2L19.9 20.6L16 18.4L12.1 20.6L13 16.2L9.6 13.1L14.1 12.6L16 8.5Z"
        fill={active ? '#facc15' : '#94a3b8'}
      />
    </svg>
  );
}

export function Coin5CSvg({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 36 36" fill="none" className={className} aria-hidden="true">
      <circle cx="18" cy="18" r="16" fill="#EAB308" stroke="#92400E" strokeWidth="2.5" />
      <circle cx="18" cy="18" r="12.5" stroke="#FEF08A" strokeWidth="1.5" />
      <text
        x="18"
        y="22.5"
        textAnchor="middle"
        fill="#451A03"
        fontSize="13"
        fontWeight="800"
        fontFamily="Barlow Condensed, sans-serif"
      >
        5¢
      </text>
    </svg>
  );
}
