# OAuth callback

This page handles the OAuth redirect from Supabase and finalizes the session on the client.

Route: /auth/callback

It calls `supabase.auth.getSessionFromUrl()` to parse the session returned in the URL, stores it in local session storage (via the client SDK) and redirects to `/` (or a `redirectTo` query param if provided).

Make sure this exact path (`https://your-app.example/auth/callback`) is added to your Google OAuth credentials redirect URIs if you use `redirectTo` to return users directly to the app.
