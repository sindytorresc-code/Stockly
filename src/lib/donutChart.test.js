import { describe, expect, it } from "vitest";
import { donutSlicePath } from "./donutChart.js";

describe("donutSlicePath", () => {
  it("creates a closed annular path for a category slice", () => {
    const path = donutSlicePath(120, 120, 96, 57, 0, 90);
    expect(path).toContain("A 96 96 0 0 0");
    expect(path).toContain("A 57 57 0 0 1");
    expect(path.endsWith("Z")).toBe(true);
  });

  it("keeps a full-circle category renderable", () => {
    expect(donutSlicePath(0, 0, 10, 5, 0, 360)).toMatch(/^M .* Z$/);
  });
});
