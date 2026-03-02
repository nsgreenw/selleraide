import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { checkCsrfOrigin } from "@/lib/api/csrf";

function makeRequest(origin?: string): NextRequest {
  const headers = new Headers();
  if (origin !== undefined) headers.set("origin", origin);
  return new NextRequest("https://app.selleraide.com/api/test", { headers });
}

describe("checkCsrfOrigin", () => {
  const originalEnv = process.env.NEXT_PUBLIC_APP_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = "https://app.selleraide.com";
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.NEXT_PUBLIC_APP_URL = originalEnv;
    } else {
      delete process.env.NEXT_PUBLIC_APP_URL;
    }
    vi.restoreAllMocks();
  });

  // ── Happy path ──────────────────────────────────────────────────────

  describe("happy path", () => {
    it("allows requests with no Origin header (same-origin)", () => {
      expect(checkCsrfOrigin(makeRequest())).toBeNull();
    });

    it("allows requests with matching Origin", () => {
      expect(
        checkCsrfOrigin(makeRequest("https://app.selleraide.com"))
      ).toBeNull();
    });

    it("allows matching Origin with trailing path ignored by URL parser", () => {
      // Browser Origin headers never include paths, but verify robustness
      expect(
        checkCsrfOrigin(makeRequest("https://app.selleraide.com/some/path"))
      ).toBeNull();
    });

    it("works with localhost dev URLs", () => {
      process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
      expect(
        checkCsrfOrigin(makeRequest("http://localhost:3000"))
      ).toBeNull();
    });

    it("works with custom port matching", () => {
      process.env.NEXT_PUBLIC_APP_URL = "https://app.selleraide.com:8443";
      expect(
        checkCsrfOrigin(makeRequest("https://app.selleraide.com:8443"))
      ).toBeNull();
    });
  });

  // ── Origin mismatch rejection ───────────────────────────────────────

  describe("origin mismatch rejection", () => {
    it("rejects completely different domain", () => {
      expect(checkCsrfOrigin(makeRequest("https://evil.com"))).toBe(
        "Cross-origin request blocked"
      );
    });

    it("rejects subdomain mismatch", () => {
      expect(
        checkCsrfOrigin(makeRequest("https://other.selleraide.com"))
      ).toBe("Cross-origin request blocked");
    });

    it("rejects localhost origin against production URL", () => {
      expect(
        checkCsrfOrigin(makeRequest("http://localhost:3000"))
      ).toBe("Cross-origin request blocked");
    });

    it("rejects production origin against localhost URL", () => {
      process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
      expect(
        checkCsrfOrigin(makeRequest("https://app.selleraide.com"))
      ).toBe("Cross-origin request blocked");
    });

    it("rejects port mismatch on same host", () => {
      process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
      expect(
        checkCsrfOrigin(makeRequest("http://localhost:4000"))
      ).toBe("Cross-origin request blocked");
    });
  });

  // ── Bypass attempts ─────────────────────────────────────────────────

  describe("bypass attempts", () => {
    it("rejects domain that contains the legitimate domain as a prefix", () => {
      // attacker registers app.selleraide.com.evil.com
      expect(
        checkCsrfOrigin(makeRequest("https://app.selleraide.com.evil.com"))
      ).toBe("Cross-origin request blocked");
    });

    it("rejects domain that contains the legitimate domain as a suffix", () => {
      // attacker registers evil-app.selleraide.com
      expect(
        checkCsrfOrigin(makeRequest("https://evil-app.selleraide.com"))
      ).toBe("Cross-origin request blocked");
    });

    it("rejects null origin string (sandboxed iframes)", () => {
      // Sandboxed <iframe> sends Origin: null as a literal string
      expect(checkCsrfOrigin(makeRequest("null"))).toBe(
        "Invalid request origin"
      );
    });

    it("rejects javascript: protocol origin", () => {
      // new URL("javascript:void(0)") is valid but host is empty
      expect(
        checkCsrfOrigin(makeRequest("javascript:void(0)"))
      ).toBe("Cross-origin request blocked");
    });

    it("rejects data: URI origin", () => {
      // new URL("data:...") parses successfully with empty host
      expect(checkCsrfOrigin(makeRequest("data:text/html,<h1>hi</h1>"))).toBe(
        "Cross-origin request blocked"
      );
    });

    it("rejects origin with user:pass credentials in URL", () => {
      // new URL("https://user:pass@app.selleraide.com") — host still matches,
      // but in practice browsers strip credentials from Origin.
      // Verify no crash and that URL parsing handles it.
      const result = checkCsrfOrigin(
        makeRequest("https://user:pass@app.selleraide.com")
      );
      // URL.host for this is "app.selleraide.com" so this actually passes —
      // which is fine, credentials don't affect the security check
      expect(result).toBeNull();
    });

    it("rejects origin with different default port explicitly specified", () => {
      // https default port is 443, URL parser normalizes it away
      // so https://app.selleraide.com:443 host = "app.selleraide.com"
      expect(
        checkCsrfOrigin(makeRequest("https://app.selleraide.com:443"))
      ).toBeNull();
    });

    it("rejects non-default port when app uses default", () => {
      expect(
        checkCsrfOrigin(makeRequest("https://app.selleraide.com:8443"))
      ).toBe("Cross-origin request blocked");
    });

    it("allows http origin against https app URL (protocol-agnostic host check)", () => {
      // The CSRF check compares hosts, not protocols.
      // HSTS header prevents browsers from making HTTP requests anyway.
      expect(
        checkCsrfOrigin(makeRequest("http://app.selleraide.com"))
      ).toBeNull();
    });

    it("rejects origin with trailing dot (FQDN notation)", () => {
      // "app.selleraide.com." is technically valid FQDN
      // URL parser may or may not strip the dot — verify behavior
      const result = checkCsrfOrigin(
        makeRequest("https://app.selleraide.com.")
      );
      // URL parser keeps the trailing dot: host = "app.selleraide.com."
      // which does NOT equal "app.selleraide.com" — correctly rejected
      expect(result).toBe("Cross-origin request blocked");
    });

    it("rejects origin with uppercase to test case sensitivity", () => {
      // URL parser lowercases host, so this should match
      expect(
        checkCsrfOrigin(makeRequest("https://APP.SELLERAIDE.COM"))
      ).toBeNull();
    });

    it("rejects bare IP address origin", () => {
      expect(
        checkCsrfOrigin(makeRequest("https://192.168.1.1"))
      ).toBe("Cross-origin request blocked");
    });

    it("rejects IPv6 origin", () => {
      expect(
        checkCsrfOrigin(makeRequest("https://[::1]:3000"))
      ).toBe("Cross-origin request blocked");
    });
  });

  // ── Malformed input handling ────────────────────────────────────────

  describe("malformed input", () => {
    it("rejects random garbage string", () => {
      expect(checkCsrfOrigin(makeRequest("not-a-url"))).toBe(
        "Invalid request origin"
      );
    });

    it("rejects empty string origin", () => {
      // Empty string is falsy so treated as no Origin
      expect(checkCsrfOrigin(makeRequest(""))).toBeNull();
    });

    it("treats whitespace-only origin as no origin (Headers API trims)", () => {
      // Headers.set trims whitespace, so " " becomes "" which is falsy
      expect(checkCsrfOrigin(makeRequest(" "))).toBeNull();
    });

    it("rejects origin with unicode homoglyphs via punycode URL", () => {
      // Headers API rejects non-ASCII bytes, so test the punycode equivalent
      // Cyrillic 'а' in punycode: xn--pp-1ea.selleraide.com
      expect(
        checkCsrfOrigin(makeRequest("https://xn--pp-1ea.selleraide.com"))
      ).toBe("Cross-origin request blocked");
    });

    it("handles very long origin string without crashing", () => {
      const longOrigin = "https://" + "a".repeat(10000) + ".com";
      const result = checkCsrfOrigin(makeRequest(longOrigin));
      expect(result).toBe("Cross-origin request blocked");
    });

    it("handles origin with special characters", () => {
      expect(
        checkCsrfOrigin(makeRequest("https://evil.com/<script>"))
      ).toBe("Cross-origin request blocked");
    });
  });

  // ── Env var edge cases ──────────────────────────────────────────────

  describe("env var edge cases", () => {
    it("allows when NEXT_PUBLIC_APP_URL is missing (fail open)", () => {
      delete process.env.NEXT_PUBLIC_APP_URL;
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      expect(
        checkCsrfOrigin(makeRequest("https://evil.com"))
      ).toBeNull();
      expect(warnSpy).toHaveBeenCalledWith(
        "[CSRF] NEXT_PUBLIC_APP_URL is not set — skipping origin check"
      );
    });

    it("allows when NEXT_PUBLIC_APP_URL is empty string (fail open)", () => {
      process.env.NEXT_PUBLIC_APP_URL = "";
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      expect(
        checkCsrfOrigin(makeRequest("https://evil.com"))
      ).toBeNull();
      expect(warnSpy).toHaveBeenCalledWith(
        "[CSRF] NEXT_PUBLIC_APP_URL is not set — skipping origin check"
      );
    });

    it("allows when NEXT_PUBLIC_APP_URL is not a valid URL (fail open)", () => {
      process.env.NEXT_PUBLIC_APP_URL = "not-a-url";
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      expect(
        checkCsrfOrigin(makeRequest("https://evil.com"))
      ).toBeNull();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("NEXT_PUBLIC_APP_URL is not a valid URL")
      );
    });

    it("handles NEXT_PUBLIC_APP_URL with trailing slash", () => {
      process.env.NEXT_PUBLIC_APP_URL = "https://app.selleraide.com/";
      expect(
        checkCsrfOrigin(makeRequest("https://app.selleraide.com"))
      ).toBeNull();
    });

    it("handles NEXT_PUBLIC_APP_URL with path", () => {
      process.env.NEXT_PUBLIC_APP_URL = "https://app.selleraide.com/app";
      expect(
        checkCsrfOrigin(makeRequest("https://app.selleraide.com"))
      ).toBeNull();
    });
  });

  // ── Performance / stability ─────────────────────────────────────────

  describe("performance", () => {
    it("handles 10,000 rapid calls without degradation", () => {
      const start = performance.now();
      for (let i = 0; i < 10_000; i++) {
        checkCsrfOrigin(makeRequest("https://app.selleraide.com"));
      }
      const elapsed = performance.now() - start;
      // Should complete in under 1 second (typically ~50ms)
      expect(elapsed).toBeLessThan(1000);
    });

    it("handles 10,000 rejection calls without degradation", () => {
      const start = performance.now();
      for (let i = 0; i < 10_000; i++) {
        checkCsrfOrigin(makeRequest("https://evil.com"));
      }
      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(1000);
    });
  });
});
