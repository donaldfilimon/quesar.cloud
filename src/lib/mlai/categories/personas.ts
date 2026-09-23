/**
 * The three personas of the Abbey–Aviva–Abi framework.
 *
 * `personas` feeds `PersonaGrid` (docs catalog and /abbey); `companionPersonas`
 * is the shorter CLI-persona framing on /abbey. Moved verbatim from
 * `src/lib/content.ts`. The cinematic film keeps its own literal persona table
 * (`src/cinematic/film/scenes/extra.tsx`, different fields and trait copy).
 */
export const personas = [
  {
    id: "abbey",
    name: "Abbey",
    role: "Empathic polymath",
    color: "abbey" as const,
    body: "High-EQ tutor and partner. Scaffolds, names uncertainty, and keeps the human in the loop.",
  },
  {
    id: "aviva",
    name: "Aviva",
    role: "Unfiltered expert",
    color: "aviva" as const,
    body: "Direct, concise, unhedged. Fewer tokens by design. Facts without preamble.",
  },
  {
    id: "abi",
    name: "Abi",
    role: "Adaptive moderator",
    color: "abi" as const,
    body: "Routes and blends. Classifies intent, applies policy, and reports what the ledger can prove.",
  },
] as const;

export const companionPersonas = [
  {
    name: "Abbey",
    body: "Care first. Scaffolded teaching, frustration detection, and a named uncertainty budget.",
  },
  {
    name: "Aviva",
    body: "Clarity always. Strip hedges. Answer the question that was asked.",
  },
  {
    name: "Abi",
    body: "Competence throughout. Route, blend, refuse, and leave a trace.",
  },
] as const;
