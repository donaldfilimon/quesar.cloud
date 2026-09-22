import { CinematicShell } from "../components/CinematicShell";
import { Film } from "../film/Film";

/** /showcase/film: ported from mlai apps/mlai/src/views. Client-only (canvas, WebAudio). */
export default function Room() {
  return (
    <CinematicShell>
      <Film />
    </CinematicShell>
  );
}
