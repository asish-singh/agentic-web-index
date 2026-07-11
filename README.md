# The Agentic Web Index

A quarterly benchmark ranking 200 prominent websites by how ready they are for AI agents. Each site is scored out of 100 by [agent-readiness-auditor](https://github.com/asish-singh/agent-readiness-auditor), which runs nine automated checks covering safety (hidden prompt injection text) and machine readability (llms.txt, robots.txt stance on AI crawlers, structured data, sitemap, accountability links, answer shaped content, index blocking, and advertised agent endpoints).

Live edition. https://asishsingh.in/agentic-web-index/

Current edition. Q3 2026 (July 2026). 152 of 200 panel sites audited successfully, median score 76.

## What is in this repository

- `data/panel.txt`, the panel of 200 sites across twelve sectors, one URL per line. The first 84 sites carry over from The State of the Agentic Web study so results stay comparable across editions.
- `data/results-2026-q3.csv`, the raw audit results for the current edition, machine readable.
- `data/build-index.js` and `data/template.html`, the generator that turns the panel and results into the published page.
- `index.html`, the published page itself, generated from the data above.
- `live-audit-service/`, the small Node service behind the live audit widget on the page, deployed at audit.asishsingh.in. It wraps the auditor with rate limits (5 audits per IP per hour, 60 per hour globally) and blocks internal targets.

## Reproduce the results

Every number on the page can be regenerated from public tools and public websites.

```bash
# Re run the audits (takes a while, hits 200 live sites)
npx agent-readiness-auditor --batch data/panel.txt --csv > data/results-<edition>.csv

# Rebuild the page from the results
cd data && node build-index.js
```

## Run the live audit service

```bash
cd live-audit-service
npm install
npm start          # serves GET /api/audit?target=example.com on port 3000
```

## Publishing a new edition

1. Refresh the results with the batch command above into a new dated CSV.
2. Point the `EDITION`, `EDITION_DATE`, and results filename in `data/build-index.js` at the new edition.
3. Run `node build-index.js` and review the regenerated `index.html`.
4. Deploy the page to asishsingh.in.

## License

The code (generator and live audit service) is MIT licensed, see `LICENSE`. The panel and results data are published under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), attribute as "The Agentic Web Index by Asish Singh".

## Author

Asish Singh. Related work: [agent-readiness-auditor](https://github.com/asish-singh/agent-readiness-auditor), [ai-search-playbook](https://github.com/asish-singh/ai-search-playbook), [agentic-web-governance-pack](https://github.com/asish-singh/agentic-web-governance-pack), [The Agentic Web Governance Gap](https://github.com/asish-singh/agentic-web-governance-gap) (the policy study built on this data).
