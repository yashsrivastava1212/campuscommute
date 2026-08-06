type BrandLogoProps = {
  size?: number;
  className?: string;
  variant?: "default" | "light";
};

/** Converging routes — two paths meeting at a shared destination */
export function BrandLogo({ size = 32, className = "", variant = "default" }: BrandLogoProps) {
  const accent = variant === "light" ? "#10B981" : "#10B981";
  const stroke = variant === "light" ? "#FFFFFF" : "#0F172A";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <circle cx="7" cy="9" r="2.5" fill={accent} />
      <circle cx="7" cy="23" r="2.5" fill={accent} />
      <circle cx="25" cy="16" r="3" fill={accent} />
      <path
        d="M9.5 9 C13.5 8.5 17.5 10.5 21.5 14"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M9.5 23 C13.5 23.5 17.5 21.5 21.5 18"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
