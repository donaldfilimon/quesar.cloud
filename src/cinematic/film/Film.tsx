import { FilmEvidence } from "./evidence";
// Film.tsx — the MLAI brand film. A ~69s, six-scene explainer in the MLAI
// visual system (near-black substrate, electric cyan→blue→violet, Space
// Grotesk / IBM Plex Sans / IBM Plex Mono), hosted by the three agent voices.
//
//   Dependency graph (each module imports only what it needs):
//     tokens.ts ─► primitives.tsx ─► scenes/* ─► Film.tsx
//     easing.ts ─► fx.tsx ─► scenes/*
//     easing.ts ─► engine.tsx ─► scenes/* + Film.tsx + narration.tsx
//     chrome.tsx (SceneTag/StatusBadge/FlowNode) ─► scenes/*
//
//   Controls: space = play/pause · ←/→ scrub (shift = 1s) · 0 = restart.
//   Playhead persists across reloads; the voice toggle (top-right) mutes the
//   agents while captions keep carrying the words.

import { Grain, Vignette, GridBG } from "./primitives";
import { Stage, Sprite } from "./engine";
import { SceneOpen, SceneClose } from "./scenes/title";
import { ScenePersonaRouting, SceneVerifiableMemory } from "./scenes/core";
import { SceneGovernance, SceneNorthStar } from "./scenes/outro";
import { NarrationController, Narrator, VoiceToggle } from "./narration";
import { useVoiceGate } from "./speech";
import { Transcript } from "./transcript";
import { SCRIPT } from "./narration-script";
import { filmRecord, filmTimeline } from "../catalog";

// Scene slots [start, end] in seconds — must match the narration script.
const T = filmTimeline("film");
const DURATION = filmRecord("film").duration;

export function Film() {
  const voice = useVoiceGate();
  return (
    <Stage
      width={1920}
      height={1080}
      duration={DURATION}
      background="#040406"
      persistKey="mlai-film"
      voice={voice}
    >
      {/* persistent ambient substrate */}
      <GridBG opacity={0.4} />
      <Vignette />

      <Sprite start={T.open[0]} end={T.open[1]}>
        <SceneOpen />
      </Sprite>
      <Sprite start={T.routing[0]} end={T.routing[1]}>
        <ScenePersonaRouting />
      </Sprite>
      <Sprite start={T.memory[0]} end={T.memory[1]}>
        <SceneVerifiableMemory />
      </Sprite>
      <Sprite start={T.governance[0]} end={T.governance[1]}>
        <SceneGovernance />
      </Sprite>
      <Sprite start={T.northStar[0]} end={T.northStar[1]}>
        <SceneNorthStar />
      </Sprite>
      <Sprite start={T.close[0]} end={T.close[1]}>
        <SceneClose />
      </Sprite>

      {/* agent voiceover — controller fires speech, Narrator draws the caption */}
      <NarrationController />
      <Narrator />
      <VoiceToggle />
      <Transcript lines={SCRIPT} />

      {/* film grain on top */}
      <Grain />
      <FilmEvidence id="film" />
    </Stage>
  );
}
