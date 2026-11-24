import { cn } from "@/lib/utils";

export function MelodicaMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("melodica-mascot inline-flex h-10 w-10 shrink-0 items-center justify-center sm:h-11 sm:w-11", className)}
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
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <MelodicaMark />
      <span className="font-display text-[21px] font-bold tracking-[-0.045em] text-ink">Melodica</span>
    </span>
  );
}
