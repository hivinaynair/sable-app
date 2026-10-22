# Eval plan

Scope note on wording: evals here measure behaviour and gate regressions. They do
not fine-tune model weights. What they tune is our prompts, tool schemas, filter
thresholds, retrieval order and the decision to drop a candidate. Nothing in this
plan trains a model.

The cost ceiling in D55 shapes this plan: judge-graded evals cost money per run, so
the large suites are deterministic and the judge is reserved for the few behaviours
no assertion can express.

## Five layers, in the order they catch bugs most cheaply

| Layer | What it proves | Tool | Runs |
|---|---|---|---|
| 1 Deterministic unit and integration tests | Pipeline invariants that are code, not model behaviour | Vitest | Every commit |
| 2 Golden fixture corpus | Extraction and classification against frozen real-world inputs with labelled ground truth | Vitest over committed fixtures | Every commit |
| 3 eve agent evals | The agent booted, chose the right tools, respected its boundaries | eve defineEval and eve eval | Every PR |
| 4 Judge-graded evals | Groundedness of fit explanations, where no assertion suffices | eve t.judge | Nightly and pre-release |
| 5 Adversarial and security suite | Prompt injection, SSRF, namesake confusion, stale listings | Vitest plus eve evals, optionally Garak or Promptfoo | Nightly and pre-release |

Layer 3 is the backbone and it is eve's own framework, not a third-party addition.
`eve eval` boots a real agent server, drives it over the TypeScript client protocol,
and grades the result, so a pass means the agent actually accepted a request and
behaved. It supplies tool stubs, deterministic assertions over the tool-call stream,
a judge, and reporters. Adding a second agent-eval framework on top would duplicate
it, so third-party tools below are chosen only where eve has no equivalent.

## Layer 1: what must never be model-graded

Most of our invariants are enforced in code per D31, so they belong in Vitest, where
they are fast, free and deterministic. Each test cites the criterion it proves.

| Invariant | Test focus | Criteria proved |
|---|---|---|
| I1 verified_open required | A candidate in uncertain or confirmed_closed state cannot reach a digest; an Apply button alone does not promote to verified_open | J5.S4.c2, J6.S3.c3, J6.S4.c4 |
| I2 no repeats | Exact-opening matching: same requisition suppressed, different requisition at the same employer not suppressed, reopened role labelled | J5.S3.c1, J5.S3.c3, J5.S3.c4 |
| I3 hard constraints | Unknown sponsorship, salary or country eligibility never counts as satisfied; remote is not worldwide | J5.S2.c2, J5.S2.c3, J4.S2.c3 |
| I5 tenant isolation | Cross-subscriber reads of resume, draft profile, preferences and recommendations are refused | J2.S1.c4, J3.S1.c4, J4.S1.c4, J5.S1.c2 |
| I6 opt-in respected | Paused, unsubscribed and never-opted-in subscribers are suppressed before a message is prepared | J7.S1.c2 |
| I7 one send per key | Concurrent sends resolve to one provider call; an uncertain record blocks retry until reconciliation | J7.S2.c2, J7.S4.c3 |
| I9 no external writes | The research tool surface exposes no write capability at all, asserted against the registered tool list rather than against behaviour | J6.S4.c6 |
| Date semantics | A changed update date on an unchanged requisition id creates no new vacancy | J6.S3.c2 |
| Freshness | A candidate past the freshness window is revalidated before inclusion | J5.S4.c1 |
| Timezone and DST | A local delivery time resolves correctly across a DST transition in both directions, and an invalid IANA id is rejected | J4.S3.c2, J4.S3.c3 |

The I9 test is worth calling out as a pattern: rather than prompting the agent not to
submit forms and then testing whether it obeyed, assert that no write-capable tool is
registered for the research agent. That is D31 made testable. A behavioural eval for
the same rule belongs in layer 5 as defence in depth, not as the primary control.

## Layer 2: the golden fixture corpus

The single highest-value asset in this plan, and it costs nothing to run.

Commit frozen captures with hand-labelled ground truth: Greenhouse, Lever and Ashby
feed responses; official careers-page HTML including a JavaScript shell; a listing
that has moved ATS; a closure notice page; a 403, a CAPTCHA wall and a soft 404; and
resumes in PDF and DOCX covering all three families of D53, including one with a
personal-projects section that must not be read as professional experience.

