declare module "virtual:search-catalog-url" {
  const url: string;
  export default url;
}

/** Null outside the static build, or when GitHub did not answer at build time. */
declare module "virtual:github-snapshot-url" {
  const url: string | null;
  export default url;
}
