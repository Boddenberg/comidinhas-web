import type { ReactElement, SVGProps } from 'react'

type IconName =
  | 'home'
  | 'search'
  | 'heart'
  | 'heart-filled'
  | 'bookmark'
  | 'sparkles'
  | 'trophy'
  | 'clock'
  | 'user'
  | 'settings'
  | 'sun'
  | 'pin'
  | 'bell'
  | 'chevron-down'
  | 'chevron-right'
  | 'star'
  | 'plus'
  | 'check'
  | 'wallet'
  | 'cloud-sun'
  | 'calendar'
  | 'robot'
  | 'x'
  | 'bolt'
  | 'arrow-right'

type IconProps = SVGProps<SVGSVGElement> & {
  name: IconName
  size?: number | string
}

const paths: Record<IconName, ReactElement> = {
  home: (
    <path
      d="M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1v-8.5Z"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  search: (
    <>
      <circle cx={11} cy={11} r={6.5} fill="none" stroke="currentColor" strokeWidth={1.7} />
      <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" />
    </>
  ),
  heart: (
    <path
      d="M12 20s-7-4.35-7-9.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 7 3.5C19 15.65 12 20 12 20Z"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinejoin="round"
    />
  ),
  'heart-filled': (
    <path
      d="M12 20s-7-4.35-7-9.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 7 3.5C19 15.65 12 20 12 20Z"
      fill="currentColor"
    />
  ),
  bookmark: (
    <path
      d="M6 4h12v17l-6-3.5L6 21V4Z"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinejoin="round"
    />
  ),
  sparkles: (
    <>
      <path
        d="M12 3.5 13.6 8 18 9.6 13.6 11.2 12 15.7 10.4 11.2 6 9.6 10.4 8 12 3.5Z"
        fill="currentColor"
      />
      <path d="M18.5 15.5 19.3 17.7 21.5 18.5 19.3 19.3 18.5 21.5 17.7 19.3 15.5 18.5 17.7 17.7 18.5 15.5Z" fill="currentColor" />
    </>
  ),
  trophy: (
    <path
      d="M7 4h10v3a5 5 0 0 1-5 5 5 5 0 0 1-5-5V4Zm0 0H4v2a3 3 0 0 0 3 3m10-5h3v2a3 3 0 0 1-3 3M9 19h6m-3-7v7"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  clock: (
    <>
      <circle cx={12} cy={12} r={8} fill="none" stroke="currentColor" strokeWidth={1.7} />
      <path d="M12 8v4.5l3 2" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" />
    </>
  ),
  user: (
    <>
      <circle cx={12} cy={8.5} r={3.5} fill="none" stroke="currentColor" strokeWidth={1.7} />
      <path
        d="M5 20a7 7 0 0 1 14 0"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.7}
        strokeLinecap="round"
      />
    </>
  ),
  settings: (
    <>
      <circle cx={12} cy={12} r={2.8} fill="none" stroke="currentColor" strokeWidth={1.7} />
      <path
        d="M12 3v2.4M12 18.6V21M4.2 7.5l2 1.2M17.8 15.3l2 1.2M3 12h2.4M18.6 12H21M4.2 16.5l2-1.2M17.8 8.7l2-1.2"
        stroke="currentColor"
        strokeWidth={1.7}
        strokeLinecap="round"
      />
    </>
  ),
  sun: (
    <>
      <circle cx={12} cy={12} r={4} fill="currentColor" />
      <path
        d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </>
  ),
  'cloud-sun': (
    <>
      <circle cx={8} cy={9} r={3} fill="currentColor" />
      <path
        d="M8 3.5v1.4M8 13.1v1.4M2.5 9h1.4M12.1 9h1.4M4.4 5.4l1 1M11.6 12.6l-1-1M4.4 12.6l1-1M11.6 5.4l-1 1"
        stroke="currentColor"
        strokeWidth={1.4}
        strokeLinecap="round"
      />
      <path
        d="M11 19h7a3 3 0 0 0 0-6 4 4 0 0 0-7.5-1"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
    </>
  ),
  pin: (
    <>
      <path
        d="M12 21s-6-5.5-6-11a6 6 0 1 1 12 0c0 5.5-6 11-6 11Z"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.7}
        strokeLinejoin="round"
      />
      <circle cx={12} cy={10} r={2.4} fill="none" stroke="currentColor" strokeWidth={1.7} />
    </>
  ),
  bell: (
    <path
      d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2H4.5L6 16Zm4 3.5a2 2 0 0 0 4 0"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  'chevron-down': (
    <path
      d="m6 9 6 6 6-6"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  'chevron-right': (
    <path
      d="m9 6 6 6-6 6"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  star: (
    <path
      d="m12 4 2.6 5.3 5.9.85-4.25 4.15 1 5.85L12 17.5 6.75 20.15l1-5.85L3.5 10.15l5.9-.85L12 4Z"
      fill="currentColor"
    />
  ),
  plus: (
    <path
      d="M12 5v14M5 12h14"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
    />
  ),
  check: (
    <path
      d="m5 12 4.5 4.5L19 7"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  wallet: (
    <path
      d="M4 8a2 2 0 0 1 2-2h12v3H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h13a1 1 0 0 0 1-1V9H6m11 4h2"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  calendar: (
    <>
      <rect x={4} y={5} width={16} height={15} rx={2} fill="none" stroke="currentColor" strokeWidth={1.7} />
      <path d="M4 10h16M9 3v4M15 3v4" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" />
    </>
  ),
  robot: (
    <>
      <rect x={4} y={7} width={16} height={12} rx={3} fill="none" stroke="currentColor" strokeWidth={1.7} />
      <circle cx={9} cy={13} r={1.4} fill="currentColor" />
      <circle cx={15} cy={13} r={1.4} fill="currentColor" />
      <path d="M12 4v3M9 19v2M15 19v2" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" />
    </>
  ),
  x: (
    <path
      d="M6 6 18 18M6 18 18 6"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
    />
  ),
  bolt: (
    <path
      d="M13 3 4 14h6l-1 7 9-11h-6l1-7Z"
      fill="currentColor"
    />
  ),
  'arrow-right': (
    <path
      d="M5 12h14m-5-5 5 5-5 5"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
}

export function Icon({ name, size = 20, ...rest }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
      {...rest}
    >
      {paths[name]}
    </svg>
  )
}
