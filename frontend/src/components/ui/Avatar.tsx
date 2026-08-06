type AvatarProps = {
  name: string;
  size?: "sm" | "md";
};

export function Avatar({ name, size = "md" }: AvatarProps) {
  const initial = (name.trim()[0] ?? "S").toUpperCase();
  const sizeClass = size === "sm" ? "h-8 w-8 text-label-md" : "h-9 w-9 text-body-md";

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-navy font-medium text-white ${sizeClass}`}
      aria-hidden
    >
      {initial}
    </div>
  );
}
