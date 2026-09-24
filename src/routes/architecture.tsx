import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArchitectureDiagram } from "@/components/diagram/architecture-diagram";
import { JourneyRail, PageClose, PageHero, Section, StepList } from "@/components/site";
import { architectureSteps, fieldNotesOffline } from "@/lib/content";
import { isArchitectureNodeId } from "@/lib/architecture-node-ids";
import { pageHead } from "@/lib/seo";
import { staticSite } from "@/lib/static-site";

type NodeSearch = { node?: string };

function parseNode(value: unknown) {
  return isArchitectureNodeId(value) ? value : undefined;
}

// Always return the key: the root route has no validateSearch, so its search is
// the raw query, and the router merges it into this route's result. Omitting
// `node` would let an unknown `?node=` through; an explicit undefined overrides it.
function nodeSearch(search: Record<string, unknown>): NodeSearch {
  return { node: parseNode(search.node) };
}

export const Route = createFileRoute("/architecture")({
  validateSearch: (search: Record<string, unknown>): NodeSearch => nodeSearch(search),
  head: () =>
    pageHead(
      "Architecture — Quesar, ABI, WDBX",
      "Interactive architecture of Quesar: user input, ABI orchestration, model routing, WDBX memory, provenance, and local or remote compute.",
    ),
  component: ArchitecturePage,
});

function ArchitecturePage() {
  const { node } = Route.useSearch();
  const navigate = useNavigate({ from: "/architecture" });
  return (
    <>
      <PageHero
        eyebrow="Architecture"
        title="From request to record, with every layer named."
        lede="Select a component to see what is current in source versus what is not claimed. Motion on the connectors is a reminder that work flows; it is not a performance graph."
      />
      <JourneyRail current="architecture" />
      <Section
        lede={`Select a node. The inspector lists implemented scope and the claims this site refuses. ${
          staticSite ? fieldNotesOffline : "Save a field note on the same node after you sign in."
        }`}
      >
        <ArchitectureDiagram
          selectedId={node ?? "quesar"}
          onSelect={(id) => {
            void navigate({ search: { node: id }, replace: true });
          }}
        />
      </Section>
      <Section
        eyebrow="Reading the diagram"
        title="Input, processing, memory, retrieval, execution, tools, output."
        lede="The layers are a map, not a marketing stack. If a name sounds larger than the implementation, the status label is the correction."
      >
        <StepList steps={architectureSteps} />
      </Section>
      <PageClose
        primary={{ to: "/developers", label: "Developers" }}
        secondary={[{ to: "/investors", label: "Investors" }]}
        next={[
          {
            to: "/console",
            label: "Console",
            body: staticSite
              ? fieldNotesOffline
              : "Sign in and save what is current versus not claimed.",
          },
          {
            to: "/developers",
            label: "Developers",
            body: "Live GitHub READMEs when GitHub answers.",
          },
          {
            to: "/investors",
            label: "Investors",
            body: "TAM and ARR tagged as targets, not results.",
          },
        ]}
      />
    </>
  );
}
