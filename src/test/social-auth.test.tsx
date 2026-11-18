import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";

const { managedSignIn, directSignIn } = vi.hoisted(() => ({
  managedSignIn: vi.fn().mockResolvedValue({ redirected: true }),
  directSignIn: vi.fn().mockResolvedValue({ data: { url: "https://accounts.google.com" }, error: null }),
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
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

import { Route } from "@/routes/auth";

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("external Google authentication", () => {
  it.each(["signin", "signup"])("uses direct Google OAuth from the %s screen with a public same-origin callback", async (mode) => {
    const AuthPage = Route.options.component;
    if (!AuthPage) throw new Error("Auth page missing");
    render(<AuthPage />);
    if (mode === "signup") fireEvent.click(screen.getByRole("button", { name: "Create an account" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue with Google" }));
    await waitFor(() => expect(directSignIn).toHaveBeenCalledWith({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth` },
    }));
    expect(managedSignIn).not.toHaveBeenCalled();
  });
  it("reports provider errors and allows another attempt", async () => {
    directSignIn.mockResolvedValueOnce({ error: { message: "Google is not configured" } });
    const AuthPage = Route.options.component;
    if (!AuthPage) throw new Error("Auth page missing");
    render(<AuthPage />);
    const button = screen.getByRole("button", { name: "Continue with Google" });
    fireEvent.click(button);
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Google is not configured"));
    expect(button).not.toBeDisabled();
    expect(managedSignIn).not.toHaveBeenCalled();
  });
});