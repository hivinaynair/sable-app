# Decision record — personalised job digest

Users who are job-hunting get generic, stale or repeated job alerts and cannot tell
whether a listing is still open, whether they are eligible, or who to talk to.
Intended outcome: a subscriber receives, on their own schedule, up to N job
recommendations that are currently open, that they are plausibly eligible for, each
explaining its fit and its gaps, and none of which they have been sent before.

Scope of this record: v1 of the product described in the owner brief of 2026-10-21.
Authority: the product owner (brief author) owns product policy. The implementer owns
internal technical choices and records them here as draft until confirmed.

## Verification performed 2026-10-21

Source-backed findings that constrain the decisions below. These are observations,
not approved policy; they move into the journey spine as O IDs.

- `decide` and `journeys` skills read from `hivinaynair/agentic-skills` at clone
  of 2026-10-21. Both accessible. Validator requires Bun; Bun 1.x is present.
- eve is real and current: `github.com/vercel/eve`, commit `7b8a520`, 2026-10-21.
  `docs/schedules.mdx` confirms `defineSchedule` takes a standard 5-field cron,
  minute granularity, and that **Vercel evaluates cron expressions in UTC**, and
  that **`eve dev` never fires schedules on their cron cadence**.
- eve durable execution confirmed: `docs/concepts/execution-model-and-durability.mdx`
  states every session runs as one durable workflow on the Workflow SDK, checkpointed
  at step boundaries, surviving restarts and redeploys.
- eve's own documented answer for per-user schedule times is the dispatcher pattern
  in `docs/patterns/dynamic-scheduling.md`: one authored `defineSchedule` at
  `* * * * *`, application-owned rows, `claimDue` atomic lease, `to(...).send(...)`.
  That doc states delivery is **at least once** and that side-effecting work needs
  application-level idempotency.
- `defineDynamicSchedules` (`docs/experimental/dynamic-schedules.mdx`) supports
  `{ type: "cron", cron, timezone }` with IANA timezones, but is explicitly
  experimental and **gated behind an organisation-level Vercel feature flag**.
- Sandbox trust boundary confirmed: `docs/concepts/security-model.md` states the
  sandbox gets no `process.env`, no secrets and no path back to the app runtime;
  tools execute in the app runtime and proxy into the sandbox. Network is
  policy-controlled; `setNetworkPolicy("deny-all")` and per-domain allow lists exist.
- `@agent-browser/eve` exists on npm at 0.39.1. The eve integration entry
  (`apps/docs/lib/integrations/data.ts`) documents `browser({ allowedDomains,
  contentBoundaries, maxOutputChars })` and tools `browser__navigate`,
  `browser__snapshot`, `browser__click`, `browser__fill`, `browser__find`,
  `browser__screenshot`, and states it requires a sandbox backend with real process
  execution such as Vercel Sandbox.
- ATS feed shapes are confirmed only from secondary sources, because this container's
  egress gateway blocked `boards-api.greenhouse.io`, `api.lever.co`,
  `api.ashbyhq.com`, `docs.greenhouse.io` and `developers.ashbyhq.com`. Reported
  shapes: Greenhouse `GET https://boards-api.greenhouse.io/v1/boards/{token}/jobs?content=true`;
  Lever `GET https://api.lever.co/v0/postings/{site}?mode=json`; Ashby
  `GET https://api.ashbyhq.com/posting-api/job-board/{slug}?includeCompensation=true`.
  All unauthenticated, none support server-side search. **Unverified against primary
  docs — must be re-verified in the dev environment before the catalogue is built.**

## Decisions

