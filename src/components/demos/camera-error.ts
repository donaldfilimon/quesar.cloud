/** Maps a getUserMedia / playback failure to a message a visitor can act on. */
export const describeCameraError = (err: unknown): string => {
  const name = err instanceof Error || err instanceof DOMException ? err.name : "";
  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
      return "Camera access was blocked. Allow camera access for this site in your browser settings, then try again.";
    case "NotFoundError":
    case "OverconstrainedError":
      return "No camera was found. Connect a camera, then try again.";
    case "NotSupportedError":
    case "TypeError":
      return "Camera access is not available in this browser.";
    case "NotReadableError":
    case "AbortError":
      return "The camera is in use by another application or could not be started.";
    default:
      return "The camera could not be started.";
  }
};
