import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { isBotCheckPage } from "../src/rw/client";

const fixture = (name: string) => readFileSync(path.join(__dirname, "fixtures", name), "utf8");

describe("isBotCheckPage", () => {
  it("detects the pass.rw.by verification page", () => {
    expect(isBotCheckPage(fixture("route-bot-check.html"))).toBe(true);
  });

  it("does not flag real timetable pages", () => {
    expect(isBotCheckPage(fixture("route-ok.html"))).toBe(false);
    expect(isBotCheckPage(fixture("route-empty.html"))).toBe(false);
  });
});
