import { cn } from "@/lib/utils";

/** Soft, decorative ambient gradient — used behind hero/onboarding surfaces. Purely visual, aria-hidden. */
export function GradientMesh({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 -z-10 overflow-hidden",
        className
      )}
    >
      <div className="absolute -top-40 -left-32 h-[32rem] w-[32rem] rounded-full bg-brand-indigo/25 blur-[120px] dark:bg-brand-indigo/20 animate-float" />
      <div
        className="absolute top-1/3 -right-24 h-[28rem] w-[28rem] rounded-full bg-brand-electric/20 blur-[120px] dark:bg-brand-electric/15 animate-float"
        style={{ animationDelay: "-2s" }}
      />
      <div
        className="absolute bottom-[-8rem] left-1/4 h-[24rem] w-[24rem] rounded-full bg-brand-purple/15 blur-[110px] dark:bg-brand-purple/12 animate-float"
        style={{ animationDelay: "-4s" }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,var(--border)_1px,transparent_0)] [background-size:32px_32px] opacity-[0.35] dark:opacity-[0.15]" />
    </div>
  );
}
