# Planning skills

Repository-local copies of `decide` and `journeys` from
[hivinaynair/agentic-skills](https://github.com/hivinaynair/agentic-skills), pinned to
commit `9ec781b24a9b5f6f64d68660c9d02471299b44a8` on
`vinay/markdown-journeys`, copied on 2026-10-26.

The skill folders are unchanged upstream files. Their MIT licence is included in
[LICENSE](LICENSE). Keep local project policy in `docs/decisions.md` and journeys
in `docs/journeys/`; do not customise the checker to hide open planning items.

`bun run check:spec` uses this local checker, so a fresh clone needs no sibling
checkout. To update, copy both skill folders from a reviewed upstream revision,
update this provenance, then run `bun run check:spec`, `bun test` and
`bun run typecheck`.