| ID | Status | Decision | Why | Alternatives | Source | Date | Supersedes |
|---|---|---|---|---|---|---|---|
| D1 | accepted | Clerk for authentication | Owner requirement | Auth.js and Supabase Auth not considered | Owner brief | 2026-10-21 | |
| D2 | accepted | Vercel eve is the agent framework and is not replaced by a direct model-call loop | Owner requirement; eve supplies durable sessions and tool permissioning | A bare AI SDK loop: rejected by owner | Owner brief | 2026-10-21 | |
| D3 | accepted | Vercel Sandbox is the agent's isolated computer, with @agent-browser/eve providing the in-sandbox browser | Owner requirement; sandbox boundary keeps secrets out of browser context | Hosted browser services such as Browserbase: rejected by owner | Owner brief | 2026-10-21 | |
| D4 | accepted | Shared job discovery and verification is separate from per-user matching, over one reusable catalogue | Avoids re-researching the internet per subscriber and makes verification cacheable | Per-user independent research: rejected by owner | Owner brief | 2026-10-21 | |
| D5 | accepted | An employer registry holds verified company identity, website, careers page and ATS board, and resolves namesakes explicitly | Namesake confusion produces confidently wrong recommendations | Matching companies by name string: rejected by owner | Owner brief | 2026-10-21 | |
| D6 | accepted | Public structured ATS feeds are the preferred extraction path; official HTML or structured job data otherwise | Cheapest reliable evidence of a current opening | Aggregators as primary source: rejected by owner | Owner brief | 2026-10-21 | |
| D7 | accepted | Directories and aggregators may supply leads but can never establish that a job is open | Aggregator staleness is the main cause of dead recommendations | Treating aggregator listings as openings: rejected by owner | Owner brief | 2026-10-21 | |
| D8 | accepted | The sandbox browser is used selectively, only when simpler retrieval returns incomplete content or a JavaScript shell | Browser sessions are the expensive operation | Browser-first verification: rejected on cost | Owner brief | 2026-10-21 | |
| D9 | accepted | Availability is a tri-state: verified_open, confirmed_closed, uncertain. A timeout, 403, CAPTCHA, blank page or single 404 is not proof of closure | Honest uncertainty beats a false closure or false opening | Boolean open flag: rejected by owner | Owner brief | 2026-10-21 | |
| D10 | accepted | Original publication date, update date, first-seen date and last-verification time are stored as distinct fields; a refreshed listing is not a new vacancy | Refresh-driven churn would resurface old roles as new | Single updated_at field: rejected by owner | Owner brief | 2026-10-21 | |
| D11 | accepted | Research is strictly read-only: no applications, résumé uploads, account creation, employer contact or changes to external accounts | Owner requirement and legal exposure | Auto-apply: excluded, see X3 | Owner brief | 2026-10-21 | |
| D12 | accepted | Access restrictions are respected; authentication and anti-bot controls are never bypassed | Owner requirement | Bypassing controls: rejected by owner | Owner brief | 2026-10-21 | |
| D13 | accepted | Hard eligibility constraints are applied as filters before ranking, and are never relaxed to fill a digest | A padded digest destroys the product's trust claim | Soft-weighting constraints into the score: rejected by owner | Owner brief | 2026-10-21 | |
| D14 | accepted | The requested count is up to N strong new matches, not a quota. Shortfalls are explained | Owner requirement | Always ship exactly N: rejected by owner | Owner brief | 2026-10-21 | |
| D15 | accepted | Digest size defaults to 10 | Owner requirement | | Owner brief | 2026-10-21 | |
| D16 | accepted | Unknown salary, sponsorship and country eligibility are preserved as unknown, never inferred. A sponsorship question on a form does not prove sponsorship is offered | Inferring eligibility misleads the user about their chances | Guessing from company or role norms: rejected by owner | Owner brief | 2026-10-21 | |
| D17 | accepted | Deduplication and recommendation/application history operate at the exact-opening level, not the employer level | Owner requirement; employer-level exclusion would hide valid roles | Employer-level suppression: rejected by owner | Owner brief | 2026-10-21 | |
| D18 | accepted | v1 history comes from user-entered application history plus the app's own delivery records | Owner requirement | Mailbox scanning: excluded, see X2 | Owner brief | 2026-10-21 | |
| D19 | accepted | Delivery stores a local time plus an IANA timezone and handles daylight-saving transitions | Owner requirement | Storing UTC only: rejected, loses user intent across DST | Owner brief | 2026-10-21 | |
| D20 | superseded | Daily delivery in v1 | Owner requirement | Weekday or selected-day delivery: deferred, see Q8 | Owner brief | 2026-10-21 | |
| D21 | accepted | Profiles, jobs, recommendations, digest contents and send state live in Postgres, not in an agent filesystem or a long-running browser | Owner requirement; sandboxes are not permanent desktops | Agent-filesystem state: rejected by owner | Owner brief | 2026-10-21 | |
| D22 | accepted | Email is sent by a separate controlled tool that checks opt-in, pause and unsubscribe status, verifies the recipient, and enforces duplicate-send protection with an idempotency key | Owner requirement; prevents the agent from mailing people directly | Letting the research agent send mail: rejected by owner | Owner brief | 2026-10-21 | |
| D23 | accepted | Uncertain sends are reconciled before any retry | Owner requirement | Blind retry: rejected, duplicates digests | Owner brief | 2026-10-21 | |
| D24 | accepted | Clicking an application link is not recorded as proof of application submission | Owner requirement | Click equals applied: rejected by owner | Owner brief | 2026-10-21 | |
| D25 | accepted | Contacts are included only with an exact verified profile URL or a genuinely published professional email. Addresses are never guessed. Missing contact is acceptable | Guessed addresses are the highest-harm failure in this product | Pattern-derived email addresses: rejected by owner | Owner brief | 2026-10-21 | |
| D26 | accepted | Someone explicitly hiring is distinguished from a potentially relevant team member, and current affiliation plus recruiting function are verified | Owner requirement | One undifferentiated contact field: rejected by owner | Owner brief | 2026-10-21 | |
| D27 | accepted | Only visible application-form questions and AI-assistance restrictions are recorded; an inaccessible form is never implied to have been inspected | Owner requirement | Assuming standard form contents: rejected by owner | Owner brief | 2026-10-21 | |
| D28 | accepted | Extracted profiles separate professional experience from personal projects, demos and work in progress, and no accomplishment or qualification is ever invented | Owner requirement; fabricated credentials are unacceptable | Flat experience list: rejected by owner | Owner brief | 2026-10-21 | |
| D29 | accepted | The user reviews and corrects the extracted profile before it is used for matching | Owner requirement; extraction errors would propagate into every digest | Trusting extraction silently: rejected by owner | Owner brief | 2026-10-21 | |
| D30 | accepted | Onboarding never asks again for information already available from the résumé or a prior answer | Owner requirement | Fixed questionnaire: rejected by owner | Owner brief | 2026-10-21 | |
| D31 | accepted | Agent tool permissions are enforced in code, not only in prompts | Owner requirement; prompt-only limits are bypassable by injection | Prompt-level instruction only: rejected by owner | Owner brief | 2026-10-21 | |
| D32 | accepted | External pages and uploaded documents are treated as untrusted data, never as instructions | Prompt-injection defence | Trusting page text: rejected by owner | Owner brief | 2026-10-21 | |
| D33 | accepted | Sandbox network access is restricted, private and internal destinations are blocked, and secrets stay out of browser-visible output and agent files | Owner requirement; SSRF and secret-leak defence | Open egress: rejected by owner | Owner brief | 2026-10-21 | |
| D34 | accepted | The sandbox never uses the owner's computer, personal browser, cookies or logins | Owner requirement | Reusing a personal browser profile: rejected by owner | Owner brief | 2026-10-21 | |
| D35 | accepted | Per-user private data is isolated; uploads are validated; retention is minimised; logs are redacted; AI processing is disclosed; deletion is supported | Owner requirement | | Owner brief | 2026-10-21 | |
| D36 | accepted | Explicit limits are set for runtime, pages visited, retries, model usage, concurrency and spending | Owner requirement; bounds untrusted-input-driven work | Unbounded research: rejected by owner | Owner brief | 2026-10-21 | |
| D37 | accepted | Public job and company enrichment is shared and reusable; private profiles stay isolated | Owner requirement; makes per-user cost tractable | Per-user private caches of public data: rejected on cost | Owner brief | 2026-10-21 | |
| D38 | accepted | Mock data and verified integration results are clearly labelled wherever they appear | Owner requirement | Unlabelled fixtures: rejected by owner | Owner brief | 2026-10-21 | |
| D39 | accepted | No paid service is provisioned and nothing is deployed publicly without asking first | Owner requirement | | Owner brief | 2026-10-21 | |
| D40 | accepted | Each recommendation carries company, role, direct application URL, grounded fit explanation, material gaps and constraints, published compensation or undisclosed, location and remote restrictions, sponsorship evidence or uncertainty, relevant product and verified funding context when useful, a verified hiring contact when available, and supporting sources with last-verification date | Owner requirement | | Owner brief | 2026-10-21 | |
| D41 | accepted | Relevance is judged from actual responsibilities, stack, frontend/backend balance, seniority, domain and product team, not from the job title | Owner requirement; a frontend role at a payments company may be AI work | Title-based matching: rejected by owner | Owner brief | 2026-10-21 | |
| D42 | accepted | Remote is never treated as worldwide; geographic restrictions are preserved | Owner requirement | | Owner brief | 2026-10-21 | |
| D43 | accepted | AI is used for evidence-based extraction, relevance assessment and explanation, with structured validation around its output | Owner requirement | Unvalidated model output: rejected by owner | Owner brief | 2026-10-21 | |
| D44 | accepted | Users can mark jobs interested, not relevant, already applied or already contacted, with optional reasons | Owner requirement | | Owner brief | 2026-10-21 | |
| D45 | accepted | Users can preview an initial digest immediately during onboarding | Owner requirement | | Owner brief | 2026-10-21 | |
| D46 | accepted | Users can edit preferences, pause and resume delivery, and unsubscribe easily | Owner requirement | | Owner brief | 2026-10-21 | |
| D47 | accepted | Résumé upload accepts PDF and DOCX, with manual entry as a fallback | Owner requirement | | Owner brief | 2026-10-21 | |
| D48 | accepted | Shortlisted jobs are revalidated near delivery under a defined freshness policy, and verification results are cached and shared across users | Owner requirement; one browser session per user per job is unaffordable | Verify per user at send time: rejected on cost | Owner brief | 2026-10-21 | |
| D49 | accepted | A verified live listing is never presented as a guarantee of interview or hire | Owner requirement | | Owner brief | 2026-10-21 | |
| D50 | accepted | Per-user delivery times are driven by eve's documented application-managed dispatcher pattern: one authored defineSchedule at minute cadence, due rows claimed under an atomic Postgres lease | eve cron is UTC and fixed at build time, so it cannot express per-user local times; this is eve's own documented pattern, so no second orchestration system is introduced | defineDynamicSchedules supports IANA timezones directly but is experimental and feature-flag gated, so it is unsuitable for v1; an external scheduler such as Inngest or Temporal would add the orchestration system the owner asked to avoid | Implementer, builder-owned internal choice, from eve docs/patterns/dynamic-scheduling.md and docs/schedules.mdx | 2026-10-21 | |
| D51 | accepted | Next.js with TypeScript, Postgres, private object storage for résumés, and a transactional email provider | Owner-suggested defaults; Postgres gives the atomic lease D50 needs | Serverless KV instead of Postgres: weaker leasing and relational history; a non-Vercel host would complicate eve deployment and Vercel Sandbox access | Implementer, builder-owned internal choice, from owner brief | 2026-10-21 | |
| D52 | accepted | Digest rendering and delivery is deterministic application code reading persisted recommendation rows, not a model call at send time | Makes duplicate-send protection and idempotency testable, and keeps send cost near zero | Agent composes the email at send time: rejected, non-deterministic and unverifiable | Implementer, builder-owned internal choice | 2026-10-21 | |
| D53 | accepted | v1 covers three job families: software engineering, design and product management. Each family has its own relevance configuration and onboarding question branch; a given user targets the families they select | Owner answer to Q1 | A single narrow segment: rejected by owner | Owner answer | 2026-10-21 | |
| D54 | accepted | Greenfield repository, scaffolded fresh. No existing Clerk, Postgres or Vercel project is assumed | Owner answer to Q2 | Building inside an existing app: not applicable | Owner answer | 2026-10-21 | |
| D55 | accepted | Total running cost stays under 20 USD per month during v1, dev-only usage. Caps on employer-set size, pages visited, browser sessions, model calls and concurrency are enforced in code and fail closed when exceeded | Owner answer to Q3; makes D36 concrete | A higher ceiling: rejected by owner for v1 | Owner answer | 2026-10-21 | |
| D76 | accepted | v1 supports daily, weekday-only and selected-day delivery. The schedule stores a set of weekdays plus the local time and IANA timezone of D19, and the delivery day is evaluated in the subscriber's own timezone, never as the UTC day. The missed-run grace window of D74 and the per-date idempotency key of D75 apply per selected delivery day | Owner answer to Q8; a feature many job-seekers use, and the timezone day-boundary cases are tested directly rather than deferred | A stored day set with daily-only UI, daily only with a later migration, or a weekdays-only toggle: all rejected by owner | Owner answer | 2026-10-22 | D20 |
| D74 | accepted | A missed or interrupted scheduled run is sent late if it recovers within a grace window, defaulting to 6 hours after the scheduled local delivery time. Past the window the digest is skipped and its unsent matches fold into the next scheduled digest, still subject to freshness and the no-repeat rule. The 6 hour figure was offered as an example in the question and can be changed without changing the policy | Owner answer to Q7; a short delay is better than a lost day, while a digest arriving many hours late reads as stale and risks two digests close together | Always sending late, always dropping, or dropping with a notice in the next digest: all rejected by owner | Owner answer | 2026-10-22 | |
| D75 | accepted | The send idempotency key of D22 is derived from the subscriber and the scheduled local delivery date, so a late send, a retry of the same scheduled day and the next day's run can never collide or double-send. Folded matches are claimed by the next date's key, not the missed one | Follows from D74 combined with the at-least-once dispatch observed in O5 | A key derived from the run attempt: rejected, a retry would mint a new key and double-send | Implementer derivation from D74 and D22 | 2026-10-22 | |
| D73 | accepted | Hiring-contact enrichment is not in the first shippable version. Recommendations ship without a contact until verification and ranking are trustworthy, after which enrichment is added under the existing rules of D25 and D26. This defers the capability, not the policy, so X4 still forbids any outreach | Owner answer to Q9; a missing contact is acceptable under D25 while a wrong one damages trust more than any other error, and contact research is browser-heavy and would compete with the verification budget of D66 | Shipping contacts in the first version, including only near-free ones from the feed, or substituting company-level hiring pages: all rejected by owner | Owner answer | 2026-10-22 | |
| D72 | accepted | Software engineering is the first relevance configuration built to a trustworthy standard, and its structure becomes the template the design and product management configurations follow. The matching skeleton stays family-agnostic so the other two are configuration rather than new code | Owner answer to Q13; ATS feeds carry the richest structured signal for engineering roles, making the read-responsibilities-not-titles requirement of D41 most testable there | Product management or design first, or leaving all three naive: all rejected by owner | Owner answer | 2026-10-22 | |
| D70 | accepted | Verification freshness is tiered by the strength of the evidence source. A feed-sourced opening is trusted for 48 hours because a successful full feed response is itself evidence of currency. A browser-verified opening is trusted for 24 hours. An opening in uncertain state is re-checked every run regardless of age. Results are cached against the opening and shared across subscribers per D48 | Owner answer to Q6; gives the best cost to accuracy ratio by spending the browser budget where the evidence is weakest | A flat 24 hour window, re-verifying everything every run, or a flat 72 hour window: all rejected by owner | Owner answer | 2026-10-22 | |
| D71 | accepted | The tier a verification came from is stored on the opening alongside its last-verification time, because D70 cannot be applied without knowing which evidence source produced the current state | Follows from D70 | Storing only a timestamp: insufficient to compute the applicable window | Implementer derivation from D70 | 2026-10-22 | |
| D69 | accepted | Digest size is configurable from 3 to 20, defaulting to 10. The ceiling of 20 also bounds what discovery aims at for one subscriber under D67 and bounds per-subscriber verification cost under D66 | Owner answer to Q4; a floor of 3 keeps a digest worth opening and a ceiling of 20 keeps one subscriber from dominating the verification budget | 1 to 10, 5 to 50, or no ceiling: all rejected by owner | Owner answer | 2026-10-22 | |
| D67 | accepted | The target for D62 is the subscriber's own configured digest size. Every run records the achieved number of fresh verified relevant openings against that target, so the gap is visible from the first run. Discovery prioritises subscribers currently coming in short | Owner answer to Q17; a per-subscriber target needs no separately agreed threshold and follows the appetite the subscriber already expressed under D15 | A fixed floor across all subscribers, measuring without a target, or tracking only a trend: all rejected by owner | Owner answer | 2026-10-22 | |
| D68 | accepted | The shortfall message of D60 states the achieved number against the subscriber's configured target and why the gap exists, rather than a generic apology | Follows from D67 making the target per-subscriber and explicit | A generic nothing-today message: rejected as it hides the reason | Implementer derivation from D60 and D67 | 2026-10-22 | |
| D66 | accepted | Discovery and verification hold independent per-day budgets. When the discovery budget is spent, discovery stops until the next period while verification keeps its own allowance. Verification work for an existing subscriber's digest is never reduced in order to widen coverage | Owner answer to Q18; protects a served subscriber from coverage growth and keeps the two costs separately attributable under D55 | A shared pool with verification prioritised, a registry size cap, or discovery triggered only on shortfall: all rejected by owner | Owner answer | 2026-10-22 | |
| D64 | accepted | Employer admission is fully automated with no human review queue. Because there is no escalation path, the gate resolves ambiguity by rejection rather than admission: an employer is admitted only when its own site or careers page links the ATS board and the board identifies that same company, and any name collision or inconclusive check leaves the employer unadmitted. Rejections and collisions are logged so errors are discoverable after the fact | Owner answer to Q12. The rejection-on-ambiguity rule is the implementer's derivation from combining that answer with D5 and D9, since without a review queue an ambiguous candidate has nowhere to go but in or out, and the owner can override it | A confidence score with an owner review queue, a quarantine state, or owner approval of every employer: all rejected by owner | Owner answer plus implementer derivation | 2026-10-22 | |
| D65 | accepted | Subscriber not-relevant feedback per D44 is the backstop for an identity error that passes the automated gate of D64, so it is treated as a signal about the employer record and not only about one opening | Follows from D64 having no human gate; without this the product has no corrective path for a namesake error | Treating feedback as per-opening only: rejected as it loses the identity signal | Implementer derivation from D64 | 2026-10-22 | |
| D61 | accepted | Employer count is not the coverage limit. A bounded seed set exists only to validate the pipeline, and continuous employer and opening discovery runs from the beginning rather than being deferred to a later stage | Owner answer to Q14; a fixed registry turns coverage into a permanent ceiling and hides whether the pipeline can actually find work for a given person | A fixed owner-seeded registry expanded later: rejected by owner | Owner answer | 2026-10-22 | |
| D62 | accepted | The primary pipeline measure is the number of fresh, verified, relevant openings found per user per digest, not the number of employers tracked. Employer count, feed count and page count are cost inputs, not success measures | Owner answer to Q14; this is the only measure that reflects whether a subscriber is served | Employer coverage as the headline metric: rejected by owner | Owner answer | 2026-10-22 | |
| D63 | accepted | Stage 1 starts from roughly 10 to 15 hand-verified employers purely to exercise the pipeline, and this is a starting point rather than a cap. Continuous discovery is built in stage 1, not bolted on later | Implementer, within the bound the owner delegated under D61 | A larger initial set: unnecessary for pipeline validation and costlier to verify by hand | Implementer, builder-owned internal choice | 2026-10-22 | |
| D60 | accepted | On a run with zero strong new matches, the first empty run sends one short email stating the shortfall and its reason. Subsequent consecutive empty runs send nothing until there is something to report. The subscriber record therefore carries the timestamp of the last shortfall notice and a consecutive-empty-run counter | Owner answer to Q5; silence alone reads as a broken product while a daily nothing-today notice trains the subscriber to ignore the digest | Always sending an empty digest; always skipping silently; skipping but surfacing run history in the app: all rejected by owner | Owner answer | 2026-10-21 | |
| D59 | accepted | Minimal retention: the uploaded resume file is deleted once the subscriber confirms their extracted profile, only the reviewed profile persists, sandbox and browser state is discarded at session end, and no verification screenshots are retained | Owner answer to Q11; smallest breach surface, and the confirmed profile is what matching requires | Retaining the file for the account lifetime, a fixed purge window, or retaining screenshots as an audit trail: all rejected by owner | Owner answer | 2026-10-21 | |
| D58 | accepted | Resend is the email provider, sending from a subdomain the owner controls. The owner supplies the account, API key and DNS records. Until those exist, the digest renderer writes a labelled local artifact so content and duplicate-send protection stay testable | Owner answer to Q10; real deliverability and inbox rendering are exercised from the start | A local-file renderer throughout stage 1: not chosen; Postmark and Amazon SES: rejected on setup time | Owner answer | 2026-10-21 | |
| D57 | accepted | eve's own eval framework is the agent-eval backbone. No second agent-eval harness and no hosted eval platform is adopted in v1. Hard rules are tested as code, not graded by a model | eve eval drives the real agent over HTTP and already provides tool stubs, assertions, a judge and reporters; a model-graded check on a rule that code can enforce is weaker and costs money | DeepEval, Inspect AI or Promptfoo as the primary harness: rejected as duplicating eve and adding a Python toolchain | Implementer, builder-owned internal choice, from eve docs/evals | 2026-10-21 | |
| D56 | accepted | Nothing paid is provisioned in stage 1. Local Postgres and labelled mock data are used until the owner approves each paid service | Follows D39 and D55 | Provisioning hosted services now: rejected by owner | Owner answer | 2026-10-21 | |

