/** Maps a doc nav id to its /docs slug. */
export function docHref(id: string) {
  return id === "intro" ? "getting-started" : id;
}
