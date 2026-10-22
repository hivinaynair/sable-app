# Learning log

What this project teaches about building AI agents and writing evals, one stage at
a time. Every lesson points at the decision, file or test that shows it, so you can
see it in context rather than take it on trust (D79, D80).

## Stage 0: planning, before any code

**1. Decide what "correct" means before building anything.**
The decision record (`docs/decisions.md`) and the journey spine
(`docs/journeys/thin-flow.yaml`) were written before a line of code. The spine has
114 numbered rules such as `J5.S4.c2`, and later every test cites the rule it proves.
Without this, an eval has nothing fixed to measure against. You end up grading the
agent against whatever you happened to think on the day.

**2. Let a mechanical checker find your mistakes.**
The journeys validator rejected my first spine: review entries pointed at steps in
other journeys. Fixing that exposed a real gap. Profile review and preferences had
no ownership check of their own and were relying on sign-in to protect them. Cheap
structural checks catch reasoning errors, but only if you run them.

**3. Read the framework's docs before designing around it.**
I assumed eve schedules could fire at each user's local time. They can't: an eve
cron runs in UTC and is fixed at build time (O1). The fix was eve's own documented
dispatcher pattern (D50), not a second scheduling system. Checking the real docs
first meant the design changed on paper rather than in code.

**4. Hard rules belong in code, not in the prompt.**
"Never submit an application" could be a line in the agent's instructions. Instead,
the research agent is simply never given a tool that can write to an external site
(I9, D31). A prompt can be talked out of a rule by a malicious job page. A tool that
doesn't exist can't be called. The eval for it then checks the registered tool list,
not the agent's behaviour.

**5. "Unknown" is a value, not a gap to fill.**
A timeout is not proof a job closed (D9). A missing sponsorship line doesn't mean
sponsorship is offered (D16). An inconclusive company match means rejection, not
admission (D64). Most of what makes an agent trustworthy is refusing to round
uncertainty into a confident answer.

**6. Layer evals by cost, and use a model judge last.**
The eval plan (`docs/evals-plan.md`) runs deterministic tests first, then frozen
real-world fixtures, then eve agent evals, and only then a model judge. Anything
code can check, code checks: it's free, fast and never wrong about its own
assertion. The judge is kept for things like "is this explanation grounded in the
résumé", which no assertion can express.

**7. A judge is a model too, so test it before you trust it.**
Judge evals only warn until their scores have been checked against examples you
labelled yourself (D77, D78). An uncalibrated judge can block good changes or wave
bad ones through, and it does both with a confident-looking number.

**8. Measure the outcome the user feels, not the activity.**
Coverage is measured as fresh, verified, relevant openings per user, against the
digest size that user chose (D62, D67). The number of companies tracked is a cost,
not a result. Measuring activity makes a pipeline look busy while it fails people.

## Stage 1, increment 1: the rules before the agent

**9. Keep the agent's judgements out of your rules.**
`packages/core` has no model calls at all. The agent and Jev will produce
*inputs*, such as "sponsorship: not_stated" or a relevance score, and pure functions
decide what happens next. That's why 53 tests run in half a second with no API key,
and why the most important promises (never pad, never repeat, never send an
unverified job) can be proven rather than hoped for. See
`packages/core/src/digest.ts` and `packages/core/src/availability.ts`.

**10. Name each test after the rule it proves.**
Every test title starts with a rule ID such as `J5.S2.c2`.
`scripts/gen-verification.mjs` turns those names into `docs/verification.json`, and
the journeys checker confirms every link resolves. Today 27 of 114 rules have a
test. Read that number as a coverage map: the missing 87 are the parts not built
yet, and the gap is visible rather than guessed.

**11. Test the edge cases the brief named, literally.**
The brief said a 403, CAPTCHA, blank page or single 404 is not proof of closure.
There's one test case for each (`availability.test.ts`). It said remote doesn't
mean worldwide, and the owner's own example (on-site in Singapore or Hong Kong,
with sponsorship) is the fixture for the eligibility tests. The daylight-saving
tests use real transition dates in London and New York. If a requirement is worth
writing down, it's worth one test with its exact wording.

**12. "Passed" isn't evidence until you've seen the count.**
Turborepo reported both tasks successful while showing only errors. A suite that
ran zero tests would have looked identical, so I re-ran it to see "53 passed". Get
in the habit of checking the number, not just the colour.
