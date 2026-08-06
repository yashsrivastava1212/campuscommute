import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { formatRideDate, formatRideTime, seatsLabel } from "@/lib/format";
import { RouteDisplay } from "./RouteDisplay";

type RideCardProps = {
  origin: string;
  destination: string;
  departureAt: string;
  seatsAvailable: number;
  totalSeats: number;
  href?: string;
  hostName?: string;
  className?: string;
};

export function RideCard({
  origin,
  destination,
  departureAt,
  seatsAvailable,
  href,
  hostName,
  className = "",
}: RideCardProps) {
  const full = seatsAvailable <= 0;
  const content = (
    <>
      <div className="flex items-start justify-between gap-4">
        <span className="text-label-md font-medium tracking-wide text-on-variant">
          {formatRideDate(departureAt)}
        </span>
        <span
          className={`rounded-full px-2.5 py-0.5 text-label-md font-medium ${
            full
              ? "bg-surface-muted text-muted"
              : "bg-emerald-light text-emerald-dark ring-1 ring-emerald/15"
          }`}
        >
          {seatsLabel(seatsAvailable)}
        </span>
      </div>

      <p className="mt-3 text-2xl font-semibold tracking-tight text-on-surface">
        {formatRideTime(departureAt)}
      </p>

      <div className="mt-5">
        <RouteDisplay origin={origin} destination={destination} compact />
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-border/60 pt-4">
        {hostName ? (
          <p className="text-body-md text-on-variant">
            Hosted by <span className="font-medium text-on-surface">{hostName}</span>
          </p>
        ) : (
          <span />
        )}
        {href && (
          <span className="inline-flex items-center gap-1 text-body-md font-medium text-navy transition-colors group-hover:text-emerald-dark">
            View ride
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        )}
      </div>
    </>
  );

  const cardClass = `ride-card group block ${className}`;

  if (href) {
    return (
      <Link href={href} className={cardClass}>
        {content}
      </Link>
    );
  }

  return <article className={cardClass}>{content}</article>;
}
