import { CinematicShell } from "../components/CinematicShell";
import { Explainer } from "../explainer/Explainer";

/** /showcase/explainer: ported from mlai apps/mlai/src/views. Client-only (canvas, WebAudio). */
export default function Room() {
  return (
    <CinematicShell>
      <Explainer />
    </CinematicShell>
  );
}
