import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * `/tf-pose-demo`: PoseNet on the viewer's webcam, entirely in the browser.
 * Ported from mlai `src/views/TFPoseDemo.tsx` (b6f3686). Unlike mlai, the
 * camera is requested only after the visitor presses Start (`attempt > 0`).
 *
 * The `<video>` and `<canvas>` are rendered on every pass, loading and error
 * included, because setup reads them through refs; rendering them only once
 * loading finished meant setup always failed with "Media elements not found"
 * (measured 2026-09-17). `src/__tests__/tf-pose-demo.test.ts` pins that order.
 *
 * TensorFlow is imported dynamically here and nowhere else, so it stays out of
 * the main bundle (this view is itself lazy-loaded by the `ssr: false`
 * `/tf-pose-demo` route). `tf-pose-demo.test.ts` pins both.
 */

type Status = "idle" | "camera" | "model" | "running" | "error";

const STATUS_TEXT: Record<Exclude<Status, "error">, string> = {
  idle: "The camera is off. Press Start to request access.",
  camera: "Requesting camera access…",
  model: "Loading the pose model…",
  running: "Pose detection is running.",
};

const SKELETON: ReadonlyArray<readonly [number, number]> = [
  [5, 7], [7, 9], [6, 8], [8, 10], // arms
  [5, 6], [5, 11], [6, 12], [11, 12], // torso
  [11, 13], [13, 15], [12, 14], [14, 16], // legs
];

const MIN_SCORE = 0.5;

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

class DemoError extends Error {}

