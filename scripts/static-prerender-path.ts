/** Query and fragment variants share the canonical pathname's output file. */
export function staticPrerenderPath(path: string): boolean {
  return (
    !path.includes("?") &&
    !path.includes("#") &&
    !path.startsWith("/media/") &&
    !path.startsWith("/api/") &&
    !path.startsWith("/_serverFn")
  );
}
