import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { validateAdaptationEdit } from "./upgrade-edit-boundaries.mjs";

const cuts = [
  "kinetic-60",
  "editorial-60",
  "technical-120",
  "design-120",
  "technical-180",
  "design-180",
  "technical-600",
  "design-600",
];
async function load(cut) {
  const edit = JSON.parse(
    await readFile(
      new URL(`../trailer-editions-2026-10-09/artifacts/${cut}/edit.json`, import.meta.url),
      "utf8",
    ),
  );
  const timings = Object.fromEntries(
    await Promise.all(
      [...new Set(edit.chapters.map((c) => c.sourceFilm))].map(async (film) => [
        film,
        JSON.parse(
          await readFile(
            new URL(`../../../public/media/films/${film}.timing.json`, import.meta.url),
            "utf8",
          ),
        ).measurements,
      ]),
    ),
  );
  return { edit, timings };
}
test("actual technical-120 preserves the next chapter cue at 8.399999999999999 versus 8.4", async () => {
  const { edit, timings } = await load("technical-120");
  const cue = edit.cues.find((c) => c.id === "explainer-cue-03");
  assert.equal(edit.chapters[0].end, 8.4);
  assert.equal(cue.start, 8.399999999999999);
  assert.equal(edit.chapters[1].start, 8.4);
  const result = validateAdaptationEdit(edit, 120, timings);
  assert.equal(result.assignments.find((c) => c.id === cue.id).chapterIndex, 1);
});
for (const cut of cuts)
  test(`all original cues retained once with unique ownership: ${cut}`, async () => {
    const { edit, timings } = await load(cut);
    const result = validateAdaptationEdit(edit, Number(cut.split("-").at(-1)), timings);
    assert.equal(result.originalCueCount, edit.cues.length);
    assert.equal(result.assignments.length, edit.cues.length);
  });
for (const [label, mutate] of [
  [
    "one microsecond truncated end",
    (d) => {
      d.cues[0].end -= 1e-6;
    },
  ],
  [
    "one microsecond truncated start",
    (d) => {
      d.cues[0].start += 1e-6;
    },
  ],
  [
    "cue beyond film",
    (d) => {
      d.cues[0].end = 121;
    },
  ],
  [
    "cue before film",
    (d) => {
      d.cues[0].start = -1e-6;
    },
  ],
  [
    "NaN cue",
    (d) => {
      d.cues[0].start = NaN;
    },
  ],
  [
    "infinite cue",
    (d) => {
      d.cues[0].end = Infinity;
    },
  ],
  [
    "string timing",
    (d) => {
      d.cues[0].end = String(d.cues[0].end);
    },
  ],
  [
    "NaN chapter",
    (d) => {
      d.chapters[0].end = NaN;
    },
  ],
  [
    "chapter gap",
    (d) => {
      d.chapters[1].start += 0.01;
    },
  ],
  [
    "chapter overlap",
    (d) => {
      d.chapters[1].start -= 0.01;
    },
  ],
  [
    "original source cut truncation",
    (d) => {
      d.chapters[0].sourceEnd -= 0.001;
      d.chapters[0].end -= 0.001;
      d.chapters[1].start -= 0.001;
      d.chapters[1].sourceStart -= 0.001;
    },
  ],
  [
    "missing cue",
    (d) => {
      d.cues.shift();
    },
  ],
  [
    "duplicate cue",
    (d) => {
      d.cues.push({ ...d.cues[0] });
    },
  ],
  [
    "wrong source",
    (d) => {
      d.cues[0].sourceFilm = "film";
    },
  ],
  [
    "changed text",
    (d) => {
      d.cues[0].text += " changed";
    },
  ],
  [
    "changed measured duration",
    (d) => {
      d.cues[0].seconds -= 0.01;
    },
  ],
])
  test(`refuses ${label}`, async () => {
    const { edit, timings } = await load("technical-120");
    mutate(edit);
    assert.throws(() => validateAdaptationEdit(edit, 120, timings));
  });
test("refuses original source timing that exceeds its complete cue", async () => {
  const { edit, timings } = await load("technical-120");
  timings.explainer[0].seconds = 1000;
  assert.throws(() => validateAdaptationEdit(edit, 120, timings), /original narration timing/);
});

test("refuses reordered otherwise valid original cues", async () => {
  const { edit, timings } = await load("technical-120");
  [edit.cues[0], edit.cues[1]] = [edit.cues[1], edit.cues[0]];
  assert.throws(() => validateAdaptationEdit(edit, 120, timings), /Unordered/);
});

test("refuses a materially pre-boundary start instead of assigning it to the next chapter", async () => {
  const { edit, timings } = await load("technical-120");
  edit.cues.find((cue) => cue.id === "explainer-cue-03").start = 8.4 - 1e-6;
  assert.throws(() => validateAdaptationEdit(edit, 120, timings), /truncates narration/);
});

test("refuses an end crossing the adjacent chapter boundary by one microsecond", async () => {
  const { edit, timings } = await load("technical-120");
  edit.cues.find((cue) => Math.abs(cue.end - 8.4) < 1e-10).end = 8.4 + 1e-6;
  assert.throws(() => validateAdaptationEdit(edit, 120, timings), /truncates narration/);
});