const TFPoseDemo = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    // Nothing touches the camera until the visitor opts in.
    if (attempt === 0) return;
    // The <video> is rendered unconditionally, so this node outlives the effect.
    const videoEl = videoRef.current;
    let cancelled = false;
    let stream: MediaStream | null = null;
    let frame = 0;
    let disposeNet: (() => void) | null = null;

    const fail = (message: string) => {
      if (cancelled) return;
      setError(message);
      setStatus("error");
    };

    const run = async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!video || !canvas || !ctx) {
        throw new DemoError("The demo could not start its video surface.");
      }

      setError(null);
      setStatus("camera");

      if (typeof navigator.mediaDevices?.getUserMedia !== "function") {
        throw new DemoError(
          window.isSecureContext
            ? "This browser does not support camera access."
            : "Camera access needs a secure (HTTPS) connection.",
        );
      }

      // Ask for the camera before downloading the model, so a denied or
      // missing camera is reported in seconds rather than after the download.
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      } catch (err) {
        throw new DemoError(describeCameraError(err));
      }
      if (cancelled) {
        // Cleanup ran while the permission prompt was open, before `stream` was set.
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      video.srcObject = stream;
      try {
        await video.play();
      } catch (err) {
        console.error("Video playback failed:", err);
        throw new DemoError("The camera started, but its video could not be played.");
      }
      if (cancelled) return;

      // PoseNet sizes a <video> input from its width/height attributes,
      // which default to 0, not from the intrinsic stream size.
      video.width = video.videoWidth || 640;
      video.height = video.videoHeight || 480;
      canvas.width = video.width;
      canvas.height = video.height;

      setStatus("model");
      let net: import("@tensorflow-models/posenet").PoseNet;
      try {
        await import("@tensorflow/tfjs");
        const { load } = await import("@tensorflow-models/posenet");
        net = await load({
          architecture: "MobileNetV1",
          outputStride: 16,
          inputResolution: 200,
          multiplier: 0.5,
        });
      } catch (err) {
        console.error("PoseNet load failed:", err);
        throw new DemoError(
          "The pose model could not be loaded. Check your connection, then try again.",
        );
      }
      disposeNet = () => net.dispose();
      if (cancelled) {
        disposeNet();
        return;
      }

      setStatus("running");

      const scaleX = () => canvas.width / (video.videoWidth || canvas.width);
      const scaleY = () => canvas.height / (video.videoHeight || canvas.height);

      const detect = async () => {
        if (cancelled) return;
        try {
          const pose = await net.estimateSinglePose(video, { flipHorizontal: false });
          if (cancelled) return;
          const sx = scaleX();
          const sy = scaleY();

          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          ctx.fillStyle = "rgba(0, 255, 0, 0.8)";
          for (const kp of pose.keypoints) {
            if (kp.score <= MIN_SCORE) continue;
            ctx.beginPath();
            ctx.arc(kp.position.x * sx, kp.position.y * sy, 5, 0, 2 * Math.PI);
            ctx.fill();
          }

          ctx.strokeStyle = "rgba(255, 0, 0, 0.6)";
          ctx.lineWidth = 2;
          for (const [i, j] of SKELETON) {
            const a = pose.keypoints[i];
            const b = pose.keypoints[j];
            if (!a || !b || a.score <= MIN_SCORE || b.score <= MIN_SCORE) continue;
            ctx.beginPath();
            ctx.moveTo(a.position.x * sx, a.position.y * sy);
            ctx.lineTo(b.position.x * sx, b.position.y * sy);
            ctx.stroke();
          }
        } catch (err) {
          // A single bad frame is not fatal; keep the loop alive.
          console.error("Pose detection error:", err);
        }
        if (!cancelled) frame = requestAnimationFrame(detect);
      };

      frame = requestAnimationFrame(detect);
    };

    run().catch((err: unknown) => {
      if (err instanceof DemoError) {
        fail(err.message);
      } else {
        console.error("Pose demo failed:", err);
        fail("The demo stopped unexpectedly. Try again.");
      }
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((track) => track.stop());
      if (videoEl) videoEl.srcObject = null;
      disposeNet?.();
    };
  }, [attempt]);

  const busy = status === "camera" || status === "model";

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <div
        className="relative aspect-[4/3] overflow-hidden rounded-[18px] border border-border bg-bg-elevated"
        data-state={status}
        aria-busy={busy}
      >
        {/* The video only feeds the canvas; the canvas is what is shown. */}
        <video
          ref={videoRef}
          playsInline
          muted
          aria-hidden="true"
          tabIndex={-1}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-0"
        />
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="Webcam view with detected body keypoints and skeleton drawn over it"
          className={`absolute inset-0 h-full w-full object-cover ${status === "running" ? "" : "invisible"}`}
        />
        {/* Both live regions stay mounted so every change is announced. */}
        <div
          className={`absolute inset-0 flex items-center justify-center p-6 text-center ${
            status === "running" ? "pointer-events-none" : ""
          }`}
        >
          <p
            role="status"
            className={
              status === "running" || status === "error"
                ? "sr-only"
                : "inline-flex items-center rounded-lg border border-border bg-bg px-4 py-2 text-sm text-fg"
            }
          >
            {status === "error" ? "" : STATUS_TEXT[status]}
          </p>
          <div
            role="alert"
            className={
              status === "error"
                ? "max-w-sm rounded-lg border border-destructive/40 border-l-4 bg-bg p-4 text-left text-sm text-destructive"
                : "sr-only"
            }
          >
            {status === "error" ? error : ""}
          </div>
        </div>
      </div>
      <div className="surface p-6">
        <h2 className="font-display text-xl text-fg">How it works</h2>
        <p className="mt-3 text-sm leading-relaxed text-fg-muted">
          TensorFlow.js runs the PoseNet model (MobileNetV1) on your webcam feed. It estimates seventeen body
          keypoints per frame, such as shoulders, elbows and knees, and draws the confident ones over the video.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-fg-muted">
          <strong className="text-fg">Privacy:</strong> no video or personal data leaves your browser. The model
          weights are downloaded from Google&apos;s public model storage. The camera stops when you leave this page.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-fg-muted">
          This is an isolated prototype, separate from the MLAI platform, not a production vision stack.
        </p>
        <div className="mt-6">
          <Button type="button" onClick={() => setAttempt((n) => n + 1)} variant="secondary" disabled={busy}>
            {status === "idle" ? "Start camera" : status === "error" ? "Try again" : "Restart demo"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TFPoseDemo;
