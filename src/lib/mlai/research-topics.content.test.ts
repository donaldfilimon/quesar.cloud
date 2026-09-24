import { describe, expect, it } from "vitest";

import {
  architectureNodes,
  researchSources as contentSources,
  researchTopics as contentTopics,
} from "@/lib/content";
import { researchRecords } from "./categories/research-records";
import {
  researchSources,
  researchTopics,
  sharedResearchCopy,
  untopicedTracks,
} from "./categories/research-topics";
import { ResearchSourcesSchema, ResearchTopicsSchema } from "./schemas-research-topics";

describe("research topics and sources", () => {
  it("parse without error and without changes", () => {
    const topics = ResearchTopicsSchema.safeParse(researchTopics);
    expect(topics.error?.issues ?? []).toEqual([]);
    expect(topics.data).toStrictEqual(researchTopics);

    const sources = ResearchSourcesSchema.safeParse(researchSources);
    expect(sources.error?.issues ?? []).toEqual([]);
    expect(sources.data).toStrictEqual(researchSources);
  });

  it("are re-exported unchanged from @/lib/content", () => {
    expect(contentTopics).toBe(researchTopics);
    expect(contentSources).toBe(researchSources);
  });

  it("link only to research tracks that exist", () => {
    const trackIds = new Set(researchRecords.tracks.map((track) => track.id));
    for (const topic of researchTopics) {
      for (const id of topic.trackIds) expect(trackIds, topic.title).toContain(id);
    }
    for (const id of untopicedTracks) expect(trackIds).toContain(id);
  });

  it("place every research track in a topic or the untopiced allowlist", () => {
    const referenced = new Set(researchTopics.flatMap((topic) => topic.trackIds));
    for (const track of researchRecords.tracks) {
      const inTopic = referenced.has(track.id);
      const allowlisted = untopicedTracks.includes(track.id);
      // Exactly one: a referenced track must leave the allowlist.
      expect(inTopic !== allowlisted, `track ${track.id}`).toBe(true);
    }
  });

  it("share wording with the architecture map", () => {
    const node = (id: string) => architectureNodes.find((n) => n.id === id)?.detail ?? "";
    const topic = (title: string) => researchTopics.find((t) => t.title === title)?.body ?? "";

    expect(node("embed").startsWith(sharedResearchCopy.retrieval)).toBe(true);
    expect(topic("Retrieval").startsWith(sharedResearchCopy.retrieval)).toBe(true);
    expect(node("provenance")).toBe(sharedResearchCopy.provenance);
    expect(topic("Provenance and trust").startsWith(sharedResearchCopy.provenance)).toBe(true);
  });

  it("keep the rendered copy of the shared sentences", () => {
    expect(researchTopics.find((t) => t.title === "Retrieval")?.body).toBe(
      "Ordered vector search and hybrid ranking contracts exist. Collapsing semantic, temporal, causal, and persona signals into one score is a documented limitation.",
    );
    expect(researchTopics.find((t) => t.title === "Provenance and trust")?.body).toBe(
      "Signatures and causal history answer why a record is trusted. They do not make the record true. Federation evidence is separately authorized.",
    );
    expect(architectureNodes.find((n) => n.id === "embed")?.detail).toBe(
      "Ordered vector search and hybrid ranking contracts exist. Collapsing every signal into one score is a documented limitation.",
    );
    expect(architectureNodes.find((n) => n.id === "provenance")?.detail).toBe(
      "Signatures and causal history answer why a record is trusted. They do not make the record true.",
    );
  });
});
