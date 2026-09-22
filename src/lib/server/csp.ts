/**
 * Content-Security-Policy builder (ported from mlai `src/lib/csp.ts`).
 *
 * Shipped as `Content-Security-Policy-Report-Only` (see `src/start.ts`), not
 * enforced. The allowlist was curated for mlai's Next app, and this app runs
 * inside the framed Grok preview with injected platform scripts, so an
 * enforced policy could break the preview or the "Created with Grok" pill
 * (AGENTS.md shell rule 2). Reports to `/api/csp-report` show what enforcing
 * would break; flip to enforcing only once that stream is quiet.
 *
 * Deviations from mlai:
 * - no `frame-ancestors`: the Grok preview frames this app, and browsers
 *   ignore the directive in report-only anyway;
 * - no `upgrade-insecure-requests` (also ignored in report-only);
 * - `https://grok.com` + `https://*.grok.com` in script/style/img/connect/frame,
 *   for the platform's injected extensions script;
 * - no `storage.googleapis.com`: nothing here loads PoseNet checkpoints;
 * - development adds `ws:`/`wss:` to connect-src for Vite HMR, besides the
 *   `'unsafe-eval'` mlai already allowed there.
 *
 * Directive rationale (the allowlist tracks the real runtime surface):
 * - 'unsafe-inline' script/style: TanStack Start's inline hydration payload
 *   and inline styles; there is no nonce middleware.
 * - 'wasm-unsafe-eval' + blob: workers + jsdelivr + huggingface: Kokoro TTS
 *   (`src/cinematic/film/kokoro-loader.ts`) imports kokoro.web.js from jsDelivr
 *   and pulls ONNX weights from Hugging Face.
 * - avatars.githubusercontent.com: team avatars (`src/lib/mlai/categories/team.ts`).
 * - fonts.googleapis.com / fonts.gstatic.com: the JetBrains Mono stylesheet.
 * - challenges.cloudflare.com (script, frame, connect): the Turnstile widget.
 *
 * Extend the specific directive when a surface gains a new external origin;
 * never widen to a bare https: wildcard.
 */

const GROK = ["https://grok.com", "https://*.grok.com"];
const TURNSTILE = "https://challenges.cloudflare.com";

export const CSP_HEADER = "Content-Security-Policy-Report-Only";
export const REPORTING_ENDPOINTS = 'csp-endpoint="/api/csp-report"';

export function buildCsp({ dev }: { dev: boolean }): string {
  const scriptSrc = [
    "script-src",
    "'self'",
    "'unsafe-inline'",
    "'wasm-unsafe-eval'",
    "blob:",
    "https://cdn.jsdelivr.net",
    TURNSTILE,
    ...GROK,
    // Vite dev evaluates strings (HMR); production bundles never eval. Kept
    // last so the dev and production script-src differ by one trailing token.
    ...(dev ? ["'unsafe-eval'"] : []),
  ].join(" ");

  const connectSrc = [
    "connect-src",
    "'self'",
    "data:",
    "blob:",
    "https://cdn.jsdelivr.net",
    "https://huggingface.co",
    "https://*.huggingface.co",
    "https://*.hf.co",
    "https://fonts.gstatic.com",
    "https://fonts.googleapis.com",
    TURNSTILE,
    ...GROK,
    ...(dev ? ["ws:", "wss:"] : []),
  ].join(" ");

  return [
    "default-src 'self'",
    scriptSrc,
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com ${GROK.join(" ")}`,
    "font-src 'self' data: https://fonts.gstatic.com",
    `img-src 'self' data: blob: https://avatars.githubusercontent.com ${GROK.join(" ")}`,
    connectSrc,
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    `frame-src ${TURNSTILE} ${GROK.join(" ")}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    // `report-to` is current; `report-uri` is kept because Safari and older
    // Firefox only implement that one.
    "report-to csp-endpoint",
    "report-uri /api/csp-report",
  ].join("; ");
}
