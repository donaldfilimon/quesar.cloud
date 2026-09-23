/* Console navigation — routes, sidebar entries and page titles. Split out of
   Shell.tsx so that module exports only components (fast refresh). */
import {
  IActivity,
  IDb,
  ILayers,
  IMsg,
  ISettings,
  type IconComponent,
} from "./Icons.tsx";

export type Route = "overview" | "telemetry" | "personas" | "memory" | "settings";

type NavItem = readonly [route: Route, label: string, Icon: IconComponent];

export const NAV: NavItem[] = [
  ["overview", "Overview", IActivity],
  ["telemetry", "WDBX Telemetry", IDb],
  ["personas", "Personas", IMsg],
  ["memory", "Memory", ILayers],
  ["settings", "Settings", ISettings],
];

export const TITLES: Record<Route, string> = {
  overview: "Overview",
  telemetry: "WDBX Telemetry",
  personas: "Personas",
  memory: "Verifiable Memory",
  settings: "Settings",
};
