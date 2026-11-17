import type { Session, SupabaseClient } from "@supabase/supabase-js";

export function authCallbackUrl(origin: string) {
  return new URL("/auth", origin).href;
}

/** getSession waits for the SDK's URL-session initialization (detectSessionInUrl defaults to true). */
export function watchAuthCallback(
  auth: SupabaseClient["auth"],
  onSession: (session: Session) => void,
  onError: (error: Error) => void,
) {
  let active = true;
  let redirected = false;
  const accept = (session: Session | null) => {
    if (!active || redirected || !session) return;
    redirected = true;
    // Leave the auth notification's lock before navigation runs protected loaders.
    queueMicrotask(() => {
      if (active) onSession(session);
    });
  };
  // Subscribe first so a callback finishing during getSession cannot be missed.
  const { data } = auth.onAuthStateChange((_event, session) => accept(session));
  void auth.getSession().then(({ data, error }) => {
    if (!active) return;
    if (error) onError(error);
    else accept(data.session);
  }).catch((error: unknown) => {
    if (active) onError(error instanceof Error ? error : new Error("Sign-in failed"));
  });
  return () => {
    active = false;
    data.subscription.unsubscribe();
  };
}