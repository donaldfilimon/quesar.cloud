/** Keep the persistent server from inheriting the Pages-only bypass. */
export function assertPersistentBuildMode(mode: string, staticFlag: string | undefined): void {
  if (mode === "persistent" && staticFlag === "true") {
    throw new Error("Persistent server build cannot use VITE_STATIC_SITE=true.");
  }
}
