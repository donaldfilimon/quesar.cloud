import { CinematicShell } from "../components/CinematicShell";
import { Mega } from "../mega/Mega";

/** /showcase/mega: ported from mlai apps/mlai/src/views. Client-only (canvas, WebAudio). */
export default function Room() {
  return (
    <CinematicShell background="#030408">
      <div id="video-root" className="absolute inset-0">
        <Mega />
      </div>
    </CinematicShell>
  );
}
