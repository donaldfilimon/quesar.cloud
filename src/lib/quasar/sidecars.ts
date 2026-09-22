// Ported from mlai `apps/mlai/lib/sidecars.ts` at b6f3686. A health probe only:
// it fetches the URL with a short timeout and never starts anything.
export async function probeSidecar(url: string): Promise<"available" | "unavailable"> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(1500) });
    return response.ok ? "available" : "unavailable";
  } catch {
    return "unavailable";
  }
}
