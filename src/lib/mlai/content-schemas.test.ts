import { describe, expect, it } from "vitest";
import type { ZodType } from "zod";
import { about } from "./categories/about";
import { blog } from "./categories/blog";
import { changelog } from "./categories/changelog";
import { docs } from "./categories/docs";
import { industries } from "./categories/industries";
import { investor } from "./categories/investor";
import { platform, runtime } from "./categories/platform";
import { products } from "./categories/products";
import { projects } from "./categories/projects";
import { research } from "./categories/research";
import { researchSources, researchTopics } from "./categories/research-topics";
import { refusals, services } from "./categories/services";
import { stats } from "./categories/stats";
import { abbeyWorkspaceFacts, quesarSurfaces, quesarWhat, setups } from "./categories/surfaces";
import { team } from "./categories/team";
import {
  AboutSchema,
  BlogSchema,
  ChangelogSchema,
  DocsSchema,
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
import { ResearchSourcesSchema, ResearchTopicsSchema } from "./schemas-research-topics";
import {
  AbbeyWorkspaceFactsSchema,
  QuesarSurfacesSchema,
  QuesarWhatSchema,
  SetupsSchema,
} from "./schemas-surfaces";
import { InvestorSchema } from "./schemas-investor";

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
  ["researchTopics", ResearchTopicsSchema, researchTopics],
  ["researchSources", ResearchSourcesSchema, researchSources],
  ["blog", BlogSchema, blog],
  ["team", TeamSchema, team],
  ["stats", StatsSchema, stats],
  ["products", ProductsSchema, products],
  ["changelog", ChangelogSchema, changelog],
  ["docs", DocsSchema, docs],
  ["projects", ProjectsSchema, projects],
  ["quesarSurfaces", QuesarSurfacesSchema, quesarSurfaces],
  ["quesarWhat", QuesarWhatSchema, quesarWhat],
  ["setups", SetupsSchema, setups],
  ["abbeyWorkspaceFacts", AbbeyWorkspaceFactsSchema, abbeyWorkspaceFacts],
  ["investor", InvestorSchema, investor],
];

describe("content datasets match their schemas", () => {
  it.each(datasets)("%s parses without error and without changes", (_name, schema, data) => {
    const result = schema.safeParse(data);
    expect(result.error?.issues ?? []).toEqual([]);
    expect(result.data).toStrictEqual(data);
  });
});
