import { describe, expect, it } from "vitest";
import { webUrl } from "./safe-url";

describe("webUrl", () => {
  it("lets http and https through and rejects every other scheme or garbage", () => {
    expect(webUrl("https://www.reddit.com/r/forhire/comments/1")).toBe(
      "https://www.reddit.com/r/forhire/comments/1",
    );
    expect(webUrl("http://jobs.example.org/42")).toBe("http://jobs.example.org/42");
    expect(webUrl("javascript:alert(1)")).toBeNull();
    expect(webUrl("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(webUrl("JavaScript:alert(1)")).toBeNull();
    expect(webUrl("not a url")).toBeNull();
  });
});
