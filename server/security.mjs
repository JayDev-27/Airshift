/**
 * Shared HTTP hardening for the Node server and the hosted Worker so both
 * runtimes send identical security headers.
 */

/** Content Security Policy: only same-origin code, and the forecast provider as the single external origin. */
export const contentPolicy = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self' https://air-quality-api.open-meteo.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'"
].join('; ');

/** Headers applied to every response. */
export const securityHeaders = Object.freeze({
  'Content-Security-Policy': contentPolicy,
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
});

/** Maximum accepted JSON request body, in bytes. */
export const maxBodyBytes = 12 * 1024;
