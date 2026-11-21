# Security

## Reporting a vulnerability

Open a private security advisory on this repository instead of a public issue. Include steps to reproduce.

## Protections

- **Secrets stay on the server.** `GEMINI_API_KEY` is read from the environment and sent only to the Gemini API with the `x-goog-api-key` header. `/api/status` reports whether it is set, never its value. `.env` files are ignored by git.
- **Input validation.** Bodies over 12 KB are rejected with 413, with the limit enforced on the stream itself in the Worker. Malformed JSON returns 400. Questions must be 1–600 characters. Profiles are rebuilt from allowlisted fields with clamped numbers, and the city is matched against a fixed list.
- **Model output is never trusted.** Gemini returns schema-constrained JSON. Action IDs, formats and constraints are re-filtered against allowlists. All advice text and numbers come from reviewed server code, not the model. Any unexpected output falls back to the guided answer.
- **Abuse limits.** At most six concurrent Gemini calls and 30 per minute, with a 12-second timeout. Calls are aborted if the client disconnects.
- **Headers** (`server/security.mjs`, shared by both runtimes): strict Content Security Policy with `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy` and HSTS. API responses use `Cache-Control: no-store`.
- **Supply chain.** The production image installs only runtime dependencies and runs as the unprivileged `node` user. CI runs `npm audit --omit=dev --audit-level=high`.
