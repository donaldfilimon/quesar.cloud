export interface Probe {
  streams: {
    codec_type: string;
    duration?: string;
    width?: number;
    height?: number;
    avg_frame_rate?: string;
    nb_read_frames?: string;
  }[];
  format: { duration: string };
}
export interface Shot {
  id: number;
  start: number;
  end: number;
}
export interface VoiceReceipt {
  sampleRate: number;
  seconds: number;
  model: string;
  device: string;
  voice: string;
  speed: number;
  normalizedText?: string;
  processing?: { peak: number };
}
declare global {
  interface Window {
    ready: boolean;
    filmChapters: string[][];
    selections: Record<number, number[]>;
    filmTimeline?: { duration: number; chapters: Shot[] };
    renderFrame(time: number, duration?: number, edition?: string): void;
    exportPersonaPCM(
      who: string,
      text: string,
      options: { maxSeconds: number; timeoutMs: number },
    ): Promise<VoiceReceipt & { samples: Float32Array }>;
  }
}
