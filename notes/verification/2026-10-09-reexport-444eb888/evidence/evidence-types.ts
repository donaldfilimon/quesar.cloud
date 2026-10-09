import type { FilmCue } from "../../../../src/lib/mlai/categories/film-collection.ts";
export type CueMeasurement = FilmCue & {
  voice: string;
  speed: number;
  textHash: string;
  spokenHash: string;
  samples: number;
  seconds: number;
  overrun: boolean;
};
export type TimingReceipt = { catalogHash: string; rate: number; measurements: CueMeasurement[] };
export type ProbeStream = {
  codec_type: string;
  codec_name: string;
  width?: number;
  height?: number;
  avg_frame_rate?: string;
  nb_read_frames?: string;
  duration?: string;
};
export type MediaProbe = { streams: ProbeStream[]; format: { size: string } };
