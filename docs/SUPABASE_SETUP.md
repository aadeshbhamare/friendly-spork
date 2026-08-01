# Supabase setup and Google OAuth

This document describes the exact steps to enable Supabase authentication and enable Google sign-in for your project.

1) Create Google OAuth credentials
- Go to https://console.cloud.google.com/apis/credentials
- Select or create a project.
- Configure the OAuth consent screen (External or Internal depending on your needs). Fill in required fields.
- Create Credentials → OAuth client ID → Web application.
- Add authorized redirect URIs. For Supabase hosted auth use the callback URL:

  https://<YOUR-PROJECT-REF>.supabase.co/auth/v1/callback

  Replace `<YOUR-PROJECT-REF>` with your Supabase project ref (the short id that appears in your Supabase project URL).

  If you use a custom domain for Supabase Auth or a different redirect, add that exact URL here.

- Save and copy the Client ID and Client Secret.

2) Configure Supabase
- Go to your Supabase project dashboard → Authentication → Settings → External OAuth Providers
- Find Google and paste the Client ID and Client Secret you copied from Google Cloud Console.
- Enable the provider and save.

3) Add environment variables to your app
- In development, create a `.env.local` file in the project root (do NOT commit secrets to git).

Example `.env.local` (client-side keys only):

NEXT_PUBLIC_SUPABASE_URL=https://<YOUR-PROJECT-REF>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<ANON-CLIENT-KEY>

- For server-side operations (optional), you may also set SUPABASE_SERVICE_ROLE_KEY which must be kept secret.

4) Use the Supabase client in your app
- Install the client library:

  npm install @supabase/supabase-js

- Create a `src/lib/supabase.ts` file (already added in this branch) and import `supabase` where needed.

5) Ensure callback URLs match
- When testing locally and using OAuth, add the callback URL you will use locally to both Google Console and Supabase settings.
- For example, if using a proxy or custom auth domain, add the exact redirect URI.

6) Debugging tips
- If you see `{"code":"400","error_code":"validation_failed","msg":"Unsupported provider: provider is not enabled"}` it means the provider isn't enabled in Supabase or the provider field passed from the client is wrong. Use lowercase `google` when calling `supabase.auth.signInWithOAuth({ provider: 'google' })`.
- Check the network requests in the browser developer tools and see the request to `/auth/v1/authorize` or Supabase auth endpoints. Look for query parameters and error responses.
- Check Supabase project logs for incoming auth requests.

7) Security note
- Do not commit `SUPABASE_SERVICE_ROLE_KEY` or any secret keys to your repository. Use environment variables provided by your host (Vercel, Netlify, GitHub Actions secrets, etc.)

