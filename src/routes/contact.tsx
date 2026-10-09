import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useHydrated } from "@tanstack/react-router";
import { toast } from "sonner";
import { NextUp, PageHero, Section, Surface } from "@/components/site";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Turnstile, type TurnstileHandle } from "@/components/turnstile";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import {
  getTurnstileConfig,
  INQUIRY_LIMITS,
  sendInquiry,
  TOPICS,
  type TurnstileConfig,
} from "@/lib/inquiries";
import {
  contactSearch,
  contactOutcomeMessage,
  readReceipts,
  receiptLabel,
  saveContactReceipt,
  submitContact,
  type InquiryReceipt,
} from "@/lib/contact-context";
import { readStore, writeStore } from "@/lib/local-store";
import { pageHead } from "@/lib/seo";
import { track } from "@/lib/telemetry";
import { staticSite } from "@/lib/static-site";
import { site } from "@/lib/site-identity";

export const Route = createFileRoute("/contact")({
  head: () =>
    pageHead(
      "Contact — MLAI",
      "Discuss an MLAI engineering scope. The static preview requests an email draft; a configured server can accept an inquiry through the form.",
    ),
  validateSearch: contactSearch,
  component: ContactPage,
});

/** Local drafts, accepted receipts and delivery-unknown legacy copies (max 20). */
const KEY = "mlai-inquiries";

