import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

/**
 * Integration test: verifies that CSRF protection is applied to all mutation
 * routes and NOT applied to intentionally exempt routes.
 *
 * This reads the actual source files to catch accidental omissions.
 */

const API_DIR = path.resolve(__dirname, "../../../src/app/api");

function readRoute(relativePath: string): string {
  return fs.readFileSync(path.join(API_DIR, relativePath), "utf-8");
}

// Routes that MUST have checkCsrfOrigin
const PROTECTED_ROUTES = [
  "auth/login/route.ts",
  "auth/signup/route.ts",
  "auth/reset-password/route.ts",
  "auth/logout/route.ts",
  "auth/update-password/route.ts",
  "chat/route.ts",
  "chat/[id]/route.ts",
  "chat/[id]/messages/route.ts",
  "generate/route.ts",
  "listings/route.ts",
  "listings/[id]/route.ts",
  "listings/[id]/export/route.ts",
  "listings/[id]/refine/route.ts",
  "listings/[id]/repurpose/route.ts",
  "listings/[id]/title-variants/route.ts",
  "listings/import/route.ts",
  "batch/route.ts",
  "batch/[id]/cancel/route.ts",
  "subscription/checkout/route.ts",
  "subscription/portal/route.ts",
  "feedback/route.ts",
  "audit/optimize/route.ts",
  "audit/rewrite/route.ts",
];

// Routes that must NOT have checkCsrfOrigin (intentionally exempt)
const EXEMPT_ROUTES = [
  "audit/route.ts",            // Chrome extension sends from arbitrary origins
  "webhooks/stripe/route.ts",  // Stripe signature verification
];

describe("CSRF route integration", () => {
  describe("protected routes import and call checkCsrfOrigin", () => {
    for (const route of PROTECTED_ROUTES) {
      it(`${route} has CSRF protection`, () => {
        const source = readRoute(route);
        expect(source).toContain('import { checkCsrfOrigin }');
        expect(source).toContain("checkCsrfOrigin(");
      });
    }
  });

  describe("exempt routes do NOT have CSRF protection", () => {
    for (const route of EXEMPT_ROUTES) {
      it(`${route} is exempt from CSRF`, () => {
        const source = readRoute(route);
        expect(source).not.toContain("checkCsrfOrigin");
      });
    }
  });

  describe("CSRF check is placed before auth in each mutation handler", () => {
    // For files with multiple handlers (e.g. GET + DELETE), we need to check
    // ordering within each mutation handler, not globally across the file.
    const MUTATION_METHODS = ["POST", "DELETE", "PATCH", "PUT"];

    for (const route of PROTECTED_ROUTES) {
      it(`${route} runs CSRF before auth in every mutation handler`, () => {
        const source = readRoute(route);

        // Find each mutation handler's body
        for (const method of MUTATION_METHODS) {
          const handlerRegex = new RegExp(
            `export async function ${method}\\b`
          );
          const handlerMatch = handlerRegex.exec(source);
          if (!handlerMatch) continue;

          // Slice source from handler start to find positions within it
          const handlerStart = handlerMatch.index;
          const handlerSource = source.slice(handlerStart);

          const csrfPos = handlerSource.indexOf("checkCsrfOrigin(");
          const authPos = handlerSource.indexOf("requireAuth()");
          const rateLimitPos = handlerSource.indexOf("Limiter().limit(");

          if (csrfPos === -1) continue; // already covered by import check

          // CSRF should come before auth within this handler
          if (authPos !== -1) {
            expect(csrfPos).toBeLessThan(authPos);
          }

          // CSRF should come before rate limiting within this handler
          if (rateLimitPos !== -1) {
            expect(csrfPos).toBeLessThan(rateLimitPos);
          }
        }
      });
    }
  });

  describe("no mutation handler uses _request (unused param)", () => {
    // Verify we didn't leave any _request params that should be used for CSRF
    for (const route of PROTECTED_ROUTES) {
      it(`${route} does not have unused _request in mutation handlers`, () => {
        const source = readRoute(route);

        // Extract only mutation handler signatures (POST, DELETE, PATCH, PUT)
        const mutationRegex = /export async function (?:POST|DELETE|PATCH|PUT)\((_request)/g;
        const matches = [...source.matchAll(mutationRegex)];

        expect(matches).toHaveLength(0);
      });
    }
  });
});
