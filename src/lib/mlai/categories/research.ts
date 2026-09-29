import type { Research } from "../schemas";
import { researchRecords } from "./research-records";

/** Audited public corpus; each record pins its source commits and review date (`research-records.ts`). */
export const research: Research = researchRecords;
