# FOOTSTEPS_AMERICA.md
## Claude Code Build Reference — Footsteps Through America

**Read this entire document before writing any code.** This is the single source of truth for the project. When in doubt, this file wins. It is the sibling of FOOTSTEPS_PROJECT.md (the Bible story app) and deliberately reuses that app's proven architecture. Where this document says "same as Footsteps," clone the pattern from the Footsteps Bible app codebase (futurexrp/Adventure-Through-The-Bible).

---

## 1. WHAT THIS IS

Footsteps Through America is a family American history story app. True stories from 400 years of America, told in vivid present-tense narrative, professionally narrated with word-by-word highlight sync, organized as a chronological "Trail" through ten eras, gated by mastery quizzes, rewarded with badges and printable certificates.

- **Audience:** families with kids ages 5–12; homeschool families are the beachhead market.
- **Positioning:** "Patriot, not propaganda." Honest framing. We tell the proud parts and the hard parts. Hard chapters end with the people who endured and rebuilt — never in despair.
- **Business model:** one-time purchase ($29 placeholder, confirm before launch). No subscription, no ads. First 3 stories free.
- **Launch state:** paywall STRIPPED until launch (same as Footsteps). Build purchase flow but leave it disabled behind a flag.

## 2. STACK (clone of Footsteps Bible app)

- **Frontend:** static site, vanilla HTML/CSS/JS. GitHub Pages hosting.
- **Audio:** ElevenLabs MP3, one file per story per tier, with character-level timestamp JSON for word highlighting.
- **Progress/auth (Phase 2+):** Supabase.
- **Payments (launch):** Stripe one-time checkout.
- **No frameworks.** No React, no build step, no bundler. Single-page-ish app with JSON-driven content, same as Footsteps.

## 3. NON-NEGOTIABLE CONTENT RULES

These exist because they were learned the hard way on the Bible app:

1. **Audio is the source of truth.** Story JSON text must exactly match the recorded audio. If they diverge, fix the JSON, never re-record to match text edits after audio is final.
2. **NO EM DASHES in story paragraphs.** Em dashes cause ElevenLabs word-highlight drift. Use periods, commas, or restructure the sentence. This applies to story body text only; UI copy and this document may use them.
3. **Register:** Message-style. Vivid. Present tense. Zero commentary inside the story. Short declarative bursts. The story never preaches; the Connections block carries the character lesson.
4. **Honest framing rules:**
   - Hard stories (slavery, Trail of Tears, internment, etc.) open with a framing line that prepares the reader (pattern: "This story happened. It is hard to hear, and it is ours.") and close through endurance/rebuilding.
   - Never sanitize into falsehood; never wallow. Confession before accusation. No varnish, no despair.
   - Every fact must be defensible. When numbers are uncertain, use "about," "around," "roughly." Never invent quotes; paraphrase disputed ones ("A soldier who was there writes later that...").
5. **Every story ends with a Connections block:** one character trait + 2–3 sentences + one "Ask together:" discussion question for the dinner table.
6. **Two tiers, same trail:** ages 5–8 ("Little Footsteps") and ages 9–12 ("The Full Trail"). Same 50 story slots per tier; the 5–8 telling is shorter and gentler but never false. **Build the 9–12 tier first, 5 stories per session** (same cadence as Footsteps).

## 4. THE TRAIL — CONTENT STRUCTURE

Ten eras + capstone. 50 stories per tier (5 per era). Era metadata lives in `data/eras.json`; stories in `data/tier1/era-XX/story-YY.json` (tier1 = ages 9–12, tier2 = ages 5–8).

| # | Era | Years | Badge numeral |
|---|-----|-------|---------------|
| 1 | Colonies | 1607–1763 | I |
| 2 | The Revolution | 1763–1783 | II |
| 3 | A New Nation | 1783–1815 | III |
| 4 | Westward | 1815–1861 | IV |
| 5 | A House Divided | 1861–1865 | V |
| 6 | Rebuilding & Frontier | 1865–1900 | VI |
| 7 | Machines & Immigrants | 1900–1929 | VII |
| 8 | Depression & War | 1929–1945 | VIII |
| 9 | Freedom's Unfinished Work | 1945–1975 | IX |
| 10 | Modern America | 1975–Today | X |
| ★ | **Patriot Badge** (capstone) | all eras complete | ★ |

Three prototype stories are already written and approved for register: **The Crossing** (Era II), **The Conductor** (Era V), **The Long Walk** (Era IV). Use them as the canonical voice reference for all future stories.

## 5. STORY JSON SCHEMA

```json
{
  "id": "era02-story03",
  "era": 2,
  "slot": 3,
  "title": "The Crossing",
  "subtitle": "Christmas night, 1776",
  "tier": 1,
  "readMinutes": 5,
  "heroImage": "assets/art/era02-story03.webp",
  "paragraphs": [
    "It is Christmas night, 1776, and the American Revolution is almost dead.",
    "..."
  ],
  "audio": {
    "src": "audio/tier1/era02-story03.mp3",
    "timestamps": "audio/tier1/era02-story03.json"
  },
  "connections": {
    "trait": "Perseverance",
    "body": "Washington's soldiers did not feel brave that night. ...",
    "askTogether": "What is something hard you kept doing when quitting would have been easier?"
  },
  "sources": [
    "Note internal source references here; not rendered in app."
  ]
}
```

The `sources` array is new vs. the Bible app: every story carries its factual basis for the editorial audit trail. Not user-facing.

## 6. CARD FLOW (per story — same as Footsteps)

hero → story (with audio player) → connections → footer nav

