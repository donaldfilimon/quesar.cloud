/**
 * Asset imports for the main typecheck (src/, scripts/, e2e/, vitest). The Next
 * program (tsconfig.next.json, which excludes this file) gets them from Next's own
 * types instead; declaring both would collide.
 */
declare module "*.css";
declare module "*.svg" {
  /** Next.js imports images as `{ src, width, height }` (see src/cinematic/design/mark.ts). */
  const asset: string | { src: string; width: number; height: number };
  export default asset;
}
