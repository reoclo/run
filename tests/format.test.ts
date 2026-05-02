import { describe, it, expect } from "vitest";
import { buildFailureSummary } from "../src/format.js";

describe("buildFailureSummary", () => {
  it("returns the last 50 lines of stderr when stderr is present", () => {
    const stderr = Array.from({ length: 75 }, (_, i) => `err line ${i + 1}`).join("\n");
    const out = buildFailureSummary("ignored", stderr);
    const lines = out.split("\n");
    expect(lines).toHaveLength(50);
    expect(lines[0]).toBe("err line 26");
    expect(lines[49]).toBe("err line 75");
  });

  it("falls back to stdout tail when stderr is empty but stdout has content", () => {
    const stdout = "line 1\nline 2\nline 3";
    const out = buildFailureSummary(stdout, "");
    expect(out).toContain("Command failed but stderr was empty");
    expect(out).toContain("line 3");
  });

  it("returns the diagnostic hint when both streams are empty", () => {
    const out = buildFailureSummary("", "");
    expect(out).toContain("no stdout or stderr captured");
    expect(out).toContain("working_directory");
  });
});
