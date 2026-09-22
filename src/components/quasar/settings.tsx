// Ported from mlai `apps/mlai/lib/quasar-screens.tsx` (`QuasarSettings`) at b6f3686,
// with the `lib/sidecars.ts` health probe. Like mlai, the first paint shows no
// origin and the controls stay disabled until this device's setting is read.
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getBaseUrl, hydrateOrigin, listSites, setBaseUrl, storedOrigin } from "@/lib/quasar/api";
import { getQuasarDefaultOrigin } from "@/lib/quasar/config";
import { DEFAULT_ORIGIN, ORIGIN_KEY } from "@/lib/quasar";
import { probeSidecar } from "@/lib/quasar/sidecars";
import { cn } from "@/lib/utils";
import { Notice, QuasarFrame, SecurityNote, ServiceUnreachable } from "./shared";
import { errorText, isUnreachable } from "./util";

type Health = "unknown" | "checking" | "available" | "unavailable";

export function QuasarSettings() {
  const [url, setUrl] = useState("");
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [testError, setTestError] = useState<unknown>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [deploymentDefault, setDeploymentDefault] = useState<string | null | undefined>(undefined);
  const [health, setHealth] = useState<Health>("unknown");

  useEffect(() => {
    let cancelled = false;
    hydrateOrigin().then(
      async (origin) => {
        const local = await storedOrigin();
        if (cancelled) return;
        setUrl(origin);
        setSaved(local);
        setReady(true);
        setHealth("checking");
        const result = await probeSidecar(`${origin}/api/sites`);
        if (!cancelled) setHealth(result);
      },
      () => {
        if (!cancelled) setReady(true);
      },
    );
    getQuasarDefaultOrigin().then(
      (value) => {
        if (!cancelled) setDeploymentDefault(value);
      },
      () => {
        if (!cancelled) setDeploymentDefault(null);
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  async function check(origin: string) {
    setHealth("checking");
    // The service has no /health route; its site list is the cheapest read.
    setHealth(await probeSidecar(`${origin}/api/sites`));
  }

  async function save(test: boolean) {
    if (!ready || pending) return;
    setPending(true);
    setMessage(null);
    setTestError(null);
    try {
      await setBaseUrl(url);
      const origin = getBaseUrl();
      setUrl(origin);
      setSaved(await storedOrigin());
      if (test) {
        try {
          const sites = await listSites();
          setHealth("available");
          setMessage({
            tone: "ok",
            text: `Saved on this device. Connected: the service holds ${sites.length} site${sites.length === 1 ? "" : "s"}.`,
          });
        } catch (error) {
          setHealth("unavailable");
          setMessage({ tone: "ok", text: "Saved on this device." });
          setTestError(error);
        }
      } else {
        setMessage({ tone: "ok", text: "Saved on this device." });
        void check(origin);
      }
    } catch (error) {
      setMessage({ tone: "error", text: errorText(error) });
    } finally {
      setPending(false);
    }
  }

  const fallbackLabel =
    deploymentDefault === undefined
      ? "…"
      : deploymentDefault
        ? `${deploymentDefault} (QUASAR_SERVICE_ORIGIN)`
        : `${DEFAULT_ORIGIN} (QUASAR_SERVICE_ORIGIN is not set)`;

  return (
    <QuasarFrame
      eyebrow="Quasar · settings"
      title="Service origin"
      lede="Where this browser reaches the Quasar service. The setting is stored in this browser only; quesar.cloud keeps no copy."
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="space-y-6">
          <form
            className="surface space-y-4 p-6"
            onSubmit={(event) => {
              event.preventDefault();
              void save(true);
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="quasar-origin">Server base URL</Label>
              <Input
                id="quasar-origin"
                value={url}
                inputMode="url"
                spellCheck={false}
                autoComplete="off"
                placeholder={ready ? DEFAULT_ORIGIN : ""}
                disabled={!ready || pending}
                onChange={(event) => {
                  setUrl(event.target.value);
                  setMessage(null);
                }}
              />
              <p className="text-xs text-fg-subtle">
                An HTTP(S) origin only: scheme, host and port, no path or credentials. Use the
                machine&apos;s LAN address when the service runs elsewhere.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="secondary"
                disabled={!ready || pending}
                onClick={() => void save(false)}
              >
                Save
              </Button>
              <Button type="submit" disabled={!ready || pending}>
                {pending ? "Connecting…" : "Save and test connection"}
              </Button>
            </div>
            {message ? (
              <p
                role={message.tone === "error" ? "alert" : "status"}
                className={cn(
                  "text-sm",
                  message.tone === "error" ? "text-destructive" : "text-fg-muted",
                )}
              >
                {message.text}
              </p>
            ) : null}
          </form>

          {testError ? (
            isUnreachable(testError) ? (
              <ServiceUnreachable origin={getBaseUrl()} error={testError} />
            ) : (
              <Notice tone="error" title="The service refused the request">
                <p>{errorText(testError)}</p>
              </Notice>
            )
          ) : null}

          <dl className="surface grid gap-3 p-6 text-sm sm:grid-cols-[auto_minmax(0,1fr)]">
            <dt className="text-fg-subtle">Health</dt>
            <dd className="flex flex-wrap items-center gap-3">
              <span
                className={cn(
                  "font-mono text-xs uppercase",
                  health === "available" && "text-status-current",
                  health === "unavailable" && "text-destructive",
                  (health === "unknown" || health === "checking") && "text-fg-subtle",
                )}
              >
                {health}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={!ready || health === "checking"}
                onClick={() => void check(getBaseUrl())}
              >
                Check again
              </Button>
            </dd>
            <dt className="text-fg-subtle">Saved on this device</dt>
            <dd className="font-mono text-xs break-all text-fg">
              {!ready ? "…" : saved ? `${saved} (localStorage ${ORIGIN_KEY})` : "nothing saved"}
            </dd>
            <dt className="text-fg-subtle">Used when nothing is saved</dt>
            <dd className="font-mono text-xs break-all text-fg">{fallbackLabel}</dd>
          </dl>
          <p className="text-xs text-fg-subtle">
            The health check is a 1.5 s read of <span className="font-mono">/api/sites</span>. It
            only reports whether this browser got an answer; it starts nothing.
          </p>
        </div>

        <div className="space-y-6">
          <SecurityNote />
          <Notice title="Reaching it from this site">
            <p>
              Requests go from your browser straight to the service. When this page is served over
              HTTPS, browsers treat <span className="font-mono">http://localhost</span> as
              trustworthy, but may block plain HTTP to other hosts as mixed content or ask before
              reaching your local network. Running this site locally avoids both.
            </p>
          </Notice>
        </div>
      </div>
    </QuasarFrame>
  );
}
