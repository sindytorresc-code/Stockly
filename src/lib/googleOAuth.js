export function buildGoogleAuthorizeUrl({ supabaseUrl, redirectTo, codeChallenge }) {
  const authorize = new URL(`${supabaseUrl.replace(/\/$/, "")}/auth/v1/authorize`);
  authorize.searchParams.set("provider", "google");
  authorize.searchParams.set("redirect_to", redirectTo);
  authorize.searchParams.set("code_challenge", codeChallenge);
  authorize.searchParams.set("code_challenge_method", "s256");
  return authorize.toString();
}
