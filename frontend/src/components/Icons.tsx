type IconProps = { className?: string }

const base = {
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

export function PinIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

export function PhoneIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.4-1.2a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2Z" />
    </svg>
  )
}

export function UsersIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M16 20v-1.5a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V20" />
      <circle cx="9" cy="7" r="3.2" />
      <path d="M22 20v-1.5a4 4 0 0 0-3-3.9" />
      <path d="M16.5 3.6a4 4 0 0 1 0 7" />
    </svg>
  )
}

export function FlagIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M7 21V3" />
      <path d="M7 4h9.5l-1.8 3.5L16.5 11H7" />
      <path d="M4.5 21h5" />
    </svg>
  )
}

export function CartIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M3 6h5l2.5 7H18" />
      <path d="M8 6v7" />
      <path d="M18 13V8h-4" />
      <circle cx="8.5" cy="18" r="1.9" />
      <circle cx="17" cy="18" r="1.9" />
    </svg>
  )
}

export function CalendarIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="3.5" y="5" width="17" height="16" rx="2.5" />
      <path d="M3.5 10h17" />
      <path d="M8.5 3v4M15.5 3v4" />
    </svg>
  )
}

export function ClockIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  )
}

export function ListIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="4" y="3.5" width="16" height="17" rx="2" />
      <path d="M8 8.5h8M8 12h8M8 15.5h5" />
    </svg>
  )
}

export function ChevronIcon({
  className,
  direction = 'down',
}: IconProps & { direction?: 'up' | 'down' | 'left' | 'right' }) {
  const rotation = { down: 0, up: 180, left: 90, right: -90 }[direction]
  return (
    <svg
      {...base}
      className={className}
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      <path d="M6 9.5l6 6 6-6" />
    </svg>
  )
}
