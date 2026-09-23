import { createFileRoute } from "@tanstack/react-router";
import { RepoList } from "@/components/github/repo-list";
import { PageClose, PageHero, RouteFrame, Section } from "@/components/site";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/source")({
  head: () =>
    pageHead(
      "Source — MLAI public tree",
      "In-site catalog of public MLAI repositories. Each name opens a page here.",
    ),
  component: SourceIndex,
});

function SourceIndex() {
  return (
    <RouteFrame>
      <PageHero
        eyebrow="Source"
        title="The catalog stays here."
        lede="Public repositories, mapped to pages on this site. Live stars when GitHub answers. You do not need to leave to read what they are."
      />
      <Section>
        <RepoList />
      </Section>
      <PageClose
        primary={{ to: "/developers", label: "Developers" }}
        next={[
          {
            to: "/architecture",
            label: "Architecture",
            body: "Click a node for current versus not claimed.",
          },
          { to: "/apps", label: "Apps", body: "Working orientations of the public tree." },
        ]}
      />
    </RouteFrame>
  );
}