function ContactPage() {
  const { service } = contactSearch(Route.useSearch());
  const { user } = useCurrentUserState();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState<(typeof TOPICS)[number]>(service ? "Services" : "Quesar");
  const [selectedService, setSelectedService] = useState(service ?? "");
  const [previousService, setPreviousService] = useState(service);
  if (service !== previousService) {
    setPreviousService(service);
    setSelectedService(service ?? "");
  }
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState<InquiryReceipt[]>([]);
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [receiptPersisted, setReceiptPersisted] = useState(false);
  // The static build has no server to ask: Turnstile is off from the start.
  const [turnstile, setTurnstile] = useState<TurnstileConfig | "loading" | "unreachable">(() =>
    staticSite ? { state: "off" } : "loading",
  );
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileFailed, setTurnstileFailed] = useState(false);
  const turnstileRef = useRef<TurnstileHandle>(null);
  const onTurnstileError = useCallback(() => setTurnstileFailed(true), []);

  // Local receipts and the signed-in user's name/email are client-only: the
  // server render and the hydration pass leave them empty, then the first
  // client render after hydration fills them in (adjusted during render).
  const hydrated = useHydrated();
  const [receiptsLoaded, setReceiptsLoaded] = useState(false);
  if (hydrated && !receiptsLoaded) {
    setReceiptsLoaded(true);
    setSaved(readReceipts(readStore<unknown>(KEY, [])));
  }
  // Prefill from the account while a field is empty (as before, a field cleared
  // while signed in refills).
  if (hydrated && user) {
    if (!name && user.displayName) setName(user.displayName);
    if (!email && user.primaryEmail) setEmail(user.primaryEmail);
  }

  useEffect(() => {
    if (staticSite) return;
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

  const needsToken = typeof turnstile === "object" && turnstile.state === "ready";
  // Also blocked until hydration: the prerendered static page must not offer a
  // live submit button before the form handler is attached.
  const blocked =
    !hydrated ||
    turnstile === "loading" ||
    turnstile === "unreachable" ||
    (typeof turnstile === "object" && turnstile.state === "misconfigured") ||
    (needsToken && !turnstileToken);

  function keepReceipt(receipt: InquiryReceipt) {
    const result = saveContactReceipt(receipt, saved, (receipts) => writeStore(KEY, receipts));
    setSaved(result.receipts);
    setReceiptPersisted(result.persisted);
    setStatus(result.status);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = message.trim();
    const inquiryMessage = selectedService.trim()
      ? `Service: ${selectedService.trim()}\n\n${trimmed}`
      : trimmed;
    if (!trimmed || blocked || status === "saving") return;
    if (inquiryMessage.length > INQUIRY_LIMITS.messageMax) {
      setStatus("error");
      setError(
        `Keep your service context and message under ${INQUIRY_LIMITS.messageMax} characters.`,
      );
      return;
    }
    setStatus("saving");
    setError("");
    track("inquiry_submit");
    if (staticSite) {
      const subject = encodeURIComponent(
        `[${topic}] Inquiry from ${name.trim() || "the Quesar site"}`,
      );
      const body = encodeURIComponent(`${inquiryMessage}\n\n— ${name.trim()} <${email.trim()}>`);
      window.location.href = `mailto:${site.contact.email}?subject=${subject}&body=${body}`;
      const draft: InquiryReceipt = {
        delivery: "draft",
        id: crypto.randomUUID(),
        name: name.trim(),
        email: email.trim(),
        topic,
        message: inquiryMessage,
        created: Date.now(),
      };
      keepReceipt(draft);
      toast.success(`Opening your email app to send this to ${site.contact.email}.`);
      return;
    }
    const result = await submitContact(
      { name, email, company: "", topic, message: inquiryMessage, turnstileToken },
      (data) => sendInquiry({ data }),
    );
    // Turnstile tokens are single-use: always start the next attempt fresh.
    if (needsToken) turnstileRef.current?.reset();
    if (!result.ok) {
      setStatus("error");
      setError(result.error);
      toast.error(result.error);
      return;
    }
    track("inquiry_success");
    const inquiry: InquiryReceipt = {
      delivery: "accepted",
      id: crypto.randomUUID(),
      name: name.trim(),
      email: email.trim(),
      topic,
      message: inquiryMessage,
      created: Date.now(),
    };
    keepReceipt(inquiry);
    setMessage("");
    toast.success("Inquiry accepted by the site.");
  }

  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="Discuss your project."
        lede={
          staticSite
            ? `This static preview has no server, so submitting requests an email draft addressed to ${site.contact.email}. A local copy is saved when device storage is available; delivery is unconfirmed. For architecture questions, the pages themselves are the public path.`
            : "The server accepts and stores your inquiry with this site; if you are signed in, it is linked to your account. A local receipt records acceptance when device storage is available. For architecture questions, the pages themselves are the public path."
        }
      />
      <Section>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <form onSubmit={onSubmit} className="surface p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="contact-name">Name</Label>
                <Input
                  id="contact-name"
                  disabled={status === "saving"}
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
                  disabled={status === "saving"}
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
            <div className="mt-4">
              <Label htmlFor="contact-service">Service or project context (optional)</Label>
              <Input
                id="contact-service"
                disabled={status === "saving"}
                value={selectedService}
                maxLength={120}
                onChange={(event) => setSelectedService(event.target.value)}
                className="mt-1 bg-bg"
              />
              <p className="mt-2 text-sm text-fg-muted">
                Edit this context to describe the scope you need. It is included with your message.
              </p>
            </div>
            <fieldset className="mt-4">
              <legend className="text-sm">Topic</legend>
              <RadioGroup
                disabled={status === "saving"}
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
                disabled={status === "saving"}
                required
                minLength={INQUIRY_LIMITS.messageMin}
                maxLength={INQUIRY_LIMITS.messageMax}
                value={message}
                onChange={(event) =>
                  setMessage(event.target.value.slice(0, INQUIRY_LIMITS.messageMax))
                }
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
                    The bot check could not load. Allow challenges.cloudflare.com, then reload the
                    page.
                  </p>
                ) : null}
              </div>
            ) : null}
            {typeof turnstile === "object" && turnstile.state === "misconfigured" ? (
              <p role="alert" className="mt-4 text-sm text-fg-muted">
                Bot verification is misconfigured on this site, so inquiries cannot be sent right
                now.
              </p>
            ) : null}
            {turnstile === "unreachable" ? (
              <p role="alert" className="mt-4 text-sm text-fg-muted">
                The server is unreachable, so inquiries cannot be sent right now. Reload to retry.
              </p>
            ) : null}
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Button
                type="submit"
                className="hover:bg-primary hover:underline motion-reduce:transition-none"
                disabled={status === "saving" || blocked}
              >
                {status === "saving"
                  ? "Sending…"
                  : staticSite
                    ? "Open email draft"
                    : "Send inquiry"}
              </Button>
              {status === "done" ? (
                <p role="status" className="text-sm text-fg-muted">
                  {contactOutcomeMessage(staticSite ? "draft" : "accepted", receiptPersisted)}
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
                  <a href={`mailto:${site.contact.email}`} className="break-words text-accent">
                    {site.contact.email}
                  </a>
                </li>
                <li>
                  <a href={`tel:${site.contact.phoneInternational}`} className="text-accent">
                    {site.contact.phone}
                  </a>
                </li>
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
                  <p className="text-fg-muted">
                    Selected repositories and source references, described on this site.
                  </p>
                </li>
                <li>
                  <Link to="/apps" className="text-accent">
                    Apps
                  </Link>
                  <p className="text-fg-muted">
                    Preview app surfaces and inspect their setup requirements.
                  </p>
                </li>
              </ul>
            </Surface>
            {saved.length ? (
              <ul className="mt-4 space-y-3">
                {saved.slice(0, 5).map((item) => (
                  <li key={item.id} className="surface p-4">
                    <p className="font-mono text-2xs text-fg-subtle">
                      {receiptLabel(item.delivery)} · {item.topic} ·{" "}
                      {new Date(item.created).toISOString().slice(0, 10)}
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
              {
                to: "/developers",
                label: "Developers",
                body: "Repository catalog, source references, and setup gates.",
              },
              {
                to: "/services",
                label: "Services",
                body: "If you need an engagement, start there.",
              },
            ]}
          />
        </div>
      </Section>
    </>
  );
}
