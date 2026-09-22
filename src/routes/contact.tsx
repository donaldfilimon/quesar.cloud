import { type FormEvent, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { NextUp, PageHero, Section, Surface } from "@/components/site";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { readStore, writeStore } from "@/lib/local-store";
import { pageHead } from "@/lib/seo";
import { addNote } from "@/lib/workspace";

export const Route = createFileRoute("/contact")({
  head: () =>
    pageHead(
      "Contact — MLAI Corporation",
      "Send an inquiry about Quesar, ABI, WDBX, Abbey, or services without leaving this site.",
    ),
  component: ContactPage,
});

type Inquiry = {
  id: string;
  name: string;
  email: string;
  topic: string;
  message: string;
  created: number;
};

const KEY = "mlai-inquiries";
const TOPICS = ["Quesar", "Abbey", "ABI / WDBX", "Services", "Investors", "Other"] as const;

function ContactPage() {
  const { user } = useCurrentUserState();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState<(typeof TOPICS)[number]>("Quesar");
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState<Inquiry[]>([]);
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");

  useEffect(() => {
    setSaved(readStore<Inquiry[]>(KEY, []));
  }, []);

  useEffect(() => {
    if (!user) return;
    if (!name && user.displayName) setName(user.displayName);
    if (!email && user.primaryEmail) setEmail(user.primaryEmail);
  }, [user, name, email]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) return;
    setStatus("saving");
    const inquiry: Inquiry = {
      id: crypto.randomUUID(),
      name: name.trim().slice(0, 80),
      email: email.trim().slice(0, 120),
      topic,
      message: trimmed.slice(0, 2000),
      created: Date.now(),
    };
    const next = [inquiry, ...saved].slice(0, 20);
    writeStore(KEY, next);
    setSaved(next);
    setMessage("");
    if (user) {
      try {
        await addNote({
          data: {
            nodeId: "contact",
            body: `[${topic}] ${inquiry.name} <${inquiry.email}>\n${inquiry.message}`,
          },
        });
      } catch {
        setStatus("done");
        toast.success("Saved on this device.");
        return;
      }
    }
    setStatus("done");
    toast.success(user ? "Saved to your field console." : "Saved on this device.");
  }

  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="Write here. Stay here."
        lede="This site does not operate a hosted inbox. Your inquiry stays on this device, and if you are signed in it is also saved to your field console. For architecture questions, the pages themselves are the public path."
      />
      <Section>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <form onSubmit={onSubmit} className="surface p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="contact-name">Name</Label>
                <Input id="contact-name" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" className="mt-1 bg-bg" />
              </div>
              <div>
                <Label htmlFor="contact-email">Email</Label>
                <Input
                  id="contact-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  className="mt-1 bg-bg"
                />
              </div>
            </div>
            <fieldset className="mt-4">
              <legend className="text-sm">Topic</legend>
              <RadioGroup
                className="mt-2 flex flex-wrap gap-2"
                value={topic}
                onValueChange={(value) => setTopic(value as (typeof TOPICS)[number])}
                aria-label="Topic"
              >
                {TOPICS.map((item) => (
                  <RadioGroupItem key={item} value={item}>
                    {item}
                  </RadioGroupItem>
                ))}
              </RadioGroup>
            </fieldset>
            <div className="mt-4">
              <Label htmlFor="contact-message">Message</Label>
              <Textarea
                id="contact-message"
                required
                value={message}
                onChange={(event) => setMessage(event.target.value.slice(0, 2000))}
                rows={7}
                className="mt-1 bg-bg"
              />
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={status === "saving"}>
                {status === "saving" ? "Saving…" : "Save inquiry"}
              </Button>
              {status === "done" ? (
                <p className="text-sm text-fg-muted">Saved on this device. Sign in to also keep it in the field console.</p>
              ) : null}
            </div>
          </form>
          <div>
            <Surface>
              <h2 className="font-display text-2xl">Direct paths</h2>
              <ul className="mt-4 space-y-3 text-sm">
                <li>
                  <Link to="/services" className="text-accent">
                    Services
                  </Link>
                  <p className="text-fg-muted">Audit, design, build, harden — engagement first.</p>
                </li>
                <li>
                  <Link to="/source" className="text-accent">
                    Source catalog
                  </Link>
                  <p className="text-fg-muted">Every public tree, described on this site.</p>
                </li>
                <li>
                  <Link to="/apps" className="text-accent">
                    Apps
                  </Link>
                  <p className="text-fg-muted">Workspace, vault, studio, bot — in the browser.</p>
                </li>
              </ul>
            </Surface>
            {saved.length ? (
              <ul className="mt-4 space-y-3">
                {saved.slice(0, 5).map((item) => (
                  <li key={item.id} className="surface p-4">
                    <p className="font-mono text-[11px] text-fg-subtle">
                      {item.topic} · {new Date(item.created).toISOString().slice(0, 10)}
                    </p>
                    <p className="mt-2 line-clamp-3 text-sm text-fg-muted">{item.message}</p>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
        <div className="mt-10">
          <NextUp
            items={[
              { to: "/developers", label: "Developers", body: "Full repository index and gates." },
              { to: "/services", label: "Services", body: "If you need an engagement, start there." },
            ]}
          />
        </div>
      </Section>
    </>
  );
}
