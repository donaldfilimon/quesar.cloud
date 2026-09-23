/**
 * Content-Security-Policy builder (ported from mlai `src/lib/csp.ts`).
 *
 * Shipped as `Content-Security-Policy-Report-Only` (see `src/start.ts`), not
 * enforced. The allowlist was curated for mlai's Next app; reports to
 * `/api/csp-report` show what enforcing would break, so flip to enforcing only
 * once that stream is quiet.
 *
 * Deviations from mlai:
 * - `frame-ancestors 'self'` is declared for when the policy is enforced
 *   (browsers ignore it in report-only);
 * - no `upgrade-insecure-requests` (also ignored in report-only);
 * - `storage.googleapis.com` in connect-src for the /tf-pose-demo PoseNet weights;
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
 * - fonts: all self-hosted (fontsource), so no font origin is allowed.
 * - challenges.cloudflare.com (script, frame, connect): the Turnstile widget.
 *
 * Extend the specific directive when a surface gains a new external origin;
 * never widen to a bare https: wildcard.
 */

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
    // PoseNet weights for /tf-pose-demo (@tensorflow-models/posenet default model URL).
    "https://storage.googleapis.com",
    TURNSTILE,
    ...(dev ? ["ws:", "wss:"] : []),
  ].join(" ");

  return [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    "img-src 'self' data: blob: https://avatars.githubusercontent.com",
    connectSrc,
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    `frame-src ${TURNSTILE}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    // `report-to` is current; `report-uri` is kept because Safari and older
    // Firefox only implement that one.
    "report-to csp-endpoint",
    "report-uri /api/csp-report",
  ].join("; ");
}
