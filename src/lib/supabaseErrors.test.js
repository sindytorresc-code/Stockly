import { describe, expect, it } from "vitest";
import { formatSupabaseError } from "./supabaseErrors.js";

describe("formatSupabaseError", () => {
  it("explains missing database columns", () => {
    const error = new Error(
      JSON.stringify({
        message: "Could not find the 'campaign' column of 'products' in the schema cache",
      }),
    );
    expect(formatSupabaseError(error)).toMatch(/migrate-missing-columns.sql/);
  });
});
