import { describe, expect, it } from "vitest";
import { buildGoogleAuthorizeUrl } from "./googleOAuth.js";

describe("Google Supabase OAuth", () => {
  it("builds an authorization request with the app redirect and PKCE challenge", () => {
    const url = new URL(buildGoogleAuthorizeUrl({
      supabaseUrl: "https://project.supabase.co/",
      redirectTo: "https://owner.github.io/Stockly/",
      codeChallenge: "pkce-challenge",
    }));
    expect(url.origin + url.pathname).toBe("https://project.supabase.co/auth/v1/authorize");
    expect(url.searchParams.get("provider")).toBe("google");
    expect(url.searchParams.get("redirect_to")).toBe("https://owner.github.io/Stockly/");
    expect(url.searchParams.get("code_challenge")).toBe("pkce-challenge");
    expect(url.searchParams.get("code_challenge_method")).toBe("s256");
  });
});
