<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Card images (photo, cover, QR logo) are stored as resized data URLs in the `cards` row, because the workspace blocks public storage buckets.
- Public card pages (/c/$slug) load through a publishable-key server function so SSR can set share metadata; owner editing uses the browser client under RLS.
- Card colour themes are CSS blocks keyed by `[data-card-theme]` in src/styles.css, listed in src/lib/themes.ts; add a theme in both places.
- Global administrator roles live only in protected user_roles; every admin server function validates the caller through their authenticated client before using privileged auth APIs, preventing client-side privilege escalation.
- Feature permissions are enforced by database policies/triggers and mirrored by the shared access query; user overrides take precedence over organization grants, managed accounts default to denied, and unmanaged existing accounts retain access for compatibility.
- Saved business card templates use owner-scoped card_templates and a fixed-format themed BusinessCard renderer; linked QR settings come from the current profile and PNG preparation waits for QR rendering before a separate download click to preserve browser user activation.
- Lead capture: cards.collect_contacts/collect_fields configure a pre-save visitor form; submissions go to card_leads via an anon INSERT policy limited to collecting cards, and owners read/delete them through authenticated server functions.
- Site settings live in the single-row site_settings table (publicly readable, super-admin writable); the root loader fetches them and applies colours/font on <html>, while Logo and the home page render logo, name, announcement and contact details from them.
