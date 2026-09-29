import { beforeEach, describe, expect, it, vi } from "vitest";

const voice = vi.hoisted(() => ({
  isSupported: () => true,
  load: vi.fn(() => Promise.resolve(true)),
  warm: vi.fn(() => Promise.resolve()),
  status: () => "idle",
}));
vi.mock("./neural-voice", () => ({ NeuralVoice: voice }));

describe("voice gate", () => {
  beforeEach(() => {
    vi.resetModules();
    voice.load.mockClear();
    voice.warm.mockClear();
    vi.stubGlobal("window", {});
  });

  it("downloads nothing until the viewer asks, then loads once and warms queued lines", async () => {
    const speech = await import("./speech");
    speech.primeNeural([{ who: "abbey", text: "First line." }]);
    speech.primeNeural([{ text: "Second line." }]);
    expect(voice.load).not.toHaveBeenCalled();
    expect(voice.warm).not.toHaveBeenCalled();

    speech.requestVoice();
    speech.requestVoice();
    expect(voice.load).toHaveBeenCalledTimes(1);
    expect(voice.warm).toHaveBeenCalledWith([
      { who: "abbey", text: "First line." },
      { who: "abbey", text: "Second line." },
    ]);

    speech.primeNeural([{ who: "aviva", text: "Later." }]);
    expect(voice.warm).toHaveBeenLastCalledWith([{ who: "aviva", text: "Later." }]);
  });
});