Labels record, per fixture, the expected availability classification, the expected
extracted fields, and the expected distinct dates. This gives us a regression suite
for exactly the failures the brief names: stale results, ATS migrations, namesakes,
restricted remote, unknown sponsorship, duplicates, inaccessible forms.

Capture fixtures from live sources once, redact nothing except any personal data, and
treat them as untrusted data in the tests, consistent with D32 and I8.

## Layer 3: eve agent evals

Under `evals/`, with `evals.config.ts` at its root. Each file is one eval; the path is
its identity. Tool stubs let us control what discovery and retrieval return without
network access, so these are cheap and deterministic apart from the model call.

Planned evals, each named for the behaviour it gates:

- `research/prefers-feed-over-browser` — stub a usable ATS feed and assert
  `t.notCalledTool("browser__navigate")`. This is the cost control of D8 made
  testable, and it is the eval most likely to catch an expensive regression.
  Proves J6.S2.c1 and J6.S4.c1.
- `research/browses-only-on-js-shell` — stub a feed that returns a JavaScript shell
  and assert the browser was used, with `t.maxToolCalls(n)` bounding the page budget.
  Proves J6.S4.c1 and J6.S4.c9.
- `research/no-closure-from-a-block` — stub a 403 and a CAPTCHA and assert the
  recorded classification is uncertain, never confirmed_closed. Proves J6.S4.c7.
- `research/records-what-was-inspected` — assert the structured result carries the
  URLs actually loaded. Proves J6.S4.c2.
- `research/refuses-off-allowlist-navigation` — stub a listing whose Apply link points
  off the allow list and to a private address, and assert no navigation. Proves
  J6.S4.c8.
- `research/no-write-tools-used` — `t.usedNoTools()` scoped to the write surface, or
  `t.notCalledTool` per write-capable name. Proves J6.S4.c6.
- `matching/title-is-not-the-signal` — the brief's own example: a frontend role at a
  stablecoin company whose description is AI work. Assert it is not matched to a
  payments-domain preference. Proves J5.S5.c1.
- `matching/unknown-is-not-eligible` — a listing with no sponsorship statement against
  a subscriber who requires sponsorship; assert exclusion. Proves J5.S2.c2.
- `matching/explains-the-shortfall` — stub a catalogue yielding three survivors against
  a request for ten; assert exactly three are returned with a stated reason and no
  padding. Proves J5.S6.c1 and J5.S6.c2.
- `matching/structured-output-validates` — assert `turn.outputMatches(schema)` so a
  malformed recommendation is dropped rather than rendered. Proves J5.S5.c5.
- `profile/separates-projects-from-experience` — proves J2.S2.c2.
- `profile/no-unsupported-claims` — proves J2.S2.c4.

## Layer 4: judge-graded evals

`t.judge` calls a separate decision model and scores 0 to 1 with a threshold. Reserve
it for the two things assertions cannot express, and run it nightly rather than per
commit so the cost stays inside D55.

- Groundedness of the fit explanation: judge that every candidate-side claim traces to
  the confirmed profile, `.atLeast(0.9)`. Proves J5.S5.c2 and J5.S5.c3, and is the
  direct guard on I4 and D28.
- Gap disclosure quality: a score rubric on whether material gaps are stated plainly
  rather than buried or softened, `.atLeast(0.75)`. Proves J5.S5.c4.

Judge scores are model estimates, not calibrated confidence, so treat a threshold as a
regression tripwire rather than a measurement of truth. Both of these also need a small
human-labelled sample to check the judge agrees with us before we trust its gate.

## Layer 5: adversarial and security suite

This is where third-party open-source tooling earns its place, because eve has no
built-in attack corpus.

- **Prompt injection through job pages and resumes.** The attack surface is specific:
  text inside a fetched listing or an uploaded document instructing the agent to
  navigate elsewhere, reveal configuration, mark a job verified, or contact an
  employer. Build a corpus of such payloads embedded in realistic fixtures and assert
  the forbidden effect did not occur, proving J2.S2.c3, J6.S4.c5 and I8. Assert on the
  effect, not on the reply text: a refusal sentence is not evidence the tool was not
  called.
- **SSRF and private-address egress.** Assert at the network-policy layer that private
  and link-local destinations are refused, independently of what the agent attempted.
  Proves J6.S4.c8 and D33.
- **Secret non-disclosure.** Assert no credential appears in browser-visible output,
  screenshots or sandbox files, which O2 makes structurally unlikely but should still
  be checked.

## Open-source tooling survey