## Explicit exclusions

| ID | Status | Decision | Why | Alternatives | Source | Date | Supersedes |
|---|---|---|---|---|---|---|---|
| X1 | accepted | Tailored résumé generation is outside v1 | Owner requirement | | Owner brief | 2026-10-21 | |
| X2 | accepted | Mailbox and Gmail integration is outside v1 | Owner requirement; consented Gmail may come later with receipt classification | | Owner brief | 2026-10-21 | |
| X3 | accepted | Automated job applications are outside v1 | Owner requirement | | Owner brief | 2026-10-21 | |
| X4 | accepted | Automatic employer or contact outreach is outside v1 | Owner requirement | | Owner brief | 2026-10-21 | |
| X5 | accepted | No billing model is assumed or implemented | Owner requirement | | Owner brief | 2026-10-21 | |
| X6 | accepted | A universal global jobs API is not assumed to exist; ATS feeds are employer-specific | Owner requirement and factual constraint | | Owner brief | 2026-10-21 | |

## Open questions

| ID | Status | Decision | Why | Alternatives | Source | Date | Supersedes |
|---|---|---|---|---|---|---|---|
| Q1 | resolved | Answered by D53 | Owner chose multi-function coverage over a single narrow segment | A broad multi-segment launch | Owner answer | 2026-10-21 | |
| Q2 | resolved | Answered by D54 | Owner chose a greenfield repository | Build inside an existing app | Owner answer | 2026-10-21 | |
| Q3 | resolved | Answered by D55 | Owner set a dev-only ceiling under 20 USD per month | Unbounded spend with alerting | Owner answer | 2026-10-21 | |
| Q4 | resolved | Answered by D69 | Owner chose 3 to 20 with a default of 10 | 1 to 10; 5 to 50; no ceiling | Owner answer | 2026-10-22 | |
| Q5 | resolved | Answered by D60 | Owner chose one shortfall notice then silence | Always send; always skip; skip but surface run history in the app | Owner answer | 2026-10-21 | |
| Q6 | resolved | Answered by D70 | Owner chose freshness tiered by evidence source | A flat 24 hour window; re-verifying every job every run; a flat 72 hour window | Owner answer | 2026-10-22 | |
| Q7 | resolved | Answered by D74 | Owner chose late delivery within a grace window, then folding into the next run | Always send late; always drop; drop and tell the subscriber | Owner answer | 2026-10-22 | |
| Q8 | resolved | Answered by D76 | Owner chose weekday and selected-day delivery in v1 | A stored day set with daily-only UI; daily only with a later migration; a weekdays-only toggle | Owner answer | 2026-10-22 | |
| Q9 | resolved | Answered by D73 | Owner deferred contact enrichment until the core flow is trustworthy | Contacts in the first version; only where nearly free; company-level links instead of people | Owner answer | 2026-10-22 | |
| Q10 | resolved | Answered by D58 | Owner chose Resend on a subdomain they control, in preference to deferring with a local-file renderer | Postmark; Amazon SES | Owner answer | 2026-10-21 | |
| Q11 | resolved | Answered by D59 | Owner chose minimal retention | Indefinite retention of uploads; a fixed purge window; retaining screenshots | Owner answer | 2026-10-21 | |
| Q12 | resolved | Answered by D64 | Owner chose a fully automated gate with no human in the loop | Bidirectional link with a confidence score and an owner review queue; auto-admit with a quarantine state; owner approval of every employer | Owner answer | 2026-10-22 | |
| Q13 | resolved | Answered by D72 | Owner chose software engineering first | Product management first; design first; a shared skeleton with no family tuned | Owner answer | 2026-10-22 | |
| Q14 | resolved | Answered by D61 and D62. The question was wrongly framed: it treated employer count as the coverage limit | Owner rejected a fixed registry size as the coverage model | A fixed seed size as the cap | Owner answer | 2026-10-22 | |
| Q15 | open | What eval score thresholds gate a release, and does a failing judge-graded eval block a merge or only warn? | Owner answers; blocks CI gating. Recommend warn-only until judge agreement has been checked against a human-labelled sample | Hard block from the start | Arises from the eval plan | 2026-10-21 | |
| Q16 | open | Who labels the golden fixture corpus ground truth, and how often is it refreshed? | Owner answers; blocks the layer 2 corpus. Recommend the owner labels the first corpus so a good match is owner-defined rather than implementer-defined | Implementer labels it | Arises from the eval plan | 2026-10-21 | |
| Q17 | resolved | Answered by D67 | Owner chose the subscriber's own configured digest size as the target | A fixed floor for all users; measure without targeting; track a trend rather than a level | Owner answer | 2026-10-22 | |
| Q18 | resolved | Answered by D66 | Owner chose separate budgets with discovery pausing first | One shared budget with verification prioritised; a registry size cap; demand-driven discovery only on shortfall | Owner answer | 2026-10-22 | |

## Accepted scope and next action

Ready to map: the thin flow the owner named — Clerk sign-in, résumé upload and
reviewed profile, preferences, a small real job catalogue, ranked preview, test email.
Policy for it is accepted under D1 to D49, with D50 to D52 as implementer drafts.

Blocked: the empty-digest branch depends on Q5, the freshness window on Q6, the
missed-run branch on Q7, contact enrichment on Q9, the email provider on Q10,
retention on Q11, registry expansion on Q12, the first relevance configuration on
Q13 and the seed employer count on Q14. Q1 to Q3 are resolved by D53 to D56.

Next action: the thin flow is mapped in docs/journeys/thin-flow.yaml. Implement
stage 1 against it. Q4 to Q14 are answerable as the stages reach them and none of
them block stage 1. Planning adds no authorisation to provision, deploy or commit.
