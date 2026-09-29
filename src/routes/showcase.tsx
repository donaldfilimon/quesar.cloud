import { createFileRoute } from "@tanstack/react-router";
import { PageClose, PageHero, RouteFrame, Section } from "@/components/site";
import { ShowcaseWall } from "@/components/site/showcase-wall";
import { Trailer } from "@/components/site/trailer";
import { FILM_PUBLISHED, filmCuts } from "@/components/site/film-cuts";
import { ogImage } from "@/lib/og-image";
import { pageHead, SITE_ORIGIN } from "@/lib/seo";

const DESCRIPTION = "Quesar showcase: trailer, film, explainer, design lab, Abbey, mega board.";

export const Route = createFileRoute("/showcase")({
  // The film records are read in the loader, which shares the component's lazy
  // chunk; `head` only reads loaderData, so none of them reach the main bundle.
  codeSplitGroupings: [["loader", "component"]],
  loader: () => {
    const mark = filmCuts[0];
    return {
      title: mark.title,
      caption: mark.caption,
      poster: `${SITE_ORIGIN}${mark.poster}`,
      mp4: `${SITE_ORIGIN}${mark.sources[mark.sources.length - 1].src}`,
      duration: Math.round(mark.duration),
      published: FILM_PUBLISHED,
    };
  },
  // The trailer's first cut, described for link previews and search: og:video
  // for cards that can play it, VideoObject for structured data.
  head: ({ loaderData: video }) => {
    const head = pageHead("Showcase — Quesar", DESCRIPTION, ogImage("showcase"));
    if (!video) return head;
    return {
      meta: [
        ...head.meta,
        { property: "og:type", content: "video.other" },
        { property: "og:video", content: video.mp4 },
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
            name: `Quesar film: ${video.title}`,
            description: video.caption,
            thumbnailUrl: video.poster,
            contentUrl: video.mp4,
            uploadDate: video.published,
            duration: `PT${video.duration}S`,
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
