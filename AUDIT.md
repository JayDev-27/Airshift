# Airshift final audit

## Code quality

The planner keeps calculations and reviewed recommendations in `src/domain.mjs`. The application keeps conversational rendering, the 3D scene, photo display, and motion controls in their own modules. City configuration and action identifiers are validated on the server. The production build passed.

## Security

The Gemini API key remains on the server. The API limits request bodies and question length, caps concurrency and request rate, aborts model calls after disconnects, and filters returned actions and constraints through allowlists. API responses use no-store and malformed bodies return JSON errors. The production server adds Content Security Policy and MIME-sniffing protection.

`npm audit --omit=dev` reported zero production dependency vulnerabilities. The full dependency check reports a high-severity advisory for `picomatch` through the Vite build and development dependency tree. That tree is omitted by the production Docker stage. The latest Vite release still uses the affected version.

## Efficiency

The Delhi preview now renders a responsive still from the same 3D scene and switches to the canvas only after the first frame. The scene loads on demand. The server compresses text assets and uses immutable caching for content-hashed bundles. City chooser thumbnails are separate from hero photos. Concurrent requests share a short-lived forecast promise for each city.

## Testing

`npm test` passed six suites of checks covering all 14 cities, severe family scenarios, unsupported profile values, fixed work shifts, incomplete forecasts, half-hour time offsets, follow-ups, malformed and oversized inputs, rate limiting, and mocked Gemini output and failure paths.

Browser testing covered all city photos, desktop and narrow mobile layouts, chart and readings views, keyboard controls, a conversation reopened after dismissal, cold refreshes with delayed 3D data, and the fallback with WebGL disabled. Real Open-Meteo forecasts were verified separately.

## Accessibility

Automated axe-core checks found zero violations in the rules run for the overview, settings, assistant reply, daily plan, indoor air, community, and evidence screens. Some color contrast checks over layered backgrounds required manual review. This audit is an automated and manual spot check. The interface includes reduced motion, keyboard-operable selectors and chart inspection, a readings table, a skip link, and native modal focus handling.

## Google services

The Gemini integration uses the server-side Gemini REST API with JSON Schema output, bounded prior question context, and validated action identifiers. The response adapter and fallback were verified against a mock provider. This environment has no Gemini API key, so the public-provider path remains unverified. The app includes a Dockerfile and Cloud Run deployment instructions. The event portal requires a reachable URL for a live preview. [Gemini structured output](https://ai.google.dev/gemini-api/docs/structured-output) · [Cloud Run source deployment](https://docs.cloud.google.com/run/docs/deploying-source-code)
