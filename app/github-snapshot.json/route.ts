import { captureGithubSnapshot } from "@/lib/github-data";

/**
 * `virtual:github-snapshot-url` in the Vite build (scripts/github-snapshot-plugin.ts):
 * the GitHub panels' data, captured once at build time so a visitor whose own GitHub
 * calls fail still sees it, labelled with its capture time. `null` when GitHub did
 * not answer, which the panels treat as no snapshot. GITHUB_TOKEN raises the
 * build's rate limit; it never reaches the output.
 */
export const dynamic = "force-static";

const authorized: typeof fetch = (input, init) => {
  const token = process.env.GITHUB_TOKEN;
  const url = String(input instanceof Request ? input.url : input);
  if (!token || !url.startsWith("https://api.github.com/")) return fetch(input, init);
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);
  return fetch(input, { ...init, headers });
};

export async function GET() {
  const payload = await captureGithubSnapshot(authorized);
  console.info(
    payload
      ? `[github-snapshot] captured ${payload.repos.length} repos, ${payload.readmes.length} READMEs`
      : "[github-snapshot] GitHub did not answer; building without a snapshot",
  );
  return Response.json(payload);
}
