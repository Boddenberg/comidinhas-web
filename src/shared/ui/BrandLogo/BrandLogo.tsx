type BrandLogoProps = {
  size?: number
}

export function BrandLogo({ size = 44 }: BrandLogoProps) {
  return (
    <svg
      aria-hidden="true"
      height={size}
      viewBox="0 0 56 56"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="bl-pink" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#e07a96" />
          <stop offset="1" stopColor="#a33655" />
        </linearGradient>
        <linearGradient id="bl-blue" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#5b8def" />
          <stop offset="1" stopColor="#1f5fd6" />
        </linearGradient>
      </defs>

      <ellipse cx="20" cy="14" fill="url(#bl-pink)" rx="9" ry="11" transform="rotate(-22 20 14)" />
      <ellipse cx="36" cy="14" fill="url(#bl-pink)" rx="9" ry="11" transform="rotate(22 36 14)" />
      <ellipse cx="14" cy="28" fill="url(#bl-blue)" rx="11" ry="9" transform="rotate(-12 14 28)" />
      <ellipse cx="42" cy="28" fill="url(#bl-blue)" rx="11" ry="9" transform="rotate(12 42 28)" />
      <circle cx="28" cy="22" fill="#ffffff" r="6" />
      <circle cx="28" cy="22" fill="#1f5fd6" r="3.4" />

      <path
        d="M28 32 C 26 38, 26 44, 28 50 C 30 44, 30 38, 28 32 Z"
        fill="#3a8a5d"
      />
      <path
        d="M28 36 C 24 38, 22 42, 22 46"
        fill="none"
        stroke="#3a8a5d"
        strokeLinecap="round"
        strokeWidth="2"
      />
      <path
        d="M28 36 C 32 38, 34 42, 34 46"
        fill="none"
        stroke="#3a8a5d"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  )
}
