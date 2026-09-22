import { CinematicShell } from "../components/CinematicShell";
import { Trailer } from "../trailer/Trailer";

/** /showcase/trailer: ported from mlai apps/mlai/src/views. Client-only (canvas, WebAudio). */
export default function Room() {
  return (
    <CinematicShell>
      <Trailer />
    </CinematicShell>
  );
}
