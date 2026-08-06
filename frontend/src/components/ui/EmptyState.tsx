import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
};

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-muted text-on-variant">
        <Icon className="h-6 w-6" aria-hidden />
      </div>
      <h2 className="mt-4 text-title-lg text-on-surface">{title}</h2>
      {description && <p className="mt-2 max-w-sm text-body-md text-on-variant">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
