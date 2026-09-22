// Ported from mlai `apps/mlai/lib/quasar-screens.tsx` (`QuasarNewSite`) at b6f3686.
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createSite, isUncertain, listSites, recover } from "@/lib/quasar/api";
import { CreateSiteBody } from "@/lib/quasar";
import { Notice, QuasarFrame, ServiceUnreachable } from "./shared";
import { errorText, isUnreachable, useServiceOrigin } from "./util";

export function QuasarNewSite() {
  const navigate = useNavigate();
  const origin = useServiceOrigin();
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [uncertain, setUncertain] = useState(false);
  const body = { name: name.trim(), prompt: prompt.trim() };
  const valid = CreateSiteBody.safeParse(body).success;
  const disabled = pending || !origin || !valid || uncertain;

  function submit() {
    if (disabled) return;
    setPending(true);
    setError(null);
    createSite(body).then(
      (site) => navigate({ to: "/quasar/site/$id", params: { id: site.id } }),
      (err: unknown) => {
        setError(err);
        setUncertain(isUncertain());
        setPending(false);
      },
    );
  }

  function retry() {
    setPending(true);
    // A failed create may still have reached the service. Read its list before
    // allowing another create, so a retry cannot silently make a duplicate.
    recover(async () => {
      await listSites();
    }).then(
      () => {
        setUncertain(false);
        setError(null);
        setPending(false);
      },
      (err: unknown) => {
        setError(err);
        setPending(false);
      },
    );
  }

  return (
    <QuasarFrame
      eyebrow="Quasar · local builder"
      title="New site"
      lede="Describe a site. The service copies its Next.js template into ~/.quasar/sites/<slug> and runs a generation job with Claude, using the Anthropic credentials of the machine it runs on."
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
        <form
          className="surface space-y-5 p-6"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="quasar-name">Name</Label>
            <Input
              id="quasar-name"
              value={name}
              maxLength={60}
              autoComplete="off"
              placeholder="Harbor"
              onChange={(event) => setName(event.target.value)}
            />
            <p className="text-xs text-fg-subtle">
              Up to 60 characters. The folder name is derived from it.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="quasar-prompt">Prompt</Label>
            <Textarea
              id="quasar-prompt"
              value={prompt}
              maxLength={4000}
              rows={8}
              placeholder="A quiet landing page for a harbour-side bakery, with opening hours and a map link."
              onChange={(event) => setPrompt(event.target.value)}
            />
            <p className="text-xs text-fg-subtle">{prompt.trim().length} / 4000</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={disabled}>
              {pending ? "Creating…" : "Create site"}
            </Button>
            {uncertain ? (
              <Button type="button" variant="secondary" onClick={retry} disabled={pending}>
                Retry: refresh state
              </Button>
            ) : null}
          </div>
          {error ? (
            isUnreachable(error) && !uncertain ? (
              <ServiceUnreachable origin={origin} error={error} />
            ) : (
              <Notice
                tone="error"
                title={uncertain ? "Outcome unknown" : "Could not create the site"}
              >
                <p>{errorText(error)}</p>
                {uncertain ? (
                  <p>
                    The request may have reached the service. Refresh state before creating again,
                    then check the sites list for a duplicate.
                  </p>
                ) : null}
              </Notice>
            )
          ) : null}
        </form>
        <Notice title="What happens">
          <p>
            The service answers at once and generates in the background. You land on the site page,
            which follows the generation feed and can start a local preview.
          </p>
          <p>
            Each generation spends tokens on the service&apos;s Anthropic account. Quasar v1 does
            not host, deploy or bill: the result is an ordinary Next.js project on disk.
          </p>
        </Notice>
      </div>
    </QuasarFrame>
  );
}
