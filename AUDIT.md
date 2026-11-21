# Airshift final audit

## Code quality

The planner keeps calculations and reviewed recommendations in `src/domain.mjs`. The application keeps conversational rendering, the 3D scene, photo display, and motion controls in their own modules. City configuration and action identifiers are validated on the server. The production build passed.

## Security

The Gemini API key remains on the server. The API limits request bodies and question length, caps concurrency and request rate, aborts model calls after disconnects, and filters returned actions and constraints through allowlists. API responses use no-store and malformed bodies return JSON errors. The production server adds Content Security Policy and MIME-sniffing protection.

`npm audit --omit=dev` reported zero production dependency vulnerabilities. The full dependency check reports a high-severity advisory for `picomatch` through the Vite build and development dependency tree. That tree is omitted by the production Docker stage. The latest Vite release still uses the affected version.

## Efficiency

The Delhi preview now renders a responsive still from the same 3D scene and switches to the canvas only after the first frame. The scene loads on demand. The server compresses text assets and uses immutable caching for content-hashed bundles. City chooser thumbnails are separate from hero photos. Concurrent requests share a short-lived forecast promise for each city.

## Final review (21 November 2026)

- Moved the security headers into `server/security.mjs` so the Node server and the Worker share one policy. Added `frame-ancestors`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy` and HSTS.
- Replaced magic numbers in the assistant with named limits and added JSDoc to the exported functions.
- Added ESLint with React Hooks and strict `jsx-a11y` rules. Fixed an impure ID fallback and the reply stream's mutable render counter. The remaining exceptions are documented inline: native dialog backdrop dismissal, the focusable scroll region, and roving arrow-key focus.
- Expanded the suite from 7 to 51 tests across `domain`, `forecast`, `security` and end-to-end API files. Line coverage is 100% for the domain and server modules. Added GitHub Actions CI for lint, coverage, build and production audit.

## Testing

The original `npm test` suite passed seven tests covering all 14 cities, severe family scenarios, unsupported profile values, fixed work shifts, incomplete forecasts, half-hour time offsets, follow-ups, malformed and oversized inputs, rate limiting, mocked Gemini output and failure paths, and the hosted Worker adapter.

Browser testing covered all city photos, desktop and narrow mobile layouts, chart and readings views, keyboard controls, a conversation reopened after dismissal, cold refreshes with delayed 3D data, and the fallback with WebGL disabled. Real Open-Meteo forecasts were verified separately.

## Accessibility

Automated axe-core checks found zero violations in the rules run for the overview, settings, assistant reply, daily plan, indoor air, community, and evidence screens. Some color contrast checks over layered backgrounds required manual review. This audit is an automated and manual spot check. The interface includes reduced motion, keyboard-operable selectors and chart inspection, a readings table, a skip link, and native modal focus handling.

## Google services

The Gemini integration uses the server-side Gemini REST API with JSON Schema output, bounded prior question context, and validated action identifiers. The response adapter and fallback were verified against a mock provider. The hosted demo uses guided mode. The Node server and hosted Worker share the same forecast and assistant services. [Gemini structured output](https://ai.google.dev/gemini-api/docs/structured-output) · [Cloud Run source deployment](https://docs.cloud.google.com/run/docs/deploying-source-code)
