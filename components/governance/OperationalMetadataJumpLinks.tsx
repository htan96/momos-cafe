import Link from "next/link";
import { buildOperationalMetadataJumpLinks } from "@/lib/operations/operationalContextLinks";

export default function OperationalMetadataJumpLinks({
  metadata,
  className,
}: {
  metadata: unknown;
  className?: string;
}) {
  const links = buildOperationalMetadataJumpLinks(metadata);
  if (links.length === 0) return null;

  return (
    <div className={className ?? "flex flex-wrap gap-x-3 gap-y-1 mt-2"}>
      {links.map((l) => (
        <Link
          key={`${l.href}-${l.label}`}
          href={l.href}
          className="text-[11px] font-semibold text-teal-dark underline-offset-2 hover:underline"
        >
          {l.label}
        </Link>
      ))}
    </div>
  );
}
