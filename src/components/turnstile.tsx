import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from "react";

/**
 * Cloudflare Turnstile widget (ported from mlai `TurnstileWidget.tsx` without
 * `next/script`). Render it only when the server reports Turnstile as ready;
 * the site key comes from `getTurnstileConfig`, never from the bundle.
 */

type TurnstileWidgetId = string;

type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      action: string;
      theme: "auto";
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
    },
  ) => TurnstileWidgetId;
  reset: (widgetId: TurnstileWidgetId) => void;
  remove: (widgetId: TurnstileWidgetId) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let scriptPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error("Turnstile failed to load"));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export type TurnstileHandle = { reset: () => void };

export const Turnstile = forwardRef<
  TurnstileHandle,
  {
    siteKey: string;
    action: string;
    onTokenChange: (token: string) => void;
    onLoadError?: () => void;
  }
>(function Turnstile({ siteKey, action, onTokenChange, onLoadError }, ref) {
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<TurnstileWidgetId | null>(null);

  const renderWidget = useCallback(() => {
    if (!container.current || widgetId.current !== null || !window.turnstile) return;
    widgetId.current = window.turnstile.render(container.current, {
      sitekey: siteKey,
      action,
      theme: "auto",
      callback: onTokenChange,
      "expired-callback": () => onTokenChange(""),
      "error-callback": () => onTokenChange(""),
    });
  }, [action, onTokenChange, siteKey]);

  useEffect(() => {
    let cancelled = false;
    loadTurnstileScript()
      .then(() => {
        if (!cancelled) renderWidget();
      })
      .catch(() => {
        if (!cancelled) onLoadError?.();
      });
    return () => {
      cancelled = true;
      if (widgetId.current !== null && window.turnstile) {
        window.turnstile.remove(widgetId.current);
        widgetId.current = null;
      }
    };
  }, [renderWidget, onLoadError]);

  useImperativeHandle(
    ref,
    () => ({
      reset() {
        if (widgetId.current !== null && window.turnstile) window.turnstile.reset(widgetId.current);
        onTokenChange("");
      },
    }),
    [onTokenChange],
  );

  return <div ref={container} className="min-h-[65px]" aria-label="Human verification" />;
});
