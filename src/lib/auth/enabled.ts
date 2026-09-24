/**
 * False only in the static Pages build, which has no auth server. Kept apart
 * from `./client` so code in the main bundle (route loaders) can read it without
 * pulling in the Better Auth browser client.
 */
export const authEnabled = import.meta.env.VITE_AUTH_ENABLED !== "false";
