# Who publishes an AI Catalog? A first census, October 2026

On 6 October 2026 the Model Context Protocol project merged MCP Server Cards ([SEP-2127](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2127)). The proposal makes `/.well-known/ai-catalog.json` the place where a website lists its agent facing endpoints, so an AI client can discover an MCP server or an A2A agent without being told where to look. The catalog format is defined at [ai-catalog.io](https://ai-catalog.io/spec/).

Five days later, on 11 October, every site on the Index panel was probed for that file and for two older conventions. The raw outcome for each site is in [`data/catalog-census-2026-10-11.csv`](../data/catalog-census-2026-10-11.csv), and the probe is [`data/catalog-census.py`](../data/catalog-census.py), so the census can be rerun by anyone.

## Result

Seven of the 200 panel sites serve a catalog that satisfies every required rule of the spec.

| Site | MCP server cards | Content type served |
|---|---|---|
| github.com | 1 | `application/ai-catalog+json` |
| huggingface.co | 1 | `application/ai-catalog+json` |
| airtable.com | 1 | `application/json` |
| zapier.com | 1 | `application/json` |
| railway.app | 1 | `application/json` |
| vercel.com | 0 | `application/ai-catalog+json` |
| supabase.com | 0 | `application/json` |

All seven come from three of the panel's sector groups, AI companies (Hugging Face), major SaaS (Airtable and Zapier) and developer platforms (the other four). The remaining ten groups (news, government, retail, finance, India majors, education, health, energy, telecom, and social platforms) hold 140 sites. 101 of them answered the catalog address, and none serves a catalog.

Two of the seven reference their MCP server without a server card entry. Supabase describes its MCP server as a generic `application/json` entry pointing straight at the endpoint, and Vercel lists only the OAuth metadata for its MCP server, typed the same way. A client that looks for `application/mcp-server-card+json` entries, as SEP-2127 intends, would not find an MCP server in either catalog. Four of the seven also serve the file as plain `application/json` where the spec says it should use `application/ai-catalog+json`, which is a recommendation rather than a requirement.

Older conventions are rarer still. Five sites serve JSON at the earlier `/.well-known/mcp.json` path (Cloudflare, Monday.com, Notion, Render and Twilio), and one serves an A2A agent card at `/.well-known/agent-card.json` (Monday.com). Healthline returns the same unrelated privacy file at every well known path probed, so it is excluded from every count.

## Compared to what

The [second edition of The State of the Agentic Web](https://github.com/asish-singh/agent-readiness-auditor/tree/main/reports/2026-state-of-the-agentic-web), measured in July 2026, found that none of 69 reachable prominent sites advertised an agent endpoint. That study looked only for mentions in `llms.txt` and `robots.txt`, because no discovery file had been agreed, so the two figures are not a like for like trend. They do bracket the change. In July no discovery address had been agreed, and the proposal that became SEP-2127 was still a draft. Five days after it merged, seven panel sites already serve it, so several must have adopted it while it was still a draft.

## Reading the denominator

Seven of 200 understates adoption among sites that can be measured. For 45 sites the answer is unknown rather than negative, because the catalog address returned HTTP 403 (34 sites, mostly bot protection) or no response at all (11). Among the 155 sites that did answer, seven serve a valid catalog. Fifteen of those 155 answer any unknown address with an ordinary web page and a success code. A naive check counts those as publishing a catalog. The probe treats a file as a catalog only when it parses as a JSON object, which is why they are not counted here.

## Method

Each site was requested over HTTPS with the same identifying user agent the auditor uses, following redirects, with a 20 second timeout. A catalog counts as valid when `specVersion` is a string in Major.Minor form, `entries` is an array, and every entry has an `identifier`, a `type`, and exactly one of `url` or `data`. This is a single snapshot from one network location on one day.