1. **Hero card:** era label + story number, title, subtitle, hero art.
2. **Story card:** paragraphs rendered as spans-per-word for highlighting; sticky audio player.
3. **Connections card:** trait label, body, "Ask together" question styled as the oxblood-left-border block from the mockup.
4. **Footer nav:** prev/next story, back to Trail.

## 7. AUDIO + HIGHLIGHT SYNC (clone from Footsteps)

- ElevenLabs generation with character-level timestamps exported to per-story JSON.
- Playback sync: `requestAnimationFrame` polling at ~16ms, binary search over timestamp array to find the active word, toggle a `.lit` class. This is already implemented in the Bible app; port it directly.
- Word `.lit` style: oxblood background (#8A2E35), paper text (#F3ECDC), 2px radius.
- Narrator voice: warm, unhurried, storyteller register. Pick one ElevenLabs voice per tier and NEVER change it mid-tier.

## 8. BADGES, QUIZZES, CERTIFICATES

- Each era ends with a **25-question mastery quiz; pass at 80%** (20/25). Questions stored in `data/tier1/era-XX/quiz.json`. Multiple choice, 4 options, drawn from story facts only (never from Connections opinion content).
- Passing awards the era badge. All ten badges → **Patriot Badge** unlocks.
- **Printable certificates:** every era badge generates a printable certificate; the Patriot certificate is the premium one — most ornate, framing-quality. Implement as print-styled HTML pages (`certificates/era-XX.html`) with the child's name injected; `window.print()` flow. Use the design tokens below; Patriot certificate gets the brass + oxblood treatment with the 13-star arc.
- Progress persistence: localStorage first (Phase 1), Supabase sync later (Phase 3) — same migration path as Footsteps.

## 9. DESIGN SYSTEM (from approved mockup: footsteps-through-america-mockup.html)

The landing page mockup is the visual bible. Extract and reuse its tokens app-wide.

**Palette**
```
--paper:        #F3ECDC   (background)
--paper-deep:   #EAE0C9   (cards, wells)
--ink:          #202B3C   (text, dark buttons)
--ink-soft:     #3D4A5E   (secondary text)
--night:        #1A2333   (dark sections, story art)
--oxblood:      #8A2E35   (accent, highlights, CTA hover)
--brass:        #A8792B   (badges, rules, stars)
--brass-soft:   #C29A4E   (badge stroke on dark)
--rule:         #D8CCAF   (hairlines)
--paper-on-night: #EFE7D4 (light text on dark)
```

**Type**
- Display: Libre Caslon Display (Google Fonts). Caslon = the Declaration broadside typeface; this is deliberate, keep it.
- Body: Source Serif 4, 18px base, 1.65 line-height.
- Labels/UI: Archivo, 12–14px, 700, letter-spacing 0.14–0.22em, uppercase.

**Rules of restraint ("patriot, not annoying")**
- Stars appear ONLY in: footer 13-star line, Patriot badge, story-art corner ornament, certificates. Nowhere else.
- Red-white-blue appears ONLY as the 4px top rule (`.flagline`). Never as section backgrounds.
- No flag imagery, no eagles, no fireworks clip art. Patriotism lives in the typography, the palette, and the honesty.
- Signature element: the dashed brass Trail line connecting era badges. Reuse on the in-app Trail/progress screen.

**Logo:** Matt is creating the logo. A 44px circular slot exists in the nav (`.logo-slot`). Do not generate placeholder logo art beyond that slot.

## 10. REPO LAYOUT

```
/index.html              landing page (start from approved mockup)
/app/                    the story app shell
/data/eras.json
/data/tier1/era-01..10/  story JSON + quiz.json
/data/tier2/...          (built after tier1 complete)
/audio/tier1/            mp3 + timestamp json
/assets/art/             hero art (webp)
/certificates/           print-styled certificate pages
/js/                     player.js, highlight.js, trail.js, quiz.js, progress.js
/css/tokens.css          design tokens above
FOOTSTEPS_AMERICA.md     this file
CORRECTIONS.md           running editorial/factual corrections log (create empty)
```

## 11. BUILD PHASES

**Phase 1 — Shell + first era (ship this):**
landing page from mockup → app shell → Trail screen with all 10 badges (locked) → Era II ("The Revolution") fully playable with 5 stories including The Crossing → quiz + badge + certificate for Era II → localStorage progress. Free-access, no paywall.

**Phase 2 — Content march:** remaining tier1 eras, 5 stories per session. Audio generated per batch. CORRECTIONS.md discipline: any factual fix gets logged.

**Phase 3 — Accounts + sync:** Supabase auth + progress sync (port Footsteps pattern).

**Phase 4 — Launch:** Stripe one-time checkout, first-3-stories-free gate flag flipped on, tier2 (ages 5–8) content march begins.

## 12. WORKING PREFERENCES (Matt)

- Complete file replacements over surgical patches.
- One batch commit per session with a clear message.
- Ship first, iterate. Do not gold-plate Phase 1.
- Direct, honest feedback; flag factual risks in stories immediately and log them in CORRECTIONS.md.
- 5 stories per content session, tier1 (9–12) first.
- Never modify approved story text after audio is recorded; audio is the source of truth.

## 13. EDITORIAL GUARDRAILS (quick test for every new story)

1. Could a fair-minded historian call it accurate? If unsure, soften numbers with "about/around" or cut the claim.
2. Does it show, never lecture? All meaning-making belongs in Connections.
3. Would a 10-year-old keep listening? First sentence must hook.
4. If it's a hard chapter: does it open with honest framing and close through endurance? Does it honor the people wronged without flattening them into victims only?
5. Zero em dashes in paragraphs. Check before audio generation, every time.
