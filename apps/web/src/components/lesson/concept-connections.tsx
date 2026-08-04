import Link from "next/link";
import { Waypoints, CheckCircle2, Circle, ArrowRight } from "lucide-react";
import type { ConceptConnection } from "@/lib/api";

function ConceptList({ courseId, items }: { courseId: string; items: ConceptConnection[] }) {
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((item) => (
        <li key={item.id}>
          <Link
            href={`/dashboard/${courseId}/lessons/${item.slug}`}
            className="flex items-center gap-2 rounded-lg px-1.5 py-1 text-sm transition-colors hover:bg-accent/50 hover:text-brand-indigo"
          >
            {item.is_completed ? (
              <CheckCircle2 className="size-3.5 shrink-0 text-brand-emerald" />
            ) : (
              <Circle className="size-3.5 shrink-0 text-muted-foreground/40" />
            )}
            <span className="truncate">{item.title}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function ConceptConnections({
  courseId,
  related,
  unlocks,
}: {
  courseId: string;
  related: ConceptConnection[];
  unlocks: ConceptConnection[];
}) {
  if (related.length === 0 && unlocks.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <Waypoints className="size-4 text-brand-electric" />
        <p className="text-sm font-semibold">How this connects to what you&rsquo;ve learned</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {related.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Related concepts</p>
            <ConceptList courseId={courseId} items={related} />
          </div>
        )}
        {unlocks.length > 0 && (
          <div>
            <p className="mb-1.5 flex items-center gap-1 text-xs font-medium text-muted-foreground">
              Unlocks next
              <ArrowRight className="size-3" />
            </p>
            <ConceptList courseId={courseId} items={unlocks} />
          </div>
        )}
      </div>
    </div>
  );
}
