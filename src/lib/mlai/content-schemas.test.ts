import { describe, expect, it } from "vitest";
import type { ZodType } from "zod";
import { about } from "./categories/about";
import { blog } from "./categories/blog";
import { changelog } from "./categories/changelog";
import { docs } from "./categories/docs";
import { faq } from "./categories/faq";
import { industries } from "./categories/industries";
import { platform, runtime } from "./categories/platform";
import { products } from "./categories/products";
import { projects } from "./categories/projects";
import { research } from "./categories/research";
import { refusals, services } from "./categories/services";
import { stats } from "./categories/stats";
import { team } from "./categories/team";
import {
  AboutSchema,
  BlogSchema,
  ChangelogSchema,
  DocsSchema,
  FAQSchema,
  IndustriesSchema,
  PlatformSchema,
  ProductsSchema,
  ProjectsSchema,
  RefusalsSchema,
  ResearchSchema,
  RuntimeSchema,
  ServicesSchema,
  StatsSchema,
  TeamSchema,
} from "./schemas";

// The content modules export plain typed data and never call zod at runtime,
// so zod and the schemas stay out of the client bundle. Validation lives here
// instead. Parsing must also be a no-op: several schemas carry `.default([])`
// and zod strips unknown keys, so a dataset that parses to something other
// than itself would render differently from what the schema describes.
const datasets: [string, ZodType, unknown][] = [
  ["about", AboutSchema, about],
  ["platform", PlatformSchema, platform],
  ["industries", IndustriesSchema, industries],
  ["services", ServicesSchema, services],
  ["refusals", RefusalsSchema, refusals],
  ["runtime", RuntimeSchema, runtime],
  ["research", ResearchSchema, research],
  ["blog", BlogSchema, blog],
  ["team", TeamSchema, team],
  ["stats", StatsSchema, stats],
  ["faq", FAQSchema, faq],
  ["products", ProductsSchema, products],
  ["changelog", ChangelogSchema, changelog],
  ["docs", DocsSchema, docs],
  ["projects", ProjectsSchema, projects],
];

describe("content datasets match their schemas", () => {
  it.each(datasets)("%s parses without error and without changes", (_name, schema, data) => {
    const result = schema.safeParse(data);
    expect(result.error?.issues ?? []).toEqual([]);
    expect(result.data).toStrictEqual(data);
  });
});
