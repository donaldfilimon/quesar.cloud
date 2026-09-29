import { createFileRoute } from "@tanstack/react-router";
import { PageClose, PageHero, RouteFrame, Section } from "@/components/site";
import { ShowcaseWall } from "@/components/site/showcase-wall";
import { Trailer } from "@/components/site/trailer";
import { FILM_PUBLISHED, filmCuts } from "@/components/site/film-cuts";
import { ogImage } from "@/lib/og-sections";
import { pageHead, SITE_ORIGIN } from "@/lib/seo";

const DESCRIPTION = "Quesar showcase: trailer, film, explainer, design lab, Abbey, mega board.";
const mark = filmCuts[0];
const markMp4 = `${SITE_ORIGIN}${mark.sources[mark.sources.length - 1].src}`;

export const Route = createFileRoute("/showcase")({
  // The trailer's first cut, described for link previews and search: og:video
  // for cards that can play it, VideoObject for structured data.
  head: () => {
    const head = pageHead("Showcase — Quesar", DESCRIPTION, ogImage("showcase"));
    return {
      meta: [
        ...head.meta,
        { property: "og:type", content: "video.other" },
        { property: "og:video", content: markMp4 },
        { property: "og:video:type", content: "video/mp4" },
        { property: "og:video:width", content: "1280" },
        { property: "og:video:height", content: "720" },
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "VideoObject",
            name: `Quesar film: ${mark.title}`,
            description: mark.caption,
            thumbnailUrl: `${SITE_ORIGIN}${mark.poster}`,
            contentUrl: markMp4,
            uploadDate: FILM_PUBLISHED,
            duration: `PT${Math.round(mark.duration)}S`,
          }),
        },
      ],
    };
  },
  component: ShowcasePage,
});

function ShowcasePage() {
  return (
    <RouteFrame>
      <PageHero
        eyebrow="Showcase"
        title="Look, then inspect."
        lede="The projection room. Films and trailers drawn frame by frame by a timeline engine in your browser, narrated by the three Quesar minds. Atmosphere is not evidence: the films are orientation, and status lives on the product pages."
      />
      <Section>
        <Trailer full />
        <div className="mt-10">
          <ShowcaseWall />
        </div>
      </Section>
      <PageClose
        primary={{ to: "/architecture", label: "Architecture" }}
        next={[
          { to: "/quesar", label: "Quesar", body: "The product that the film orients." },
          { to: "/apps", label: "Apps", body: "Working surfaces, not stills." },
        ]}
      />
    </RouteFrame>
  );
}
