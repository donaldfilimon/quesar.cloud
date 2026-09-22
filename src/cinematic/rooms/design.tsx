import { CinematicShell } from "../components/CinematicShell";
import { DesignHub } from "../design/DesignHub";

/** /showcase/design: ported from mlai apps/mlai/src/views. Client-only (canvas, WebAudio). */
export default function Room() {
  return (
    <CinematicShell background="#050509">
      <DesignHub />
    </CinematicShell>
  );
}
