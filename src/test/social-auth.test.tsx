import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { managedSignIn, directSignIn } = vi.hoisted(() => ({
  managedSignIn: vi.fn().mockResolvedValue({ redirected: true }),
  directSignIn: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => ({ options }),
  useNavigate: () => vi.fn(),
}));
vi.mock("@/integrations/lovable/index", () => ({ lovable: { auth: { signInWithOAuth: managedSignIn } } }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { signInWithOAuth: directSignIn } } }));
vi.mock("@/lib/auth-callback", () => ({
  authCallbackUrl: (origin: string) => `${origin}/auth`,
  watchAuthCallback: () => () => {},
}));
vi.mock("@/components/Logo", () => ({ Logo: () => null }));

import { Route } from "@/routes/auth";

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("managed social sign-up", () => {
  it("uses managed Google sign-in with a public callback instead of secret-dependent authorization", async () => {
    const AuthPage = Route.options.component;
    if (!AuthPage) throw new Error("Auth page missing");
    render(<AuthPage />);
    fireEvent.click(screen.getByRole("button", { name: "Continue with Google" }));
    await waitFor(() => expect(managedSignIn).toHaveBeenCalledWith("google", {
      redirect_uri: `${window.location.origin}/auth`,
    }));
    expect(directSignIn).not.toHaveBeenCalled();
  });
});