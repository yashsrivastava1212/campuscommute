type BrandWordmarkProps = {
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeClasses = {
  sm: "text-base",
  md: "text-xl",
  lg: "text-headline-md",
};

export function BrandWordmark({ size = "md", className = "" }: BrandWordmarkProps) {
  return (
    <span className={`font-semibold tracking-tight text-on-surface ${sizeClasses[size]} ${className}`}>
      Campus<span className="font-medium text-on-variant">Commute</span>
    </span>
  );
}
