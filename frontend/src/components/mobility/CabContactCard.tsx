import type { CabService } from "@/data/cab-services";
import { Avatar } from "@/components/ui/Avatar";

type CabContactCardProps = {
  contact: CabService;
};

export function CabContactCard({ contact }: CabContactCardProps) {
  return (
    <article className="cab-contact-card">
      <Avatar name={contact.name} />
      <div className="min-w-0 flex-1">
        <h2 className="text-body-lg font-semibold text-on-surface">{contact.name}</h2>
        <div className="mt-1.5 flex flex-col gap-0.5">
          {contact.phones.map((phone) => (
            <a
              key={phone}
              href={`tel:+91${phone}`}
              className="text-body-md text-on-variant transition-colors hover:text-emerald-dark"
            >
              {phone}
            </a>
          ))}
        </div>
      </div>
    </article>
  );
}
