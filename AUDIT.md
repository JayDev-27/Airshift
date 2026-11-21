# Airshift engineering audit

## Code quality

- [`src/domain.mjs`](src/domain.mjs) ranks comparable outdoor windows and builds reviewed recommendations. Separate activity and transport builders keep eligibility, timing and impact formulas easy to trace.
- [`server/api.mjs`](server/api.mjs) handles route dispatch, input validation and response status for Express and the Worker. Each adapter enforces the request size limit while reading its own stream.
- [`src/lib/open-meteo.mjs`](src/lib/open-meteo.mjs) normalizes CAMS data for the server and static site. The browser checks that an API response matches the city and covers a recent, complete day. The live forecast can fall back to Open-Meteo or the labeled winter demo. Switching city or mode cancels the old request.
- [`src/lib/assistant-contract.mjs`](src/lib/assistant-contract.mjs) defines the valid selections and request limits for Gemini and the browser. Reviewed actions and explicit inputs determine the final wording and figures.

## Verification

| Check | Coverage |
| --- | --- |
| `npm run check` | ESLint, the automated suite and a production build |
| `npm run test:coverage` | Domain, client helper and in-process server coverage. Browser components and the spawned Express process have separate behavioral checks. |
| `npm run build:site` | Static assets and the Worker entry in one deployable package |
| `npm audit` | Runtime and development dependencies |
| Chrome and WebKit | Nine axe scans, keyboard navigation and focus restoration, guided conversation, preference persistence and forecast fallback |
| Production-only install | HTTP and guided assistant smoke checks using the Dockerfile’s runtime file layout |

The planner returned the same output before and after the refactor across 5,600 demo profile combinations. A real Open-Meteo request returned a complete live Delhi forecast. A simulated slow request confirmed that returning to the demo cancels the request and keeps its error out of the current view.

## Verification limits

Gemini structured output and failures were tested with mocked provider responses. The public Render demo uses guided mode. The Vite build still reports its lazy 3D scene as larger than the default chunk warning threshold. Docker image execution requires a Docker daemon.
