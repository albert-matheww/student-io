import { Lightbulb, AlertTriangle, FlaskConical, Sparkles } from "lucide-react";
import type { NoteBlock } from "@/lib/api";
import { cn } from "@/lib/utils";

const CALLOUT_STYLES = {
  tip: { icon: Lightbulb, cls: "border-brand-emerald/30 bg-brand-emerald/5 text-brand-emerald" },
  warning: { icon: AlertTriangle, cls: "border-brand-amber/30 bg-brand-amber/5 text-brand-amber" },
  example: { icon: FlaskConical, cls: "border-brand-electric/30 bg-brand-electric/5 text-brand-electric" },
  mnemonic: { icon: Sparkles, cls: "border-brand-purple/30 bg-brand-purple/5 text-brand-purple" },
} as const;

export function NoteBlockView({ block }: { block: NoteBlock }) {
  switch (block.type) {
    case "definition":
      return (
        <div className="rounded-2xl border border-border bg-accent/40 p-4">
          <p className="text-xs font-semibold tracking-wide text-brand-indigo uppercase">{block.term}</p>
          <p className="mt-1 text-sm leading-relaxed text-foreground/90">{block.text}</p>
        </div>
      );

    case "paragraph":
      return <p className="text-sm leading-relaxed text-foreground/90">{block.text}</p>;

    case "bullets":
      return (
        <div>
          {block.title && <p className="mb-2 text-sm font-semibold">{block.title}</p>}
          <ul className="flex flex-col gap-1.5">
            {block.items.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-foreground/90">
                <span className="mt-2 size-1 shrink-0 rounded-full bg-brand-indigo" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      );

    case "callout": {
      const style = CALLOUT_STYLES[block.variant];
      const Icon = style.icon;
      return (
        <div className={cn("flex gap-3 rounded-2xl border p-4", style.cls)}>
          <Icon className="size-4 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold">{block.title}</p>
            <p className="mt-0.5 text-sm leading-relaxed text-foreground/80">{block.text}</p>
          </div>
        </div>
      );
    }

    case "table":
      return (
        <div className="overflow-hidden rounded-2xl border border-border">
          {block.title && (
            <p className="border-b border-border bg-muted/50 px-4 py-2 text-xs font-semibold">{block.title}</p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {block.headers.map((h) => (
                    <th key={h} className="px-4 py-2 text-left font-semibold text-muted-foreground">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    {row.map((cell, j) => (
                      <td key={j} className="px-4 py-2 text-foreground/90">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );

    default:
      return null;
  }
}
