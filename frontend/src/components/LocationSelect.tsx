export type Location = {
  id: string;
  name: string;
  slug: string;
  category: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  campus: "Campus",
  airport: "Airports in Goa",
  railway: "Railway Stations in Goa",
  bus_stand: "Bus Stands in Goa",
};

const CATEGORY_ORDER = ["campus", "airport", "railway", "bus_stand", "other"];

export function groupLocations(locations: Location[]) {
  const groups = new Map<string, Location[]>();

  for (const loc of locations) {
    const list = groups.get(loc.category) ?? [];
    list.push(loc);
    groups.set(loc.category, list);
  }

  return CATEGORY_ORDER.filter((cat) => groups.has(cat)).map((category) => ({
    category,
    label: CATEGORY_LABELS[category] ?? category,
    locations: groups.get(category)!,
  }));
}

type LocationSelectProps = {
  id: string;
  label: string;
  value: string;
  onChange: (id: string) => void;
  locations: Location[];
  placeholder?: string;
  required?: boolean;
};

export function LocationSelect({
  id,
  label,
  value,
  onChange,
  locations,
  placeholder = "Select location",
  required = true,
}: LocationSelectProps) {
  const groups = groupLocations(locations);

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <select
        id={id}
        className="input-field"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      >
        <option value="">{placeholder}</option>
        {groups.map((group) => (
          <optgroup key={group.category} label={group.label}>
            {group.locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}

export function findLocation(locations: Location[], id: string) {
  return locations.find((loc) => loc.id === id);
}
