# Editorial instrument: home and shell redesign (phase 5)

Decided with Donald on 2026-09-23: a full redesign of the home page and the site shell in the **editorial instrument** direction.

## Brief

- **Subject:** Quesar, MLAI's infrastructure for persistent AI. Abbey (the assistant) runs on ABI (orchestration), which runs on WDBX (a provenance-aware memory substrate).
- **Audience:** technical founders, developers and investors deciding whether this is real.
- **The page's one job:** make one idea land. *This memory can show where every answer came from.* Then route people to the architecture, the source, or the showcase.

## Tokens

| Name | Light | Dark | Role |
|---|---|---|---|
| Paper | `#F6F7F2` | `#111410` | page ground (olive-tinted, not cream, not neutral black) |
| Ink | `#171B15` | `#EEF0E8` | text |
| Moss | `#555D4F` | `#A9B1A0` | secondary text (≥ 4.5:1 on paper) |
| Rule | `#D8DCD0` | `#2A2F27` | hairlines, borders |
| Chain | `#1C6F8A` | `#6CC3D9` | the one accent: provenance links, focus, primary action |
| Signal | `#8A5A12` | `#E0B060` | status "partial" only |

**Type:**
- **Space Grotesk (display):** used large and tight as the page's voice.
- **IBM Plex Sans (text).**
- **IBM Plex Mono:** only for real data (hashes, record fields, commands), never for labels. It's self-hosted, which replaces JetBrains Mono from Google Fonts. One superfamily, so text and data read as one voice.
- **Scale:** 1.25 ratio from a 16px base: `2xs 11`, `xs 12`, `sm 14`, `base 16`, `lg 20`, `xl 25`, `2xl 31`, `3xl 39`, `4xl 49`, `display clamp(3rem, 7vw, 6.25rem)`. Body lines ≤ 68ch.

## Layout

The home page is left-aligned on a 12-column grid. Section heads sit in the left 5 columns and content runs across the right 7, like an annotated technical document.

```
[ H1 (7 cols, display)             ][ provenance chain (5) ]
[ lede + one CTA pair              ][  episode ─ hash ─ … ]
────────────────────────────────────────────────────────────
[ The problem (5) ][ session transcript vs. WDBX record (7)]
[ The stack  (5)   ][ chip cutaway: Abbey / ABI / WDBX  (7)]
[ Retrieval  (5)   ][ WDBX configuration facts table   (7) ]
[ Showcase   (5)   ][ trailer, click to play            (7) ]
[ Research   (5)   ][ three latest papers               (7) ]
[ Privacy    (5)   ][ mechanisms, each with its scope   (7) ]
[ Start here: developers · architecture · contact          ]
```

## Principles

1. **One memorable thing:** the hero's provenance chain, a real WDBX backtrace record. Everything else stays quiet: no grid, wash, vignette, cursor spotlight, film grain, stacked video or particle field.
2. **Structure carries information.** Numbering appears only where content is a sequence (the chain). Section labels are plain sentence-case words beside the heading, not tracked uppercase mono eyebrows.
3. **Motion answers the reader.** There's one load moment (the chain links draw in, skipped under reduced motion), no per-section fade-ups, and view transitions between routes.
4. **Honest copy.** VISION/ROADMAP and status labels stay, and no numbers appear that the source doesn't carry.

## Review against the generic defaults

- **Near-black with one bright accent:** the dark ground is olive graphite and the accent is a desaturated chain-cyan used only on provenance and action. Light mode is equally first-class.
- **Tracked uppercase mono eyebrows:** the current site's most visible tell. Removed site-wide via the `eyebrow`/label tokens.
- **SaaS card grid with identical rounded cards:** sections are editorial rows with hairlines. Surfaces are kept only where something is an object (the transcript, the chain).
- **Middle-dot meta strings and `→` on links:** avoided in new copy.

## What moves off the home page (moved, not deleted)

- The FAQ and the status-label legend go to `/company`.
- The control-plane and product-boundary sections go to `/platform`.
- The architecture diagram already lives on `/architecture`.
- The GitHub source panel and repo list already live on `/developers`.
- The persona grid already lives on `/abbey` and `/platform`.
- The origin quote already lives on `/company` and `/about`.
