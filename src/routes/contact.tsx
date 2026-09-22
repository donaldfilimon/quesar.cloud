import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { NextUp, PageHero, Section, Surface } from "@/components/site";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Turnstile, type TurnstileHandle } from "@/components/turnstile";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getTurnstileConfig, INQUIRY_LIMITS, sendInquiry, TOPICS, type TurnstileConfig } from "@/lib/inquiries";
import { readStore, writeStore } from "@/lib/local-store";
import { pageHead } from "@/lib/seo";
import { track } from "@/lib/telemetry";

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

/** Local receipts of inquiries the server accepted (newest first, max 20). */
const KEY = "mlai-inquiries";

function ContactPage() {
  const { user } = useCurrentUserState();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState<(typeof TOPICS)[number]>("Quesar");
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState<Inquiry[]>([]);
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [turnstile, setTurnstile] = useState<TurnstileConfig | "loading" | "unreachable">("loading");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileFailed, setTurnstileFailed] = useState(false);
  const turnstileRef = useRef<TurnstileHandle>(null);
  const onTurnstileError = useCallback(() => setTurnstileFailed(true), []);

  useEffect(() => {
    setSaved(readStore<Inquiry[]>(KEY, []));
    let cancelled = false;
    getTurnstileConfig()
      .then((config) => {
        if (!cancelled) setTurnstile(config);
      })
      .catch(() => {
        if (!cancelled) setTurnstile("unreachable");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    if (!name && user.displayName) setName(user.displayName);
    if (!email && user.primaryEmail) setEmail(user.primaryEmail);
  }, [user, name, email]);

  const needsToken = typeof turnstile === "object" && turnstile.state === "ready";
  const blocked =
    turnstile === "loading" ||
    turnstile === "unreachable" ||
    (typeof turnstile === "object" && turnstile.state === "misconfigured") ||
    (needsToken && !turnstileToken);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || blocked) return;
    setStatus("saving");
    setError("");
    track("inquiry_submit");
    let result: Awaited<ReturnType<typeof sendInquiry>>;
    try {
      result = await sendInquiry({ data: { name, email, company: "", topic, message: trimmed, turnstileToken } });
    } catch {
      result = { ok: false, code: "unavailable", error: "We couldn't reach the server. Your message is still in the form." };
    }
    // Turnstile tokens are single-use: always start the next attempt fresh.
    if (needsToken) turnstileRef.current?.reset();
    if (!result.ok) {
      setStatus("error");
      setError(result.error);
      toast.error(result.error);
      return;
    }
    track("inquiry_success");
    const inquiry: Inquiry = {
      id: crypto.randomUUID(),
      name: name.trim(),
      email: email.trim(),
      topic,
      message: trimmed,
      created: Date.now(),
    };
    const next = [inquiry, ...saved].slice(0, 20);
    writeStore(KEY, next);
    setSaved(next);
    setMessage("");
    setStatus("done");
    toast.success("Inquiry sent.");
  }

  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="Write here. Stay here."
        lede="Your inquiry is sent to MLAI and stored with this site; if you are signed in, it is linked to your account. A copy of what you sent stays on this device as a receipt. For architecture questions, the pages themselves are the public path."
      />
      <Section>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <form onSubmit={onSubmit} className="surface p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="contact-name">Name</Label>
                <Input
                  id="contact-name"
                  required
                  minLength={INQUIRY_LIMITS.nameMin}
                  maxLength={INQUIRY_LIMITS.nameMax}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoComplete="name"
                  className="mt-1 bg-bg"
                />
              </div>
              <div>
                <Label htmlFor="contact-email">Email</Label>
                <Input
                  id="contact-email"
                  type="email"
                  required
                  maxLength={INQUIRY_LIMITS.emailMax}
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
                minLength={INQUIRY_LIMITS.messageMin}
                value={message}
                onChange={(event) => setMessage(event.target.value.slice(0, INQUIRY_LIMITS.messageMax))}
                rows={7}
                className="mt-1 bg-bg"
              />
            </div>
            {needsToken ? (
              <div className="mt-4">
                <Turnstile
                  ref={turnstileRef}
                  siteKey={turnstile.siteKey}
                  action="inquiry"
                  onTokenChange={setTurnstileToken}
                  onLoadError={onTurnstileError}
                />
                {turnstileFailed ? (
                  <p role="alert" className="mt-2 text-sm text-fg-muted">
                    The bot check could not load. Allow challenges.cloudflare.com, then reload the page.
                  </p>
                ) : null}
              </div>
            ) : null}
            {typeof turnstile === "object" && turnstile.state === "misconfigured" ? (
              <p role="alert" className="mt-4 text-sm text-fg-muted">
                Bot verification is misconfigured on this site, so inquiries cannot be sent right now.
              </p>
            ) : null}
            {turnstile === "unreachable" ? (
              <p role="alert" className="mt-4 text-sm text-fg-muted">
                The server is unreachable, so inquiries cannot be sent right now. Reload to retry.
              </p>
            ) : null}
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={status === "saving" || blocked}>
                {status === "saving" ? "Sending…" : "Send inquiry"}
              </Button>
              {status === "done" ? (
                <p role="status" className="text-sm text-fg-muted">
                  Sent. A receipt is kept on this device.
                </p>
              ) : null}
              {status === "error" && error ? (
                <p role="alert" className="text-sm text-fg-muted">
                  {error}
                </p>
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
