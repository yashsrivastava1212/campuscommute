import { shortLocation } from "@/lib/format";

type RouteDisplayProps = {
  origin: string;
  destination: string;
  compact?: boolean;
  className?: string;
};

export function RouteDisplay({
  origin,
  destination,
  compact = false,
  className = "",
}: RouteDisplayProps) {
  return (
    <div className={`flex gap-3 ${className}`}>
      <div className="flex flex-col items-center pt-1">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald ring-2 ring-emerald/20" />
        <span className="my-1 w-0.5 flex-1 min-h-[20px] bg-gradient-to-b from-emerald/60 to-emerald/20" />
        <span className="h-2.5 w-2.5 shrink-0 rounded-full border-2 border-emerald bg-white" />
      </div>
      <div className={`flex flex-1 flex-col ${compact ? "gap-3" : "gap-5"}`}>
        <div>
          <p className={`font-medium text-on-surface ${compact ? "text-body-md" : "text-body-lg"}`}>
            {shortLocation(origin)}
          </p>
          {!compact && origin !== shortLocation(origin) && (
            <p className="mt-0.5 text-label-md text-muted">{origin}</p>
          )}
        </div>
        <div>
          <p className={`font-medium text-on-surface ${compact ? "text-body-md" : "text-body-lg"}`}>
            {shortLocation(destination)}
          </p>
          {!compact && destination !== shortLocation(destination) && (
            <p className="mt-0.5 text-label-md text-muted">{destination}</p>
          )}
        </div>
      </div>
    </div>
  );
}
