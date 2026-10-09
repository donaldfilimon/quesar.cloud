import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

// Next 16 removed `next lint`; this is the flat config it recommends.
const config = [
  ...nextVitals,
  ...nextTypeScript,
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts"] },
];

export default config;
