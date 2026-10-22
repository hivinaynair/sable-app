# sable-app

Personalised job-recommendation digests: subscribers sign in, upload a résumé,
answer a few questions, and receive up to N currently open, verified, relevant
openings on their own schedule, each with its fit, gaps and sources.

**Status: stage 1 in progress.** The domain rules in `packages/core` are built and
tested. The web app, agent, database and email are not built yet.

Turborepo monorepo on pnpm workspaces (Node 24):

- `packages/core`: `@sable/core`, the pure domain rules (eligibility, deduplication, availability, freshness, scheduling, send idempotency, digest selection)
- `apps/web`, `apps/agent`: the Next.js app and the eve agent, added as they are built

```sh
pnpm install
pnpm test           # all tests, through turbo
pnpm typecheck
pnpm spec:links     # regenerate docs/verification.json from test names
pnpm check:spec     # validate the journey spec and its test links
```

- `docs/decisions.md`: decision record (accepted decisions, exclusions, open questions)
- `docs/journeys/thin-flow.yaml`: journey spine for the first end-to-end flow; `thin-flow.md` is generated from it
- `docs/evals-plan.md`: evaluation strategy and open-source tooling assessment

Specs follow the `decide` and `journeys` skills from
[hivinaynair/agentic-skills](https://github.com/hivinaynair/agentic-skills).
