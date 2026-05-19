# WRITEUP.md

## Three Trade-offs

### 1. Zustand over React Context for session state
**Decision:** Used Zustand with the `persist` middleware.
**Why:** Zustand's `persist` handles localStorage serialization and re-hydration
automatically, enabling the resume-on-refresh requirement with ~5 lines of code.
Context + useReducer would require a manual `useEffect` sync to localStorage and
a hydration-check guard to prevent SSR mismatch — both are fragile and verbose.
**Trade-off:** Adds a dependency. For a larger team, Context is more familiar and
requires no external library, but the persistence boilerplate cost is high.

### 2. Branching resolved server-side, not client-side
**Decision:** The `resolveNextScreen` logic lives in `SessionService`, not the
frontend form engine.
**Why:** Healthcare eligibility decisions should not run only in JavaScript that a
user can inspect or bypass. The server is authoritative. The frontend drives UX;
the backend enforces rules.
**Trade-off:** Every screen advance requires a network round-trip. With a ~10ms
LAN latency this is imperceptible; over a mobile connection it could add
visible delay. Mitigation: show a loading state (aria-busy) on the Next button.

### 3. JSON schema as the single source of truth
**Decision:** `form-schema.json` is imported by both the NestJS API and the
Next.js frontend via a TypeScript path alias.
**Why:** Eliminates the drift risk of maintaining two separate screen definitions.
A change to one option label is one file change.
**Trade-off:** Creates a build-time coupling between the two apps. In a true
microservices architecture, the frontend would fetch the schema from an API
endpoint (GET /api/form-schema). Kept as a file import to save time and match
the monorepo scope of this assessment.

---

## What I'd Do Differently With Another Week

- **Property-based tests** using `fast-check` to fuzz the eligibility evaluator
  with thousands of randomly generated `FormAnswers` objects and assert that
  results always fall into the three valid states with consistent reasons.
- **GET /api/form-schema endpoint** to decouple frontend from the JSON file and
  allow schema updates without a frontend rebuild.
- **Optimistic UI** on the Next button: update the Zustand store before the API
  responds, then roll back on error. Reduces perceived latency.
- **Full Storybook coverage** for every input component, enabling visual
  regression testing.
- **An ADR for the Zustand decision** (see above) as a formal Architectural
  Decision Record.

---

## AI Tools Used

| Stage | Tool | What I used it for |
|---|---|---|
| Initial scaffold | Claude Code | Generated monorepo structure, package.json, docker-compose |
| Evaluator logic | Claude API (claude-sonnet-4-20250514) | Draft of pure function, then heavily reviewed and corrected branch ordering |
| Unit tests | Claude Code | Generated skeleton test cases; I wrote the edge cases and ordering tests manually |
| Playwright helpers | GitHub Copilot | Autocomplete on selector patterns |
| WRITEUP.md | Manual | Written entirely by me |

**Where AI helped:** Boilerplate that would have taken 45 minutes (NestJS module
wiring, Prisma service, Zustand store shape) took 8 minutes. The AI got the
structure right and I focused on correctness.

**Where AI slowed me down:** The first draft of the evaluator had the GLP-1 check
inside `checkImmediateIneligibility` but returning `Requires Clinical Review`
— a logical contradiction. I caught it in code review. The lesson: the evaluator
needed my eyes, not just the model's output.

---

## Spec Ambiguities & Resolutions

### Ambiguity 1 — BMI boundary between screens 3 and 4
**Issue:** Screen 3 takes height, Screen 4 is a computed BMI step. The spec says
Screen 4 branches on BMI, but the UI shows Screen 4 as its own screen. What does
the user see on Screen 4 if the BMI is already calculated? Is it a loading state,
a confirmation, or is it skipped?
**Resolution:** Screen 4 is a non-interactive computed screen that displays the
calculated BMI value for 2 seconds, then auto-advances. This gives the user
transparency about their BMI (important in a health context) without requiring
any action. The branching happens server-side when Screen 3's answer is submitted.

### Ambiguity 2 — "Daily alcohol + moderate/high risk factors"
**Issue:** The spec says "Daily alcohol + moderate/high risk factors → Review"
but never defines what "moderate/high risk factors" means numerically.
**Resolution:** Defined as any of: BMI >= 30, at least one comorbid condition,
or current smoker. This aligns with standard clinical framing of "metabolic
risk burden." The evaluator comment documents this decision explicitly.

### Ambiguity 3 — Multiple BP categories selected simultaneously (e.g. Normal + Hypertensive Crisis)
**Issue:** Screen 9 is a checkbox (multi-select). A user could check both
"Normal" and "Hypertensive Crisis." The spec gives no guidance on precedence.
**Resolution:** The most severe selection dominates. If "Hypertensive Crisis"
is checked alongside any other option, the result is Clinical Review. This
matches clinical triage logic: a patient who reports ever having a hypertensive
crisis reading requires review regardless of their most recent normal reading.
This decision is documented and tested in `edge-cases.spec.ts`.
