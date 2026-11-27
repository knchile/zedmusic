import { describe, expect, it } from "vitest";
import { renderEmail } from "./templates";

describe("email templates", () => {
  it("escapes user-controlled values in HTML", () => {
    const { html, text } = renderEmail({ kind: "verify-email", name: "<script>x</script>", url: "https://x.test/?a=1&b=2" });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("a=1&amp;b=2");
    expect(text).toContain("https://x.test/?a=1&b=2");
  });
  it("renders every template with a subject", () => {
    for (const t of [
      { kind: "verify-email", name: "A", url: "https://x" },
      { kind: "reset-password", name: "A", url: "https://x" },
      { kind: "password-changed", name: "A" },
    ] as const) {
      expect(renderEmail(t).subject).toMatch(/Zed Music Online/);
    }
  });
});
