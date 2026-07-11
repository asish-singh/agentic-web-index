# Project: agentic-web-index

The public home of The Agentic Web Index, a quarterly benchmark ranking 200 prominent websites by AI agent readiness, scored with agent-readiness-auditor.

## Status

- Started: 2026-07-11 (extracted from the private asishsingh.in repo, where it was built on 2026-07-10)
- Current state: Q3 2026 edition published, live at https://asishsingh.in/agentic-web-index/

## Goal

Make the Index publicly verifiable and citable. The panel, raw results, page generator, and live audit service all live here in the open, so anyone can reproduce the numbers. This repo is the source of truth for the Index; the copy inside the private asishsingh.in repo is only a deploy artifact and should be synced from here.

## How to run it

- Rebuild the page: `cd data && node build-index.js` (writes ../index.html)
- Run the live audit service locally: `cd live-audit-service && npm install && npm start`
- New edition workflow is documented in README.md

## Notes for Claude

- Asish is non-technical: explain in plain language, choose sensible defaults, confirm before anything destructive.
- Never use em dashes, en dashes, hyphens, or colons as punctuation in prose. Technical strings are exempt.
- This repo is public. No client names, tokens, or private data ever land here.
- index.html is generated. Change data or template.html and rebuild, never hand edit it.
- Deploys still go through the asishsingh.in repo and Hostinger; after changes here, copy the folder contents back there and redeploy.
- Commit working checkpoints as you go.
