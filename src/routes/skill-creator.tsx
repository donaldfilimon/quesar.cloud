import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CodeBlock } from "@/components/site/lab";
import {
  HeroStatus,
  IntegrityList,
  PageClose,
  PageHero,
  Section,
  Surface,
} from "@/components/site";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { integrityRules } from "@/lib/content";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/skill-creator")({
  head: () =>
    pageHead(
      "skill-creator — MLAI",
      "Public agent skill for creating skills and shipping the company site without breaking integrity rules.",
    ),
  component: SkillCreatorPage,
});

function SkillCreatorPage() {
  const [name, setName] = useState("site-integrity");
  const [purpose, setPurpose] = useState(
    "Ship the company site without breaking Apple framing or provenance tags.",
  );
  const skill = useMemo(
    () => `---
name: ${name || "untitled"}
description: ${purpose || "Describe the skill."}
---

# ${name || "untitled"}

${purpose}

## Integrity
- Use the approved Apple sentence only.
- Tag figures measured / target / reported.
- ABI is nightly Rust. Do not mix Zig-era claims.
- Do not invent WDBX recall, QPS, or latency.
`,
    [name, purpose],
  );

  return (
    <>
      <PageHero
        eyebrow="skill-creator"
        title="The same rules this site is written under."
        lede="Public agent skill for creating skills and shipping the company site without breaking Apple framing, provenance tags, Apache-2.0, or toolchain facts."
      >
        <HeroStatus status="current" />
      </PageHero>
      <Section eyebrow="Compose" title="A skill file, in the browser.">
        <div className="grid gap-4 lg:grid-cols-2">
          <Surface>
            <Label htmlFor="skill-name">Name</Label>
            <Input
              id="skill-name"
              className="mt-1"
              value={name}
              onChange={(event) => setName(event.target.value.slice(0, 64))}
            />
            <Label htmlFor="skill-purpose" className="mt-4">
              Purpose
            </Label>
            <Textarea
              id="skill-purpose"
              className="mt-1 bg-bg"
              value={purpose}
              onChange={(event) => setPurpose(event.target.value.slice(0, 280))}
            />
          </Surface>
          <CodeBlock code={skill} label="SKILL.md" />
        </div>
      </Section>
      <Section eyebrow="Rules" title="Copied from the public skill.">
        <IntegrityList rules={integrityRules} />
      </Section>
      <PageClose
        primary={{ to: "/plugins", label: "Plugins" }}
        next={[
          { to: "/docs", label: "Docs", body: "The same integrity language, as articles." },
          { to: "/apps", label: "Apps", body: "Other surfaces that follow these rules." },
        ]}
      />
    </>
  );
}
