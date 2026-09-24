import { afterEach, describe, expect, it, vi } from "vitest";
import { optedOut, track } from "@/lib/telemetry";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("optedOut: privacy gate (ported from mlai)", () => {
  it("opts out when navigator is unavailable (SSR)", () => {
    vi.stubGlobal("navigator", undefined);
    expect(optedOut()).toBe(true);
  });

  it("honors Do Not Track in both '1' and 'yes' forms", () => {
    vi.stubGlobal("navigator", { doNotTrack: "1" });
    expect(optedOut()).toBe(true);
    vi.stubGlobal("navigator", { doNotTrack: "yes" });
    expect(optedOut()).toBe(true);
  });

  it("honors Global Privacy Control even when Do Not Track is off", () => {
    vi.stubGlobal("navigator", { doNotTrack: "0", globalPrivacyControl: true });
    expect(optedOut()).toBe(true);
    vi.stubGlobal("navigator", { globalPrivacyControl: true });
    expect(optedOut()).toBe(true);
  });

  it("allows tracking when no opt-out signal is present", () => {
    vi.stubGlobal("navigator", { doNotTrack: "unspecified" });
    expect(optedOut()).toBe(false);
    vi.stubGlobal("navigator", { doNotTrack: "0" });
    expect(optedOut()).toBe(false);
    vi.stubGlobal("navigator", { doNotTrack: null, globalPrivacyControl: false });
    expect(optedOut()).toBe(false);
    vi.stubGlobal("navigator", {});
    expect(optedOut()).toBe(false);
  });
});

describe("track: sends nothing once the visitor opts out", () => {
  function stubBrowser(nav: Record<string, unknown>) {
    const sendBeacon = vi.fn((_url: string, _body: Blob) => true);
    const fetchMock = vi.fn((_url: string, _init: RequestInit) =>
      Promise.resolve(new Response(null, { status: 204 })),
    );
    vi.stubGlobal("navigator", { sendBeacon, ...nav });
    vi.stubGlobal("window", { location: { pathname: "/about" } });
    vi.stubGlobal("fetch", fetchMock);
    return { sendBeacon, fetchMock };
  }

  it("makes no request under Do Not Track", () => {
    const { sendBeacon, fetchMock } = stubBrowser({ doNotTrack: "1" });
    track("page_view");
    expect(sendBeacon).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("makes no request under Global Privacy Control", () => {
    const { sendBeacon, fetchMock } = stubBrowser({ globalPrivacyControl: true });
    track("inquiry_open");
    expect(sendBeacon).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not throw without a navigator (SSR)", () => {
    vi.stubGlobal("navigator", undefined);
    expect(() => track("page_view")).not.toThrow();
  });

  it("beacons the event and current pathname when not opted out", async () => {
    const { sendBeacon, fetchMock } = stubBrowser({});
    track("page_view");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(sendBeacon).toHaveBeenCalledTimes(1);
    const [url, body] = sendBeacon.mock.calls[0];
    expect(url).toBe("/api/telemetry");
    expect(JSON.parse(await body.text())).toEqual({ event: "page_view", path: "/about" });
  });

  it("falls back to a keepalive fetch without sendBeacon", () => {
    const { fetchMock } = stubBrowser({ sendBeacon: undefined });
    track("inquiry_submit", "/contact");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/telemetry");
    expect(init).toMatchObject({ method: "POST", keepalive: true });
    expect(JSON.parse(init.body as string)).toEqual({ event: "inquiry_submit", path: "/contact" });
  });
});
