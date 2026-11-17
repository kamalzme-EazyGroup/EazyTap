import { createClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { watchAuthCallback } from "@/lib/auth-callback";

afterEach(() => {
  window.history.replaceState(null, "", "/");
});

describe("OAuth callback session", () => {
  it("detects URL hash tokens with the generated client's SDK defaults and redirects to /dashboard", async () => {
    const user = { id: "callback-user", aud: "authenticated", role: "authenticated", email: "callback@example.test" };
    const jwt = `${btoa(JSON.stringify({ alg: "HS256" }))}.${btoa(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600 }))}.test-signature`;
    window.history.replaceState(null, "", `/auth#access_token=${jwt}&refresh_token=test-refresh&expires_in=3600&token_type=bearer&type=signup`);
    const client = createClient("https://callback.example.test", "test-key", {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: vi.fn().mockResolvedValue(new Response(JSON.stringify(user), { status: 200, headers: { "Content-Type": "application/json" } })) },
    });
    const navigate = vi.fn();
    const error = vi.fn();
    const stop = watchAuthCallback(client.auth, () => navigate("/dashboard"), error);
    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith("/dashboard"));
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(error).not.toHaveBeenCalled();
    expect(window.location.hash).toBe("");
    stop();
  });

  it("leaves signed-out visitors on /auth", async () => {
    const client = createClient("https://signedout.example.test", "test-key", {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const redirect = vi.fn();
    const stop = watchAuthCallback(client.auth, redirect, vi.fn());
    await client.auth.getSession();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(redirect).not.toHaveBeenCalled();
    stop();
  });
});