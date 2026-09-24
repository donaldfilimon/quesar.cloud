/** Shown while a cinematic room's chunk loads. Same fixed overlay footprint as CinematicShell. */
export function CinematicFallback() {
  return (
    <div
      className="fixed inset-0 z-80 flex items-center justify-center bg-[#040406] font-mono text-xs tracking-0.2em text-white/60"
      role="status"
      aria-live="polite"
    >
      LOADING
    </div>
  );
}
