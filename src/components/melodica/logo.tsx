import { cn } from "@/lib/utils";

export function MelodicaMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("melodica-mascot inline-flex h-12 w-12 shrink-0 items-center justify-center sm:h-14 sm:w-14", className)}
    >
      <img
        src="/melodica-logo.png"
        alt=""
        className="h-full w-full object-contain"
        draggable={false}
      />
    </span>
  );
}

export function MelodicaLogo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <MelodicaMark />
      <span className="font-display text-lg font-semibold tracking-tight text-ink">Melodica</span>
    </span>
  );
}
