// Next.js build only (next.config.ts). The Vite build runs Tailwind through
// @tailwindcss/vite and ignores this file (vite.config.ts sets an inline config).
export default {
  plugins: { "@tailwindcss/postcss": {} },
};
