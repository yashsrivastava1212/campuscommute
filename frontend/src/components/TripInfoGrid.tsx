import { RouteDisplay } from "@/components/mobility/RouteDisplay";
import { formatRideDate, formatRideTime, seatsLabel } from "@/lib/format";

type TripInfoGridProps = {
  origin: string;
  destination: string;
  departureAt: string;
  seatsAvailable: number;
  totalSeats: number;
  status?: string;
};

/** Journey summary — replaces database-style field boxes */
export function TripInfoGrid({
  origin,
  destination,
  departureAt,
  seatsAvailable,
  status,
}: TripInfoGridProps) {
  const full = seatsAvailable <= 0;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <span className="text-label-md font-medium tracking-wide text-on-variant">
          {formatRideDate(departureAt)}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          {status && (
            <span className="badge-member">{status}</span>
          )}
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
      </div>

      <p className="mt-3 text-2xl font-semibold tracking-tight text-on-surface">
        {formatRideTime(departureAt)}
      </p>

      <div className="mt-5">
        <RouteDisplay origin={origin} destination={destination} />
      </div>
    </div>
  );
}

export { shortLocation, formatRideDate as formatDepartureDate } from "@/lib/format";
