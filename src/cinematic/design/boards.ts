import { lazy } from "react";
import type { designShots } from "../catalog";
const BrandBoard = lazy(() => import("./brand/BrandBoard"));
const DesignBoard = lazy(() => import("./board/DesignBoard"));
const ShowcaseBoard = lazy(() => import("./showcase/ShowcaseBoard"));
const HeroBoard = lazy(() => import("./hero/HeroBoard"));
const LabBoard = lazy(() => import("./lab/LabBoard"));
const Marketing = lazy(() => import("./marketing/Marketing"));
const Console = lazy(() => import("./console/Console"));
const Docs = lazy(() => import("./docs/Docs"));

export type Board = (typeof designShots)[number]["shot"]["board"];

export const BOARDS: Record<Board, React.LazyExoticComponent<() => React.ReactNode>> = {
  brand: BrandBoard,
  system: DesignBoard,
  showcase: ShowcaseBoard,
  hero: HeroBoard,
  lab: LabBoard,
  marketing: Marketing,
  console: Console,
  docs: Docs,
};
