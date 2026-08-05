export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex items-center ${compact ? "flex-row gap-2" : "flex-col gap-2"}`}>
      <div
        className={`flex items-center justify-center rounded-2xl bg-brand-600 font-bold text-white shadow-lg shadow-brand-600/25 ${
          compact ? "h-9 w-9 text-sm" : "h-14 w-14 text-xl"
        }`}
      >
        CC
      </div>
      <h1
        className={`font-bold tracking-tight text-slate-900 ${
          compact ? "text-lg" : "text-2xl"
        }`}
      >
        CampusCommute
      </h1>
    </div>
  );
}