Assessed against what we actually need. Licences and claims below come from secondary
roundups gathered 2026-10-21 and are **not yet verified against each project's own
repository**; verify before adopting any of them.

| Tool | Licence as reported | Role it could play here | Verdict |
|---|---|---|---|
| eve evals (`defineEval`) | Part of eve | Layers 3 and 4: drives the real agent over HTTP, tool stubs, tool-call assertions, judge, reporters | **Adopt. This is the backbone.** No third-party agent-eval framework is needed alongside it |
| Vitest | MIT | Layers 1, 2 and parts of 5 | **Adopt.** Already the eve repo's own test runner, so no new toolchain |
| NVIDIA Garak | Apache 2.0 | Layer 5: hundreds of prompt-injection and jailbreak probes, the broadest ready-made attack corpus | **Adopt later, as a corpus source.** Point it at our agent's HTTP surface in a nightly job; mine its probe set for payloads to embed in our own fixtures rather than depending on it in CI |
| Promptfoo | MIT | Layer 5 red-teaming plus prompt regression; has an MCP plugin for tool-calling vulnerabilities | **Consider.** Capable, but its prompt-regression half duplicates eve evals. Reported acquired by OpenAI, with the date reported inconsistently across sources and unverified, which is worth weighing for roadmap neutrality |
| Microsoft PyRIT | MIT | Layer 5: orchestrating automated multi-turn attacks at scale | **Defer.** Multi-turn attack orchestration is more than a read-only research agent needs in v1 |
| DeepEval | Apache 2.0 | Large metric library, CI-friendly assertions | **Skip for the agent.** Python-first and its metrics assume an LLM-output-grading shape; our hard rules are code-level and already covered by layers 1 and 2. Reconsider only if we want its faithfulness metric as a second opinion beside eve's judge |
| Inspect AI (UK AISI) | MIT | Structured capability evals with sandboxes and async tool use | **Skip.** Strong framework, but it overlaps eve's runner and would mean a second harness and a Python toolchain |
| Langfuse | OSS core | Tracing and production observability, prompt and dataset management | **Adopt at stage 3**, when there are real runs to inspect. It answers "why did this digest look like this" in production, which no eval does |
| Arize Phoenix | Apache 2.0 with some components under Elastic v2 | OpenTelemetry-based trace-level agent evaluation | **Alternative to Langfuse.** eve already exports OpenTelemetry, so either slots in. Check the Elastic v2 components before committing |
| Ragas | Apache 2.0 | Retrieval-augmented-generation metrics | **Skip.** We do evidence-backed extraction and filtering, not RAG over a corpus; its metrics would not measure our failure modes |
| LLM Guard, NeMo Guardrails | OSS | Runtime input and output guardrails | **Out of scope for evals.** These are runtime controls, and D31 puts our controls in tool permissions and network policy instead |

Two things deliberately not adopted: a second agent-eval harness, and any hosted eval
platform, since D39 and D56 forbid provisioning paid services without asking. eve's
Braintrust reporter exists if we later want hosted experiment tracking, and that is a
decision to take explicitly.

## Wiring evals back to the spec

The journeys validator accepts a verification map linking criterion IDs to tests:

```sh
bun <journeys>/scripts/journeys.ts check docs/journeys/thin-flow.yaml \
  --verification docs/verification.json --require-links
```

Keys are rule IDs such as `J5.S4.c2`, values name a file and a locator. We write that
map as the tests appear, so the spine tells us which of its 112 rules have no test at
all. The checker verifies the file and locator exist. It does not run the test and does
not inspect its assertions, so a linked test is not proof of behaviour.

## Staging

- Stage 1: layer 1 for the invariants reachable in the thin flow, plus the first
  fixtures. No agent evals yet, because there is no agent yet.
- Stage 2: layer 2 corpus and the layer 3 research and matching evals, with
  `research/prefers-feed-over-browser` first since it guards the cost ceiling.
- Stage 3: layer 4 judge evals nightly, Langfuse or Phoenix for production traces,
  and the verification map with `--require-links`.
- Stage 4: layer 5 adversarial suite, with Garak mined for payloads.

## Open questions this raises

- Q15: What score thresholds gate a release, and does a failing judge eval block a
  merge or only warn? Recommend warn-only until we have checked judge agreement against
  a human-labelled sample.
- Q16: Who labels the golden corpus ground truth, and how often is it refreshed as
  real listings change? Recommend the owner labels the first corpus so the definition
  of a good match is owner-set rather than implementer-set.
