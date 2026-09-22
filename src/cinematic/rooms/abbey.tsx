import { CinematicShell } from "../components/CinematicShell";
import { AbbeyTrailer } from "../abbey-trailer/AbbeyTrailer";

/** /showcase/abbey: ported from mlai apps/mlai/src/views. Client-only (canvas, WebAudio). */
export default function Room() {
  return (
    <CinematicShell>
      <AbbeyTrailer />
    </CinematicShell>
  );
}
