---
name: skill-creator
description: >
  Create, improve, and ship MLAI agent skills and the MLAI company site.
  Use whenever the user asks to create a skill, update a skill, improve
  website design, restyle MLAI pages, write MLAI copy, add a product page,
  audit brand integrity, or mentions WDBX, ABI, Abbey, Aviva, Abi, provenance
  tags, Apple Silicon framing, or the MLAI design system.
license: Apache-2.0
---

# Skill Creator — MLAI

Build skills and MLAI surfaces that an engineer would trust. This skill is
the onboarding guide: integrity first, then design, then copy.

Load `references/` on demand. Do not dump every reference into context.

| Need | Open |
|---|---|
| Facts, metrics, stack, raise | `references/MLAI-master-reference.md` |
| Tokens, surfaces, components | `references/01-design-system.md` |
| Logo, color, integrity rules | `references/02-brand-guidelines.md` |
| Voice, tone by surface | `references/03-brand-voice.md` |
| Audit checklist | `references/04-brand-review.md` |
| Product + site architecture | `references/05-system-design.md` |
| Component specs, responsive | `references/06-design-handoff.md` |

---

## Integrity (non-negotiable)

1. **Apple.** Only: *"Built on Apple's public frameworks — Metal, Accelerate, Core ML."* No partnership, endorsement, sponsorship, or employer claim.
2. **Provenance.** Every number is `measured` ● / `target` ○ / `reported` ◆. A target is never a result. The 295× GPU figure and all ARR / unit-economics numbers are targets.
3. **License.** Apache-2.0, not MIT.
4. **Zig.** `0.17-dev` (or the pinned `0.17.0-dev.…` string). Never a stale version.
5. **WDBX.** Do not expand the acronym in body copy until one expansion is canonical.
6. **Facts live in data.** Metrics belong in a typed `Stat` with `provenance`. Components render; they do not invent claims. New prose introduces zero new numbers.

---

## When creating a skill

1. Name it `kebab-case`. Keep the folder `skill-name/SKILL.md`.
2. Frontmatter requires `name` and `description`. The description is the trigger: what it does **and** when to use it. Be specific. Third person.
3. Body under 500 lines. Push depth into `references/`, `scripts/`, or `assets/`.
4. Progressive disclosure: metadata always loaded, body on trigger, references on demand.
5. Include a skip list: when **not** to use the skill.
6. Encode hard rules as a short checklist, not a speech.

```
skill-name/
├── SKILL.md          required
├── references/       loaded as needed
├── scripts/          deterministic helpers
└── assets/           templates, marks, fonts
```

---

## When creating or editing the MLAI site

Read `01-design-system.md` and `02-brand-guidelines.md` before writing UI.
Read `03-brand-voice.md` before writing copy.
Read `MLAI-master-reference.md` before stating a number.

### Visual contract

- Dark refined-technical. Ink `#05070B`, panel `#0A0E16`, line `rgba(255,255,255,0.08)`.
- Accents are product-scoped: WDBX cyan `#00D4FF`, ABI violet `#7C3AED`, Abbey emerald `#10B981`. One accent per page body. The three meet only in the chip-stack logo, the homepage product grid, and the footer brand-seam.
- Type: Sora (display), Manrope (body), JetBrains Mono (code, eyebrows, provenance).
- Surfaces: `.surface`, `.surface-hover`, `.accent-edge`, `.brand-seam` once.
- Hero art is a spec card, not an illustration. No canvas graphs. No gradient-blob filler.
- Nav hamburger below `lg`. Container `max-w-6xl`, gutters `px-6`, sections `py-20→24`.
- FAQ is native `<details>`. Pull quotes are unattributed.

### IA

`/` · `/wdbx` · `/abi` · `/abbey` · `/platform` · `/architecture` · `/company` · `/investors` · `/services` · `/research` · `/contact` · `/opportunity-pilot` (field system, not a fourth product)

Opportunity Pilot is how the ABI contract looks in a chair: local scores, labeled simulation, no auto-send.

### Voice

An engineer who tells you the truth, including the parts that are still a target. Mechanism first, then the name. Short sentences. Privacy is where the computation runs, not a policy.

Banned: revolutionary, game-changing, blazing-fast, synergy, best-in-class, Apple partnership language, GLUE tables from older drafts.

---

## Review gate (before you call it done)

- [ ] Every metric has a provenance tag
- [ ] Apple sentence is the approved sentence, or absent
- [ ] Apache-2.0 and Zig 0.17-dev if mentioned
- [ ] WDBX is not expanded
- [ ] One accent in the page body
- [ ] Mobile ~390px: no overflow, tap targets ≥ 44px
- [ ] `prefers-reduced-motion` honored
- [ ] No new numbers that are not in the master reference

If a number is not in `references/MLAI-master-reference.md`, do not ship it.
