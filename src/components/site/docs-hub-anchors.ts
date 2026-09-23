/** In-page anchors of the docs hub reference section (data only, split out of
 *  docs-hub.tsx so that module exports only components for fast refresh). */
export const DOCS_HUB_ANCHORS = [
  { id: "ref-runtime", label: "Runtime build" },
  { id: "ref-personas", label: "Persona routing" },
  { id: "ref-wdbx", label: "WDBX retrieval" },
  { id: "ref-wdbx-v2", label: "WDBX V2 downloads" },
  { id: "ref-mcp", label: "MCP tools" },
  { id: "ref-deployment", label: "Deployment" },
  { id: "ref-api", label: "Site surfaces" },
] as const;
