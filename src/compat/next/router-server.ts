/**
 * `@tanstack/react-router` in the react-server layers of the Next.js server build
 * (route handlers, proxy). Server route files only declare `server.handlers`, so
 * `createFileRoute` just keeps the options for `api-route.ts` to read. The client
 * router (./router.tsx) is a `"use client"` module and cannot be called here.
 */
export { notFound, redirect } from "next/navigation";

export function createFileRoute(id: string) {
  return (options: object) => ({ id, options });
}
