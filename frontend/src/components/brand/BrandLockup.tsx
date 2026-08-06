import Link from "next/link";
import { BrandLogo } from "./BrandLogo";
import { BrandWordmark } from "./BrandWordmark";

type BrandLockupProps = {
  compact?: boolean;
  href?: string;
  className?: string;
};

export function BrandLockup({ compact = false, href, className = "" }: BrandLockupProps) {
  const content = (
    <div
      className={`flex items-center ${compact ? "gap-2.5" : "flex-col gap-3"} ${className}`}
    >
      <BrandLogo size={compact ? 28 : 40} className="shrink-0 text-navy" />
      <div className={compact ? "" : "text-center"}>
        <BrandWordmark size={compact ? "sm" : "lg"} />
        {!compact && (
          <p className="mt-1 text-body-md text-on-variant">Where GIM moves together.</p>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex transition-opacity hover:opacity-90">
        {content}
      </Link>
    );
  }

  return content;
}
